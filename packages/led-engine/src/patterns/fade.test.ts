import { describe, expect, it } from 'vitest';
import { fade } from './fade';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('fade pattern', () => {
  it('fills with white (matches firmware fade())', () => {
    const pixels = makeBuffer(4);
    fade(pixels, makeConfig(), 0);
    expect(pixels.every((p) => p.r === 255 && p.g === 255 && p.b === 255)).toBe(true);
  });
});
