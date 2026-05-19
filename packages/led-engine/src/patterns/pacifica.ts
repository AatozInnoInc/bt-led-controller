import type { PatternFn } from '@bt-led/led-types';
import { blendRgb, hsv2rgb, mapRange, sin8 } from '../math';

// Layered teal / blue sine waves suggesting gentle ocean surf (Pacifica-inspired).
export const pacifica: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const speedShift = mapRange(cfg.speed, 0, 100, 6, 2);
  const t = now >> speedShift;

  const layerA = hsv2rgb(132, 200, 255);
  const layerB = hsv2rgb(156, 180, 220);
  const layerC = hsv2rgb(170, 140, 180);

  for (let i = 0; i < n; i++) {
    const pos = Math.floor((i * 255) / Math.max(1, n)) & 0xff;
    const w1 = sin8(pos + t);
    const w2 = sin8(pos / 2 + (t * 3) / 2 + 40);
    const w3 = sin8(pos / 3 + 255 - (t >> 1));

    let acc = blendRgb(layerA, layerB, w1);
    acc = blendRgb(acc, layerC, Math.floor(w2 / 2));
    acc.r = Math.min(255, Math.floor((acc.r + w3 / 4)));
    acc.g = Math.min(255, Math.floor((acc.g + w3 / 6)));

    pixels[i].r = acc.r;
    pixels[i].g = acc.g;
    pixels[i].b = acc.b;
  }
};
