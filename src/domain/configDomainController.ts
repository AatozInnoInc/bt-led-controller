/**
 * Config Domain Controller
 * Orchestrates configuration operations
 */

import { LEDConfig, DEFAULT_CONFIG, ConfigModeState, HSVColor } from '../types/config';
import { ParameterId } from '../types/commands';
import { BLEError, ErrorCode } from '../types/errors';
import { configRepository } from '../repositories/configRepository';
import { configurationModule } from './configurationModule';
import { BLECommandEncoder } from '../utils/bleCommandEncoder';
import { bluetoothService } from '../utils/bluetoothService';

export class ConfigDomainController {
  private deviceId: string | null = null;
  private currentConfig: LEDConfig = { ...DEFAULT_CONFIG };
  private pendingConfig: LEDConfig | null = null;

  /**
   * Initialize configuration for a device
   */
  async initializeConfig(deviceId: string): Promise<LEDConfig> {
    this.deviceId = deviceId;

    // Try to load cached config
    const cachedConfig = await configRepository.loadCachedConfig(deviceId);
    if (cachedConfig) {
      this.currentConfig = cachedConfig;
      return cachedConfig;
    }

    // Use default config
    this.currentConfig = { ...DEFAULT_CONFIG };
    return this.currentConfig;
  }

  /**
   * Enter configuration mode
   */
  async enterConfigMode(): Promise<boolean> {
    if (!this.deviceId) {
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'No device connected',
      });
    }

    // Check if device is actually connected before entering config mode
    const isConnected = await bluetoothService.isDeviceConnected(this.deviceId);
    if (!isConnected) {
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Device is not connected. Please reconnect and try again.',
      });
    }

    if (configurationModule.isInConfigMode()) {
      return true; // Already in config mode
    }

    try {
      const command = BLECommandEncoder.encodeEnterConfig();
      const response = await bluetoothService.sendCommand(this.deviceId, command);
      
      if (response.isSuccess) {
        configurationModule.setConfigModeState(ConfigModeState.CONFIG);
        // Initialize pending config with current config
        this.pendingConfig = { ...this.currentConfig };
        return true;
      }
      return false;
    } catch (error) {
      if (error instanceof BLEError) {
        throw error;
      }
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: `Failed to enter config mode: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Exit configuration mode
   */
  async exitConfigMode(): Promise<boolean> {
    if (!this.deviceId) {
      return false;
    }

    if (!configurationModule.isInConfigMode()) {
      return true; // Already in run mode
    }

    try {
      const command = BLECommandEncoder.encodeExitConfig();
      const response = await bluetoothService.sendCommand(this.deviceId, command);
      
      if (response.isSuccess) {
        configurationModule.setConfigModeState(ConfigModeState.RUN);
        this.pendingConfig = null;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to exit config mode:', error);
      // Still reset state even if command fails
      configurationModule.setConfigModeState(ConfigModeState.RUN);
      this.pendingConfig = null;
      return false;
    }
  }

  /**
   * Update color as a whole HSV value (preferred method)
   * Sends HSV as a single command for efficiency
   */
  async updateColor(color: HSVColor): Promise<void> {
    if (!this.deviceId) {
      throw new Error('No device connected');
    }

    // Ensure we're in config mode
    if (!configurationModule.isInConfigMode()) {
      await this.enterConfigMode();
    }

    // Update pending config
    if (!this.pendingConfig) {
      this.pendingConfig = { ...this.currentConfig };
    }

    // Clamp HSV values to valid range (0-255)
    const clampedColor: HSVColor = {
      h: Math.max(0, Math.min(255, Math.round(color.h))),
      s: Math.max(0, Math.min(255, Math.round(color.s))),
      v: Math.max(0, Math.min(255, Math.round(color.v))),
    };

    // Update pending config
    this.pendingConfig = { ...this.pendingConfig, color: clampedColor };

    // Send HSV as single command
    try {
      const command = BLECommandEncoder.encodeUpdateColor(clampedColor);
      const response = await bluetoothService.sendCommand(this.deviceId, command);
      
      if (!response.isSuccess) {
        throw new BLEError({
          code: ErrorCode.UNKNOWN_ERROR,
          message: 'Failed to update color',
        });
      }
    } catch (error) {
      // Revert pending config on error
      this.pendingConfig = { ...this.currentConfig };
      throw error;
    }
  }

  /**
   * Update a parameter in real-time
   */
  async updateParameter(parameterId: ParameterId, value: number): Promise<void> {
    if (!this.deviceId) {
      throw new Error('No device connected');
    }

    // Ensure we're in config mode
    if (!configurationModule.isInConfigMode()) {
      await this.enterConfigMode();
    }

    // Update pending config
    if (!this.pendingConfig) {
      this.pendingConfig = { ...this.currentConfig };
    }

    // Update the appropriate field in pending config
    switch (parameterId) {
      case ParameterId.BRIGHTNESS:
        this.pendingConfig = { ...this.pendingConfig, brightness: Math.max(0, Math.min(100, value)) };
        break;
      case ParameterId.SPEED:
        this.pendingConfig = { ...this.pendingConfig, speed: Math.max(0, Math.min(100, value)) };
        break;
      case ParameterId.COLOR_HUE:
        this.pendingConfig = {
          ...this.pendingConfig,
          color: { ...this.pendingConfig.color, h: Math.max(0, Math.min(255, value)) },
        };
        break;
      case ParameterId.COLOR_SATURATION:
        this.pendingConfig = {
          ...this.pendingConfig,
          color: { ...this.pendingConfig.color, s: Math.max(0, Math.min(255, value)) },
        };
        break;
      case ParameterId.COLOR_VALUE:
        this.pendingConfig = {
          ...this.pendingConfig,
          color: { ...this.pendingConfig.color, v: Math.max(0, Math.min(255, value)) },
        };
        break;
      case ParameterId.EFFECT_TYPE:
        this.pendingConfig = { ...this.pendingConfig, effectType: Math.max(0, Math.min(5, value)) };
        break;
      case ParameterId.POWER_STATE:
        this.pendingConfig = { ...this.pendingConfig, powerState: value > 0 };
        break;
    }

    // Send command to device
    try {
      const command = BLECommandEncoder.encodeUpdateParameter({ parameterId, value });
      const response = await bluetoothService.sendCommand(this.deviceId, command);
      
      if (!response.isSuccess) {
        throw new BLEError({
          code: ErrorCode.UNKNOWN_ERROR,
          message: 'Failed to update parameter',
        });
      }
    } catch (error) {
      // Revert pending config on error
      this.pendingConfig = { ...this.currentConfig };
      throw error;
    }
  }

  /**
   * Save configuration to flash memory
   */
  async saveConfiguration(): Promise<void> {
    if (!this.deviceId) {
      throw new Error('No device connected');
    }

    if (!configurationModule.isInConfigMode()) {
      throw new Error('Not in configuration mode');
    }

    if (!this.pendingConfig) {
      return; // Nothing to save
    }

    try {
      // Commit to flash
      const command = BLECommandEncoder.encodeCommitConfig();
      const response = await bluetoothService.sendCommand(this.deviceId, command);
      
      if (!response.isSuccess) {
        throw new BLEError({
          code: ErrorCode.FLASH_WRITE_FAILED,
          message: 'Failed to commit configuration to flash',
        });
      }

      // Update current config
      this.currentConfig = { ...this.pendingConfig };
      
      // Save to cache
      await configRepository.saveCachedConfig(this.deviceId, this.currentConfig);
      
      // Clear pending config
      this.pendingConfig = null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Revert pending changes
   */
  async revertChanges(): Promise<void> {
    this.pendingConfig = null;
    // Optionally exit config mode
    await this.exitConfigMode();
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): LEDConfig {
    return this.currentConfig;
  }

  /**
   * Get pending configuration
   */
  getPendingConfig(): LEDConfig | null {
    return this.pendingConfig;
  }

  /**
   * Check if there are pending changes
   */
  hasPendingChanges(): boolean {
    return this.pendingConfig !== null;
  }

  /**
   * Reset controller state
   */
  reset(): void {
    this.deviceId = null;
    this.currentConfig = { ...DEFAULT_CONFIG };
    this.pendingConfig = null;
    configurationModule.reset();
  }
}

export const configDomainController = new ConfigDomainController();

