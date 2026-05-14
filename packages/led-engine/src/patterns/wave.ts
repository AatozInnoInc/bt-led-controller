import type { PatternFn } from '@bt-led/led-types';
import { gamma8, hsv2rgb, mapRange, rgb2hsv, sin8 } from '../math';

// Mirrors wave() in bt-led-controller.ino: HSV traveling wave, speed controls time shift.
// When secondaryColor is set, the hue sweep is constrained to the range [color, secondaryColor].
export const wave: PatternFn = (pixels, cfg, now) => {
  const speedShift = mapRange(cfg.speed, 0, 100, 4, 1);
  const timePhase = (now >>> speedShift) & 0xff;

  const n = pixels.length;
  const hueA = cfg.secondaryColor ? rgb2hsv(cfg.color.r, cfg.color.g, cfg.color.b).h : 0;
  const hueB = cfg.secondaryColor ? rgb2hsv(cfg.secondaryColor.r, cfg.secondaryColor.g, cfg.secondaryColor.b).h : 255;

  for (let i = 0; i < n; i++) {
    const positionPhase = Math.floor((i * 255) / n) & 0xff;
    const wavePhase = (timePhase + positionPhase) & 0xff;
    const sineVal = sin8(wavePhase);
    const g = gamma8(sineVal);
    const hue = cfg.secondaryColor
      ? (hueA + Math.round((hueB - hueA) * (wavePhase / 255)) + 256) & 0xff
      : wavePhase;
    const rgb = hsv2rgb(hue, 255, g);
    pixels[i].r = rgb.r;
    pixels[i].g = rgb.g;
    pixels[i].b = rgb.b;
  }
};
