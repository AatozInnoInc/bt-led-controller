import type { PatternFn } from '@bt-led/led-types';
import { sin8 } from '../math';

// Mirrors breath() in bt-led-controller.ino — same sine-wave envelope, but tinted
// with the current colour instead of grayscale. Matches the firmware update.
export const breath: PatternFn = (pixels, cfg, now) => {
  const value = ((sin8((now >>> 3) & 0xff) + 1) >>> 1) & 0xff;
  for (const p of pixels) {
    p.r = Math.round((cfg.color.r * value) / 255);
    p.g = Math.round((cfg.color.g * value) / 255);
    p.b = Math.round((cfg.color.b * value) / 255);
  }
};
