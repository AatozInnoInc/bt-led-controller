import type { PatternFn } from '@bt-led/led-types';
import { fadeToBlackBy, hsv2rgb, mapRange } from '../math';
import { smoothNoise1 } from './simNoise';

// Sparse movers guided by smoothed 1D noise (standing in for flowing Perlin drift).
export const perlin_move: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  fadeToBlackBy(pixels, mapRange(cfg.speed, 0, 100, 45, 95));

  const movers = Math.max(3, Math.min(n, Math.round(mapRange(cfg.speed, 0, 100, 4, 14))));

  for (let m = 0; m < movers; m++) {
    const nx = smoothNoise1(now / 1100 + m * 4.17);
    const idx = Math.min(n - 1, Math.floor(nx * n));
    const hue = Math.floor(smoothNoise1(m * 9.2 + now / 750) * 256) & 0xff;
    const rgb = hsv2rgb(hue, 255, 255);
    pixels[idx].r = rgb.r;
    pixels[idx].g = rgb.g;
    pixels[idx].b = rgb.b;
  }

  void cfg;
};
