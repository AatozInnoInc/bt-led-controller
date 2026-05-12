import type { PatternFn } from '@bt-led/led-types';
import { mapRange, sin8 } from '../math';

// Mirrors pulse() in bt-led-controller.ino: sine brightness modulation on cfg.color.
export const pulse: PatternFn = (pixels, cfg, now) => {
  const { r, g, b } = cfg.color;
  const period = mapRange(cfg.speed, 0, 100, 4000, 500);
  const phase = Math.floor(((now % period) * 255) / period) & 0xff;
  const brightness = sin8(phase);

  for (const p of pixels) {
    p.r = Math.floor((r * brightness) / 255);
    p.g = Math.floor((g * brightness) / 255);
    p.b = Math.floor((b * brightness) / 255);
  }
};
