import type { PatternFn } from '@bt-led/led-types';

// fade() in bt-led-controller.ino is `fill_solid_buf(255, 255, 255)`.
// Kept as-is for parity; behaviour can be revisited when the firmware does.
export const fade: PatternFn = (pixels) => {
  for (const p of pixels) {
    p.r = 255;
    p.g = 255;
    p.b = 255;
  }
};
