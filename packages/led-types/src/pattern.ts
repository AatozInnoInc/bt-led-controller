import type { LedConfig, RGB } from './preset';

export const PATTERN_IDS = [
  'off',
  'solid',
  'rainbow',
  'pulse',
  'fade',
  'chase',
  'twinkle',
  'wave',
  'breath',
  'strobe',
  'fire',
  'meteor',
  'colorwipe',
  'plasma',
  'larson',
  'confetti',
] as const;

export type PatternId = (typeof PATTERN_IDS)[number];

// Integer ids 0..13 all have firmware equivalents (MAX_EFFECTS = 14).
// Ids 14+ (larson, confetti) are simulator-only until firmware ports land.
// VirtualDevice uses PATTERN_FROM_INT for validation, so all registered ids work.
export const PATTERN_INT: Record<PatternId, number> = {
  off: 0,
  solid: 1,
  rainbow: 2,
  pulse: 3,
  fade: 4,
  chase: 5,
  twinkle: 6,
  wave: 7,
  breath: 8,
  strobe: 9,
  meteor: 10,
  colorwipe: 11,
  plasma: 12,
  fire: 13,
  larson: 14,
  confetti: 15,
};

export const PATTERN_FROM_INT: Record<number, PatternId> = Object.fromEntries(
  PATTERN_IDS.map((id) => [PATTERN_INT[id], id]),
);

export type PatternFn = (pixels: RGB[], cfg: LedConfig, now: number) => void;
