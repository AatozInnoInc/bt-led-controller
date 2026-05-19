import { describe, expect, it } from 'vitest';
import type { PatternId, RGB } from '@bt-led/led-types';
import { buildPatternRegistry } from './index';
import { makeBuffer, makeConfig } from '../testHelpers';

/** Simulator-first patterns (BLE ids 16–36); exercised here for bounds + basic output. */
const EXTENDED_SIMULATOR_PATTERN_IDS: PatternId[] = [
  'glitter',
  'fairy',
  'sparkle_plus',
  'pacifica',
  'aurora',
  'sunrise',
  'gradient',
  'lighthouse',
  'icu',
  'chase_rainbow',
  'running_saw',
  'railway',
  'bpm',
  'perlin_move',
  'distortion_waves',
  'lightning',
  'rain',
  'fireworks',
  'candle',
  'bouncing_balls',
  'dissolve',
];

function rgbInRange(p: RGB): boolean {
  return p.r >= 0 && p.r <= 255 && p.g >= 0 && p.g <= 255 && p.b >= 0 && p.b <= 255;
}

describe('extended simulator pattern pack', () => {
  const ledCount = 24;
  const registry = buildPatternRegistry(ledCount);

  it.each(EXTENDED_SIMULATOR_PATTERN_IDS)(
    '%s keeps RGB within 0–255 across sampled times',
    (pattern) => {
      const pixels = makeBuffer(ledCount);
      const cfg = makeConfig({ pattern });
      const fn = registry[pattern];
      for (const t of [0, 17, 333, 8888]) {
        fn(pixels, cfg, t);
        expect(pixels.every(rgbInRange)).toBe(true);
      }
    },
  );

  it.each(EXTENDED_SIMULATOR_PATTERN_IDS)(
    '%s produces non-zero strip energy within sampled ticks',
    (pattern) => {
      const pixels = makeBuffer(ledCount);
      const cfg = makeConfig({ pattern });
      const fn = registry[pattern];
      let accumulated = 0;
      for (let t = 0; t < 600; t += 13) {
        fn(pixels, cfg, t);
        accumulated += pixels.reduce((sum, p) => sum + p.r + p.g + p.b, 0);
      }
      expect(accumulated).toBeGreaterThan(0);
    },
  );
});
