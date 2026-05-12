import type { PatternFn } from '@bt-led/led-types';
import { gamma8, hsv2rgb, mapRange, sin8 } from '../math';

// Mirrors wave() in bt-led-controller.ino: HSV traveling wave, speed controls time shift.
export const wave: PatternFn = (pixels, cfg, now) => {
  const speedShift = mapRange(cfg.speed, 0, 100, 4, 1);
  const timePhase = (now >>> speedShift) & 0xff;

  const n = pixels.length;
  for (let i = 0; i < n; i++) {
    const positionPhase = Math.floor((i * 255) / n) & 0xff;
    const wavePhase = (timePhase + positionPhase) & 0xff;
    const sineVal = sin8(wavePhase);
    const g = gamma8(sineVal);
    const rgb = hsv2rgb(wavePhase, 255, g);
    pixels[i].r = rgb.r;
    pixels[i].g = rgb.g;
    pixels[i].b = rgb.b;
  }
};
