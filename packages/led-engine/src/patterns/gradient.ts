import type { PatternFn } from '@bt-led/led-types';
import { blendRgb, mapRange } from '../math';

// Sliding saturation / brightness ribbon anchored on cfg.color across the strip.
export const gradient: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const period = Math.max(1, mapRange(cfg.speed, 0, 100, 12000, 1500));
  const scroll = (now % period) / period;

  const dark = {
    r: Math.floor(cfg.color.r * 0.25),
    g: Math.floor(cfg.color.g * 0.25),
    b: Math.floor(cfg.color.b * 0.25),
  };

  for (let i = 0; i < n; i++) {
    const u = (((i / Math.max(1, n)) + scroll) % 1);
    const t = Math.floor(Math.abs(Math.sin(u * Math.PI)) * 255);
    const rgb = blendRgb(dark, cfg.color, t);
    pixels[i].r = rgb.r;
    pixels[i].g = rgb.g;
    pixels[i].b = rgb.b;
  }
};
