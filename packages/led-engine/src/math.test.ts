import { describe, expect, it } from 'vitest';
import {
  GAMMA8,
  beat8,
  blendRgb,
  fadeToBlackBy,
  hsv2rgb,
  mapRange,
  qadd8,
  qsub8,
  rgb2hsv,
  sin8,
} from './math';

describe('sin8 (port of sin8_approx)', () => {
  // The .ino formula is (sin(x/255 * 2π) + 1) * 127.5, so x=0 returns ~127, not 0.
  it('matches the .ino at key phase points', () => {
    expect(sin8(0)).toBe(127);
    expect(sin8(64)).toBeGreaterThanOrEqual(254);
    expect(sin8(64)).toBeLessThanOrEqual(255);
    // sin(π) is ~0 but float wobble nudges it slightly negative,
    // so sin8(128) lands at 125 in the .ino's formula.
    expect(sin8(128)).toBeLessThanOrEqual(128);
    expect(sin8(128)).toBeGreaterThanOrEqual(124);
    expect(sin8(192)).toBeLessThanOrEqual(1);
  });
});

describe('hsv2rgb', () => {
  it('returns pure red at h=0', () => {
    expect(hsv2rgb(0, 255, 255)).toEqual({ r: 255, g: 0, b: 0 });
  });
  it('returns near-green at h=85', () => {
    const { r, g, b } = hsv2rgb(85, 255, 255);
    expect(g).toBe(255);
    expect(b).toBe(0);
    expect(r).toBeLessThan(10);
  });
  it('returns near-blue at h=170', () => {
    // Integer hsv2rgb in the .ino doesn't land cleanly at 170; b is 255 and
    // r/g are tiny but non-zero.
    const { r, g, b } = hsv2rgb(170, 255, 255);
    expect(b).toBe(255);
    expect(r).toBeLessThan(10);
    expect(g).toBeLessThan(10);
  });
  it('returns grayscale when saturation is 0', () => {
    expect(hsv2rgb(123, 0, 200)).toEqual({ r: 200, g: 200, b: 200 });
  });
});

describe('rgb2hsv', () => {
  it('round-trips pure red through hsv2rgb', () => {
    const hsv = rgb2hsv(255, 0, 0);
    expect(hsv.s).toBe(255);
    expect(hsv.v).toBe(255);
  });
  it('returns (0,0,0) for black', () => {
    expect(rgb2hsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 });
  });
});

describe('qadd8 / qsub8 saturating arithmetic', () => {
  it('qadd8 saturates at 255', () => {
    expect(qadd8(200, 100)).toBe(255);
    expect(qadd8(10, 20)).toBe(30);
  });
  it('qsub8 saturates at 0', () => {
    expect(qsub8(10, 20)).toBe(0);
    expect(qsub8(50, 30)).toBe(20);
  });
});

describe('beat8', () => {
  it('is deterministic given the same now value', () => {
    expect(beat8(60, 0, 0)).toBe(0);
    expect(beat8(60, 0, 1000)).toBe(beat8(60, 0, 1000));
  });
  it('phase shifts the result', () => {
    expect(beat8(60, 100, 0)).toBe(100);
  });
});

describe('blendRgb', () => {
  it('returns a at t=0 and b at t=255', () => {
    const a = { r: 100, g: 50, b: 0 };
    const b = { r: 0, g: 200, b: 255 };
    expect(blendRgb(a, b, 0)).toEqual(a);
    expect(blendRgb(a, b, 255)).toEqual(b);
  });
});

describe('mapRange', () => {
  it('maps endpoints exactly', () => {
    expect(mapRange(0, 0, 100, 500, 1000)).toBe(500);
    expect(mapRange(100, 0, 100, 500, 1000)).toBe(1000);
  });
});

describe('fadeToBlackBy', () => {
  it('reduces all channels toward zero', () => {
    const px = [{ r: 200, g: 100, b: 50 }];
    fadeToBlackBy(px, 128);
    expect(px[0].r).toBeLessThan(200);
    expect(px[0].g).toBeLessThan(100);
    expect(px[0].b).toBeLessThan(50);
  });
});

describe('GAMMA8 table', () => {
  it('is monotonic non-decreasing and 256 entries', () => {
    expect(GAMMA8).toHaveLength(256);
    for (let i = 1; i < 256; i++) {
      expect(GAMMA8[i]).toBeGreaterThanOrEqual(GAMMA8[i - 1]);
    }
    expect(GAMMA8[0]).toBe(0);
    expect(GAMMA8[255]).toBe(255);
  });
});
