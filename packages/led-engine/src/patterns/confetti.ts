import type { PatternFn } from '@bt-led/led-types';
import { fadeToBlackBy, hsv2rgb, mapRange } from '../math';

// Confetti: random coloured sparkles appear and fade smoothly. Unlike Twinkle
// (which uses a single colour), Confetti assigns a random HSV hue to each
// sparkle — matching the FastLED DemoReel100 "confetti" effect.
// Speed controls how many new sparkles appear each frame.
export const confetti: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  fadeToBlackBy(pixels, 10);

  // 2..6 new sparkles per frame depending on speed
  const count = Math.max(1, Math.round(mapRange(cfg.speed, 0, 100, 2, 6)));
  for (let i = 0; i < count; i++) {
    const pos = Math.floor(Math.random() * n);
    const hue = Math.floor(Math.random() * 256);
    const rgb = hsv2rgb(hue, 255, 255);
    if (pixels[pos]) {
      pixels[pos].r = rgb.r;
      pixels[pos].g = rgb.g;
      pixels[pos].b = rgb.b;
    }
  }

  // Suppress unused-param lint — cfg.color is intentionally not used;
  // confetti is palette-driven (random hues) like wave/plasma.
  void cfg;
  void now;
};
