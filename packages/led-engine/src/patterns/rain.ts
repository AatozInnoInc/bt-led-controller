import type { PatternFn } from '@bt-led/led-types';
import { fadeToBlackBy, hsv2rgb, mapRange } from '../math';
import { hash01 } from './simNoise';

// Falling cyan/teal streaks with short tails (rain-style dripdown).
export const rain: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  fadeToBlackBy(pixels, mapRange(cfg.speed, 0, 100, 40, 85));

  void cfg;

  const stepMs = mapRange(cfg.speed, 0, 100, 110, 28);
  const slot = Math.floor(now / Math.max(8, stepMs));
  const drops = Math.max(2, Math.round(mapRange(cfg.speed, 0, 100, 2, Math.floor(n / 4))));

  for (let d = 0; d < drops; d++) {
    const seed = slot + d * 991;
    const col = Math.floor(hash01(seed) * n);
    const hue = 135 + Math.floor(hash01(seed + 2) * 55);
    const head = hsv2rgb(hue, 210, 255);
    pixels[col].r = head.r;
    pixels[col].g = head.g;
    pixels[col].b = head.b;

    const below = col + 1;
    if (below < n) {
      const tail = hsv2rgb(hue, 200, 140);
      pixels[below].r = tail.r;
      pixels[below].g = tail.g;
      pixels[below].b = tail.b;
    }
  }
};
