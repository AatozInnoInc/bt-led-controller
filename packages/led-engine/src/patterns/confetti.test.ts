import { afterEach, describe, expect, it, vi } from 'vitest';
import { confetti } from './confetti';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('confetti pattern', () => {
  afterEach(() => vi.restoreAllMocks());

  it('places at least one non-black pixel', () => {
    // Mock random so sparkles always appear at position 0 with hue 0 (red)
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const pixels = makeBuffer(16);
    confetti(pixels, makeConfig(), 0);
    const total = pixels.reduce((s, p) => s + p.r + p.g + p.b, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('all pixels stay within RGB bounds', () => {
    const pixels = makeBuffer(16);
    confetti(pixels, makeConfig(), 500);
    expect(pixels.every((p) => p.r <= 255 && p.g <= 255 && p.b <= 255)).toBe(true);
  });
});
