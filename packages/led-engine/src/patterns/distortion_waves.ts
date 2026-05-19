import type { PatternFn } from '@bt-led/led-types';
import { gamma8, hsv2rgb, mapRange, sin8 } from '../math';

// Phase-warped sine stack for a psychedelic travelling distortion look.
export const distortion_waves: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const shift = mapRange(cfg.speed, 0, 100, 6, 1);
  const t = now >> shift;

  const hueBias = Math.floor((cfg.color.r + cfg.color.g + cfg.color.b) / 6) & 0xff;

  for (let i = 0; i < n; i++) {
    const pos = Math.floor((i * 255) / Math.max(1, n)) & 0xff;
    const warp = sin8((pos >> 2) + (t << 1));
    const phase = (pos + Math.floor(warp / 6) + t) & 0xff;
    const hue = (phase + hueBias) & 0xff;
    const br = gamma8(sin8(phase));
    const rgb = hsv2rgb(hue, 255, br);
    pixels[i].r = rgb.r;
    pixels[i].g = rgb.g;
    pixels[i].b = rgb.b;
  }
};
