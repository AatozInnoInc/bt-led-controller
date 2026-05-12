import type { PatternFn } from '@bt-led/led-types';

export const solid: PatternFn = (pixels, cfg) => {
  for (const p of pixels) {
    p.r = cfg.color.r;
    p.g = cfg.color.g;
    p.b = cfg.color.b;
  }
};
