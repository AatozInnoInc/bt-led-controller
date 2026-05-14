import type { LedConfig, PatternId, RGB } from '@bt-led/led-types';
import { STATELESS_PATTERNS, createFire } from '@bt-led/led-engine';

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
  fade: 1500,    // mid-cycle → warm yellow hue
  chase: 200,
  twinkle: 0,
  wave: 600,
  breath: 600,
  strobe: 0,
  fire: 1500,
  meteor: 400,
  colorwipe: 800,
  plasma: 600,
  larson: 500,   // dot somewhere near the middle of its travel
  confetti: 0,
};

// Patterns that use Math.random. Swap in a seeded LCG for stable thumbnails.
const RANDOM_PATTERNS = new Set<PatternId>(['twinkle', 'confetti']);

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
      // Tick multiple frames so the heat column has time to develop.
      const fire = createFire(n);
      for (let i = 0; i < 40; i++) fire(pixels, cfg, i * 40);
    } else if (id === 'larson') {
      // Tick a few frames so the fading trail is visible.
      for (let i = 5; i >= 0; i--) {
        STATELESS_PATTERNS.larson(pixels, cfg, now - i * 40);
      }
    } else {
      STATELESS_PATTERNS[id](pixels, cfg, now);
    }
  };

  if (RANDOM_PATTERNS.has(id))
    withSeededRandom(0xc0ffee, run);
  else run();

  cache.set(key, pixels);
  return pixels;
}
