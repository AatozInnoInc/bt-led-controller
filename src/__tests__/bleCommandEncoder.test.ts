/**
 * BLE Command Encoder Tests
 * Tests encoding and decoding of BLE commands and responses
 */

import { BLECommandEncoder } from '../utils/bleCommandEncoder';
import { CommandType, ResponseType, ParameterId } from '../types/commands';
import { ErrorCode } from '../types/errors';
import { MOCK_COMMANDS, MOCK_RESPONSES, MOCK_COLORS, MOCK_USER_IDS } from './utils/testFixtures';
import { assertUint8ArrayEqual } from './utils/testHelpers';

describe('BLECommandEncoder', () => {
  describe('Command Encoding', () => {
    describe('Config Mode Commands', () => {
      it('should encode ENTER_CONFIG command', () => {
        const command = BLECommandEncoder.encodeEnterConfig();
        expect(command[0]).toBe(CommandType.ENTER_CONFIG);
        expect(command.length).toBe(1);
      });

      it('should encode EXIT_CONFIG command', () => {
        const command = BLECommandEncoder.encodeExitConfig();
        expect(command[0]).toBe(CommandType.EXIT_CONFIG);
        expect(command.length).toBe(1);
      });

      it('should encode COMMIT_CONFIG command', () => {
        const command = BLECommandEncoder.encodeCommitConfig();
        expect(command[0]).toBe(CommandType.COMMIT_CONFIG);
        expect(command.length).toBe(1);
      });
    });

    describe('Parameter Update Commands', () => {
      it('should encode UPDATE_PARAM for brightness', () => {
        const command = BLECommandEncoder.encodeUpdateParameter({
          parameterId: ParameterId.BRIGHTNESS,
          value: 200,
        });
        
        expect(command[0]).toBe(CommandType.UPDATE_PARAM);
        expect(command[1]).toBe(ParameterId.BRIGHTNESS);
        expect(command[2]).toBe(200);
        expect(command.length).toBe(3);
      });

      it('should encode UPDATE_PARAM for speed', () => {
        const command = BLECommandEncoder.encodeUpdateParameter({
          parameterId: ParameterId.SPEED,
          value: 50,
        });
        
        expect(command[0]).toBe(CommandType.UPDATE_PARAM);
        expect(command[1]).toBe(ParameterId.SPEED);
        expect(command[2]).toBe(50);
      });

      it('should clamp parameter values to 0-255 range', () => {
        const tooHigh = BLECommandEncoder.encodeUpdateParameter({
          parameterId: ParameterId.BRIGHTNESS,
          value: 300,
        });
        expect(tooHigh[2]).toBe(255);

        const tooLow = BLECommandEncoder.encodeUpdateParameter({
          parameterId: ParameterId.BRIGHTNESS,
          value: -10,
        });
        expect(tooLow[2]).toBe(0);
      });

      it('should round floating point values', () => {
        const command = BLECommandEncoder.encodeUpdateParameter({
          parameterId: ParameterId.BRIGHTNESS,
          value: 127.7,
        });
        expect(command[2]).toBe(128);
      });
    });

    describe('Color Update Commands', () => {
      it('should encode UPDATE_COLOR with HSV values', () => {
        const command = BLECommandEncoder.encodeUpdateColor(MOCK_COLORS.red);
        
        expect(command[0]).toBe(CommandType.UPDATE_COLOR);
        expect(command[1]).toBe(MOCK_COLORS.red.h);
        expect(command[2]).toBe(MOCK_COLORS.red.s);
        expect(command[3]).toBe(MOCK_COLORS.red.v);
        expect(command.length).toBe(4);
      });

      it('should clamp HSV values to 0-255 range', () => {
        const command = BLECommandEncoder.encodeUpdateColor({
          h: 300,
          s: -10,
          v: 260,
        });
        
        expect(command[1]).toBe(255); // h clamped to 255
        expect(command[2]).toBe(0);   // s clamped to 0
        expect(command[3]).toBe(255); // v clamped to 255
      });
    });

    describe('Analytics Commands', () => {
      it('should encode REQUEST_ANALYTICS command', () => {
        const command = BLECommandEncoder.encodeRequestAnalytics();
        expect(command[0]).toBe(CommandType.REQUEST_ANALYTICS);
        expect(command.length).toBe(1);
      });

      it('should encode CONFIRM_ANALYTICS command with batch ID', () => {
        const command = BLECommandEncoder.encodeConfirmAnalytics(5);
        expect(command[0]).toBe(CommandType.CONFIRM_ANALYTICS);
        expect(command[1]).toBe(5);
        expect(command.length).toBe(2);
      });

      it('should clamp batch ID to 0-255 range', () => {
        const command = BLECommandEncoder.encodeConfirmAnalytics(300);
        expect(command[1]).toBe(255);
      });
    });

    describe('Ownership Commands', () => {
      it('should encode CLAIM_DEVICE command with user ID', () => {
        const userId = MOCK_USER_IDS.user1;
        const command = BLECommandEncoder.encodeClaimDevice(userId);
        
        expect(command[0]).toBe(CommandType.CLAIM_DEVICE);
        expect(command[1]).toBe(userId.length); // user ID length
        
        // Verify user ID bytes
        const userIdBytes = new TextEncoder().encode(userId);
        for (let i = 0; i < userIdBytes.length; i++) {
          expect(command[2 + i]).toBe(userIdBytes[i]);
        }
      });

      it('should encode VERIFY_OWNERSHIP command with user ID', () => {
        const userId = MOCK_USER_IDS.user1;
        const command = BLECommandEncoder.encodeVerifyOwnership(userId);
        
        expect(command[0]).toBe(CommandType.VERIFY_OWNERSHIP);
        expect(command[1]).toBe(userId.length);
      });

      it('should encode UNCLAIM_DEVICE command with user ID', () => {
        const userId = MOCK_USER_IDS.user1;
        const command = BLECommandEncoder.encodeUnclaimDevice(userId);
        
        expect(command[0]).toBe(CommandType.UNCLAIM_DEVICE);
        expect(command[1]).toBe(userId.length);
      });

      it('should throw error for user ID longer than 64 bytes', () => {
        const longUserId = 'a'.repeat(65);
        
        expect(() => {
          BLECommandEncoder.encodeClaimDevice(longUserId);
        }).toThrow('User ID too long');
        
        expect(() => {
          BLECommandEncoder.encodeVerifyOwnership(longUserId);
        }).toThrow('User ID too long');
        
        expect(() => {
          BLECommandEncoder.encodeUnclaimDevice(longUserId);
        }).toThrow('User ID too long');
      });

      it('should handle user ID at exactly 64 bytes', () => {
        const userId64 = 'a'.repeat(64);
        
        expect(() => {
          BLECommandEncoder.encodeClaimDevice(userId64);
        }).not.toThrow();
        
        const command = BLECommandEncoder.encodeClaimDevice(userId64);
        expect(command[1]).toBe(64);
      });
    });
  });

  describe('Response Decoding', () => {
    describe('Success Responses', () => {
      it('should decode ACK_SUCCESS response', () => {
        const response = BLECommandEncoder.decodeResponse(MOCK_RESPONSES.success);
        
        expect(response.type).toBe(ResponseType.ACK_SUCCESS);
        expect(response.isSuccess).toBe(true);
      });

      it('should decode ACK_SUCCESS with additional data', () => {
        const responseData = new Uint8Array([ResponseType.ACK_SUCCESS, 0x01, 0x02, 0x03]);
        const response = BLECommandEncoder.decodeResponse(responseData);
        
        expect(response.type).toBe(ResponseType.ACK_SUCCESS);
        expect(response.isSuccess).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data![0]).toBe(0x01);
      });
    });

    describe('Error Responses', () => {
      it('should decode ACK_ERROR with INVALID_COMMAND', () => {
        const response = BLECommandEncoder.decodeResponse(MOCK_RESPONSES.invalidCommand);
        
        expect('code' in response).toBe(true);
        expect((response as any).code).toBe(ErrorCode.INVALID_COMMAND);
        expect((response as any).message).toContain('Invalid');
      });

      it('should decode ACK_ERROR with NOT_IN_CONFIG_MODE', () => {
        const response = BLECommandEncoder.decodeResponse(MOCK_RESPONSES.notInConfigMode);
        
        expect((response as any).code).toBe(ErrorCode.NOT_IN_CONFIG_MODE);
      });

      it('should decode ACK_ERROR with NOT_OWNER', () => {
        const response = BLECommandEncoder.decodeResponse(MOCK_RESPONSES.notOwner);
        
        expect((response as any).code).toBe(ErrorCode.NOT_OWNER);
      });

      it('should decode ACK_ERROR with ALREADY_CLAIMED', () => {
        const response = BLECommandEncoder.decodeResponse(MOCK_RESPONSES.alreadyClaimed);
        
        expect((response as any).code).toBe(ErrorCode.ALREADY_CLAIMED);
      });

      it('should decode all error codes', () => {
        const errorCodes = [
          ErrorCode.INVALID_COMMAND,
          ErrorCode.INVALID_PARAMETER,
          ErrorCode.OUT_OF_RANGE,
          ErrorCode.NOT_IN_CONFIG_MODE,
          ErrorCode.ALREADY_IN_CONFIG_MODE,
          ErrorCode.FLASH_WRITE_FAILED,
          ErrorCode.VALIDATION_FAILED,
          ErrorCode.NOT_OWNER,
          ErrorCode.ALREADY_CLAIMED,
        ];

        errorCodes.forEach(errorCode => {
          const responseData = new Uint8Array([ResponseType.ACK_ERROR, errorCode]);
          const response = BLECommandEncoder.decodeResponse(responseData);
          
          expect((response as any).code).toBe(errorCode);
          expect((response as any).message).toBeDefined();
        });
      });
    });

    describe('Analytics Batch Responses', () => {
      it('should decode empty analytics batch', () => {
        // Simplified analytics batch: [type, batchId, sessionCount]
        const batchData = new Uint8Array([
          ResponseType.ANALYTICS_BATCH,
          1,  // batchId
          0,  // sessionCount
        ]);
        
        const response = BLECommandEncoder.decodeResponse(batchData);
        
        expect('batchId' in response).toBe(true);
        expect((response as any).batchId).toBe(1);
        expect((response as any).sessionCount).toBe(0);
      });

      it('should decode analytics batch with session data', () => {
        // Create a realistic analytics batch
        const batchData = new Uint8Array(50);
        let offset = 0;
        
        batchData[offset++] = ResponseType.ANALYTICS_BATCH;
        batchData[offset++] = 2; // batchId
        batchData[offset++] = 1; // sessionCount
        
        // Session data (simplified)
        // startTime (4 bytes)
        batchData[offset++] = 0x65;
        batchData[offset++] = 0x5A;
        batchData[offset++] = 0x00;
        batchData[offset++] = 0x00;
        // endTime (4 bytes)
        batchData[offset++] = 0x65;
        batchData[offset++] = 0x5A;
        batchData[offset++] = 0x03;
        batchData[offset++] = 0xE8;
        // duration (4 bytes)
        batchData[offset++] = 0x00;
        batchData[offset++] = 0x0F;
        batchData[offset++] = 0x42;
        batchData[offset++] = 0x40;
        // flags
        batchData[offset++] = 0x03; // turnedOn | turnedOff
        
        const response = BLECommandEncoder.decodeResponse(batchData.slice(0, offset));
        
        expect('batchId' in response).toBe(true);
        expect((response as any).batchId).toBe(2);
        expect((response as any).sessionCount).toBe(1);
      });
    });

    describe('Edge Cases', () => {
      it('should throw error for empty response', () => {
        const emptyData = new Uint8Array([]);
        
        expect(() => {
          BLECommandEncoder.decodeResponse(emptyData);
        }).toThrow('Empty response');
      });

      it('should throw error for unknown response type', () => {
        const unknownData = new Uint8Array([0xFF, 0x01, 0x02]);
        
        expect(() => {
          BLECommandEncoder.decodeResponse(unknownData);
        }).toThrow('Unknown response type');
      });

      it('should throw error for malformed error response', () => {
        const malformedError = new Uint8Array([ResponseType.ACK_ERROR]); // Missing error code
        
        expect(() => {
          BLECommandEncoder.decodeResponse(malformedError);
        }).toThrow('Malformed error response');
      });
    });
  });

  describe('Round-trip Encoding/Decoding', () => {
    it('should encode and decode config mode commands', () => {
      const commands = [
        BLECommandEncoder.encodeEnterConfig(),
        BLECommandEncoder.encodeExitConfig(),
        BLECommandEncoder.encodeCommitConfig(),
      ];

      commands.forEach(command => {
        expect(command.length).toBeGreaterThan(0);
        expect(command[0]).toBeGreaterThanOrEqual(0);
        expect(command[0]).toBeLessThanOrEqual(255);
      });
    });

    it('should encode ownership commands and verify structure', () => {
      const userId = MOCK_USER_IDS.user1;
      const commands = [
        BLECommandEncoder.encodeClaimDevice(userId),
        BLECommandEncoder.encodeVerifyOwnership(userId),
        BLECommandEncoder.encodeUnclaimDevice(userId),
      ];

      commands.forEach(command => {
        expect(command.length).toBe(2 + userId.length);
        expect(command[1]).toBe(userId.length);
        
        // Verify user ID matches
        const decodedUserId = new TextDecoder().decode(command.slice(2));
        expect(decodedUserId).toBe(userId);
      });
    });
  });
});



