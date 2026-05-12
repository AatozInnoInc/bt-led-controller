import { describe, expect, it } from 'vitest';
import { breath } from './breath';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('breath pattern', () => {
  it('writes a uniform grayscale value', () => {
    const pixels = makeBuffer(8);
    breath(pixels, makeConfig(), 500);
    const first = pixels[0];
    expect(first.r).toBe(first.g);
    expect(first.g).toBe(first.b);
    expect(pixels.every((p) => p.r === first.r)).toBe(true);
  });
});
