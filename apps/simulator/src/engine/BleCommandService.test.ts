import { describe, expect, it } from 'vitest';
import { VirtualDevice } from '@bt-led/led-engine';
import { BleCommandService } from './BleCommandService';

describe('BleCommandService end-to-end', () => {
  it('completes the full enter → update → commit → exit flow', async () => {
    const device = new VirtualDevice({ ledCount: 16 });
    const ble = new BleCommandService(device);

    expect(await ble.sendStatus()).toBe(true);

    const state = await ble.enterConfigMode();
    expect(state.brightness).toBe(128);
    expect(state.pattern).toBe(0);

    await ble.updateColor(10, 20, 30);
    await ble.updatePattern('solid');
    await ble.updateSpeed(75);
    await ble.commitConfig();

    const snap = device.snapshot();
    expect(snap.currentSettings.color).toEqual([10, 20, 30]);
    expect(snap.currentSettings.currentPattern).toBe(1);
    expect(snap.currentSettings.speed).toBe(75);
    expect(snap.configDirty).toBe(false);

    await ble.exitConfigMode();
    expect(device.snapshot().configModeActive).toBe(false);
  });

  it('throws on ownership rejection', async () => {
    const device = new VirtualDevice({
      initialSettings: { hasOwner: true, ownerUserId: 'alice' },
    });
    const ble = new BleCommandService(device);
    const r = await ble.verifyOwnership('mallory');
    expect(r.success).toBe(false);
    await expect(ble.enterConfigMode()).rejects.toThrow();
  });

  it('verifyOwnership unlocks subsequent config commands', async () => {
    const device = new VirtualDevice({
      initialSettings: { hasOwner: true, ownerUserId: 'alice' },
    });
    const ble = new BleCommandService(device);
    const r = await ble.verifyOwnership('alice');
    expect(r.success).toBe(true);
    await expect(ble.enterConfigMode()).resolves.toBeTruthy();
  });
});
