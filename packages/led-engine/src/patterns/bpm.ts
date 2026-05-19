import type { PatternFn } from '@bt-led/led-types';
import { beat8, hsv2rgb, mapRange } from '../math';

// Palette stripes pulsing outward from beats-per-minute mapped from speed.
export const bpm: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const bpmVal = mapRange(cfg.speed, 0, 100, 40, 160);

  for (let i = 0; i < n; i++) {
    const phase = Math.floor((i * 255) / Math.max(1, n));
    const bri = beat8(bpmVal, phase, now);
    const hue = (phase + beat8(Math.floor(bpmVal / 2), 0, now)) & 0xff;
    const rgb = hsv2rgb(hue, 255, bri);
    pixels[i].r = rgb.r;
    pixels[i].g = rgb.g;
    pixels[i].b = rgb.b;
  }

  void cfg;
};
