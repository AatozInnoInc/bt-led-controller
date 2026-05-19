import type { PatternFn } from '@bt-led/led-types';
import { blendRgb, mapRange } from '../math';

// Horizontal dawn gradient: warm core sliding along the strip (simplified sunrise arc).
export const sunrise: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const period = Math.max(1, mapRange(cfg.speed, 0, 100, 24000, 4000));
  const phase = (now % period) / period;

  const skyLow = { r: 40, g: 24, b: 70 };
  const horizon = { r: 255, g: 140, b: 40 };
  const zenith = { r: 255, g: 230, b: 160 };

  const center = phase * (n + n / 3);

  for (let i = 0; i < n; i++) {
    const dist = Math.abs(i - center) / Math.max(1, n / 2);
    const clamped = dist > 1 ? 1 : dist;
    let c = blendRgb(zenith, horizon, Math.floor((1 - clamped) * 255));
    c = blendRgb(skyLow, c, Math.floor(clamped * 200));
    pixels[i].r = c.r;
    pixels[i].g = c.g;
    pixels[i].b = c.b;
  }

  void cfg;
};
