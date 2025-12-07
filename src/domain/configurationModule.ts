/**
 * Configuration Module
 * Manages configuration mode state
 */

import { ConfigModeState } from '../types/config';

export class ConfigurationModule {
  private configModeState: ConfigModeState = ConfigModeState.RUN;

  /**
   * Check if device is in configuration mode
   */
  isInConfigMode(): boolean {
    return this.configModeState === ConfigModeState.CONFIG;
  }

  /**
   * Set configuration mode state
   */
  setConfigModeState(state: ConfigModeState): void {
    this.configModeState = state;
  }

  /**
   * Get current configuration mode state
   */
  getConfigModeState(): ConfigModeState {
    return this.configModeState;
  }

  /**
   * Reset to run mode
   */
  reset(): void {
    this.configModeState = ConfigModeState.RUN;
  }
}

export const configurationModule = new ConfigurationModule();

