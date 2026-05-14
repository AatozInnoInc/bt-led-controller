import { describe, expect, it } from 'vitest';
import { fade } from './fade';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('fade pattern', () => {
  it('fills the entire strip with a uniform colour', () => {
    const pixels = makeBuffer(8);
    fade(pixels, makeConfig(), 0);
    const { r, g, b } = pixels[0];
    expect(pixels.every((p) => p.r === r && p.g === g && p.b === b)).toBe(true);
  });

  it('hue advances over time', () => {
    const cfg = makeConfig({ speed: 100 }); // fast cycle so now=0 and now=250 differ
    const a = makeBuffer(1);
    const b = makeBuffer(1);
    fade(a, cfg, 0);
    fade(b, cfg, 250);
    expect(a[0].r !== b[0].r || a[0].g !== b[0].g || a[0].b !== b[0].b).toBe(true);
  });
});
