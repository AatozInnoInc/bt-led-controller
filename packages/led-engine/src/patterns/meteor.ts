import type { PatternFn } from '@bt-led/led-types';
import { fadeToBlackBy, mapRange } from '../math';

// NightDriverStrip-style meteor: a 2-LED head sweeps across the strip with
// a fading trail. Trail state lives in the shared pixel buffer (same pattern
// as `chase`), so no closure is required — this remains a pure PatternFn.
//
// Simulator-only until a firmware port lands (mirrors how `fire` shipped).
//
// Speed maps to ms-per-full-sweep:  100 → 600 ms,  0 → 5000 ms.
const HEAD_SIZE = 2;
const TRAIL_FADE = 64;

export const meteor: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  if (n === 0)
    return;

  const period = mapRange(cfg.speed, 0, 100, 5000, 600);
  const phase = (now % period) / period;
  // Sweep across the strip plus an extra `HEAD_SIZE` so the head fully exits
  // before wrapping — otherwise the trailing pixels get clobbered mid-sweep.
  const head = Math.floor(phase * (n + HEAD_SIZE));

  fadeToBlackBy(pixels, TRAIL_FADE);

  for (let i = 0; i < HEAD_SIZE; i++) {
    const idx = head - i;
    if (idx >= 0 && idx < n) {
      pixels[idx].r = cfg.color.r;
      pixels[idx].g = cfg.color.g;
      pixels[idx].b = cfg.color.b;
    }
  }
};
