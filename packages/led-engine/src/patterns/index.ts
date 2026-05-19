import type { PatternFn, PatternId } from '@bt-led/led-types';
import { aurora } from './aurora';
import { bpm } from './bpm';
import { createBouncingBalls } from './bouncing_balls';
import { breath } from './breath';
import { candle } from './candle';
import { chase } from './chase';
import { chase_rainbow } from './chase_rainbow';
import { colorwipe } from './colorwipe';
import { confetti } from './confetti';
import { distortion_waves } from './distortion_waves';
import { dissolve } from './dissolve';
import { fade } from './fade';
import { fairy } from './fairy';
import { createFire } from './fire';
import { fireworks } from './fireworks';
import { glitter } from './glitter';
import { gradient } from './gradient';
import { icu } from './icu';
import { larson } from './larson';
import { lighthouse } from './lighthouse';
import { lightning } from './lightning';
import { meteor } from './meteor';
import { off } from './off';
import { pacifica } from './pacifica';
import { perlin_move } from './perlin_move';
import { plasma } from './plasma';
import { pulse } from './pulse';
import { rainbow } from './rainbow';
import { railway } from './railway';
import { rain } from './rain';
import { running_saw } from './running_saw';
import { solid } from './solid';
import { sparkle_plus } from './sparkle_plus';
import { strobe } from './strobe';
import { sunrise } from './sunrise';
import { twinkle } from './twinkle';
import { wave } from './wave';

// Stateless patterns share one instance. `fire` and `bouncing_balls` keep per-strip
// closure state and are constructed in `buildPatternRegistry`.
export const STATELESS_PATTERNS: Record<Exclude<PatternId, 'fire' | 'bouncing_balls'>, PatternFn> = {
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
  larson,
  confetti,
  glitter,
  fairy,
  sparkle_plus,
  pacifica,
  aurora,
  sunrise,
  gradient,
  lighthouse,
  icu,
  chase_rainbow,
  running_saw,
  railway,
  bpm,
  perlin_move,
  distortion_waves,
  lightning,
  rain,
  fireworks,
  candle,
  dissolve,
};

export function buildPatternRegistry(ledCount: number): Record<PatternId, PatternFn> {
  return {
    ...STATELESS_PATTERNS,
    fire: createFire(ledCount),
    bouncing_balls: createBouncingBalls(ledCount),
  };
}

export { createFire, createBouncingBalls };
