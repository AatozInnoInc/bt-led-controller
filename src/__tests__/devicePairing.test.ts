/**
 * Device Pairing Tests
 * Tests device pairing utilities and AsyncStorage operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPairedDevices,
  isDevicePaired,
  isDevicePairedToAnyUser,
  getDeviceOwner,
  pairDevice,
  unpairDevice,
  getUserPairedDevices,
} from '../utils/devicePairing';
import { MOCK_USER_IDS, MOCK_DEVICES } from './utils/testFixtures';
import { clearAsyncStorage } from './utils/testHelpers';

describe('Device Pairing', () => {
  beforeEach(async () => {
    await clearAsyncStorage();
  });

  describe('getPairedDevices', () => {
    it('should return empty array when no devices are paired', async () => {
      const devices = await getPairedDevices();
      expect(devices).toEqual([]);
    });

    it('should return paired devices from storage', async () => {
      const mockPairing = {
        deviceId: MOCK_DEVICES.device1.id,
        userId: MOCK_USER_IDS.user1,
        pairedAt: Date.now(),
        deviceName: MOCK_DEVICES.device1.name,
      };
      
      await AsyncStorage.setItem('paired_devices', JSON.stringify([mockPairing]));
      
      const devices = await getPairedDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe(MOCK_DEVICES.device1.id);
      expect(devices[0].userId).toBe(MOCK_USER_IDS.user1);
    });

    it('should handle corrupted storage data gracefully', async () => {
      await AsyncStorage.setItem('paired_devices', 'invalid json');
      
      const devices = await getPairedDevices();
      expect(devices).toEqual([]);
    });
  });

  describe('isDevicePaired', () => {
    it('should return false when device is not paired', async () => {
      const isPaired = await isDevicePaired(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      expect(isPaired).toBe(false);
    });

    it('should return true when device is paired to user', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      const isPaired = await isDevicePaired(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      expect(isPaired).toBe(true);
    });

    it('should return false when device is paired to different user', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      const isPaired = await isDevicePaired(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user2);
      expect(isPaired).toBe(false);
    });
  });

  describe('isDevicePairedToAnyUser', () => {
    it('should return false when device is not paired', async () => {
      const isPaired = await isDevicePairedToAnyUser(MOCK_DEVICES.device1.id);
      expect(isPaired).toBe(false);
    });

    it('should return true when device is paired to any user', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      const isPaired = await isDevicePairedToAnyUser(MOCK_DEVICES.device1.id);
      expect(isPaired).toBe(true);
    });

    it('should return true for device paired to different user', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user2);
      
      const isPaired = await isDevicePairedToAnyUser(MOCK_DEVICES.device1.id);
      expect(isPaired).toBe(true);
    });
  });

  describe('getDeviceOwner', () => {
    it('should return null when device is not paired', async () => {
      const owner = await getDeviceOwner(MOCK_DEVICES.device1.id);
      expect(owner).toBeNull();
    });

    it('should return owner user ID when device is paired', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      const owner = await getDeviceOwner(MOCK_DEVICES.device1.id);
      expect(owner).toBe(MOCK_USER_IDS.user1);
    });

    it('should return correct owner after re-pairing', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user2); // Re-pair
      
      const owner = await getDeviceOwner(MOCK_DEVICES.device1.id);
      expect(owner).toBe(MOCK_USER_IDS.user2);
    });
  });

  describe('pairDevice', () => {
    it('should pair device to user', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1, MOCK_DEVICES.device1.name);
      
      const devices = await getPairedDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe(MOCK_DEVICES.device1.id);
      expect(devices[0].userId).toBe(MOCK_USER_IDS.user1);
      expect(devices[0].deviceName).toBe(MOCK_DEVICES.device1.name);
      expect(devices[0].pairedAt).toBeDefined();
    });

    it('should update pairing if device already paired', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user2); // Re-pair
      
      const devices = await getPairedDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].userId).toBe(MOCK_USER_IDS.user2);
    });

    it('should allow pairing multiple devices', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      await pairDevice(MOCK_DEVICES.device2.id, MOCK_USER_IDS.user1);
      
      const devices = await getPairedDevices();
      expect(devices).toHaveLength(2);
    });

    it('should throw error for missing deviceId', async () => {
      await expect(pairDevice('', MOCK_USER_IDS.user1)).rejects.toThrow('required');
    });

    it('should throw error for missing userId', async () => {
      await expect(pairDevice(MOCK_DEVICES.device1.id, '')).rejects.toThrow('required');
    });

    it('should persist pairing to AsyncStorage', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      
      const stored = await AsyncStorage.getItem('paired_devices');
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].deviceId).toBe(MOCK_DEVICES.device1.id);
    });
  });

  describe('unpairDevice', () => {
    it('should remove device pairing', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      await unpairDevice(MOCK_DEVICES.device1.id);
      
      const devices = await getPairedDevices();
      expect(devices).toHaveLength(0);
    });

    it('should not affect other pairings', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      await pairDevice(MOCK_DEVICES.device2.id, MOCK_USER_IDS.user1);
      await unpairDevice(MOCK_DEVICES.device1.id);
      
      const devices = await getPairedDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe(MOCK_DEVICES.device2.id);
    });

    it('should not throw when unpairing non-existent device', async () => {
      await expect(unpairDevice('non-existent-device')).resolves.not.toThrow();
    });

    it('should persist changes to AsyncStorage', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      await unpairDevice(MOCK_DEVICES.device1.id);
      
      const stored = await AsyncStorage.getItem('paired_devices');
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(0);
    });
  });

  describe('getUserPairedDevices', () => {
    it('should return empty array when user has no paired devices', async () => {
      const devices = await getUserPairedDevices(MOCK_USER_IDS.user1);
      expect(devices).toEqual([]);
    });

    it('should return devices paired to specific user', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      await pairDevice(MOCK_DEVICES.device2.id, MOCK_USER_IDS.user2);
      
      const user1Devices = await getUserPairedDevices(MOCK_USER_IDS.user1);
      expect(user1Devices).toHaveLength(1);
      expect(user1Devices[0].deviceId).toBe(MOCK_DEVICES.device1.id);
    });

    it('should return multiple devices for same user', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      await pairDevice(MOCK_DEVICES.device2.id, MOCK_USER_IDS.user1);
      
      const devices = await getUserPairedDevices(MOCK_USER_IDS.user1);
      expect(devices).toHaveLength(2);
    });

    it('should not return devices paired to other users', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      await pairDevice(MOCK_DEVICES.device2.id, MOCK_USER_IDS.user2);
      
      const user2Devices = await getUserPairedDevices(MOCK_USER_IDS.user2);
      expect(user2Devices).toHaveLength(1);
      expect(user2Devices[0].deviceId).toBe(MOCK_DEVICES.device2.id);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete pairing workflow', async () => {
      // Initially no devices
      expect(await getPairedDevices()).toHaveLength(0);
      
      // Pair device
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      expect(await isDevicePaired(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1)).toBe(true);
      
      // Check owner
      expect(await getDeviceOwner(MOCK_DEVICES.device1.id)).toBe(MOCK_USER_IDS.user1);
      
      // Unpair device
      await unpairDevice(MOCK_DEVICES.device1.id);
      expect(await isDevicePaired(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1)).toBe(false);
    });

    it('should handle device transfer between users', async () => {
      // Pair to user1
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      expect(await getDeviceOwner(MOCK_DEVICES.device1.id)).toBe(MOCK_USER_IDS.user1);
      
      // Transfer to user2
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user2);
      expect(await getDeviceOwner(MOCK_DEVICES.device1.id)).toBe(MOCK_USER_IDS.user2);
      
      // user1 should no longer have access
      expect(await isDevicePaired(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1)).toBe(false);
    });

    it('should handle multiple users with multiple devices', async () => {
      await pairDevice(MOCK_DEVICES.device1.id, MOCK_USER_IDS.user1);
      await pairDevice(MOCK_DEVICES.device2.id, MOCK_USER_IDS.user2);
      
      const user1Devices = await getUserPairedDevices(MOCK_USER_IDS.user1);
      const user2Devices = await getUserPairedDevices(MOCK_USER_IDS.user2);
      
      expect(user1Devices).toHaveLength(1);
      expect(user2Devices).toHaveLength(1);
      expect(user1Devices[0].deviceId).not.toBe(user2Devices[0].deviceId);
    });
  });
});



