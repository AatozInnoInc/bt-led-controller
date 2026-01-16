/**
 * Error Handling Integration Tests
 * Tests error scenarios, recovery, and error envelope handling
 */

import { MockBluetoothService } from './mocks/MockBluetoothService';
import { createMockMicrocontroller, createConnectedMockService } from './utils/testHelpers';
import { BLECommandEncoder } from '../utils/bleCommandEncoder';
import { ErrorCode, BLEError } from '../types/errors';
import { CommandType, ParameterId } from '../types/commands';
import { MOCK_USER_IDS } from './utils/testFixtures';

describe('Error Handling Integration', () => {
  let mockService: MockBluetoothService;
  const deviceId = 'mock-device-001';

  beforeEach(async () => {
    mockService = await createConnectedMockService();
  });

  afterEach(() => {
    mockService.reset();
  });

  describe('BLE Error Codes', () => {
    it('should handle INVALID_COMMAND error', async () => {
      const invalidCommand = new Uint8Array([0xFF]); // Invalid command type
      
      try {
        await mockService.sendCommand(deviceId, invalidCommand);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BLEError);
        expect((error as BLEError).envelope.code).toBe(ErrorCode.INVALID_COMMAND);
      }
    });

    it('should handle NOT_IN_CONFIG_MODE error', async () => {
      const command = BLECommandEncoder.encodeUpdateParameter({
        parameterId: ParameterId.BRIGHTNESS,
        value: 100,
      });
      
      try {
        await mockService.sendCommand(deviceId, command);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BLEError);
        expect((error as BLEError).envelope.code).toBe(ErrorCode.NOT_IN_CONFIG_MODE);
      }
    });

    it('should handle ALREADY_IN_CONFIG_MODE error', async () => {
      const command = BLECommandEncoder.encodeEnterConfig();
      await mockService.sendCommand(deviceId, command);
      
      try {
        await mockService.sendCommand(deviceId, command);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BLEError);
        expect((error as BLEError).envelope.code).toBe(ErrorCode.ALREADY_IN_CONFIG_MODE);
      }
    });

    it('should handle NOT_OWNER error', async () => {
      // Claim device
      mockService.getMicrocontroller().setState({
        ownerUserId: MOCK_USER_IDS.user1,
        hasOwner: true,
        sessionOwnershipVerified: false,
      });
      
      const command = BLECommandEncoder.encodeEnterConfig();
      
      try {
        await mockService.sendCommand(deviceId, command);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BLEError);
        expect((error as BLEError).envelope.code).toBe(ErrorCode.NOT_OWNER);
      }
    });

    it('should handle ALREADY_CLAIMED error', async () => {
      // Claim device with user1
      const claimCommand1 = BLECommandEncoder.encodeClaimDevice(MOCK_USER_IDS.user1);
      await mockService.sendCommand(deviceId, claimCommand1);
      
      // Clear session
      mockService.getMicrocontroller().clearSessionOwnership();
      
      // Try to claim with user2
      const claimCommand2 = BLECommandEncoder.encodeClaimDevice(MOCK_USER_IDS.user2);
      
      try {
        await mockService.sendCommand(deviceId, claimCommand2);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BLEError);
        expect((error as BLEError).envelope.code).toBe(ErrorCode.ALREADY_CLAIMED);
      }
    });

    it('should handle VALIDATION_FAILED error', async () => {
      // Enter config mode
      const enterCommand = BLECommandEncoder.encodeEnterConfig();
      await mockService.sendCommand(deviceId, enterCommand);
      
      // Set unsafe configuration
      const updateBrightness = BLECommandEncoder.encodeUpdateParameter({
        parameterId: ParameterId.BRIGHTNESS,
        value: 255,
      });
      await mockService.sendCommand(deviceId, updateBrightness);
      
      const updateColor = BLECommandEncoder.encodeUpdateColor({ h: 0, s: 0, v: 255 }); // White
      await mockService.sendCommand(deviceId, updateColor);
      
      const updatePower = BLECommandEncoder.encodeUpdateParameter({
        parameterId: ParameterId.POWER_STATE,
        value: 1,
      });
      await mockService.sendCommand(deviceId, updatePower);
      
      // Try to commit (should fail validation)
      const commitCommand = BLECommandEncoder.encodeCommitConfig();
      
      try {
        await mockService.sendCommand(deviceId, commitCommand);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BLEError);
        expect((error as BLEError).envelope.code).toBe(ErrorCode.VALIDATION_FAILED);
      }
    });

    it('should handle INVALID_PARAMETER error', async () => {
      // Enter config mode
      const enterCommand = BLECommandEncoder.encodeEnterConfig();
      await mockService.sendCommand(deviceId, enterCommand);
      
      // Send invalid parameter command (too short)
      const invalidCommand = new Uint8Array([CommandType.UPDATE_PARAM, 0xFF]); // Missing value
      
      try {
        await mockService.sendCommand(deviceId, invalidCommand);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BLEError);
        expect((error as BLEError).envelope.code).toBe(ErrorCode.INVALID_PARAMETER);
      }
    });
  });

  describe('Error Recovery', () => {
    it('should recover from error and continue', async () => {
      // Try invalid command
      const invalidCommand = new Uint8Array([0xFF]);
      
      try {
        await mockService.sendCommand(deviceId, invalidCommand);
      } catch (error) {
        // Expected
      }
      
      // Should be able to proceed with valid command
      const validCommand = BLECommandEncoder.encodeEnterConfig();
      const response = await mockService.sendCommand(deviceId, validCommand);
      
      expect(response.isSuccess).toBe(true);
    });

    it('should handle consecutive errors', async () => {
      const errors: ErrorCode[] = [];
      
      // Trigger multiple errors
      for (let i = 0; i < 3; i++) {
        try {
          const invalidCommand = new Uint8Array([0xF0 + i]);
          await mockService.sendCommand(deviceId, invalidCommand);
        } catch (error) {
          errors.push((error as BLEError).envelope.code);
        }
      }
      
      expect(errors).toHaveLength(3);
      errors.forEach(code => {
        expect(code).toBe(ErrorCode.INVALID_COMMAND);
      });
    });

    it('should track error count', async () => {
      const stateBefore = mockService.getMicrocontroller().getState();
      const errorCountBefore = stateBefore.analytics.errorCount;
      
      // Trigger error
      try {
        const invalidCommand = new Uint8Array([0xFF]);
        await mockService.sendCommand(deviceId, invalidCommand);
      } catch (error) {
        // Expected
      }
      
      const stateAfter = mockService.getMicrocontroller().getState();
      expect(stateAfter.analytics.errorCount).toBe(errorCountBefore + 1);
    });

    it('should record last error code and timestamp', async () => {
      const invalidCommand = new Uint8Array([0xFF]);
      
      try {
        await mockService.sendCommand(deviceId, invalidCommand);
      } catch (error) {
        // Expected
      }
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.analytics.lastErrorCode).toBe(ErrorCode.INVALID_COMMAND);
      expect(state.analytics.lastErrorTimestamp).toBeGreaterThan(0);
    });
  });

  describe('Connection Error Scenarios', () => {
    it('should handle device disconnection', async () => {
      await mockService.disconnectDevice(deviceId);
      
      const command = BLECommandEncoder.encodeEnterConfig();
      
      try {
        await mockService.sendCommand(deviceId, command);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BLEError);
        expect((error as Error).message).toContain('not connected');
      }
    });

    it('should handle send to wrong device ID', async () => {
      const command = BLECommandEncoder.encodeEnterConfig();
      
      try {
        await mockService.sendCommand('wrong-device-id', command);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BLEError);
      }
    });
  });

  describe('Simulated Microcontroller Errors', () => {
    it('should inject and handle simulated error', async () => {
      mockService.getMicrocontroller().simulateError(ErrorCode.FLASH_WRITE_FAILED);
      
      const command = BLECommandEncoder.encodeEnterConfig();
      
      try {
        await mockService.sendCommand(deviceId, command);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BLEError);
        expect((error as BLEError).envelope.code).toBe(ErrorCode.FLASH_WRITE_FAILED);
      }
    });

    it('should clear simulated error after one use', async () => {
      mockService.getMicrocontroller().simulateError(ErrorCode.FLASH_WRITE_FAILED);
      
      // First command should error
      try {
        await mockService.sendCommand(deviceId, BLECommandEncoder.encodeEnterConfig());
      } catch (error) {
        // Expected
      }
      
      // Second command should succeed
      const response = await mockService.sendCommand(deviceId, BLECommandEncoder.encodeEnterConfig());
      expect(response.isSuccess).toBe(true);
    });
  });

  describe('Error Message Quality', () => {
    it('should provide meaningful error messages', async () => {
      const errorCodes = [
        ErrorCode.INVALID_COMMAND,
        ErrorCode.INVALID_PARAMETER,
        ErrorCode.NOT_IN_CONFIG_MODE,
        ErrorCode.ALREADY_IN_CONFIG_MODE,
        ErrorCode.NOT_OWNER,
        ErrorCode.ALREADY_CLAIMED,
        ErrorCode.VALIDATION_FAILED,
      ];
      
      errorCodes.forEach(code => {
        mockService.getMicrocontroller().simulateError(code);
        
        try {
          // Doesn't matter what command we send, error will be injected
          mockService.sendCommand(deviceId, BLECommandEncoder.encodeEnterConfig());
        } catch (error) {
          const bleError = error as BLEError;
          expect(bleError.envelope.message).toBeDefined();
          expect(bleError.envelope.message.length).toBeGreaterThan(5);
        }
      });
    });

    it('should include error code in error envelope', async () => {
      mockService.getMicrocontroller().simulateError(ErrorCode.VALIDATION_FAILED);
      
      try {
        await mockService.sendCommand(deviceId, BLECommandEncoder.encodeEnterConfig());
        fail('Should have thrown error');
      } catch (error) {
        const bleError = error as BLEError;
        expect(bleError.envelope.code).toBe(ErrorCode.VALIDATION_FAILED);
      }
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid command failures', async () => {
      const errorCount = 20;
      let errors = 0;
      
      for (let i = 0; i < errorCount; i++) {
        try {
          const invalidCommand = new Uint8Array([0xFF]);
          await mockService.sendCommand(deviceId, invalidCommand);
        } catch (error) {
          errors++;
        }
      }
      
      expect(errors).toBe(errorCount);
    });

    it('should maintain state integrity after errors', async () => {
      // Enter config mode
      await mockService.sendCommand(deviceId, BLECommandEncoder.encodeEnterConfig());
      
      // Trigger multiple errors
      for (let i = 0; i < 5; i++) {
        try {
          mockService.getMicrocontroller().simulateError(ErrorCode.INVALID_PARAMETER);
          await mockService.sendCommand(deviceId, BLECommandEncoder.encodeUpdateParameter({
            parameterId: ParameterId.BRIGHTNESS,
            value: 100,
          }));
        } catch (error) {
          // Expected
        }
      }
      
      // State should still be valid
      const state = mockService.getMicrocontroller().getState();
      expect(state.inConfigMode).toBe(true);
      
      // Should still be able to exit config mode
      const exitCommand = BLECommandEncoder.encodeExitConfig();
      const response = await mockService.sendCommand(deviceId, exitCommand);
      expect(response.isSuccess).toBe(true);
    });
  });
});



