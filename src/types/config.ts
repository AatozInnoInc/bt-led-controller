/**
 * Configuration Types
 * Immutable configuration data structures
 */

export enum ConfigModeState {
  RUN = 'run',
  CONFIG = 'config',
}

export enum EffectType {
  SOLID = 0,
  PULSE = 1,
  RAINBOW = 2,
  WAVE = 3,
  STROBE = 4,
  CUSTOM = 5,
}

// FastLED uses HSV color model (0-255 for all components)
export interface HSVColor {
  readonly h: number; // 0-255 (Hue)
  readonly s: number; // 0-255 (Saturation)
  readonly v: number; // 0-255 (Value/Brightness)
}

export interface LEDConfig {
  readonly brightness: number; // 0-100
  readonly speed: number; // 0-100
  readonly color: HSVColor; // HSV color for FastLED compatibility
  readonly effectType: EffectType;
  readonly powerState: boolean;
}

export interface ConfigParameter {
  id: number;
  name: string;
  min: number;
  max: number;
  defaultValue: number;
}

export const DEFAULT_CONFIG: LEDConfig = {
  brightness: 50,
  speed: 30,
  color: { h: 160, s: 255, v: 255 }, // HSV: iOS blue (hue ~160, full saturation, full value)
  effectType: EffectType.SOLID,
  powerState: false,
};

