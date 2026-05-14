import type { PatternFn, RGB } from '@bt-led/led-types';
import { blendRgb, hsv2rgb, mapRange, rgb2hsv } from '../math';

// Red → white → blue cycle (when no secondary colour set), scrolling with speed.
// Not an HSV rainbow — that variant lives in `wave`.
// When secondaryColor is set, sweeps between the two hues as an HSV gradient instead.
const CYCLE: RGB[] = [
  { r: 255, g: 0, b: 0 },
  { r: 255, g: 255, b: 255 },
  { r: 0, g: 0, b: 255 },
];

export const rainbow: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  // Speed 0 → 8000 ms/cycle, speed 100 → 500 ms/cycle
  const period = Math.max(1, mapRange(cfg.speed, 0, 100, 8000, 500));
  const scrollOffset = now / period; // fractional strips scrolled

  if (cfg.secondaryColor) {
    const hsv1 = rgb2hsv(cfg.color.r, cfg.color.g, cfg.color.b);
    const hsv2 = rgb2hsv(cfg.secondaryColor.r, cfg.secondaryColor.g, cfg.secondaryColor.b);
    // Use full brightness/saturation when source colours are achromatic
    const s = Math.max(hsv1.s, hsv2.s) > 0 ? 255 : 180;
    for (let i = 0; i < n; i++) {
      const position = ((i / n) + scrollOffset) % 1;
      const hue = (hsv1.h + Math.round((hsv2.h - hsv1.h) * position) + 256) & 0xff;
      const rgb = hsv2rgb(hue, s, 255);
      pixels[i].r = rgb.r;
      pixels[i].g = rgb.g;
      pixels[i].b = rgb.b;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const position = ((i / n) + scrollOffset) % 1;
      const cyclePos = ((position % 1) + 1) % 1; // always [0, 1)
      const idx = Math.floor(cyclePos * 3) % 3;
      const blendFactor = cyclePos * 3 - Math.floor(cyclePos * 3);
      const blended = blendRgb(CYCLE[idx], CYCLE[(idx + 1) % 3], Math.floor(blendFactor * 255));
      pixels[i].r = blended.r;
      pixels[i].g = blended.g;
      pixels[i].b = blended.b;
    }
  }
};
