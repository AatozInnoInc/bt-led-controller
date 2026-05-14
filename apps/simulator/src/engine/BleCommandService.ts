import {
  CMD_COMMIT_CONFIG,
  CMD_CONFIG_UPDATE,
  CMD_ENTER_CONFIG,
  CMD_EXIT_CONFIG,
  CMD_STATUS,
  CMD_VERIFY_OWNERSHIP,
  ERROR_NONE,
  PARAM_BRIGHTNESS,
  PARAM_COLOR2_RGB,
  PARAM_COLOR_RGB,
  PARAM_PATTERN,
  PARAM_POWER_MODE,
  PARAM_SPEED,
  RESPONSE_ACK_COMMIT,
  RESPONSE_ACK_CONFIG_MODE,
  RESPONSE_ACK_SUCCESS,
} from '@bt-led/ble-protocol';
import type { ConfigState } from '@bt-led/ble-protocol';
import type { VirtualDevice } from '@bt-led/led-engine';
import { PATTERN_INT, type PatternId } from '@bt-led/led-types';

const isError = (r: Uint8Array): boolean => r.length >= 2 && r[0] === RESPONSE_ACK_CONFIG_MODE && r[1] !== 0;

const encodeUserId = (id: string): number[] => {
  const bytes = Array.from(new TextEncoder().encode(id));
  return [bytes.length, ...bytes];
};

// Mock BLE transport. The interface is `async` so it stays swap-compatible with a
// real Web Bluetooth adapter — under the hood we just call processCommand() in-process.
export class BleCommandService {
  constructor(private device: VirtualDevice) {}

  async sendStatus(): Promise<boolean> {
    const r = this.device.processCommand(Uint8Array.from([CMD_STATUS]));
    return r[0] === RESPONSE_ACK_SUCCESS;
  }

  async verifyOwnership(userId: string): Promise<{ success: boolean; errorCode?: number }> {
    const r = this.device.processCommand(
      Uint8Array.from([CMD_VERIFY_OWNERSHIP, ...encodeUserId(userId)]),
    );
    if (isError(r)) return { success: false, errorCode: r[1] };
    return { success: r[0] === RESPONSE_ACK_SUCCESS };
  }

  async enterConfigMode(): Promise<ConfigState> {
    const r = this.device.processCommand(Uint8Array.from([CMD_ENTER_CONFIG]));
    if (r[0] !== RESPONSE_ACK_CONFIG_MODE || r.length !== 8) {
      throw new Error(`enterConfigMode failed (code=${r[1] ?? 'n/a'})`);
    }
    return {
      brightness: r[1],
      speed: r[2],
      color: { r: r[3], g: r[4], b: r[5] },
      pattern: r[6],
      powerMode: r[7],
    };
  }

  async exitConfigMode(): Promise<void> {
    const r = this.device.processCommand(Uint8Array.from([CMD_EXIT_CONFIG]));
    if (r[0] !== RESPONSE_ACK_SUCCESS) throw new Error('exitConfigMode failed');
  }

  async updateBrightness(value: number): Promise<void> {
    this.expectSuccess(
      this.device.processCommand(Uint8Array.from([CMD_CONFIG_UPDATE, PARAM_BRIGHTNESS, value & 0xff])),
      'updateBrightness',
    );
  }

  async updatePattern(patternId: PatternId): Promise<void> {
    const intId = PATTERN_INT[patternId];
    this.expectSuccess(
      this.device.processCommand(Uint8Array.from([CMD_CONFIG_UPDATE, PARAM_PATTERN, intId])),
      'updatePattern',
    );
  }

  async updateColor(r: number, g: number, b: number): Promise<void> {
    this.expectSuccess(
      this.device.processCommand(
        Uint8Array.from([CMD_CONFIG_UPDATE, PARAM_COLOR_RGB, r & 0xff, g & 0xff, b & 0xff]),
      ),
      'updateColor',
    );
  }

  async updateSecondaryColor(r: number, g: number, b: number): Promise<void> {
    this.expectSuccess(
      this.device.processCommand(
        Uint8Array.from([CMD_CONFIG_UPDATE, PARAM_COLOR2_RGB, r & 0xff, g & 0xff, b & 0xff]),
      ),
      'updateSecondaryColor',
    );
  }

  async updateSpeed(value: number): Promise<void> {
    this.expectSuccess(
      this.device.processCommand(
        Uint8Array.from([CMD_CONFIG_UPDATE, PARAM_SPEED, Math.max(0, Math.min(100, value))]),
      ),
      'updateSpeed',
    );
  }

  async updatePowerMode(value: number): Promise<void> {
    this.expectSuccess(
      this.device.processCommand(Uint8Array.from([CMD_CONFIG_UPDATE, PARAM_POWER_MODE, value & 0xff])),
      'updatePowerMode',
    );
  }

  async commitConfig(): Promise<void> {
    const r = this.device.processCommand(Uint8Array.from([CMD_COMMIT_CONFIG]));
    if (r[0] !== RESPONSE_ACK_COMMIT) throw new Error(`commitConfig failed (code=${r[1] ?? 'n/a'})`);
  }

  private expectSuccess(r: Uint8Array, label: string): void {
    if (r[0] === RESPONSE_ACK_SUCCESS) return;
    const code = isError(r) ? r[1] : ERROR_NONE;
    throw new Error(`${label} failed (code=0x${code.toString(16)})`);
  }
}
