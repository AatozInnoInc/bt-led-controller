import type { PatternFn } from '@bt-led/led-types';

export const off: PatternFn = (pixels) => {
  for (const p of pixels) {
    p.r = 0;
    p.g = 0;
    p.b = 0;
  }
};
