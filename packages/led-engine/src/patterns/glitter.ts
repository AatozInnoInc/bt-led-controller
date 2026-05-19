import type { PatternFn } from '@bt-led/led-types';
import { fadeToBlackBy, hsv2rgb, mapRange, rgb2hsv } from '../math';

// Rainbow scroll with additive white sparks (FastLED DemoReel “glitter” family).
export const glitter: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  fadeToBlackBy(pixels, mapRange(cfg.speed, 0, 100, 10, 28));

  const period = Math.max(1, mapRange(cfg.speed, 0, 100, 9000, 700));
  const scroll = now / period;
  const secondary = cfg.secondaryColor;
  const ha = rgb2hsv(cfg.color.r, cfg.color.g, cfg.color.b);
  const hb = secondary ? rgb2hsv(secondary.r, secondary.g, secondary.b) : null;

  for (let i = 0; i < n; i++) {
    const pos = ((i / n) + scroll) % 1;
    let hue: number;
    if (hb) {
      hue = (ha.h + Math.round((hb.h - ha.h) * pos) + 256) & 0xff;
    } else {
      hue = Math.floor(pos * 255) & 0xff;
    }
    const rgb = hsv2rgb(hue, 240, 255);
    pixels[i].r = rgb.r;
    pixels[i].g = rgb.g;
    pixels[i].b = rgb.b;
  }

  const sparks = Math.max(2, Math.round(mapRange(cfg.speed, 0, 100, 3, 10)));
  for (let s = 0; s < sparks; s++) {
    if (Math.random() > 0.4)
      continue;
    const j = Math.floor(Math.random() * n);
    pixels[j].r = 255;
    pixels[j].g = 255;
    pixels[j].b = 255;
  }
};
