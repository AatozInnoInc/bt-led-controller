import { describe, expect, it } from 'vitest';
import { colorwipe } from './colorwipe';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('colorwipe pattern', () => {
  it('starts with one lit pixel at t=0 in the configured colour', () => {
    const pixels = makeBuffer(16);
    colorwipe(pixels, makeConfig({ speed: 50, color: { r: 10, g: 200, b: 80 } }), 0);
    expect(pixels[0]).toMatchObject({ r: 10, g: 200, b: 80 });
    expect(pixels[15]).toMatchObject({ r: 0, g: 0, b: 0 });
  });

  it('fills the strip over time and then erases it', () => {
    const cfg = makeConfig({ speed: 100, color: { r: 255, g: 0, b: 0 } });
    const buf = makeBuffer(8);
    colorwipe(buf, cfg, 0);
    const litStart = buf.filter((p) => p.r > 0).length;
    // The (n-1)-th step paints the last pixel — strip is fully lit.
    colorwipe(buf, cfg, 7 * 20);
    const litFull = buf.filter((p) => p.r > 0).length;
    // The (2n-1)-th step erases the last pixel — strip is fully off.
    colorwipe(buf, cfg, 15 * 20);
    const litErased = buf.filter((p) => p.r > 0).length;
    expect(litStart).toBe(1);
    expect(litFull).toBe(8);
    expect(litErased).toBe(0);
  });
});
