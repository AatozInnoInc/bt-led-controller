import type { PatternFn, RGB } from '@bt-led/led-types';
import { fadeToBlackBy, hsv2rgb, mapRange } from '../math';

// Multi-ball bounce physics — closure keeps positions across ticks (speed tunes gravity).
export function createBouncingBalls(ledCount: number): PatternFn {
  let balls: Array<{ pos: number; vel: number; hue: number }> | null = null;
  let lastNow = 0;
  let stripLen = -1;

  void ledCount;

  return (pixels, cfg, now) => {
    const n = pixels.length;
    if (n === 0)
      return;

    if (!balls || stripLen !== n) {
      stripLen = n;
      balls = [];
      const count = Math.min(7, Math.max(3, Math.floor(Math.max(n, 8) / 8)));

      for (let i = 0; i < count; i++) {
        balls.push({
          pos: ((i + 0.5) / count) * Math.max(1, n - 1),
          vel: 0.28 + i * 0.07,
          hue: (i * 41) & 255,
        });
      }

      lastNow = now;
    }

    const dt = lastNow === 0 ? 33 : Math.min(90, Math.max(10, now - lastNow));
    lastNow = now;

    fadeToBlackBy(pixels, mapRange(cfg.speed, 0, 100, 18, 38));

    const g = mapRange(cfg.speed, 0, 100, 14, 48) / 9000;

    for (const b of balls) {
      b.vel += g * dt;
      b.pos += b.vel * dt * 0.09;

      if (b.pos >= n - 1) {
        b.pos = n - 1;
        b.vel *= -0.84;
      }

      if (b.pos <= 0) {
        b.pos = 0;
        if (b.vel < 0)
          b.vel *= -0.84;
      }

      const idx = Math.min(n - 1, Math.max(0, Math.round(b.pos)));
      const rgb = hsv2rgb(b.hue, 255, 255);
      smear(pixels, idx, rgb, n);
    }
  };
}

function smear(pixels: RGB[], idx: number, rgb: RGB, n: number): void {
  const span = 2;

  for (let k = -span; k <= span; k++) {
    const j = idx + k;
    if (j < 0 || j >= n)
      continue;
    const fall = 1 - Math.abs(k) / (span + 1);
    pixels[j].r = Math.min(255, pixels[j].r + Math.floor(rgb.r * fall));
    pixels[j].g = Math.min(255, pixels[j].g + Math.floor(rgb.g * fall));
    pixels[j].b = Math.min(255, pixels[j].b + Math.floor(rgb.b * fall));
  }
}
