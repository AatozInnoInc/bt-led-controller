import { afterEach, describe, expect, it, vi } from 'vitest';
import { twinkle } from './twinkle';
import { makeBuffer, makeConfig } from '../testHelpers';

describe('twinkle pattern', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lights pixels whose random value is below threshold using cfg.color', () => {
    const sequence = [0.0, 0.5, 0.1, 0.9];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => sequence[i++ % sequence.length]);

    const pixels = makeBuffer(4);
    const cfg = makeConfig({ color: { r: 255, g: 128, b: 0 } });
    twinkle(pixels, cfg, 0);

    expect(pixels[0]).toEqual({ r: 255, g: 128, b: 0 });
    expect(pixels[1]).toEqual({ r: 0, g: 0, b: 0 });
    expect(pixels[2]).toEqual({ r: 255, g: 128, b: 0 });
    expect(pixels[3]).toEqual({ r: 0, g: 0, b: 0 });
  });
});
