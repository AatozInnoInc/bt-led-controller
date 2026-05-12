import type { PatternFn } from '@bt-led/led-types';
import { mapRange } from '../math';

// Mirrors strobe() in bt-led-controller.ino: hard on/off at a speed-derived rate.
export const strobe: PatternFn = (pixels, cfg, now) => {
  const period = mapRange(cfg.speed, 0, 100, 1000, 50);
  const on = Math.floor(now / period) % 2 === 0;
  if (on) {
    for (const p of pixels) {
      p.r = cfg.color.r;
      p.g = cfg.color.g;
      p.b = cfg.color.b;
    }
  } else {
    for (const p of pixels) {
      p.r = 0;
      p.g = 0;
      p.b = 0;
    }
  }
};
