import type { PatternId } from './pattern';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LedConfig {
  pattern: PatternId;
  color: RGB;
  speed: number;
  brightness: number;
  powerMode: number;
}

export interface LedPreset {
  id: string;
  name: string;
  createdAt: string;
  version: 1;
  config: LedConfig;
}

export interface ExportEnvelope {
  schema: 'led-simulator-preset-v1';
  preset: LedPreset;
  generatedCode?: string;
}
