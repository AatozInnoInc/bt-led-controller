import { describe, expect, it } from 'vitest';
import { strobe } from './strobe';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('strobe pattern', () => {
  it('alternates between color and off across half-periods', () => {
    const cfg = makeConfig({ color: { r: 200, g: 100, b: 50 }, speed: 0 });
    const period = 1000;
    const onPixels = makeBuffer(4);
    const offPixels = makeBuffer(4);
    strobe(onPixels, cfg, 0);
    strobe(offPixels, cfg, period);

    expect(onPixels[0]).toEqual({ r: 200, g: 100, b: 50 });
    expect(offPixels[0]).toEqual({ r: 0, g: 0, b: 0 });
  });
});
