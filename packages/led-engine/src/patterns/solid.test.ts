import { describe, expect, it } from 'vitest';
import { solid } from './solid';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('solid pattern', () => {
  it('fills every pixel with cfg.color', () => {
    const pixels = makeBuffer(8);
    solid(pixels, makeConfig({ color: { r: 12, g: 34, b: 56 } }), 0);
    expect(pixels.every((p) => p.r === 12 && p.g === 34 && p.b === 56)).toBe(true);
  });
});
