/**
 * Test Helpers
 * Utility functions for common test operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockMicrocontroller } from '../mocks/MockMicrocontroller';
import { MockBluetoothService } from '../mocks/MockBluetoothService';
import { MOCK_USER_IDS } from './testFixtures';

/**
 * Wait for a specified number of milliseconds
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Clear AsyncStorage before tests
 */
export const clearAsyncStorage = async (): Promise<void> => {
  await AsyncStorage.clear();
};

/**
 * Create a mock microcontroller with test config
 */
export const createMockMicrocontroller = (options?: {
  simulateDelays?: boolean;
  withOwner?: boolean;
  ownerId?: string;
  withAnalytics?: boolean;
}): MockMicrocontroller => {
  const mock = new MockMicrocontroller({
    simulateDelays: options?.simulateDelays ?? false,
    developerUserIds: [MOCK_USER_IDS.developer],
    testUserIds: [MOCK_USER_IDS.testUser],
  });

  if (options?.withOwner) {
    mock.setState({
      ownerUserId: options.ownerId || MOCK_USER_IDS.user1,
      hasOwner: true,
    });
  }

  if (options?.withAnalytics) {
    mock.setState({
      analytics: {
        sessionCount: 1,
        sessions: [{
          startTime: 1700000000,
          endTime: 1700001000,
          duration: 1000000,
          turnedOn: true,
          turnedOff: true,
        }],
        flashReads: 10,
        flashWrites: 5,
        errorCount: 0,
        lastErrorCode: 0,
        lastErrorTimestamp: 0,
        averagePowerConsumption: 200,
        peakPowerConsumption: 350,
        batchId: 1,
        hasData: true,
      },
    });
  }

  return mock;
};

/**
 * Create a mock Bluetooth service with connected device
 */
export const createConnectedMockService = async (
  microcontroller?: MockMicrocontroller
): Promise<MockBluetoothService> => {
  const mock = new MockBluetoothService(microcontroller);
  await mock.initialize();
  await mock.connectToDevice('mock-device-001');
  return mock;
};

/**
 * Assert that two Uint8Arrays are equal
 */
export const assertUint8ArrayEqual = (actual: Uint8Array, expected: Uint8Array): void => {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i++) {
    expect(actual[i]).toBe(expected[i]);
  }
};

/**
 * Convert Uint8Array to hex string for debugging
 */
export const uint8ArrayToHex = (arr: Uint8Array): string => {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
};

/**
 * Setup paired device in AsyncStorage
 */
export const setupPairedDevice = async (deviceId: string, userId: string, deviceName?: string): Promise<void> => {
  const pairedDevices = [
    {
      deviceId,
      userId,
      pairedAt: Date.now(),
      deviceName,
    },
  ];
  await AsyncStorage.setItem('paired_devices', JSON.stringify(pairedDevices));
};

/**
 * Get paired devices from AsyncStorage
 */
export const getPairedDevicesFromStorage = async (): Promise<any[]> => {
  const data = await AsyncStorage.getItem('paired_devices');
  return data ? JSON.parse(data) : [];
};

/**
 * Mock console methods for cleaner test output
 */
export const mockConsole = (): { restore: () => void } => {
  const originalConsole = { ...console };
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();

  return {
    restore: () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    },
  };
};

/**
 * Wait for async state updates (for React components)
 */
export const waitForAsync = async (): Promise<void> => {
  await wait(0);
};



