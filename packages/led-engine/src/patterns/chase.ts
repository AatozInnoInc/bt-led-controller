import type { PatternFn } from '@bt-led/led-types';
import { beat8, fadeToBlackBy, mapRange } from '../math';

// CHASER_PULSE bpm from the .ino. Three offset markers with a fading trail.
const CHASER_PULSE = 12;

export const chase: PatternFn = (pixels, _cfg, now) => {
  const n = pixels.length;
  const max = n - 1;
  const pos1 = mapRange(beat8(CHASER_PULSE, 0, now), 0, 255, 0, max);
  const pos2 = mapRange(beat8(CHASER_PULSE, 85, now), 0, 255, 0, max);
  const pos3 = mapRange(beat8(CHASER_PULSE, 170, now), 0, 255, 0, max);

  fadeToBlackBy(pixels, 20);

  if (pixels[pos1]) Object.assign(pixels[pos1], { r: 255, g: 0, b: 0 });
  if (pixels[pos2]) Object.assign(pixels[pos2], { r: 255, g: 255, b: 255 });
  if (pixels[pos3]) Object.assign(pixels[pos3], { r: 0, g: 0, b: 255 });
};
