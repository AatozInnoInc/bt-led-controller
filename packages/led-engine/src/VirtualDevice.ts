import {
  CMD_CLAIM_DEVICE,
  CMD_COMMIT_CONFIG,
  CMD_CONFIG_UPDATE,
  CMD_ENTER_CONFIG,
  CMD_EXIT_CONFIG,
  CMD_STATUS,
  CMD_UNCLAIM_DEVICE,
  CMD_VERIFY_OWNERSHIP,
  DEFAULT_BRIGHTNESS,
  ERROR_ALREADY_CLAIMED,
  ERROR_INVALID_COMMAND,
  ERROR_INVALID_PARAMETER,
  ERROR_NOT_IN_CONFIG_MODE,
  ERROR_NOT_OWNER,
  MAX_EFFECTS,
  PARAM_BRIGHTNESS,
  PARAM_COLOR_RGB,
  PARAM_PATTERN,
  PARAM_POWER_MODE,
  PARAM_SPEED,
  RESPONSE_ACK_COMMIT,
  RESPONSE_ACK_CONFIG_MODE,
  RESPONSE_ACK_SUCCESS,
} from '@bt-led/ble-protocol';
import type { PatternFn, PatternId, RGB } from '@bt-led/led-types';
import { PATTERN_FROM_INT } from '@bt-led/led-types';
import { buildPatternRegistry } from './patterns';

interface Settings {
  brightness: number;
  currentPattern: number;
  powerMode: number;
  autoOff: number;
  color: [number, number, number];
  speed: number;
  ownerUserId: string;
  hasOwner: boolean;
}

const defaultSettings = (): Settings => ({
  brightness: DEFAULT_BRIGHTNESS,
  currentPattern: 0,
  powerMode: 0,
  autoOff: 0,
  color: [255, 255, 255],
  speed: 50,
  ownerUserId: '',
  hasOwner: false,
});

const cloneSettings = (s: Settings): Settings => ({ ...s, color: [...s.color] as [number, number, number] });

// Error envelope: [0x90, errorCode] — matches sendErrorResponse() in the .ino.
const errorEnvelope = (code: number): Uint8Array => Uint8Array.from([RESPONSE_ACK_CONFIG_MODE, code]);
const ack = (byte: number): Uint8Array => Uint8Array.from([byte]);

const readUserId = (data: Uint8Array, offset: number): string => {
  if (data.length <= offset) return '';
  const len = data[offset];
  if (len === 0 || data.length < offset + 1 + len) return '';
  return new TextDecoder().decode(data.subarray(offset + 1, offset + 1 + len));
};

export interface VirtualDeviceOptions {
  ledCount?: number;
  initialSettings?: Partial<Settings>;
}

export class VirtualDevice {
  readonly ledCount: number;
  private currentSettings: Settings;
  private ramBuffer: Settings;
  private configModeActive = false;
  private configDirty = false;
  private verifiedUserId = '';
  private ledBuf: RGB[];
  private patterns: Record<PatternId, PatternFn>;

  constructor(options: VirtualDeviceOptions = {}) {
    this.ledCount = options.ledCount ?? 16;
    this.currentSettings = { ...defaultSettings(), ...options.initialSettings };
    this.ramBuffer = cloneSettings(this.currentSettings);
    this.ledBuf = Array.from({ length: this.ledCount }, () => ({ r: 0, g: 0, b: 0 }));
    this.patterns = buildPatternRegistry(this.ledCount);
  }

  // Mirrors loop() command dispatch in bt-led-controller.ino.
  processCommand(data: Uint8Array): Uint8Array {
    if (data.length === 0) return errorEnvelope(ERROR_INVALID_COMMAND);
    const cmd = data[0];

    if (cmd === CMD_STATUS) return ack(RESPONSE_ACK_SUCCESS);

    if (cmd === CMD_VERIFY_OWNERSHIP) return this.handleVerifyOwnership(data);
    if (cmd === CMD_CLAIM_DEVICE) return this.handleClaimDevice(data);
    if (cmd === CMD_UNCLAIM_DEVICE) return this.handleUnclaimDevice(data);

    if (!this.checkOwnership()) return errorEnvelope(ERROR_NOT_OWNER);

    if (cmd === CMD_ENTER_CONFIG) return this.handleEnterConfig();
    if (cmd === CMD_EXIT_CONFIG) return this.handleExitConfig();
    if (cmd === CMD_COMMIT_CONFIG) return this.handleCommitConfig();
    if (cmd === CMD_CONFIG_UPDATE) return this.handleConfigUpdate(data);

    return errorEnvelope(ERROR_INVALID_COMMAND);
  }

  // Mirrors updatePattern() — runs one pattern frame, returns the current pixel array.
  tick(now: number): ReadonlyArray<RGB> {
    const id = PATTERN_FROM_INT[this.currentSettings.currentPattern] ?? 'off';
    const fn = this.patterns[id] ?? this.patterns.off;
    fn(this.ledBuf, this.toLedConfig(), now);
    return this.ledBuf.map((p) => ({ ...p }));
  }

  // Test/debug accessor. Not part of the BLE surface.
  snapshot() {
    return {
      currentSettings: cloneSettings(this.currentSettings),
      ramBuffer: cloneSettings(this.ramBuffer),
      configModeActive: this.configModeActive,
      configDirty: this.configDirty,
      verifiedUserId: this.verifiedUserId,
    };
  }

