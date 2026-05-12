export interface ConfigState {
  brightness: number;
  speed: number;
  color: { r: number; g: number; b: number };
  pattern: number;
  powerMode: number;
}

export interface CommandResult<T = void> {
  success: boolean;
  errorCode?: number;
  data?: T;
}
