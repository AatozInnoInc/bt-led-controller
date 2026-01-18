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

export type RGBColor = [number, number, number]; // [R, G, B] where each is 0-255

export interface LEDConfig {
  readonly brightness: number; // 0-100
  readonly speed: number; // 0-100
  readonly color: RGBColor; // RGB color (Arduino will convert to HSV for FastLED)
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
  color: [0, 122, 255], // RGB: iOS blue
  effectType: EffectType.SOLID,
  powerState: false,
};

