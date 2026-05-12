import type { PatternFn } from '@bt-led/led-types';

// Mirrors twinkle() in bt-led-controller.ino: each LED has a 30% chance of being lit white.
export const twinkle: PatternFn = (pixels) => {
  for (const p of pixels) {
    if (Math.random() * 10 < 3) {
      p.r = 255;
      p.g = 255;
      p.b = 255;
    } else {
      p.r = 0;
      p.g = 0;
      p.b = 0;
    }
  }
};
