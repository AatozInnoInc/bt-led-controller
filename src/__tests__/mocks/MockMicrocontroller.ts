/**
 * Mock Microcontroller
 * Simulates nRF52 firmware behavior for testing without physical hardware
 */

import { CommandType, ResponseType, ParameterId } from '../../types/commands';
import { ErrorCode } from '../../types/errors';
import { HSVColor } from '../../types/config';

export interface MockMicrocontrollerConfig {
  simulateDelays?: boolean;
  delayMs?: number;
  developerUserIds?: string[];
  testUserIds?: string[];
}

interface Config {
  brightness: number;
  speed: number;
  color: HSVColor;
  effectType: number;
  powerState: boolean;
}

interface AnalyticsSession {
  startTime: number;
  endTime: number;
  duration: number;
  turnedOn: boolean;
  turnedOff: boolean;
}

interface AnalyticsData {
  sessionCount: number;
  sessions: AnalyticsSession[];
  flashReads: number;
  flashWrites: number;
  errorCount: number;
  lastErrorCode: number;
  lastErrorTimestamp: number;
  averagePowerConsumption: number;
  peakPowerConsumption: number;
  batchId: number;
  hasData: boolean;
}

export interface MockMicrocontrollerState {
  currentConfig: Config;
  pendingConfig: Config;
  inConfigMode: boolean;
  ownerUserId: string;
  hasOwner: boolean;
  sessionOwnershipVerified: boolean;
  analytics: AnalyticsData;
}

const DEFAULT_CONFIG: Config = {
  brightness: 50,
  speed: 30,
  color: { h: 160, s: 255, v: 255 }, // iOS blue
  effectType: 0, // SOLID
  powerState: false,
};

const DEFAULT_ANALYTICS: AnalyticsData = {
  sessionCount: 0,
  sessions: [],
  flashReads: 0,
  flashWrites: 0,
  errorCount: 0,
  lastErrorCode: 0,
  lastErrorTimestamp: 0,
  averagePowerConsumption: 0,
  peakPowerConsumption: 0,
  batchId: 1,
  hasData: false,
};

const MAX_USER_ID_LENGTH = 64;
const SAFE_CURRENT_MA = 400;
const LED_COUNT = 14;

export class MockMicrocontroller {
  private state: MockMicrocontrollerState;
  private config: MockMicrocontrollerConfig;
  private errorToInject: ErrorCode | null = null;

  constructor(config: MockMicrocontrollerConfig = {}) {
    this.config = {
      simulateDelays: config.simulateDelays ?? false,
      delayMs: config.delayMs ?? 50,
      developerUserIds: config.developerUserIds ?? [],
      testUserIds: config.testUserIds ?? [],
    };

    this.state = {
      currentConfig: { ...DEFAULT_CONFIG },
      pendingConfig: { ...DEFAULT_CONFIG },
      inConfigMode: false,
      ownerUserId: '',
      hasOwner: false,
      sessionOwnershipVerified: false,
      analytics: { ...DEFAULT_ANALYTICS },
    };
  }

  /**
   * Process a BLE command and return the response
   */
  async processCommand(command: Uint8Array): Promise<Uint8Array> {
    if (this.config.simulateDelays) {
      await this.delay(this.config.delayMs!);
    }

    // Check for injected error
    if (this.errorToInject !== null) {
      const error = this.errorToInject;
      this.errorToInject = null;
      return this.createErrorResponse(error);
    }

    if (command.length === 0) {
      return this.createErrorResponse(ErrorCode.INVALID_COMMAND);
    }

    const commandType = command[0];

    switch (commandType) {
      case CommandType.ENTER_CONFIG:
        return this.handleEnterConfig();
      case CommandType.EXIT_CONFIG:
        return this.handleExitConfig();
      case CommandType.COMMIT_CONFIG:
        return this.handleCommitConfig();
      case CommandType.UPDATE_PARAM:
        return this.handleUpdateParameter(command);
      case CommandType.UPDATE_COLOR:
        return this.handleUpdateColor(command);
      case CommandType.REQUEST_ANALYTICS:
        return this.handleRequestAnalytics();
      case CommandType.CONFIRM_ANALYTICS:
        return this.handleConfirmAnalytics(command);
      case CommandType.CLAIM_DEVICE:
        return this.handleClaimDevice(command);
      case CommandType.VERIFY_OWNERSHIP:
        return this.handleVerifyOwnership(command);
      case CommandType.UNCLAIM_DEVICE:
        return this.handleUnclaimDevice(command);
      default:
        return this.createErrorResponse(ErrorCode.INVALID_COMMAND);
    }
  }

