import type { PatternFn } from '@bt-led/led-types';
import { beat8, blendRgb, fadeToBlackBy, mapRange } from '../math';

// Three offset markers with a fading trail. BPM scales with speed.
// Colours come from cfg.color / cfg.secondaryColor when set; otherwise R/W/B.
export const chase: PatternFn = (pixels, cfg, now) => {
  const n = pixels.length;
  const max = n - 1;
  const bpm = mapRange(cfg.speed, 0, 100, 5, 30);
  const pos1 = mapRange(beat8(bpm, 0, now), 0, 255, 0, max);
  const pos2 = mapRange(beat8(bpm, 85, now), 0, 255, 0, max);
  const pos3 = mapRange(beat8(bpm, 170, now), 0, 255, 0, max);

  fadeToBlackBy(pixels, 20);

  const c1 = cfg.secondaryColor ? cfg.color : { r: 255, g: 0, b: 0 };
  const c3 = cfg.secondaryColor ?? { r: 0, g: 0, b: 255 };
  const c2 = cfg.secondaryColor ? blendRgb(c1, c3, 128) : { r: 255, g: 255, b: 255 };

  if (pixels[pos1]) Object.assign(pixels[pos1], c1);
  if (pixels[pos2]) Object.assign(pixels[pos2], c2);
  if (pixels[pos3]) Object.assign(pixels[pos3], c3);
};
