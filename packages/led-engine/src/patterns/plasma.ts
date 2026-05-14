import type { PatternFn } from '@bt-led/led-types';
import { gamma8, hsv2rgb, mapRange, rgb2hsv, sin8 } from '../math';

// Plasma: sum of two phase-shifted sines drives an HSV hue + value modulation.
// When secondaryColor is set, hue sweep is constrained to [color, secondaryColor] range.
// Otherwise palette-driven (full HSV), same convention as `wave` and `fire`.
//
// Speed maps to the time-shift rate via a 5..1 bit-shift of `now`.
export const plasma: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const speedShift = mapRange(cfg.speed, 0, 100, 5, 1);
  const t = (now >>> speedShift) & 0xff;

  const hueA = cfg.secondaryColor ? rgb2hsv(cfg.color.r, cfg.color.g, cfg.color.b).h : 0;
  const hueB = cfg.secondaryColor ? rgb2hsv(cfg.secondaryColor.r, cfg.secondaryColor.g, cfg.secondaryColor.b).h : 255;

  for (let i = 0; i < n; i++) {
    const pos = Math.floor((i * 255) / Math.max(1, n)) & 0xff;
    const wave1 = sin8((pos + t) & 0xff);
    const wave2 = sin8((pos * 2 + (255 - t)) & 0xff);
    const rawHue = (wave1 + wave2) >>> 1;
    const hue = cfg.secondaryColor
      ? (hueA + Math.round((hueB - hueA) * (rawHue / 255)) + 256) & 0xff
      : rawHue & 0xff;
    const v = gamma8((sin8((pos + t * 2) & 0xff) >>> 1) + 96);
    const rgb = hsv2rgb(hue, 255, v);
    pixels[i].r = rgb.r;
    pixels[i].g = rgb.g;
    pixels[i].b = rgb.b;
  }
};