  /**
   * Get current state (for test assertions)
   */
  getState(): MockMicrocontrollerState {
    return { ...this.state };
  }

  /**
   * Set state (for test setup)
   */
  setState(state: Partial<MockMicrocontrollerState>): void {
    this.state = { ...this.state, ...state };
  }

  /**
   * Inject an error for the next command
   */
  simulateError(errorCode: ErrorCode): void {
    this.errorToInject = errorCode;
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.state = {
      currentConfig: { ...DEFAULT_CONFIG },
      pendingConfig: { ...DEFAULT_CONFIG },
      inConfigMode: false,
      ownerUserId: '',
      hasOwner: false,
      sessionOwnershipVerified: false,
      analytics: { ...DEFAULT_ANALYTICS },
    };
    this.errorToInject = null;
  }

  /**
   * Clear session ownership (simulates disconnect/reconnect)
   */
  clearSessionOwnership(): void {
    this.state.sessionOwnershipVerified = false;
  }

  // ========== Command Handlers ==========

  private handleEnterConfig(): Uint8Array {
    // Check ownership
    if (this.state.hasOwner && !this.state.sessionOwnershipVerified) {
      return this.createErrorResponse(ErrorCode.NOT_OWNER);
    }

    if (this.state.inConfigMode) {
      return this.createErrorResponse(ErrorCode.ALREADY_IN_CONFIG_MODE);
    }

    this.state.inConfigMode = true;
    this.state.pendingConfig = { ...this.state.currentConfig };
    return this.createSuccessResponse();
  }

  private handleExitConfig(): Uint8Array {
    // Check ownership
    if (this.state.hasOwner && !this.state.sessionOwnershipVerified) {
      return this.createErrorResponse(ErrorCode.NOT_OWNER);
    }

    if (!this.state.inConfigMode) {
      return this.createErrorResponse(ErrorCode.NOT_IN_CONFIG_MODE);
    }

    this.state.inConfigMode = false;
    this.state.pendingConfig = { ...this.state.currentConfig };
    return this.createSuccessResponse();
  }

  private handleCommitConfig(): Uint8Array {
    // Check ownership
    if (this.state.hasOwner && !this.state.sessionOwnershipVerified) {
      return this.createErrorResponse(ErrorCode.NOT_OWNER);
    }

    if (!this.state.inConfigMode) {
      return this.createErrorResponse(ErrorCode.NOT_IN_CONFIG_MODE);
    }

    // Validate config
    const validationError = this.validateConfig(this.state.pendingConfig);
    if (validationError !== null) {
      return this.createErrorResponse(validationError);
    }

    // Commit
    this.state.currentConfig = { ...this.state.pendingConfig };
    this.state.inConfigMode = false;
    this.state.analytics.flashWrites++;
    return this.createSuccessResponse();
  }

  private handleUpdateParameter(command: Uint8Array): Uint8Array {
    // Check ownership
    if (this.state.hasOwner && !this.state.sessionOwnershipVerified) {
      return this.createErrorResponse(ErrorCode.NOT_OWNER);
    }

    if (!this.state.inConfigMode) {
      return this.createErrorResponse(ErrorCode.NOT_IN_CONFIG_MODE);
    }

    if (command.length < 3) {
      return this.createErrorResponse(ErrorCode.INVALID_PARAMETER);
    }

    const parameterId = command[1];
    const value = command[2];

    switch (parameterId) {
      case ParameterId.BRIGHTNESS:
        this.state.pendingConfig.brightness = value;
        break;
      case ParameterId.SPEED:
        this.state.pendingConfig.speed = value;
        break;
      case ParameterId.COLOR_HUE:
        this.state.pendingConfig.color.h = value;
        break;
      case ParameterId.COLOR_SATURATION:
        this.state.pendingConfig.color.s = value;
        break;
      case ParameterId.COLOR_VALUE:
        this.state.pendingConfig.color.v = value;
        break;
      case ParameterId.EFFECT_TYPE:
        this.state.pendingConfig.effectType = value;
        break;
      case ParameterId.POWER_STATE:
        this.state.pendingConfig.powerState = value > 0;
        break;
      default:
        return this.createErrorResponse(ErrorCode.INVALID_PARAMETER);
    }

    return this.createSuccessResponse();
  }

