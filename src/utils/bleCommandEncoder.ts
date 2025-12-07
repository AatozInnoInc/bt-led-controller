/**
 * BLE Command Encoder/Decoder
 * Encodes commands to byte arrays and decodes responses
 */

import { CommandType, ResponseType, ParameterId, BLECommand, CommandResponse, UpdateParameterCommand } from '../types/commands';
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
   * Decode response from microcontroller
   */
  static decodeResponse(data: Uint8Array): CommandResponse | ErrorEnvelope {
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

