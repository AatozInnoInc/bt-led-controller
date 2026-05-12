import { describe, expect, it } from 'vitest';
import { pulse } from './pulse';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('pulse pattern', () => {
  it('modulates the configured color', () => {
    const pixels = makeBuffer(8);
    const cfg = makeConfig({ color: { r: 255, g: 0, b: 0 }, speed: 50 });
    pulse(pixels, cfg, 250);
    expect(pixels[0].r).toBeGreaterThan(0);
    expect(pixels[0].g).toBe(0);
    expect(pixels[0].b).toBe(0);
  });
  it('all pixels share the same modulated value', () => {
    const pixels = makeBuffer(4);
    pulse(pixels, makeConfig({ color: { r: 200, g: 100, b: 50 } }), 500);
    const first = pixels[0];
    expect(pixels.every((p) => p.r === first.r && p.g === first.g && p.b === first.b)).toBe(true);
  });
});