  private handleUpdateColor(command: Uint8Array): Uint8Array {
    // Check ownership
    if (this.state.hasOwner && !this.state.sessionOwnershipVerified) {
      return this.createErrorResponse(ErrorCode.NOT_OWNER);
    }

    if (!this.state.inConfigMode) {
      return this.createErrorResponse(ErrorCode.NOT_IN_CONFIG_MODE);
    }

    if (command.length < 4) {
      return this.createErrorResponse(ErrorCode.INVALID_PARAMETER);
    }

    this.state.pendingConfig.color = {
      h: command[1],
      s: command[2],
      v: command[3],
    };

    return this.createSuccessResponse();
  }

  private handleRequestAnalytics(): Uint8Array {
    // Check ownership
    if (this.state.hasOwner && !this.state.sessionOwnershipVerified) {
      return this.createErrorResponse(ErrorCode.NOT_OWNER);
    }

    if (!this.state.analytics.hasData) {
      // No analytics data to send
      return this.createSuccessResponse();
    }

    // Create analytics batch response
    const batch = new Uint8Array(100); // Simplified for mock
    let offset = 0;

    batch[offset++] = ResponseType.ANALYTICS_BATCH;
    batch[offset++] = this.state.analytics.batchId;
    batch[offset++] = this.state.analytics.sessionCount;

    // Add session data (simplified)
    for (let i = 0; i < this.state.analytics.sessionCount && i < 10; i++) {
      const session = this.state.analytics.sessions[i];
      // startTime (4 bytes)
      batch[offset++] = (session.startTime >> 24) & 0xff;
      batch[offset++] = (session.startTime >> 16) & 0xff;
      batch[offset++] = (session.startTime >> 8) & 0xff;
      batch[offset++] = session.startTime & 0xff;
      // endTime (4 bytes)
      batch[offset++] = (session.endTime >> 24) & 0xff;
      batch[offset++] = (session.endTime >> 16) & 0xff;
      batch[offset++] = (session.endTime >> 8) & 0xff;
      batch[offset++] = session.endTime & 0xff;
      // duration (4 bytes)
      batch[offset++] = (session.duration >> 24) & 0xff;
      batch[offset++] = (session.duration >> 16) & 0xff;
      batch[offset++] = (session.duration >> 8) & 0xff;
      batch[offset++] = session.duration & 0xff;
      // flags
      batch[offset++] = (session.turnedOn ? 1 : 0) | (session.turnedOff ? 2 : 0);
    }

    // Add analytics metadata
    batch[offset++] = (this.state.analytics.flashReads >> 8) & 0xff;
    batch[offset++] = this.state.analytics.flashReads & 0xff;
    batch[offset++] = (this.state.analytics.flashWrites >> 8) & 0xff;
    batch[offset++] = this.state.analytics.flashWrites & 0xff;
    batch[offset++] = (this.state.analytics.errorCount >> 8) & 0xff;
    batch[offset++] = this.state.analytics.errorCount & 0xff;
    batch[offset++] = this.state.analytics.lastErrorCode;

    this.state.analytics.flashReads++;
    return batch.slice(0, offset);
  }

  private handleConfirmAnalytics(command: Uint8Array): Uint8Array {
    // Check ownership
    if (this.state.hasOwner && !this.state.sessionOwnershipVerified) {
      return this.createErrorResponse(ErrorCode.NOT_OWNER);
    }

    if (command.length < 2) {
      return this.createErrorResponse(ErrorCode.INVALID_PARAMETER);
    }

    const batchId = command[1];
    if (batchId !== this.state.analytics.batchId) {
      return this.createErrorResponse(ErrorCode.INVALID_PARAMETER);
    }

    // Clear analytics data
    this.state.analytics = { ...DEFAULT_ANALYTICS, batchId: batchId + 1 };
    this.state.analytics.flashWrites++;
    return this.createSuccessResponse();
  }

