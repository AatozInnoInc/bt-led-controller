import type { PatternFn } from '@bt-led/led-types';
import { mapRange } from '../math';
import { hash01 } from './simNoise';

// Rare bright bursts against a dark stormy bias field (deterministic strike cadence).
export const lightning: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const windowMs = Math.max(120, mapRange(cfg.speed, 0, 100, 1600, 220));
  const slot = Math.floor(now / windowMs);
  const strike = hash01(slot) > 0.78;

  const dim = {
    r: Math.floor(cfg.color.r * 0.06),
    g: Math.floor(cfg.color.g * 0.06),
    b: Math.floor(cfg.color.b * 0.06),
  };

  for (let i = 0; i < n; i++) {
    pixels[i].r = dim.r;
    pixels[i].g = dim.g;
    pixels[i].b = dim.b;
  }

  if (!strike)
    return;

  const burst = Math.floor(hash01(slot + 17) * n);
  const span = Math.max(3, Math.floor(n / 7));

  for (let k = -span; k <= span; k++) {
    const idx = burst + k;
    if (idx >= 0 && idx < n) {
      pixels[idx].r = 255;
      pixels[idx].g = 255;
      pixels[idx].b = 255;
    }
  }
};
