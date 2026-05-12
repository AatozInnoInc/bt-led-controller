import type { PatternFn, RGB } from '@bt-led/led-types';
import { blendRgb } from '../math';

// Red → white → blue cycle, identical to rainbow() in bt-led-controller.ino.
// Not an HSV rainbow — that variant lives in `wave`.
const CYCLE: RGB[] = [
  { r: 255, g: 0, b: 0 },
  { r: 255, g: 255, b: 255 },
  { r: 0, g: 0, b: 255 },
];

export const rainbow: PatternFn = (pixels) => {
  const n = pixels.length;
  for (let i = 0; i < n; i++) {
    const position = i / n;
    const idx = Math.floor(position * 3) % 3;
    const blendFactor = position * 3 - Math.floor(position * 3);
    const start = CYCLE[idx];
    const end = CYCLE[(idx + 1) % 3];
    const blended = blendRgb(start, end, Math.floor(blendFactor * 255));
    pixels[i].r = blended.r;
    pixels[i].g = blended.g;
    pixels[i].b = blended.b;
  }
};
