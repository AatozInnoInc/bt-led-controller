import type { PatternFn } from '@bt-led/led-types';
import { beat8, hsv2rgb, mapRange } from '../math';

// Two rainbow-hued runners on cfg.color background (chase rainbow flavour).
export const chase_rainbow: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  const max = Math.max(0, n - 1);
  if (n === 0)
    return;

  const bpm = mapRange(cfg.speed, 0, 100, 8, 36);

  const bg = cfg.color;

  for (let i = 0; i < n; i++) {
    pixels[i].r = Math.floor(bg.r * 0.35);
    pixels[i].g = Math.floor(bg.g * 0.35);
    pixels[i].b = Math.floor(bg.b * 0.35);
  }

  const pos1 = Math.round((beat8(bpm, 0, now) / 255) * max);
  const pos2 = Math.round((beat8(bpm, 128, now) / 255) * max);

  const hue1 = beat8(Math.floor(bpm * 3 / 2), 0, now);
  const hue2 = beat8(Math.floor(bpm * 3 / 2), 170, now);

  const c1 = hsv2rgb(hue1, 255, 255);
  const c2 = hsv2rgb(hue2, 255, 255);

  pixels[pos1].r = c1.r;
  pixels[pos1].g = c1.g;
  pixels[pos1].b = c1.b;

  pixels[pos2].r = c2.r;
  pixels[pos2].g = c2.g;
  pixels[pos2].b = c2.b;
};
