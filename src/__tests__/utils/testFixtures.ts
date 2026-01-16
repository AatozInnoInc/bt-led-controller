/**
 * Test Fixtures
 * Provides sample data for testing
 */

import { LEDConfig, HSVColor } from '../../types/config';
import { CommandType, ResponseType, ParameterId } from '../../types/commands';
import { ErrorCode } from '../../types/errors';

// ========== User IDs ==========

export const MOCK_USER_IDS = {
  user1: 'test-user-001',
  user2: 'test-user-002',
  developer: 'dev-user-001',
  testUser: 'test-user-dev',
};

// ========== LED Configs ==========

export const MOCK_CONFIGS = {
  default: {
    brightness: 50,
    speed: 30,
    color: { h: 160, s: 255, v: 255 }, // iOS blue
    effectType: 0, // SOLID
    powerState: false,
  } as LEDConfig,

  highPower: {
    brightness: 255,
    speed: 30,
    color: { h: 0, s: 0, v: 255 }, // White
    effectType: 0,
    powerState: true,
  } as LEDConfig,

  safePower: {
    brightness: 128,
    speed: 30,
    color: { h: 160, s: 255, v: 255 }, // Blue
    effectType: 0,
    powerState: true,
  } as LEDConfig,

  rainbow: {
    brightness: 200,
    speed: 50,
    color: { h: 0, s: 255, v: 255 },
    effectType: 2, // RAINBOW
    powerState: true,
  } as LEDConfig,
};

// ========== Colors ==========

export const MOCK_COLORS = {
  red: { h: 0, s: 255, v: 255 } as HSVColor,
  green: { h: 85, s: 255, v: 255 } as HSVColor,
  blue: { h: 170, s: 255, v: 255 } as HSVColor,
  white: { h: 0, s: 0, v: 255 } as HSVColor,
  black: { h: 0, s: 0, v: 0 } as HSVColor,
};

// ========== BLE Commands (byte arrays) ==========

export const MOCK_COMMANDS = {
  enterConfig: new Uint8Array([CommandType.ENTER_CONFIG]),
  exitConfig: new Uint8Array([CommandType.EXIT_CONFIG]),
  commitConfig: new Uint8Array([CommandType.COMMIT_CONFIG]),
  
  updateBrightness: (value: number) =>
    new Uint8Array([CommandType.UPDATE_PARAM, ParameterId.BRIGHTNESS, value]),
  
  updateSpeed: (value: number) =>
    new Uint8Array([CommandType.UPDATE_PARAM, ParameterId.SPEED, value]),
  
  updateColor: (h: number, s: number, v: number) =>
    new Uint8Array([CommandType.UPDATE_COLOR, h, s, v]),
  
  requestAnalytics: new Uint8Array([CommandType.REQUEST_ANALYTICS]),
  
  confirmAnalytics: (batchId: number) =>
    new Uint8Array([CommandType.CONFIRM_ANALYTICS, batchId]),
  
  claimDevice: (userId: string) => {
    const userIdBytes = new TextEncoder().encode(userId);
    const command = new Uint8Array(2 + userIdBytes.length);
    command[0] = CommandType.CLAIM_DEVICE;
    command[1] = userIdBytes.length;
    command.set(userIdBytes, 2);
    return command;
  },
  
  verifyOwnership: (userId: string) => {
    const userIdBytes = new TextEncoder().encode(userId);
    const command = new Uint8Array(2 + userIdBytes.length);
    command[0] = CommandType.VERIFY_OWNERSHIP;
    command[1] = userIdBytes.length;
    command.set(userIdBytes, 2);
    return command;
  },
  
  unclaimDevice: (userId: string) => {
    const userIdBytes = new TextEncoder().encode(userId);
    const command = new Uint8Array(2 + userIdBytes.length);
    command[0] = CommandType.UNCLAIM_DEVICE;
    command[1] = userIdBytes.length;
    command.set(userIdBytes, 2);
    return command;
  },
};

// ========== BLE Responses (byte arrays) ==========

export const MOCK_RESPONSES = {
  success: new Uint8Array([ResponseType.ACK_SUCCESS]),
  
  error: (errorCode: ErrorCode) =>
    new Uint8Array([ResponseType.ACK_ERROR, errorCode]),
  
  invalidCommand: new Uint8Array([ResponseType.ACK_ERROR, ErrorCode.INVALID_COMMAND]),
  notInConfigMode: new Uint8Array([ResponseType.ACK_ERROR, ErrorCode.NOT_IN_CONFIG_MODE]),
  alreadyInConfigMode: new Uint8Array([ResponseType.ACK_ERROR, ErrorCode.ALREADY_IN_CONFIG_MODE]),
  notOwner: new Uint8Array([ResponseType.ACK_ERROR, ErrorCode.NOT_OWNER]),
  alreadyClaimed: new Uint8Array([ResponseType.ACK_ERROR, ErrorCode.ALREADY_CLAIMED]),
  validationFailed: new Uint8Array([ResponseType.ACK_ERROR, ErrorCode.VALIDATION_FAILED]),
};

// ========== Analytics Data ==========

export const MOCK_ANALYTICS = {
  emptyBatch: {
    batchId: 1,
    sessionCount: 0,
    sessions: [],
    flashReads: 10,
    flashWrites: 5,
    errorCount: 0,
    lastErrorCode: 0,
    lastErrorTimestamp: 0,
    averagePowerConsumption: 0,
    peakPowerConsumption: 0,
  },

  sampleBatch: {
    batchId: 1,
    sessionCount: 2,
    sessions: [
      {
        startTime: 1700000000,
        endTime: 1700001000,
        duration: 1000000,
        turnedOn: true,
        turnedOff: true,
      },
      {
        startTime: 1700002000,
        endTime: 1700003000,
        duration: 1000000,
        turnedOn: true,
        turnedOff: false,
      },
    ],
    flashReads: 25,
    flashWrites: 12,
    errorCount: 3,
    lastErrorCode: ErrorCode.VALIDATION_FAILED,
    lastErrorTimestamp: 1700002500,
    averagePowerConsumption: 250,
    peakPowerConsumption: 380,
  },
};

// ========== Device Information ==========

export const MOCK_DEVICES = {
  device1: {
    id: 'mock-device-001',
    name: 'LED Guitar',
    rssi: -50,
  },
  
  device2: {
    id: 'mock-device-002',
    name: 'LED Guitar 2',
    rssi: -60,
  },
};

// ========== Paired Device Data ==========

export const MOCK_PAIRED_DEVICES = [
  {
    deviceId: 'mock-device-001',
    userId: 'test-user-001',
    pairedAt: Date.now() - 86400000, // 1 day ago
    deviceName: 'LED Guitar',
  },
];



