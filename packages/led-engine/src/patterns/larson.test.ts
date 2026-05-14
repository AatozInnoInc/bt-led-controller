import { describe, expect, it } from 'vitest';
import { larson } from './larson';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('larson pattern', () => {
  it('places a bright dot somewhere on the strip', () => {
    const pixels = makeBuffer(16);
    larson(pixels, makeConfig(), 0);
    const total = pixels.reduce((s, p) => s + p.r + p.g + p.b, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('dot position changes over time', () => {
    const cfg = makeConfig({ color: { r: 255, g: 0, b: 0 }, speed: 50 });
    const a = makeBuffer(16);
    const b = makeBuffer(16);
    larson(a, cfg, 0);
    larson(b, cfg, 1000);
    const posA = a.findIndex((p) => p.r === 255);
    const posB = b.findIndex((p) => p.r === 255);
    // Dot should have moved
    expect(posA).not.toBe(posB);
  });
});
