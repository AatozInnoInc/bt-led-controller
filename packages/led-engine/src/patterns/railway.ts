import type { PatternFn } from '@bt-led/led-types';
import { blendRgb, mapRange } from '../math';

// Alternating LEDs cross-fade between primary and secondary (or primary vs dim).
export const railway: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const secondary = cfg.secondaryColor ?? {
    r: Math.floor(cfg.color.r * 0.15),
    g: Math.floor(cfg.color.g * 0.15),
    b: Math.floor(cfg.color.b * 0.15),
  };

  const period = Math.max(1, mapRange(cfg.speed, 0, 100, 4000, 400));
  const phase = ((now % period) / period) * 255;

  for (let i = 0; i < n; i++) {
    const stripe = i % 2 === 0;
    const local = stripe ? phase : 255 - phase;
    const rgb = blendRgb(cfg.color, secondary, local);
    pixels[i].r = rgb.r;
    pixels[i].g = rgb.g;
    pixels[i].b = rgb.b;
  }
};
