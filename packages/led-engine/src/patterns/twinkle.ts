import type { PatternFn } from '@bt-led/led-types';

// Mirrors twinkle() in bt-led-controller.ino: each LED has a 30% chance of being lit.
// Lit LEDs use the current colour from the config (was hardcoded white).
export const twinkle: PatternFn = (pixels, cfg) => {
  for (const p of pixels) {
    if (Math.random() * 10 < 3) {
      p.r = cfg.color.r;
      p.g = cfg.color.g;
      p.b = cfg.color.b;
    } else {
      p.r = 0;
      p.g = 0;
      p.b = 0;
    }
  }
};
