import { describe, expect, it } from 'vitest';
import { rainbow } from './rainbow';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('rainbow pattern', () => {
  it('writes non-zero values across the strip', () => {
    const pixels = makeBuffer(16);
    rainbow(pixels, makeConfig(), 0);
    const total = pixels.reduce((s, p) => s + p.r + p.g + p.b, 0);
    expect(total).toBeGreaterThan(0);
    expect(pixels.every((p) => p.r <= 255 && p.g <= 255 && p.b <= 255)).toBe(true);
  });
  it('starts on the red side of the cycle', () => {
    const pixels = makeBuffer(16);
    rainbow(pixels, makeConfig(), 0);
    expect(pixels[0].r).toBeGreaterThan(pixels[0].b);
  });
});
