import type { PatternFn } from '@bt-led/led-types';
import { hsv2rgb, mapRange, rgb2hsv } from '../math';

// Colour Fade: the entire strip shows a single uniform colour that slowly cycles
// through the full HSV wheel. All LEDs are always the same hue — this is what
// distinguishes Fade from Wave (spatial) and Pulse/Breath (brightness modulation).
// Speed controls the rotation rate: 0 → 12 s/cycle, 100 → 1 s/cycle.
// With a secondary colour set: oscillates between primary and secondary hue instead.
export const fade: PatternFn = (pixels, cfg, now) => {
  const period = Math.max(1, mapRange(cfg.speed, 0, 100, 12000, 1000));
  const phase = (now / period) * 256; // unbounded, wraps via & 0xff
  const hue8 = Math.floor(phase) & 0xff;

  let rgb;
  if (cfg.secondaryColor) {
    const h1 = rgb2hsv(cfg.color.r, cfg.color.g, cfg.color.b).h;
    const h2 = rgb2hsv(cfg.secondaryColor.r, cfg.secondaryColor.g, cfg.secondaryColor.b).h;
    // Oscillate between h1 and h2 using a sine wave
    const t = Math.sin((hue8 / 255) * Math.PI * 2) * 0.5 + 0.5;
    const lerpHue = (h1 + Math.round((h2 - h1) * t) + 256) & 0xff;
    rgb = hsv2rgb(lerpHue, 255, 255);
  } else {
    rgb = hsv2rgb(hue8, 255, 255);
  }

  for (const p of pixels) {
    p.r = rgb.r;
    p.g = rgb.g;
    p.b = rgb.b;
  }
};
