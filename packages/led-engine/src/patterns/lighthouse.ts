import type { PatternFn } from '@bt-led/led-types';
import { fadeToBlackBy, mapRange } from '../math';

// Dot travels start→end with an exponential-style fading tail (one-way lighthouse beam).
export const lighthouse: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  fadeToBlackBy(pixels, mapRange(cfg.speed, 0, 100, 28, 55));

  const period = Math.max(1, mapRange(cfg.speed, 0, 100, 6000, 700));
  const head = Math.floor(((now % period) / period) * Math.max(1, n - 1));

  const { r, g, b } = cfg.color;

  const tailLen = Math.min(n, 12);
  for (let k = 0; k < tailLen; k++) {
    const idx = head - k;
    if (idx < 0)
      continue;
    const fade = Math.floor(255 * (1 - k / tailLen));
    pixels[idx].r = Math.min(255, Math.floor((r * fade) / 255));
    pixels[idx].g = Math.min(255, Math.floor((g * fade) / 255));
    pixels[idx].b = Math.min(255, Math.floor((b * fade) / 255));
  }
};
