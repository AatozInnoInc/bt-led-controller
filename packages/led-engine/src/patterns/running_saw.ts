import type { PatternFn } from '@bt-led/led-types';
import { hsv2rgb, mapRange, rgb2hsv, sin8 } from '../math';

// Scrolling sine + saw luminance with hue swept between Colour A and Colour B.
export const running_saw: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const shift = mapRange(cfg.speed, 0, 100, 5, 1);
  const t = now >> shift;

  const ha = rgb2hsv(cfg.color.r, cfg.color.g, cfg.color.b);
  const hb = cfg.secondaryColor
    ? rgb2hsv(cfg.secondaryColor.r, cfg.secondaryColor.g, cfg.secondaryColor.b)
    : { h: (ha.h + 96) & 0xff, s: ha.s, v: ha.v };

  for (let i = 0; i < n; i++) {
    const pos = Math.floor((i * 255) / Math.max(1, n)) & 0xff;
    const sinePart = sin8(pos + t);
    const sawPart = (pos + (t << 1)) & 0xff;
    const lum = Math.floor((sinePart + sawPart) / 2);
    const hueWheel = ((pos << 1) + t) & 0xff;
    const hue =
      (ha.h + Math.floor((((hb.h - ha.h + 256) & 0xff) * hueWheel) / 255)) & 0xff;
    const rgb = hsv2rgb(hue, 240, lum);
    pixels[i].r = rgb.r;
    pixels[i].g = rgb.g;
    pixels[i].b = rgb.b;
  }
};
