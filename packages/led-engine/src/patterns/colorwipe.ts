import type { PatternFn } from '@bt-led/led-types';
import { mapRange } from '../math';

// Colorwipe: fill pixel-by-pixel with the preset colour, then erase pixel-by-pixel
// back to black, then repeat. Stateless — derived purely from `now` / speed.
//
// Simulator-only until a firmware port lands.
//
// Speed maps to ms-per-pixel:  100 → 20 ms,  0 → 200 ms.
export const colorwipe: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const stepMs = mapRange(cfg.speed, 0, 100, 200, 20);
  const cycle = Math.max(1, stepMs) * n * 2;
  const t = ((now % cycle) + cycle) % cycle;
  const step = Math.floor(t / Math.max(1, stepMs));

  const filling = step < n;
  const cursor = filling ? step : step - n;
  const { r, g, b } = cfg.color;

  for (let i = 0; i < n; i++) {
    const lit = filling ? i <= cursor : i > cursor;
    pixels[i].r = lit ? r : 0;
    pixels[i].g = lit ? g : 0;
    pixels[i].b = lit ? b : 0;
  }
};
