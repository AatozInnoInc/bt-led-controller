import type { PatternFn } from '@bt-led/led-types';
import { sin8 } from '../math';

// Mirrors breath() in bt-led-controller.ino:
//   b = (sin8(millis() >> 3) + 1) >> 1; ledBuf[i] = {b, b, b};
export const breath: PatternFn = (pixels, _cfg, now) => {
  const value = ((sin8((now >>> 3) & 0xff) + 1) >>> 1) & 0xff;
  for (const p of pixels) {
    p.r = value;
    p.g = value;
    p.b = value;
  }
};
