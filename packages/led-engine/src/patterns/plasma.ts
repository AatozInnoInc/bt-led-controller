import type { PatternFn } from '@bt-led/led-types';
import { gamma8, hsv2rgb, mapRange, sin8 } from '../math';

// Plasma: sum of two phase-shifted sines drives an HSV hue + value modulation.
// Palette-driven (does not use cfg.color), same convention as `wave` and `fire`.
//
// Simulator-only until a firmware port lands.
//
// Speed maps to the time-shift rate via a 5..1 bit-shift of `now`.
export const plasma: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const speedShift = mapRange(cfg.speed, 0, 100, 5, 1);
  const t = (now >>> speedShift) & 0xff;

  for (let i = 0; i < n; i++) {
    const pos = Math.floor((i * 255) / Math.max(1, n)) & 0xff;
    const wave1 = sin8((pos + t) & 0xff);
    const wave2 = sin8((pos * 2 + (255 - t)) & 0xff);
    const hue = (wave1 + wave2) >>> 1;
    const v = gamma8((sin8((pos + t * 2) & 0xff) >>> 1) + 96);
    const rgb = hsv2rgb(hue & 0xff, 255, v);
    pixels[i].r = rgb.r;
    pixels[i].g = rgb.g;
    pixels[i].b = rgb.b;
  }
};
