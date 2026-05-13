import { describe, expect, it } from 'vitest';
import { meteor } from './meteor';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('meteor pattern', () => {
  it('paints the head with the configured colour', () => {
    const pixels = makeBuffer(16);
    meteor(pixels, makeConfig({ speed: 50, color: { r: 250, g: 30, b: 200 } }), 0);
    const lit = pixels.find((p) => p.r > 0 || p.g > 0 || p.b > 0);
    expect(lit).toBeDefined();
    // Head pixel should be the exact preset colour at t=0 (no fade yet).
    expect(lit).toMatchObject({ r: 250, g: 30, b: 200 });
  });

  it('advances over time and leaves a fading trail', () => {
    const a = makeBuffer(32);
    meteor(a, makeConfig({ speed: 100 }), 0);
    const headA = a.findIndex((p) => p.r + p.g + p.b > 0);
    meteor(a, makeConfig({ speed: 100 }), 300);
    const headB = a.findIndex((p) => p.r + p.g + p.b > 0);
    expect(headB).toBeGreaterThanOrEqual(headA);
    // Trail behind the head should be dimmer than the head.
    const total = a.reduce((s, p) => s + p.r + p.g + p.b, 0);
    expect(total).toBeGreaterThan(0);
  });
});
