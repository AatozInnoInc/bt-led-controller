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
] as const;

export type PatternId = (typeof PATTERN_IDS)[number];

// Integer ids match the firmware's PATTERN_* constants in device_config.h.
// `fire` (10) is simulator-only until the firmware port lands.
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
  fire: 10,
};

export const PATTERN_FROM_INT: Record<number, PatternId> = Object.fromEntries(
  PATTERN_IDS.map((id) => [PATTERN_INT[id], id]),
);

export type PatternFn = (pixels: RGB[], cfg: LedConfig, now: number) => void;
