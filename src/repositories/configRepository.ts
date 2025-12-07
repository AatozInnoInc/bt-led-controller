/**
 * Config Repository
 * Manages cached configuration data using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEDConfig, DEFAULT_CONFIG } from '../types/config';

const CONFIG_STORAGE_KEY = (deviceId: string) => `led_config_${deviceId}`;

export class ConfigRepository {
  /**
   * Load cached configuration for a device
   */
  async loadCachedConfig(deviceId: string): Promise<LEDConfig | null> {
    try {
      const data = await AsyncStorage.getItem(CONFIG_STORAGE_KEY(deviceId));
      if (!data) {
        return null;
      }
      const config = JSON.parse(data);
      // Validate and return config
      return this.validateConfig(config) ? config : null;
    } catch (error) {
      console.error('Failed to load cached config:', error);
      return null;
    }
  }

  /**
   * Save configuration to cache
   */
  async saveCachedConfig(deviceId: string, config: LEDConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CONFIG_STORAGE_KEY(deviceId),
        JSON.stringify(config)
      );
    } catch (error) {
      console.error('Failed to save cached config:', error);
      throw error;
    }
  }

  /**
   * Clear cached configuration for a device
   */
  async clearCache(deviceId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(CONFIG_STORAGE_KEY(deviceId));
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(config: any): config is LEDConfig {
    return (
      typeof config === 'object' &&
      typeof config.brightness === 'number' &&
      config.brightness >= 0 &&
      config.brightness <= 100 &&
      typeof config.speed === 'number' &&
      config.speed >= 0 &&
      config.speed <= 100 &&
      typeof config.color === 'object' &&
      typeof config.color.h === 'number' &&
      config.color.h >= 0 &&
      config.color.h <= 255 &&
      typeof config.color.s === 'number' &&
      config.color.s >= 0 &&
      config.color.s <= 255 &&
      typeof config.color.v === 'number' &&
      config.color.v >= 0 &&
      config.color.v <= 255 &&
      typeof config.effectType === 'number' &&
      typeof config.powerState === 'boolean'
    );
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): LEDConfig {
    return { ...DEFAULT_CONFIG };
  }
}

export const configRepository = new ConfigRepository();

