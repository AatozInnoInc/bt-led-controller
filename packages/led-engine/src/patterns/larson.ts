import type { PatternFn } from '@bt-led/led-types';
import { fadeToBlackBy, mapRange } from '../math';

// Larson Scanner (KITT/Cylon eye): a single bright dot bounces back and forth
// across the strip, leaving a fading trail. Speed controls the bounce period.
// Uses cfg.color for the dot; secondaryColor is ignored (trail is just a dimmed
// version of the primary colour, derived from fadeToBlackBy).
export const larson: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0) return;

  // Speed 0 → 4000 ms/bounce, speed 100 → 300 ms/bounce
  const period = Math.max(1, mapRange(cfg.speed, 0, 100, 4000, 300));
  const phase = (now % period) / period; // 0..1
  // Triangle wave: 0 → n-1 → 0
  const t = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  const head = Math.round(t * (n - 1));

  fadeToBlackBy(pixels, 60);

  // Center dot at full brightness
  if (pixels[head]) Object.assign(pixels[head], cfg.color);
  // Dimmer flanking pixels for the eye shape
  const half = {
    r: Math.round(cfg.color.r * 0.4),
    g: Math.round(cfg.color.g * 0.4),
    b: Math.round(cfg.color.b * 0.4),
  };
  if (head > 0 && pixels[head - 1]) Object.assign(pixels[head - 1], half);
  if (head < n - 1 && pixels[head + 1]) Object.assign(pixels[head + 1], half);
};
