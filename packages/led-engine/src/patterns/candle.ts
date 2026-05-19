import type { PatternFn } from '@bt-led/led-types';
import { mapRange } from '../math';
import { smoothNoise1 } from './simNoise';

// Warm flickering glow mapped from layered noise (candle flame approximation).
export const candle: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const flickWindow = mapRange(cfg.speed, 0, 100, 160, 42);
  const flick = smoothNoise1(now / flickWindow);

  const baseR = cfg.color.r > 10 ? cfg.color.r : 230;
  const baseG = cfg.color.g > 10 ? cfg.color.g : 110;
  const baseB = cfg.color.b > 10 ? cfg.color.b : 45;

  const amp = 0.62 + flick * 0.38;

  for (let i = 0; i < n; i++) {
    const local = smoothNoise1(i * 0.29 + now / 95);
    const a = amp * (0.82 + local * 0.18);
    pixels[i].r = Math.min(255, Math.floor(baseR * a));
    pixels[i].g = Math.min(255, Math.floor(baseG * a));
    pixels[i].b = Math.min(255, Math.floor(baseB * a));
  }
};
