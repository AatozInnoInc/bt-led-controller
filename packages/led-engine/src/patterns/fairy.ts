import type { PatternFn } from '@bt-led/led-types';
import { fadeToBlackBy, hsv2rgb, mapRange } from '../math';

// Fairy lights: sparse warm sparkles that linger softly (holiday-string vibe).
export const fairy: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  fadeToBlackBy(pixels, mapRange(cfg.speed, 0, 100, 6, 18));

  void now;

  const warmHueMin = 12;
  const warmHueMax = 42;
  const count = Math.max(1, Math.round(mapRange(cfg.speed, 0, 100, 2, 6)));

  for (let k = 0; k < count; k++) {
    if (Math.random() > 0.55)
      continue;
    const idx = Math.floor(Math.random() * n);
    const hue = warmHueMin + Math.floor(Math.random() * (warmHueMax - warmHueMin));
    const tint = hsv2rgb(hue, Math.floor(cfg.color.r > 200 ? 180 : 220), 255);
    pixels[idx].r = Math.min(255, pixels[idx].r + tint.r);
    pixels[idx].g = Math.min(255, pixels[idx].g + tint.g);
    pixels[idx].b = Math.min(255, pixels[idx].b + tint.b);
  }
};
