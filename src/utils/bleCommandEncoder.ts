/**
 * BLE Command Encoder/Decoder
 * Encodes commands to byte arrays and decodes responses
 */

import { CommandType, ResponseType, ParameterId, BLECommand, CommandResponse, UpdateParameterCommand, AnalyticsBatch, AnalyticsSessionData } from '../types/commands';
import { ErrorEnvelope, ErrorCode, BLEError } from '../types/errors';
import { HSVColor } from '../types/config';

export class BLECommandEncoder {
  /**
   * Encode a command to Uint8Array for BLE transmission
   */
  static encodeCommand(command: BLECommand): Uint8Array {
    if (command.payload) {
      const buffer = new Uint8Array(1 + command.payload.length);
      buffer[0] = command.type;
      buffer.set(command.payload, 1);
      return buffer;
    }
    return new Uint8Array([command.type]);
  }

  /**
   * Encode Enter Config Mode command
   */
  static encodeEnterConfig(): Uint8Array {
    return this.encodeCommand({ type: CommandType.ENTER_CONFIG });
  }

  /**
   * Encode Exit Config Mode command
   */
  static encodeExitConfig(): Uint8Array {
    return this.encodeCommand({ type: CommandType.EXIT_CONFIG });
  }

  /**
   * Encode Commit Config command
   */
  static encodeCommitConfig(): Uint8Array {
    return this.encodeCommand({ type: CommandType.COMMIT_CONFIG });
  }

  /**
   * Encode Update Parameter command
   */
  static encodeUpdateParameter(cmd: UpdateParameterCommand): Uint8Array {
    const payload = new Uint8Array(2);
    payload[0] = cmd.parameterId;
    payload[1] = Math.max(0, Math.min(255, Math.round(cmd.value)));
    return this.encodeCommand({
      type: CommandType.UPDATE_PARAM,
      payload,
    });
  }

  /**
   * Encode Update Color command (HSV as single command)
   * Payload format: [H, S, V] (3 bytes)
   */
  static encodeUpdateColor(color: HSVColor): Uint8Array {
    const payload = new Uint8Array(3);
    payload[0] = Math.max(0, Math.min(255, Math.round(color.h))); // Hue
    payload[1] = Math.max(0, Math.min(255, Math.round(color.s))); // Saturation
    payload[2] = Math.max(0, Math.min(255, Math.round(color.v))); // Value
    return this.encodeCommand({
      type: CommandType.UPDATE_COLOR,
      payload,
    });
  }

  /**
   * Encode Request Analytics command
   */
  static encodeRequestAnalytics(): Uint8Array {
    return this.encodeCommand({ type: CommandType.REQUEST_ANALYTICS });
  }

  /**
   * Encode Confirm Analytics command
   * Payload: [batchId] (1 byte)
   */
  static encodeConfirmAnalytics(batchId: number): Uint8Array {
    const payload = new Uint8Array(1);
    payload[0] = Math.max(0, Math.min(255, batchId));
    return this.encodeCommand({
      type: CommandType.CONFIRM_ANALYTICS,
      payload,
    });
  }

