import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { LedPreset } from '@bt-led/led-types';
import { decodeConfigFromHash, encodeConfigToHash, usePresets } from './usePresets';

const preset = (id: string, name: string): LedPreset => ({
  id,
  name,
  createdAt: new Date(`2026-05-12T00:0${Number(id) || 0}:00Z`).toISOString(),
  version: 1,
  config: {
    pattern: 'solid',
    color: { r: 10, g: 20, b: 30 },
    speed: 50,
    brightness: 200,
    powerMode: 1,
  },
});

describe('usePresets', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves to localStorage and survives a re-mount', () => {
    const { result, unmount } = renderHook(() => usePresets());
    act(() => result.current.save(preset('1', 'first')));
    expect(result.current.presets).toHaveLength(1);
    unmount();

    const re = renderHook(() => usePresets());
    expect(re.result.current.presets[0].name).toBe('first');
  });

  it('replaces existing preset on save with the same id', () => {
    const { result } = renderHook(() => usePresets());
    act(() => result.current.save(preset('1', 'a')));
    act(() => result.current.save({ ...preset('1', 'a'), name: 'a2' }));
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].name).toBe('a2');
  });

  it('removes by id', () => {
    const { result } = renderHook(() => usePresets());
    act(() => {
      result.current.save(preset('1', 'a'));
      result.current.save(preset('2', 'b'));
    });
    act(() => result.current.remove('1'));
    expect(result.current.presets.map((p) => p.id)).toEqual(['2']);
  });

  it('importFromFile parses a valid envelope', async () => {
    const { result } = renderHook(() => usePresets());
    const envelope = {
      schema: 'led-simulator-preset-v1',
      preset: preset('1', 'roundtrip'),
    };
    const file = new File([JSON.stringify(envelope)], 'p.json', { type: 'application/json' });
    const out = await result.current.importFromFile(file);
    expect(out.name).toBe('roundtrip');
  });

  it('importFromFile rejects a bad envelope', async () => {
    const { result } = renderHook(() => usePresets());
    const file = new File(['{"schema":"other"}'], 'x.json');
    await expect(result.current.importFromFile(file)).rejects.toThrow();
  });
});

describe('hash codec', () => {
  it('round-trips a LedConfig as URL-safe base64', () => {
    const cfg = {
      pattern: 'fire' as const,
      color: { r: 1, g: 2, b: 3 },
      speed: 99,
      brightness: 200,
      powerMode: 1,
    };
    const encoded = encodeConfigToHash(cfg);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeConfigFromHash(`#${encoded}`)).toEqual(cfg);
  });

  it('returns null on malformed hash', () => {
    expect(decodeConfigFromHash('')).toBeNull();
    expect(decodeConfigFromHash('#!!!')).toBeNull();
  });
});
