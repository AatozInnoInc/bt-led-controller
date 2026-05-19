import type { PatternFn } from '@bt-led/led-types';
import { fadeToBlackBy, hsv2rgb, mapRange } from '../math';

// Short-lived radial hue bursts along the strip (1D fireworks approximation).
export const fireworks: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  fadeToBlackBy(pixels, mapRange(cfg.speed, 0, 100, 16, 42));

  void now;

  const bursts = Math.max(1, Math.round(mapRange(cfg.speed, 0, 100, 1, 6)));

  for (let b = 0; b < bursts; b++) {
    if (Math.random() > 0.5)
      continue;
    const cx = Math.floor(Math.random() * n);
    const hue = Math.floor(Math.random() * 256);
    const radius = Math.max(2, Math.floor(n / 9));

    for (let k = -radius; k <= radius; k++) {
      const idx = cx + k;
      if (idx < 0 || idx >= n)
        continue;
      const falloff = 1 - Math.abs(k) / (radius + 1);
      const rgb = hsv2rgb(hue & 0xff, 255, Math.floor(255 * falloff));
      pixels[idx].r = rgb.r;
      pixels[idx].g = rgb.g;
      pixels[idx].b = rgb.b;
    }
  }
};