  /**
   * Decode response from microcontroller
   */
  static decodeResponse(data: Uint8Array): CommandResponse | ErrorEnvelope | AnalyticsBatch {
    if (data.length === 0) {
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Empty response from device',
      });
    }

    const responseType = data[0];

    if (responseType === ResponseType.ACK_SUCCESS) {
      return {
        type: ResponseType.ACK_SUCCESS,
        isSuccess: true,
        data: data.slice(1),
      };
    }

    if (responseType === ResponseType.ANALYTICS_BATCH) {
      return this.decodeAnalyticsBatch(data);
    }

    if (responseType === ResponseType.ACK_ERROR) {
      if (data.length < 2) {
        throw new BLEError({
          code: ErrorCode.UNKNOWN_ERROR,
          message: 'Malformed error response',
        });
      }

      const errorCode = data[1] as ErrorCode;
      const errorData = data.length > 2 ? data.slice(2) : undefined;
      
      const envelope: ErrorEnvelope = {
        code: errorCode,
        message: this.getErrorMessage(errorCode),
        data: errorData,
      };

      return envelope;
    }

    throw new BLEError({
      code: ErrorCode.UNKNOWN_ERROR,
      message: `Unknown response type: 0x${responseType.toString(16)}`,
    });
  }

  /**
   * Decode analytics batch response
   * Note: This may be called multiple times with chunks of data
   */
  static decodeAnalyticsBatch(data: Uint8Array): AnalyticsBatch {
    // Constants for payload structure
    const RESPONSE_TYPE_SIZE = 1;        // RESP_ANALYTICS_BATCH
    const BATCH_ID_SIZE = 1;
    const SESSION_COUNT_SIZE = 1;
    const FLASH_READS_SIZE = 2;
    const FLASH_WRITES_SIZE = 2;
    const ERROR_COUNT_SIZE = 2;
    const LAST_ERROR_CODE_SIZE = 1;
    const LAST_ERROR_TIMESTAMP_SIZE = 4;
    const AVG_POWER_SIZE = 2;
    const PEAK_POWER_SIZE = 2;
    const SESSION_SIZE = 13; // startTime(4) + endTime(4) + duration(4) + flags(1)
    
    const MIN_HEADER_SIZE = RESPONSE_TYPE_SIZE + BATCH_ID_SIZE + SESSION_COUNT_SIZE +
      FLASH_READS_SIZE + FLASH_WRITES_SIZE + ERROR_COUNT_SIZE +
      LAST_ERROR_CODE_SIZE + LAST_ERROR_TIMESTAMP_SIZE +
      AVG_POWER_SIZE + PEAK_POWER_SIZE;
    
    if (data.length < MIN_HEADER_SIZE) {
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Analytics batch response too short',
      });
    }

    let idx = 1; // Skip response type
    const batchId = data[idx++];
    const sessionCount = data[idx++];
    
    // Flash reads (2 bytes, big-endian)
    const flashReads = (data[idx++] << 8) | data[idx++];
    
    // Flash writes (2 bytes)
    const flashWrites = (data[idx++] << 8) | data[idx++];
    
    // Error count (2 bytes)
    const errorCount = (data[idx++] << 8) | data[idx++];
    
    // Average power (2 bytes)
    const averagePowerConsumption = (data[idx++] << 8) | data[idx++];
    
    // Peak power (2 bytes)
    const peakPowerConsumption = (data[idx++] << 8) | data[idx++];
    
    // Last error code (1 byte)
    const lastErrorCode = data[idx++];
    
    // Last error timestamp (4 bytes, big-endian)
    const lastErrorTimestamp = (data[idx++] << 24) | (data[idx++] << 16) | (data[idx++] << 8) | data[idx++];
    
    // Decode sessions
    const sessions: AnalyticsSessionData[] = [];
    for (let i = 0; i < sessionCount; i++) {
      if (idx + SESSION_SIZE > data.length) {
        break; // Not enough data
      }
      
      // startTime (4 bytes, big-endian)
      const startTime = (data[idx++] << 24) | (data[idx++] << 16) | (data[idx++] << 8) | data[idx++];
      
      // endTime (4 bytes)
      const endTime = (data[idx++] << 24) | (data[idx++] << 16) | (data[idx++] << 8) | data[idx++];
      
      // duration (4 bytes)
      const duration = (data[idx++] << 24) | (data[idx++] << 16) | (data[idx++] << 8) | data[idx++];
      
      // flags (1 byte)
      const flags = data[idx++];
      const turnedOn = (flags & 0x01) !== 0;
      const turnedOff = (flags & 0x02) !== 0;
      
      sessions.push({
        startTime,
        endTime,
        duration,
        turnedOn,
        turnedOff,
      });
    }

    return {
      batchId,
      sessionCount,
      sessions,
      flashReads,
      flashWrites,
      errorCount,
      lastErrorCode: lastErrorCode > 0 ? lastErrorCode : undefined,
      lastErrorTimestamp: lastErrorTimestamp > 0 ? lastErrorTimestamp : undefined,
      averagePowerConsumption: averagePowerConsumption > 0 ? averagePowerConsumption : undefined,
      peakPowerConsumption: peakPowerConsumption > 0 ? peakPowerConsumption : undefined,
    };
  }

  /**
   * Get human-readable error message from error code
   */
  private static getErrorMessage(code: ErrorCode): string {
    switch (code) {
      case ErrorCode.INVALID_COMMAND:
        return 'Invalid command';
      case ErrorCode.INVALID_PARAMETER:
        return 'Invalid parameter';
      case ErrorCode.OUT_OF_RANGE:
        return 'Parameter value out of range';
      case ErrorCode.NOT_IN_CONFIG_MODE:
        return 'Device not in configuration mode';
      case ErrorCode.ALREADY_IN_CONFIG_MODE:
        return 'Device already in configuration mode';
      case ErrorCode.FLASH_WRITE_FAILED:
        return 'Failed to write to flash memory';
      case ErrorCode.VALIDATION_FAILED:
        return 'Configuration validation failed';
      default:
        return 'Unknown error';
    }
  }
}

