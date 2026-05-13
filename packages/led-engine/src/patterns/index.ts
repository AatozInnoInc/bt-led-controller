import type { PatternFn, PatternId } from '@bt-led/led-types';
import { breath } from './breath';
import { chase } from './chase';
import { colorwipe } from './colorwipe';
import { fade } from './fade';
import { createFire } from './fire';
import { meteor } from './meteor';
import { off } from './off';
import { plasma } from './plasma';
import { pulse } from './pulse';
import { rainbow } from './rainbow';
import { solid } from './solid';
import { strobe } from './strobe';
import { twinkle } from './twinkle';
import { wave } from './wave';

// Stateless patterns share one PatternFn instance; fire is per-device (heat array
// lives in a closure), so VirtualDevice constructs its own via createFire(ledCount).
export const STATELESS_PATTERNS: Record<Exclude<PatternId, 'fire'>, PatternFn> = {
  off,
  solid,
  rainbow,
  pulse,
  fade,
  chase,
  twinkle,
  wave,
  breath,
  strobe,
  meteor,
  colorwipe,
  plasma,
};

export function buildPatternRegistry(ledCount: number): Record<PatternId, PatternFn> {
  return {
    ...STATELESS_PATTERNS,
    fire: createFire(ledCount),
  };
}

export { createFire };
