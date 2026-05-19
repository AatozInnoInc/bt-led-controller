import type { PatternFn } from '@bt-led/led-types';
import { hsv2rgb, mapRange, sin8 } from '../math';

// Aurora borealis bands: greens and magentas drifting slowly along the strip.
export const aurora: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const shift = mapRange(cfg.speed, 0, 100, 7, 3);
  const t = now >> shift;

  for (let i = 0; i < n; i++) {
    const pos = Math.floor((i * 255) / Math.max(1, n)) & 0xff;
    const wave = sin8(pos + t) + sin8(pos / 2 + (t * 5) / 4);
    const hue = (96 + Math.floor(wave / 2) + (pos >> 2)) & 0xff;
    const sat = 200 + ((wave >> 2) % 56);
    const val = 140 + ((sin8(pos * 2 + t * 2) >> 1));
    const rgb = hsv2rgb(hue, sat > 255 ? 255 : sat, val > 255 ? 255 : val);
    pixels[i].r = rgb.r;
    pixels[i].g = rgb.g;
    pixels[i].b = rgb.b;
  }
};
