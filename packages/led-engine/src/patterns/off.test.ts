import { describe, expect, it } from 'vitest';
import { off } from './off';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('off pattern', () => {
  it('clears every pixel', () => {
    const pixels = makeBuffer(16, { r: 100, g: 200, b: 50 });
    off(pixels, makeConfig(), 0);
    expect(pixels.every((p) => p.r === 0 && p.g === 0 && p.b === 0)).toBe(true);
  });
});
