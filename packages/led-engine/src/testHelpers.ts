import type { LedConfig, PatternId, RGB } from '@bt-led/led-types';

export const makeBuffer = (count: number, fill: RGB = { r: 0, g: 0, b: 0 }): RGB[] =>
  Array.from({ length: count }, () => ({ ...fill }));

export const makeConfig = (overrides: Partial<LedConfig> = {}): LedConfig => ({
  pattern: 'off' as PatternId,
  color: { r: 255, g: 128, b: 0 },
  speed: 50,
  brightness: 128,
  powerMode: 0,
  ...overrides,
});
