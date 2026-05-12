import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFire } from './fire';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('fire pattern', () => {
  afterEach(() => vi.restoreAllMocks());

  it('eventually lights pixels when ticked over time', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
    const fire = createFire(16);
    const pixels = makeBuffer(16);
    for (let t = 0; t < 1000; t += 30) {
      fire(pixels, makeConfig({ speed: 80 }), t);
    }
    const total = pixels.reduce((s, p) => s + p.r + p.g + p.b, 0);
    expect(total).toBeGreaterThan(0);
    expect(pixels.every((p) => p.r <= 255 && p.g <= 255 && p.b <= 255)).toBe(true);
  });

  it('keeps independent heat arrays per instance', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
    const a = createFire(8);
    const b = createFire(8);
    const pa = makeBuffer(8);
    const pb = makeBuffer(8);
    for (let t = 0; t < 200; t += 30) {
      a(pa, makeConfig({ speed: 100 }), t);
    }
    b(pb, makeConfig({ speed: 0 }), 0);
    expect(JSON.stringify(pa)).not.toEqual(JSON.stringify(pb));
  });
});
