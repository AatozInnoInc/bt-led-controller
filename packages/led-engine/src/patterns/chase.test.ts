import { describe, expect, it } from 'vitest';
import { chase } from './chase';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('chase pattern', () => {
  it('places at least one bright marker', () => {
    const pixels = makeBuffer(16);
    chase(pixels, makeConfig(), 0);
    const total = pixels.reduce((s, p) => s + p.r + p.g + p.b, 0);
    expect(total).toBeGreaterThan(0);
  });
});