  private toLedConfig() {
    const [r, g, b] = this.currentSettings.color;
    return {
      pattern: (PATTERN_FROM_INT[this.currentSettings.currentPattern] ?? 'off') as PatternId,
      color: { r, g, b },
      speed: this.currentSettings.speed,
      brightness: this.currentSettings.brightness,
      powerMode: this.currentSettings.powerMode,
    };
  }

  private checkOwnership(): boolean {
    return !this.currentSettings.hasOwner || this.verifiedUserId !== '';
  }

  private handleVerifyOwnership(data: Uint8Array): Uint8Array {
    const userId = readUserId(data, 1);
    if (!userId) return errorEnvelope(ERROR_INVALID_PARAMETER);
    const allowed =
      !this.currentSettings.hasOwner || userId === this.currentSettings.ownerUserId;
    if (!allowed) return errorEnvelope(ERROR_NOT_OWNER);
    this.verifiedUserId = userId;
    return ack(RESPONSE_ACK_SUCCESS);
  }

  private handleClaimDevice(data: Uint8Array): Uint8Array {
    const userId = readUserId(data, 1);
    if (!userId) return errorEnvelope(ERROR_INVALID_PARAMETER);
    if (this.currentSettings.hasOwner && this.currentSettings.ownerUserId !== userId) {
      return errorEnvelope(ERROR_ALREADY_CLAIMED);
    }
    this.currentSettings.ownerUserId = userId;
    this.currentSettings.hasOwner = true;
    return ack(RESPONSE_ACK_SUCCESS);
  }

  private handleUnclaimDevice(data: Uint8Array): Uint8Array {
    const userId = readUserId(data, 1);
    if (!userId) return errorEnvelope(ERROR_INVALID_PARAMETER);
    if (!this.currentSettings.hasOwner) return ack(RESPONSE_ACK_SUCCESS);
    if (this.currentSettings.ownerUserId !== userId) return errorEnvelope(ERROR_NOT_OWNER);
    this.currentSettings.ownerUserId = '';
    this.currentSettings.hasOwner = false;
    return ack(RESPONSE_ACK_SUCCESS);
  }

  private handleEnterConfig(): Uint8Array {
    this.configModeActive = true;
    this.configDirty = false;
    this.ramBuffer = cloneSettings(this.currentSettings);
    const s = this.currentSettings;
    return Uint8Array.from([
      RESPONSE_ACK_CONFIG_MODE,
      s.brightness,
      s.speed,
      s.color[0],
      s.color[1],
      s.color[2],
      s.currentPattern,
      s.powerMode > 0 ? 1 : 0,
    ]);
  }

  private handleExitConfig(): Uint8Array {
    this.configModeActive = false;
    this.configDirty = false;
    return ack(RESPONSE_ACK_SUCCESS);
  }

  private handleCommitConfig(): Uint8Array {
    if (!this.configModeActive) return errorEnvelope(ERROR_NOT_IN_CONFIG_MODE);
    if (this.configDirty) {
      this.currentSettings = cloneSettings(this.ramBuffer);
      this.configDirty = false;
    }
    return ack(RESPONSE_ACK_COMMIT);
  }

  // Live-preview semantics from the .ino: each param update writes to BOTH ramBuffer
  // and currentSettings so the pattern reflects the change before commit.
  private handleConfigUpdate(data: Uint8Array): Uint8Array {
    if (!this.configModeActive) return errorEnvelope(ERROR_NOT_IN_CONFIG_MODE);
    if (data.length < 2) return errorEnvelope(ERROR_INVALID_PARAMETER);

    const param = data[1];

    switch (param) {
      case PARAM_BRIGHTNESS: {
        if (data.length < 3) return errorEnvelope(ERROR_INVALID_PARAMETER);
        const v = data[2];
        if (v > 255) return errorEnvelope(ERROR_INVALID_PARAMETER);
        this.ramBuffer.brightness = v;
        this.currentSettings.brightness = v;
        break;
      }
      case PARAM_PATTERN: {
        if (data.length < 3) return errorEnvelope(ERROR_INVALID_PARAMETER);
        const v = data[2];
        // firmware accepts < MAX_EFFECTS; the simulator additionally allows
        // PATTERN_INT.fire (10) since it is simulator-only.
        if (v > MAX_EFFECTS) return errorEnvelope(ERROR_INVALID_PARAMETER);
        this.ramBuffer.currentPattern = v;
        this.currentSettings.currentPattern = v;
        break;
      }
      case PARAM_COLOR_RGB: {
        if (data.length < 5) return errorEnvelope(ERROR_INVALID_PARAMETER);
        this.ramBuffer.color = [data[2], data[3], data[4]];
        this.currentSettings.color = [data[2], data[3], data[4]];
        break;
      }
      case PARAM_POWER_MODE: {
        if (data.length < 3) return errorEnvelope(ERROR_INVALID_PARAMETER);
        const v = data[2];
        if (v > 2) return errorEnvelope(ERROR_INVALID_PARAMETER);
        this.ramBuffer.powerMode = v;
        this.currentSettings.powerMode = v;
        break;
      }
      case PARAM_SPEED: {
        if (data.length < 3) return errorEnvelope(ERROR_INVALID_PARAMETER);
        const v = data[2];
        if (v > 100) return errorEnvelope(ERROR_INVALID_PARAMETER);
        this.ramBuffer.speed = v;
        this.currentSettings.speed = v;
        break;
      }
      default:
        return errorEnvelope(ERROR_INVALID_PARAMETER);
    }

    this.configDirty = true;
    return ack(RESPONSE_ACK_SUCCESS);
  }
}
