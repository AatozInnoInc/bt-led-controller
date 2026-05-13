import { describe, expect, it } from 'vitest';
import { plasma } from './plasma';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('plasma pattern', () => {
  it('produces a non-trivial output across the strip', () => {
    const pixels = makeBuffer(16);
    plasma(pixels, makeConfig({ speed: 50 }), 1234);
    const total = pixels.reduce((s, p) => s + p.r + p.g + p.b, 0);
    expect(total).toBeGreaterThan(0);
    expect(pixels.every((p) => p.r <= 255 && p.g <= 255 && p.b <= 255)).toBe(true);
  });

  it('advances over time', () => {
    const a = makeBuffer(16);
    const b = makeBuffer(16);
    plasma(a, makeConfig({ speed: 100 }), 0);
    plasma(b, makeConfig({ speed: 100 }), 5000);
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
  });
});
