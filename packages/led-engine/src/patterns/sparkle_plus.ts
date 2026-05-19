import type { PatternFn } from '@bt-led/led-types';
import { mapRange } from '../math';

// Sparkle+: strip lit in primary colour; random LEDs briefly dip darker (WLED-style inverse sparkle).
export const sparkle_plus: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  void now;

  const { r, g, b } = cfg.color;
  for (let i = 0; i < n; i++) {
    pixels[i].r = r;
    pixels[i].g = g;
    pixels[i].b = b;
  }

  const cuts = Math.max(2, Math.round(mapRange(cfg.speed, 0, 100, 4, Math.max(5, Math.floor(n / 4)))));
  for (let k = 0; k < cuts; k++) {
    if (Math.random() > 0.65)
      continue;
    const idx = Math.floor(Math.random() * n);
    pixels[idx].r = Math.floor(r * 0.12);
    pixels[idx].g = Math.floor(g * 0.12);
    pixels[idx].b = Math.floor(b * 0.12);
  }
};
