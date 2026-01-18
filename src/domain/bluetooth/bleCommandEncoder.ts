import { BLE_COMMANDS, RESPONSE_CODES } from '../../utils/bleConstants';
import { DeviceSettings } from '../../utils/bleConstants';

/**
 * BLE Command Encoder
 * Encodes commands in proper binary format for microcontroller
 */
export class BLECommandEncoder {
  /**
   * Encode status/ping command for connection verification
   * Returns: [0x00]
   */
  static encodeStatus(): Uint8Array {
    return new Uint8Array([BLE_COMMANDS.CMD_STATUS]);
  }

  /**
   * Encode enter config mode command
   * Returns: [0x10]
   */
  static encodeEnterConfigMode(): Uint8Array {
    return new Uint8Array([BLE_COMMANDS.CMD_ENTER_CONFIG]);
  }

  /**
   * Encode commit config command
   * Returns: [0x11]
   */
  static encodeCommitConfig(): Uint8Array {
    return new Uint8Array([BLE_COMMANDS.CMD_COMMIT_CONFIG]);
  }

  /**
   * Encode exit config mode command
   * Returns: [0x12]
   */
  static encodeExitConfigMode(): Uint8Array {
    return new Uint8Array([BLE_COMMANDS.CMD_EXIT_CONFIG]);
  }

  /**
   * Encode config update command
   * Format: [0x02, paramType, value...]
   * 
   * @param paramType - Parameter type (0=brightness, 1=pattern, 2=color, etc.)
   * @param value - Parameter value(s)
   */
  static encodeConfigUpdate(paramType: number, value: number | number[]): Uint8Array {
    // Guard against invalid inputs
    if (paramType < 0 || paramType > 255) {
      throw new Error(`Invalid paramType: ${paramType}. Must be 0-255`);
    }
    
    if (value === null || value === undefined) {
      throw new Error('Value cannot be null or undefined');
    }
    
    // Guard against invalid array values
    const values = Array.isArray(value) ? value : [value];
    if (values.length === 0) {
      throw new Error('Value array cannot be empty');
    }
    
    // Guard against array length overflow (BLE MTU limits)
    if (values.length > 20) {
      throw new Error(`Value array too long: ${values.length}. Maximum 20 values`);
    }
    
    try {
      const buffer = new Uint8Array(2 + values.length);
      buffer[0] = BLE_COMMANDS.CMD_CONFIG_UPDATE;
      buffer[1] = paramType;

      values.forEach((v, i) => {
        // Guard against non-numeric values
        if (typeof v !== 'number' || !isFinite(v)) {
          throw new Error(`Invalid value at index ${i}: ${v}`);
        }
        buffer[2 + i] = Math.max(0, Math.min(255, Math.round(v)));
      });

      return buffer;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to encode config update: ${error}`);
    }
  }

  /**
   * Encode brightness update
   * Format: [0x02, 0x00, brightness]
   */
  static encodeBrightnessUpdate(brightness: number): Uint8Array {
    return this.encodeConfigUpdate(0x00, brightness);
  }

  /**
   * Encode pattern update
   * Format: [0x02, 0x01, pattern]
   */
  static encodePatternUpdate(pattern: number): Uint8Array {
    return this.encodeConfigUpdate(0x01, pattern);
  }

  /**
   * Encode color update (RGB format)
   * Format: [0x02, 0x02, R, G, B] - matches firmware CMD_CONFIG_UPDATE with paramType=0x02
   */
  static encodeColorUpdate(color: [number, number, number]): Uint8Array {
    const [r, g, b] = color;
    return this.encodeConfigUpdate(0x02, [
      Math.max(0, Math.min(255, Math.round(r))),
      Math.max(0, Math.min(255, Math.round(g))),
      Math.max(0, Math.min(255, Math.round(b))),
    ]);
  }

  /**
   * Encode power mode update
   * Format: [0x02, 0x03, powerMode]
   */
  static encodePowerModeUpdate(powerMode: number): Uint8Array {
    return this.encodeConfigUpdate(0x03, powerMode);
  }

  /**
   * Encode speed update
   * Format: [0x02, 0x04, speed]
   */
  static encodeSpeedUpdate(speed: number): Uint8Array {
    return this.encodeConfigUpdate(0x04, speed);
  }

  /**
   * Encode full settings update
   * Sends multiple config update commands
   */
  static encodeSettingsUpdate(settings: Partial<DeviceSettings>): Uint8Array[] {
    const commands: Uint8Array[] = [];

    if (settings.brightness !== undefined) {
      commands.push(this.encodeBrightnessUpdate(settings.brightness));
    }

    if (settings.currentPattern !== undefined) {
      commands.push(this.encodePatternUpdate(settings.currentPattern));
    }

    console.log('Updating color:', settings);
    if (settings.color !== undefined) {
      commands.push(this.encodeColorUpdate(settings.color));
    }

    if (settings.powerMode !== undefined) {
      commands.push(this.encodePowerModeUpdate(settings.powerMode));
    }

    if (settings.speed !== undefined) {
      commands.push(this.encodeSpeedUpdate(settings.speed));
    }

    return commands;
  }


  /**
   * Convert Uint8Array to base64 string for transmission
   */
  static toBase64(data: Uint8Array): string {
    // For React Native BLE, we typically send as string
    // Convert bytes to string representation
    return Array.from(data)
      .map(byte => String.fromCharCode(byte))
      .join('');
  }

  /**
   * Convert base64 string back to Uint8Array
   */
  static fromBase64(base64: string): Uint8Array {
    return new Uint8Array(
      base64.split('').map(char => char.charCodeAt(0))
    );
  }

  /**
   * Check if response is an acknowledgment
   */
  static isAcknowledgment(data: Uint8Array | number[]): boolean {
    if (!data || data.length === 0) {
      console.warn('[BLECommandEncoder] isAcknowledgment: data is null or empty', { data });
      return false;
    }

    const firstByte = Array.isArray(data) ? data[0] : data[0];
    return (
      firstByte === RESPONSE_CODES.ACK_CONFIG_MODE ||
      firstByte === RESPONSE_CODES.ACK_COMMIT ||
      firstByte === RESPONSE_CODES.ACK_SUCCESS
    );
  }

  /**
   * Parse acknowledgment type
   */
  static parseAcknowledgment(data: Uint8Array | number[]): {
    type: 'config_mode' | 'commit' | 'success' | 'unknown';
    code: number;
  } {
    if (!data || data.length === 0) {
      console.warn('[BLECommandEncoder] parseAcknowledgment: data is null or empty', { data });
      return { type: 'unknown', code: 0 };
    }

    const firstByte = Array.isArray(data) ? data[0] : data[0];

    switch (firstByte) {
      case RESPONSE_CODES.ACK_CONFIG_MODE:
        return { type: 'config_mode', code: firstByte };
      case RESPONSE_CODES.ACK_COMMIT:
        return { type: 'commit', code: firstByte };
      case RESPONSE_CODES.ACK_SUCCESS:
        return { type: 'success', code: firstByte };
      default:
        return { type: 'unknown', code: firstByte };
    }
  }
}

