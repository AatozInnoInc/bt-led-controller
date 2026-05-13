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
] as const;

export type PatternId = (typeof PATTERN_IDS)[number];

// Integer ids 0..9 match the firmware's PATTERN_* constants in device_config.h.
// Ids 10..13 (fire, meteor, colorwipe, plasma) are simulator-only until the
// firmware ports land — VirtualDevice accepts them via the PATTERN_FROM_INT
// table rather than the MAX_EFFECTS bound from ble-protocol.
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
  meteor: 11,
  colorwipe: 12,
  plasma: 13,
};

export const PATTERN_FROM_INT: Record<number, PatternId> = Object.fromEntries(
  PATTERN_IDS.map((id) => [PATTERN_INT[id], id]),
);

export type PatternFn = (pixels: RGB[], cfg: LedConfig, now: number) => void;