  private handleClaimDevice(command: Uint8Array): Uint8Array {
    if (command.length < 2) {
      return this.createErrorResponse(ErrorCode.INVALID_PARAMETER);
    }

    const userIdLength = command[1];
    if (userIdLength > MAX_USER_ID_LENGTH || command.length < 2 + userIdLength) {
      return this.createErrorResponse(ErrorCode.INVALID_PARAMETER);
    }

    const userId = new TextDecoder().decode(command.slice(2, 2 + userIdLength));

    // Check if already claimed
    if (this.state.hasOwner) {
      // Allow developer/test users to reclaim
      if (this.isDeveloperOrTestUser(userId) || userId === this.state.ownerUserId) {
        this.state.ownerUserId = userId;
        this.state.analytics.flashWrites++;
        return this.createSuccessResponse();
      } else {
        return this.createErrorResponse(ErrorCode.ALREADY_CLAIMED);
      }
    }

    // Claim device
    this.state.ownerUserId = userId;
    this.state.hasOwner = true;
    this.state.analytics.flashWrites++;
    return this.createSuccessResponse();
  }

  private handleVerifyOwnership(command: Uint8Array): Uint8Array {
    if (command.length < 2) {
      return this.createErrorResponse(ErrorCode.INVALID_PARAMETER);
    }

    const userIdLength = command[1];
    if (userIdLength > MAX_USER_ID_LENGTH || command.length < 2 + userIdLength) {
      return this.createErrorResponse(ErrorCode.INVALID_PARAMETER);
    }

    const userId = new TextDecoder().decode(command.slice(2, 2 + userIdLength));

    // If no owner, allow anyone
    if (!this.state.hasOwner) {
      this.state.sessionOwnershipVerified = true;
      return this.createSuccessResponse();
    }

    // Check if user is owner or developer/test user
    if (userId === this.state.ownerUserId || this.isDeveloperOrTestUser(userId)) {
      this.state.sessionOwnershipVerified = true;
      return this.createSuccessResponse();
    }

    return this.createErrorResponse(ErrorCode.NOT_OWNER);
  }

  private handleUnclaimDevice(command: Uint8Array): Uint8Array {
    if (command.length < 2) {
      return this.createErrorResponse(ErrorCode.INVALID_PARAMETER);
    }

    const userIdLength = command[1];
    if (userIdLength > MAX_USER_ID_LENGTH || command.length < 2 + userIdLength) {
      return this.createErrorResponse(ErrorCode.INVALID_PARAMETER);
    }

    const userId = new TextDecoder().decode(command.slice(2, 2 + userIdLength));

    // Only owner or developer/test users can unclaim
    if (!this.state.hasOwner) {
      return this.createErrorResponse(ErrorCode.NOT_OWNER);
    }

    if (userId !== this.state.ownerUserId && !this.isDeveloperOrTestUser(userId)) {
      return this.createErrorResponse(ErrorCode.NOT_OWNER);
    }

    // Unclaim
    this.state.ownerUserId = '';
    this.state.hasOwner = false;
    this.state.sessionOwnershipVerified = false;
    this.state.analytics.flashWrites++;
    return this.createSuccessResponse();
  }

  // ========== Helper Methods ==========

  private validateConfig(config: Config): ErrorCode | null {
    // Validate power consumption
    const currentDraw = this.estimateCurrentDraw(config);
    if (currentDraw > SAFE_CURRENT_MA) {
      return ErrorCode.VALIDATION_FAILED;
    }
    return null;
  }

  private estimateCurrentDraw(config: Config): number {
    if (!config.powerState) {
      return 0;
    }

    // Convert HSV to RGB for power estimation
    const rgb = this.hsvToRgb(config.color);
    const maxComponent = Math.max(rgb.r, rgb.g, rgb.b);
    const brightness = config.brightness / 255;
    const perLedCurrent = (maxComponent / 255) * brightness * 60; // 60mA max per LED
    return perLedCurrent * LED_COUNT;
  }

  private hsvToRgb(hsv: HSVColor): { r: number; g: number; b: number } {
    const h = hsv.h / 255;
    const s = hsv.s / 255;
    const v = hsv.v / 255;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
      default: r = 0; g = 0; b = 0;
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  private isDeveloperOrTestUser(userId: string): boolean {
    return (
      this.config.developerUserIds?.includes(userId) ||
      this.config.testUserIds?.includes(userId)
    );
  }

  private createSuccessResponse(): Uint8Array {
    return new Uint8Array([ResponseType.ACK_SUCCESS]);
  }

  private createErrorResponse(errorCode: ErrorCode): Uint8Array {
    this.state.analytics.errorCount++;
    this.state.analytics.lastErrorCode = errorCode;
    this.state.analytics.lastErrorTimestamp = Math.floor(Date.now() / 1000);
    return new Uint8Array([ResponseType.ACK_ERROR, errorCode]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}



