import type { PatternFn } from '@bt-led/led-types';
import { mapRange } from '../math';
import { hash01 } from './simNoise';

// Random pixel dissolve-in then dissolve-out cycle keyed off speed / wall-clock phase.
export const dissolve: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const cycle = Math.max(600, mapRange(cfg.speed, 0, 100, 9000, 1200));
  const phaseBucket = Math.floor(now / cycle);
  const t = now % cycle;
  const half = cycle / 2;

  const off = { r: 0, g: 0, b: 0 };

  if (t < half) {
    const prog = t / half;

    for (let i = 0; i < n; i++) {
      const order = hash01(i + phaseBucket * 977);

      if (order < prog) {
        pixels[i].r = cfg.color.r;
        pixels[i].g = cfg.color.g;
        pixels[i].b = cfg.color.b;
      } else {
        pixels[i].r = off.r;
        pixels[i].g = off.g;
        pixels[i].b = off.b;
      }
    }
  } else {
    const prog = (t - half) / half;

    for (let i = 0; i < n; i++) {
      const order = hash01(i + (phaseBucket + 13) * 1999);

      if (order < prog) {
        pixels[i].r = off.r;
        pixels[i].g = off.g;
        pixels[i].b = off.b;
      } else {
        pixels[i].r = cfg.color.r;
        pixels[i].g = cfg.color.g;
        pixels[i].b = cfg.color.b;
      }
    }
  }
};
