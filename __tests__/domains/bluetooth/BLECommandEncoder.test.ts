import { BLECommandEncoder } from '../../../domains/bluetooth/BLECommandEncoder';
import { BLE_COMMANDS, RESPONSE_CODES } from '../../../utils/bleConstants';

describe('BLECommandEncoder', () => {
  describe('encodeEnterConfigMode', () => {
    it('should encode enter config mode command', () => {
      const command = BLECommandEncoder.encodeEnterConfigMode();
      
      expect(command.length).toBe(1);
      expect(command[0]).toBe(BLE_COMMANDS.CMD_ENTER_CONFIG);
    });
  });

  describe('encodeCommitConfig', () => {
    it('should encode commit config command', () => {
      const command = BLECommandEncoder.encodeCommitConfig();
      
      expect(command.length).toBe(1);
      expect(command[0]).toBe(BLE_COMMANDS.CMD_COMMIT_CONFIG);
    });
  });

  describe('encodeExitConfigMode', () => {
    it('should encode exit config mode command', () => {
      const command = BLECommandEncoder.encodeExitConfigMode();
      
      expect(command.length).toBe(1);
      expect(command[0]).toBe(BLE_COMMANDS.CMD_EXIT_CONFIG);
    });
  });

  describe('encodeConfigUpdate', () => {
    it('should encode config update with single value', () => {
      const command = BLECommandEncoder.encodeConfigUpdate(0x00, 128);
      
      expect(command.length).toBe(3);
      expect(command[0]).toBe(BLE_COMMANDS.CMD_CONFIG_UPDATE);
      expect(command[1]).toBe(0x00);
      expect(command[2]).toBe(128);
    });

    it('should encode config update with array value', () => {
      const command = BLECommandEncoder.encodeConfigUpdate(0x02, [255, 128, 64]);
      
      expect(command.length).toBe(5);
      expect(command[0]).toBe(BLE_COMMANDS.CMD_CONFIG_UPDATE);
      expect(command[1]).toBe(0x02);
      expect(command[2]).toBe(255);
      expect(command[3]).toBe(128);
      expect(command[4]).toBe(64);
    });

    it('should clamp values to 0-255 range', () => {
      const command = BLECommandEncoder.encodeConfigUpdate(0x00, 300);
      
      expect(command[2]).toBe(255);
    });
  });

  describe('encodeBrightnessUpdate', () => {
    it('should encode brightness update', () => {
      const command = BLECommandEncoder.encodeBrightnessUpdate(128);
      
      expect(command.length).toBe(3);
      expect(command[0]).toBe(BLE_COMMANDS.CMD_CONFIG_UPDATE);
      expect(command[1]).toBe(0x00);
      expect(command[2]).toBe(128);
    });
  });

  describe('encodePatternUpdate', () => {
    it('should encode pattern update', () => {
      const command = BLECommandEncoder.encodePatternUpdate(2);
      
      expect(command.length).toBe(3);
      expect(command[0]).toBe(BLE_COMMANDS.CMD_CONFIG_UPDATE);
      expect(command[1]).toBe(0x01);
      expect(command[2]).toBe(2);
    });
  });

  describe('encodeColorUpdate', () => {
    it('should encode color update', () => {
      const command = BLECommandEncoder.encodeColorUpdate(255, 128, 64);
      
      expect(command.length).toBe(5);
      expect(command[0]).toBe(BLE_COMMANDS.CMD_CONFIG_UPDATE);
      expect(command[1]).toBe(0x02);
      expect(command[2]).toBe(255);
      expect(command[3]).toBe(128);
      expect(command[4]).toBe(64);
    });
  });

  describe('encodeSettingsUpdate', () => {
    it('should encode multiple settings updates', () => {
      const commands = BLECommandEncoder.encodeSettingsUpdate({
        brightness: 128,
        currentPattern: 2,
        color: [255, 128, 64],
      });
      
      expect(commands.length).toBe(3);
      expect(commands[0][1]).toBe(0x00); // Brightness
      expect(commands[1][1]).toBe(0x01); // Pattern
      expect(commands[2][1]).toBe(0x02); // Color
    });
  });

  describe('isAcknowledgment', () => {
    it('should identify config mode acknowledgment', () => {
      const data = new Uint8Array([RESPONSE_CODES.ACK_CONFIG_MODE]);
      expect(BLECommandEncoder.isAcknowledgment(data)).toBe(true);
    });

    it('should identify commit acknowledgment', () => {
      const data = new Uint8Array([RESPONSE_CODES.ACK_COMMIT]);
      expect(BLECommandEncoder.isAcknowledgment(data)).toBe(true);
    });

    it('should return false for non-acknowledgment', () => {
      const data = new Uint8Array([0x99]);
      expect(BLECommandEncoder.isAcknowledgment(data)).toBe(false);
    });
  });

  describe('parseAcknowledgment', () => {
    it('should parse config mode acknowledgment', () => {
      const data = new Uint8Array([RESPONSE_CODES.ACK_CONFIG_MODE]);
      const result = BLECommandEncoder.parseAcknowledgment(data);
      
      expect(result.type).toBe('config_mode');
      expect(result.code).toBe(RESPONSE_CODES.ACK_CONFIG_MODE);
    });

    it('should parse commit acknowledgment', () => {
      const data = new Uint8Array([RESPONSE_CODES.ACK_COMMIT]);
      const result = BLECommandEncoder.parseAcknowledgment(data);
      
      expect(result.type).toBe('commit');
      expect(result.code).toBe(RESPONSE_CODES.ACK_COMMIT);
    });
  });
});


