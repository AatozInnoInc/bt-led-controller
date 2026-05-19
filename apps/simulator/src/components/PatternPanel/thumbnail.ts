import type { LedConfig, PatternId, RGB } from '@bt-led/led-types';
import { STATELESS_PATTERNS, createBouncingBalls, createFire } from '@bt-led/led-engine';

// White is a clean neutral: pattern structure (which LEDs are lit, trails, gradients)
// reads clearly regardless of pattern. Palette-driven effects (rainbow, wave, plasma,
// fire) manage their own colours and ignore this field anyway.
const DEFAULT_CFG: LedConfig = {
  pattern: 'off',
  color: { r: 255, g: 255, b: 255 },
  speed: 50,
  brightness: 255,
  powerMode: 0,
};

// Pattern-specific `now` (ms) chosen so the static frame lands on something visible.
const NOW: Record<PatternId, number> = {
  off: 0,
  solid: 0,
  rainbow: 0,
  pulse: 400,
  fade: 1500,
  chase: 200,
  twinkle: 0,
  wave: 600,
  breath: 600,
  strobe: 0,
  fire: 1500,
  meteor: 400,
  colorwipe: 800,
  plasma: 600,
  larson: 500,
  confetti: 0,
  glitter: 350,
  fairy: 0,
  sparkle_plus: 0,
  pacifica: 900,
  aurora: 700,
  sunrise: 5200,
  gradient: 900,
  lighthouse: 700,
  icu: 900,
  chase_rainbow: 400,
  running_saw: 600,
  railway: 400,
  bpm: 0,
  perlin_move: 1300,
  distortion_waves: 500,
  lightning: 1820,
  rain: 950,
  fireworks: 0,
  candle: 450,
  bouncing_balls: 800,
  dissolve: 1400,
};

// Patterns that use Math.random — seeded LCG keeps grid thumbnails stable.
const RANDOM_PATTERNS = new Set<PatternId>([
  'twinkle',
  'confetti',
  'glitter',
  'fairy',
  'sparkle_plus',
  'fireworks',
]);

function withSeededRandom<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  let state = seed >>> 0;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

const cache = new Map<string, RGB[]>();

export function thumbnailFor(id: PatternId, n = 8): RGB[] {
  const key = `${id}@${n}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const pixels: RGB[] = Array.from({ length: n }, () => ({ r: 0, g: 0, b: 0 }));
  const cfg: LedConfig = { ...DEFAULT_CFG, pattern: id };
  const now = NOW[id];

  const run = () => {
    if (id === 'fire') {
      const fire = createFire(n);
      for (let i = 0; i < 40; i++) fire(pixels, cfg, i * 40);
    } else if (id === 'bouncing_balls') {
      const bb = createBouncingBalls(n);
      for (let i = 0; i < 36; i++) bb(pixels, cfg, now + i * 36);
    } else if (id === 'larson') {
      for (let i = 5; i >= 0; i--) {
        STATELESS_PATTERNS.larson(pixels, cfg, now - i * 40);
      }
    } else {
      const fn = STATELESS_PATTERNS[id as keyof typeof STATELESS_PATTERNS];
      fn(pixels, cfg, now);
    }
  };

  if (RANDOM_PATTERNS.has(id))
    withSeededRandom(0xc0ffee, run);
  else run();

  cache.set(key, pixels);
  return pixels;
}
