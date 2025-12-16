/**
 * Device Pairing Utilities
 * Manages device ownership and pairing state in AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PAIRED_DEVICES_KEY = 'paired_devices';

export interface PairedDevice {
  deviceId: string;
  userId: string;
  pairedAt: number; // timestamp
  deviceName?: string;
}

/**
 * Get all paired devices
 */
export async function getPairedDevices(): Promise<PairedDevice[]> {
  try {
    const data = await AsyncStorage.getItem(PAIRED_DEVICES_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load paired devices:', error);
  }
  return [];
}

/**
 * Check if a device is paired to a specific user
 */
export async function isDevicePaired(deviceId: string, userId: string): Promise<boolean> {
  try {
    const pairedDevices = await getPairedDevices();
    return pairedDevices.some(
      (device) => device.deviceId === deviceId && device.userId === userId
    );
  } catch (error) {
    console.error('Failed to check device pairing:', error);
    return false;
  }
}

/**
 * Check if a device is paired to any user
 */
export async function isDevicePairedToAnyUser(deviceId: string): Promise<boolean> {
  try {
    const pairedDevices = await getPairedDevices();
    return pairedDevices.some((device) => device.deviceId === deviceId);
  } catch (error) {
    console.error('Failed to check device pairing:', error);
    return false;
  }
}

/**
 * Get the user ID that owns a device
 */
export async function getDeviceOwner(deviceId: string): Promise<string | null> {
  try {
    const pairedDevices = await getPairedDevices();
    const device = pairedDevices.find((d) => d.deviceId === deviceId);
    return device ? device.userId : null;
  } catch (error) {
    console.error('Failed to get device owner:', error);
    return null;
  }
}

/**
 * Pair a device to a user
 */
export async function pairDevice(
  deviceId: string,
  userId: string,
  deviceName?: string
): Promise<void> {
  try {
    // Validate inputs
    if (!deviceId || !userId) {
      throw new Error('deviceId and userId are required');
    }
    
    const pairedDevices = await getPairedDevices();
    
    // Remove existing pairing for this device (if any)
    const filtered = pairedDevices.filter((d) => d.deviceId !== deviceId);
    
    // Add new pairing
    const newPairing: PairedDevice = {
      deviceId,
      userId,
      pairedAt: Date.now(),
      deviceName,
    };
    
    filtered.push(newPairing);
    await AsyncStorage.setItem(PAIRED_DEVICES_KEY, JSON.stringify(filtered));
    console.log(`Paired device ${deviceId} to user ${userId}`);
  } catch (error) {
    console.error('Failed to pair device:', error);
    throw error;
  }
}

/**
 * Unpair a device
 */
export async function unpairDevice(deviceId: string): Promise<void> {
  try {
    const pairedDevices = await getPairedDevices();
    const filtered = pairedDevices.filter((d) => d.deviceId !== deviceId);
    await AsyncStorage.setItem(PAIRED_DEVICES_KEY, JSON.stringify(filtered));
    console.log(`Unpaired device ${deviceId}`);
  } catch (error) {
    console.error('Failed to unpair device:', error);
    throw error;
  }
}

/**
 * Get all devices paired to a specific user
 */
export async function getUserPairedDevices(userId: string): Promise<PairedDevice[]> {
  try {
    const pairedDevices = await getPairedDevices();
    return pairedDevices.filter((device) => device.userId === userId);
  } catch (error) {
    console.error('Failed to get user paired devices:', error);
    return [];
  }
}

