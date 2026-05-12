import { describe, expect, it } from 'vitest';
import {
  CMD_CLAIM_DEVICE,
  CMD_COMMIT_CONFIG,
  CMD_CONFIG_UPDATE,
  CMD_ENTER_CONFIG,
  CMD_EXIT_CONFIG,
  CMD_STATUS,
  CMD_VERIFY_OWNERSHIP,
  ERROR_NOT_OWNER,
  PARAM_COLOR_RGB,
  PARAM_PATTERN,
  PARAM_SPEED,
  RESPONSE_ACK_COMMIT,
  RESPONSE_ACK_CONFIG_MODE,
  RESPONSE_ACK_SUCCESS,
} from '@bt-led/ble-protocol';
import { VirtualDevice } from './VirtualDevice';

const encodeUserId = (id: string): number[] => {
  const bytes = Array.from(new TextEncoder().encode(id));
  return [bytes.length, ...bytes];
};

describe('VirtualDevice.processCommand', () => {
  it('responds to CMD_STATUS with success ack', () => {
    const d = new VirtualDevice();
    const r = d.processCommand(Uint8Array.from([CMD_STATUS]));
    expect(r).toEqual(Uint8Array.from([RESPONSE_ACK_SUCCESS]));
  });

  it('returns an 8-byte config snapshot on CMD_ENTER_CONFIG', () => {
    const d = new VirtualDevice();
    const r = d.processCommand(Uint8Array.from([CMD_ENTER_CONFIG]));
    expect(r.length).toBe(8);
    expect(r[0]).toBe(RESPONSE_ACK_CONFIG_MODE);
    expect(r[1]).toBe(128); // default brightness
    expect(r[2]).toBe(50); // default speed
    expect(r[3]).toBe(255); // R
    expect(r[6]).toBe(0); // pattern off
  });

  it('CMD_CONFIG_UPDATE pattern changes currentPattern', () => {
    const d = new VirtualDevice();
    d.processCommand(Uint8Array.from([CMD_ENTER_CONFIG]));
    const r = d.processCommand(Uint8Array.from([CMD_CONFIG_UPDATE, PARAM_PATTERN, 3]));
    expect(r).toEqual(Uint8Array.from([RESPONSE_ACK_SUCCESS]));
    expect(d.snapshot().currentSettings.currentPattern).toBe(3);
  });

  it('CMD_CONFIG_UPDATE color (RGB) writes all three channels', () => {
    const d = new VirtualDevice();
    d.processCommand(Uint8Array.from([CMD_ENTER_CONFIG]));
    d.processCommand(Uint8Array.from([CMD_CONFIG_UPDATE, PARAM_COLOR_RGB, 12, 34, 56]));
    expect(d.snapshot().currentSettings.color).toEqual([12, 34, 56]);
  });

  it('CMD_COMMIT_CONFIG returns 0x91 and clears configDirty', () => {
    const d = new VirtualDevice();
    d.processCommand(Uint8Array.from([CMD_ENTER_CONFIG]));
    d.processCommand(Uint8Array.from([CMD_CONFIG_UPDATE, PARAM_SPEED, 75]));
    const r = d.processCommand(Uint8Array.from([CMD_COMMIT_CONFIG]));
    expect(r).toEqual(Uint8Array.from([RESPONSE_ACK_COMMIT]));
    expect(d.snapshot().configDirty).toBe(false);
  });

  it('CMD_EXIT_CONFIG clears configModeActive', () => {
    const d = new VirtualDevice();
    d.processCommand(Uint8Array.from([CMD_ENTER_CONFIG]));
    expect(d.snapshot().configModeActive).toBe(true);
    d.processCommand(Uint8Array.from([CMD_EXIT_CONFIG]));
    expect(d.snapshot().configModeActive).toBe(false);
  });

  it('blocks config commands when device has owner and no verify', () => {
    const d = new VirtualDevice({
      initialSettings: { hasOwner: true, ownerUserId: 'alice' },
    });
    const r = d.processCommand(Uint8Array.from([CMD_ENTER_CONFIG]));
    expect(r[0]).toBe(RESPONSE_ACK_CONFIG_MODE);
    expect(r[1]).toBe(ERROR_NOT_OWNER);
    expect(d.snapshot().configModeActive).toBe(false);
  });

  it('allows config commands after CMD_VERIFY_OWNERSHIP', () => {
    const d = new VirtualDevice({
      initialSettings: { hasOwner: true, ownerUserId: 'alice' },
    });
    const verify = Uint8Array.from([CMD_VERIFY_OWNERSHIP, ...encodeUserId('alice')]);
    expect(d.processCommand(verify)).toEqual(Uint8Array.from([RESPONSE_ACK_SUCCESS]));
    const enter = d.processCommand(Uint8Array.from([CMD_ENTER_CONFIG]));
    expect(enter[0]).toBe(RESPONSE_ACK_CONFIG_MODE);
    expect(d.snapshot().configModeActive).toBe(true);
  });

  it('CMD_CLAIM_DEVICE on an unowned device records the owner', () => {
    const d = new VirtualDevice();
    const claim = Uint8Array.from([CMD_CLAIM_DEVICE, ...encodeUserId('bob')]);
    expect(d.processCommand(claim)).toEqual(Uint8Array.from([RESPONSE_ACK_SUCCESS]));
    expect(d.snapshot().currentSettings.hasOwner).toBe(true);
  });
});

describe('VirtualDevice.tick', () => {
  it('returns an LED_COUNT-length buffer of RGB values', () => {
    const d = new VirtualDevice({ ledCount: 12 });
    const out = d.tick(0);
    expect(out).toHaveLength(12);
    expect(out.every((p) => typeof p.r === 'number')).toBe(true);
  });

  it('reflects committed pattern changes', () => {
    const d = new VirtualDevice({ ledCount: 4 });
    d.processCommand(Uint8Array.from([CMD_ENTER_CONFIG]));
    // solid (pattern 1) with red
    d.processCommand(Uint8Array.from([CMD_CONFIG_UPDATE, PARAM_PATTERN, 1]));
    d.processCommand(Uint8Array.from([CMD_CONFIG_UPDATE, PARAM_COLOR_RGB, 200, 0, 0]));
    const out = d.tick(0);
    expect(out[0]).toEqual({ r: 200, g: 0, b: 0 });
  });
});
