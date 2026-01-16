/**
 * Ownership Flow Integration Tests
 * Tests device claiming, ownership verification, and unclaiming
 */

import { ConfigDomainController } from '../domain/configDomainController';
import { MockBluetoothService } from './mocks/MockBluetoothService';
import { createMockMicrocontroller, createConnectedMockService, clearAsyncStorage } from './utils/testHelpers';
import { MOCK_USER_IDS, MOCK_DEVICES } from './utils/testFixtures';
import { BLEError, ErrorCode } from '../types/errors';
import { getPairedDevices, isDevicePaired } from '../utils/devicePairing';

jest.mock('../utils/bluetoothService', () => ({
  bluetoothService: null,
}));

describe('Ownership Flow Integration', () => {
  let controller: ConfigDomainController;
  let mockService: MockBluetoothService;
  let bluetoothServiceModule: any;

  beforeEach(async () => {
    await clearAsyncStorage();
    
    mockService = await createConnectedMockService();
    bluetoothServiceModule = require('../utils/bluetoothService');
    bluetoothServiceModule.bluetoothService = mockService;
    
    controller = new ConfigDomainController();
  });

  afterEach(() => {
    controller.reset();
    mockService.reset();
  });

  describe('Device Claiming', () => {
    it('should claim unclaimed device successfully', async () => {
      await controller.claimDevice(
        MOCK_DEVICES.device1.id,
        MOCK_USER_IDS.user1,
        MOCK_DEVICES.device1.name
      );
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.hasOwner).toBe(true);
      expect(state.ownerUserId).toBe(MOCK_USER_IDS.user1);
      expect(state.sessionOwnershipVerified).toBe(true);
    });

    it('should store pairing in AsyncStorage', async () => {
      await controller.claimDevice(
        MOCK_DEVICES.device1.id,
        MOCK_USER_IDS.user1
      );
      
      const pairedDevices = await getPairedDevices();
      expect(pairedDevices).toHaveLength(1);
      expect(pairedDevices[0].deviceId).toBe(MOCK_DEVICES.device1.id);
      expect(pairedDevices[0].userId).toBe(MOCK_USER_IDS.user1);
    });

    it('should reject claim if already claimed by different user', async () => {
      // Claim by user1
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      // Clear session ownership
      mockService.getMicrocontroller().clearSessionOwnership();
      
      // Try to claim by user2
      await expect(
        controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user2)
      ).rejects.toThrow(BLEError);
    });

    it('should allow developer to claim already-claimed device', async () => {
      // Claim by regular user
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      // Clear session ownership
      mockService.getMicrocontroller().clearSessionOwnership();
      
      // Claim by developer (should succeed)
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.developer);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.ownerUserId).toBe(MOCK_USER_IDS.developer);
    });

    it('should allow same owner to reclaim', async () => {
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      // Clear session ownership
      mockService.getMicrocontroller().clearSessionOwnership();
      
      // Reclaim by same user
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.ownerUserId).toBe(MOCK_USER_IDS.user1);
    });

    it('should verify ownership after claiming', async () => {
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.sessionOwnershipVerified).toBe(true);
    });

    it('should throw error if device not connected', async () => {
      await mockService.disconnectDevice(MOCK_DEVICES.device1.id);
      
      await expect(
        controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1)
      ).rejects.toThrow('not connected');
    });
  });

  describe('Ownership Verification', () => {
    beforeEach(async () => {
      // Claim device first
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      // Clear session ownership to test verification
      mockService.getMicrocontroller().clearSessionOwnership();
    });

    it('should verify ownership for owner', async () => {
      await controller.verifyOwnership(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.sessionOwnershipVerified).toBe(true);
    });

    it('should reject verification for non-owner', async () => {
      await expect(
        controller.verifyOwnership(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user2)
      ).rejects.toThrow(BLEError);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.sessionOwnershipVerified).toBe(false);
    });

    it('should allow developer to verify ownership', async () => {
      await controller.verifyOwnership(MOCK_DEVICES.device1.id, MOCK_USER_IDS.developer);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.sessionOwnershipVerified).toBe(true);
    });

    it('should allow test user to verify ownership', async () => {
      await controller.verifyOwnership(MOCK_DEVICES.device1.id, MOCK_USER_IDS.testUser);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.sessionOwnershipVerified).toBe(true);
    });
  });

  describe('Per-Session Ownership', () => {
    it('should require verification after reconnection', async () => {
      // Claim and verify
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      await controller.initializeConfig(MOCK_DEVICES.device1.id);
      
      // Simulate disconnection
      mockService.simulateDisconnect();
      
      // Reconnect
      await mockService.connectToDevice(MOCK_DEVICES.device1.id);
      
      // Try to enter config mode without verifying ownership
      await expect(controller.enterConfigMode()).rejects.toThrow(BLEError);
    });

    it('should block commands without ownership verification', async () => {
      // Claim device
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      // Clear session ownership
      mockService.getMicrocontroller().clearSessionOwnership();
      
      await controller.initializeConfig(MOCK_DEVICES.device1.id);
      
      // Try to enter config mode
      await expect(controller.enterConfigMode()).rejects.toThrow(BLEError);
    });

    it('should allow commands after ownership verification', async () => {
      // Claim device
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      // Clear and re-verify
      mockService.getMicrocontroller().clearSessionOwnership();
      await controller.verifyOwnership(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      await controller.initializeConfig(MOCK_DEVICES.device1.id);
      
      // Should succeed
      await controller.enterConfigMode();
      expect(controller.isInConfigMode()).toBe(true);
    });
  });

  describe('Device Unclaiming', () => {
    beforeEach(async () => {
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
    });

    it('should unclaim device successfully', async () => {
      await controller.unclaimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.hasOwner).toBe(false);
      expect(state.ownerUserId).toBe('');
      expect(state.sessionOwnershipVerified).toBe(false);
    });

    it('should remove pairing from AsyncStorage', async () => {
      await controller.unclaimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      const pairedDevices = await getPairedDevices();
      expect(pairedDevices).toHaveLength(0);
    });

    it('should reject unclaim from non-owner', async () => {
      await expect(
        controller.unclaimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user2)
      ).rejects.toThrow(BLEError);
      
      // Device should still be claimed
      const state = mockService.getMicrocontroller().getState();
      expect(state.hasOwner).toBe(true);
    });

    it('should allow developer to unclaim device', async () => {
      await controller.unclaimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.developer);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.hasOwner).toBe(false);
    });

    it('should reject unclaim on unclaimed device', async () => {
      // Unclaim once
      await controller.unclaimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      // Try to unclaim again
      await expect(
        controller.unclaimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1)
      ).rejects.toThrow(BLEError);
    });
  });

  describe('Full Ownership Lifecycle', () => {
    it('should complete full claim → use → unclaim workflow', async () => {
      const deviceId = MOCK_DEVICES.device1.id;
      const userId = MOCK_USER_IDS.user1;
      
      // Claim device
      await controller.claimDevice(deviceId, userId);
      expect(await isDevicePaired(deviceId, userId)).toBe(true);
      
      // Use device (config mode)
      await controller.initializeConfig(deviceId);
      await controller.enterConfigMode();
      expect(controller.isInConfigMode()).toBe(true);
      
      // Unclaim device
      await controller.unclaimDevice(deviceId, userId);
      expect(await isDevicePaired(deviceId, userId)).toBe(false);
      
      // Verify it's unclaimed on microcontroller
      const state = mockService.getMicrocontroller().getState();
      expect(state.hasOwner).toBe(false);
    });

    it('should handle device transfer workflow', async () => {
      const deviceId = MOCK_DEVICES.device1.id;
      
      // User 1 claims
      await controller.claimDevice(deviceId, MOCK_USER_IDS.user1);
      
      // Developer takes over
      mockService.getMicrocontroller().clearSessionOwnership();
      await controller.claimDevice(deviceId, MOCK_USER_IDS.developer);
      
      // User 2 takes ownership
      mockService.getMicrocontroller().clearSessionOwnership();
      await controller.unclaimDevice(deviceId, MOCK_USER_IDS.developer);
      await controller.claimDevice(deviceId, MOCK_USER_IDS.user2);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.ownerUserId).toBe(MOCK_USER_IDS.user2);
    });

    it('should prevent unauthorized access after ownership change', async () => {
      const deviceId = MOCK_DEVICES.device1.id;
      
      // User 1 claims
      await controller.claimDevice(deviceId, MOCK_USER_IDS.user1);
      
      // Transfer to user 2 (via developer)
      mockService.getMicrocontroller().clearSessionOwnership();
      await controller.claimDevice(deviceId, MOCK_USER_IDS.developer);
      mockService.getMicrocontroller().clearSessionOwnership();
      await controller.unclaimDevice(deviceId, MOCK_USER_IDS.developer);
      await controller.claimDevice(deviceId, MOCK_USER_IDS.user2);
      
      // Clear session
      mockService.getMicrocontroller().clearSessionOwnership();
      
      // User 1 should not be able to access
      await expect(
        controller.verifyOwnership(deviceId, MOCK_USER_IDS.user1)
      ).rejects.toThrow(BLEError);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle disconnection during claim', async () => {
      await mockService.disconnectDevice(MOCK_DEVICES.device1.id);
      
      await expect(
        controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1)
      ).rejects.toThrow('not connected');
    });

    it('should handle disconnection during verification', async () => {
      await controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      mockService.getMicrocontroller().clearSessionOwnership();
      
      await mockService.disconnectDevice(MOCK_DEVICES.device1.id);
      
      await expect(
        controller.verifyOwnership(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1)
      ).rejects.toThrow('not connected');
    });

    it('should handle microcontroller errors during claim', async () => {
      mockService.getMicrocontroller().simulateError(ErrorCode.FLASH_WRITE_FAILED);
      
      await expect(
        controller.claimDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1)
      ).rejects.toThrow(BLEError);
    });
  });
});



