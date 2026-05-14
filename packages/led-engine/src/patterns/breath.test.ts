import { describe, expect, it } from 'vitest';
import { breath } from './breath';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('breath pattern', () => {
  it('writes a uniform tinted value scaled by the sine envelope', () => {
    const pixels = makeBuffer(8);
    const cfg = makeConfig({ color: { r: 200, g: 100, b: 50 } });
    breath(pixels, cfg, 500);
    // All pixels must be the same colour
    const first = pixels[0];
    expect(pixels.every((p) => p.r === first.r && p.g === first.g && p.b === first.b)).toBe(true);
    // Channels must reflect the colour ratios (r ≥ g ≥ b for this orange)
    expect(first.r).toBeGreaterThanOrEqual(first.g);
    expect(first.g).toBeGreaterThanOrEqual(first.b);
  });
});
