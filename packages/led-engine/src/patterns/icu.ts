import type { PatternFn } from '@bt-led/led-types';
import { fadeToBlackBy, mapRange } from '../math';

// Two ICU “eyes”: dots launched from both ends toward centre with decay trails.
export const icu: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  fadeToBlackBy(pixels, mapRange(cfg.speed, 0, 100, 35, 55));

  const period = Math.max(1, mapRange(cfg.speed, 0, 100, 5000, 600));
  const u = (now % period) / period;

  const mid = (n - 1) / 2;
  const left = Math.floor(u * mid);
  const right = n - 1 - Math.floor(u * mid);

  const { r, g, b } = cfg.color;

  const paint = (idx: number, gain: number) => {
    if (idx >= 0 && idx < n) {
      pixels[idx].r = Math.min(255, Math.floor(r * gain));
      pixels[idx].g = Math.min(255, Math.floor(g * gain));
      pixels[idx].b = Math.min(255, Math.floor(b * gain));
    }
  };

  paint(left, 1);
  paint(left - 1, 0.55);
  paint(right, 1);
  paint(right + 1, 0.55);
};
