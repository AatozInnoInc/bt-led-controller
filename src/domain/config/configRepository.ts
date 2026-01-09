import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceSettings } from '../../utils/bleConstants';
import { logger } from '../../utils/logger';

const CONFIG_STORAGE_KEY = '@led_guitar:config';
const CONFIG_CACHE_KEY = '@led_guitar:config_cache';

/**
 * Config Repository
 * Manages cached configuration state, serialization, and local persistence
 */
export class ConfigRepository {
  private static instance: ConfigRepository;
  private cachedConfig: DeviceSettings | null = null;
  private isDirty: boolean = false;

  private constructor() {}

  static getInstance(): ConfigRepository {
    if (!ConfigRepository.instance) {
      ConfigRepository.instance = new ConfigRepository();
    }
    return ConfigRepository.instance;
  }

  /**
   * Load cached config from AsyncStorage
   */
  async loadCachedConfig(): Promise<DeviceSettings | null> {
    try {
      const cached = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        this.cachedConfig = this.validateConfig(parsed);
        this.isDirty = false;
        return this.cachedConfig;
      }
    } catch (error) {
      logger.error('ConfigRepository', 'Failed to load cached config', error as Error);
    }
    return null;
  }

  /**
   * Save config to cache (AsyncStorage)
   */
  async saveCachedConfig(config: DeviceSettings): Promise<void> {
    try {
      this.cachedConfig = this.validateConfig(config);
      await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(this.cachedConfig));
      this.isDirty = false;
    } catch (error) {
      logger.error('ConfigRepository', 'Failed to save cached config', error as Error);
      throw error;
    }
  }

  /**
   * Get current cached config (in-memory)
   */
  getCachedConfig(): DeviceSettings | null {
    return this.cachedConfig;
  }

  /**
   * Update cached config (marks as dirty)
   */
  updateCachedConfig(updates: Partial<DeviceSettings>): DeviceSettings {
    if (!this.cachedConfig) {
      // Create default config if none exists
      this.cachedConfig = this.getDefaultConfig();
    }

    this.cachedConfig = {
      ...this.cachedConfig,
      ...updates,
    };
    this.isDirty = true;
    return this.cachedConfig;
  }

  /**
   * Check if config has unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.isDirty;
  }

  /**
   * Mark config as saved (clears dirty flag)
   */
  markAsSaved(): void {
    this.isDirty = false;
  }

  /**
   * Serialize config for transmission
   */
  serializeConfig(config: DeviceSettings): string {
    return JSON.stringify(config);
  }

  /**
   * Deserialize config from received data
   */
  deserializeConfig(data: string): DeviceSettings | null {
    try {
		// TODO for Agent: Consider basic ACL so we can create more separation of concerns. Will be useful for testing, but also for future updates which could break backwards compatibility (i.e. config schema is changed in a way which breaks older builds)
      const parsed = JSON.parse(data);
      return this.validateConfig(parsed);
    } catch (error) {
      logger.error('ConfigRepository', 'Failed to deserialize config', error as Error);
      return null;
    }
  }

  /**
   * Validate config structure and values
   */
  validateConfig(config: any): DeviceSettings {
    const validated: DeviceSettings = {
      brightness: this.validateRange(config?.brightness, 0, 100, 50),
      currentPattern: this.validateRange(config?.currentPattern, 0, 9, 0),
      powerMode: this.validateRange(config?.powerMode, 0, 2, 0),
      autoOff: this.validateRange(config?.autoOff, 0, 255, 0),
      maxEffects: this.validateRange(config?.maxEffects, 1, 10, 10),
      defaultColor: this.validateColor(config?.defaultColor),
      speed: this.validateRange(config?.speed, 0, 100, 30),
      color: this.validateHSVColor(config?.color),
      effectType: this.validateRange(config?.effectType, 0, 5, 0),
      powerState: typeof config?.powerState === 'boolean' ? config.powerState : false,
    };

    return validated;
  }

  /**
   * Validate range and return default if invalid
   */
  private validateRange(value: any, min: number, max: number, defaultValue: number): number {
    const num = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(num) || num < min || num > max) {
      return defaultValue;
    }
    return num;
  }

  /**
   * Validate color array
   */
  private validateColor(color: any): [number, number, number] {
    if (Array.isArray(color) && color.length === 3) {
      const [r, g, b] = color.map(c => this.validateRange(c, 0, 255, 255));
      return [r, g, b];
    }
    return [255, 255, 255]; // Default white
  }

  /**
   * Validate HSV color structure
   */
  private validateHSVColor(color: any): { h: number; s: number; v: number } {
    if (color && typeof color === 'object') {
      return {
        h: this.validateRange(color.h, 0, 255, 160),
        s: this.validateRange(color.s, 0, 255, 255),
        v: this.validateRange(color.v, 0, 255, 255),
      };
    }
    return { h: 160, s: 255, v: 255 }; // Default iOS blue
  }

  /**
   * Get default config
   */
  getDefaultConfig(): DeviceSettings {
    return {
      brightness: 50,
      currentPattern: 0,
      powerMode: 0,
      autoOff: 0,
      maxEffects: 10,
      defaultColor: [255, 255, 255],
      speed: 30,
      color: { h: 160, s: 255, v: 255 }, // iOS blue in HSV
      effectType: 0, // SOLID
      powerState: false,
    };
  }

  /**
   * Clear cached config
   */
  async clearCache(): Promise<void> {
    try {
      this.cachedConfig = null;
      this.isDirty = false;
      await AsyncStorage.removeItem(CONFIG_CACHE_KEY);
    } catch (error) {
      logger.error('ConfigRepository', 'Failed to clear cache', error as Error);
    }
  }

  /**
   * Compare two configs to check if they're different
   */
  compareConfigs(config1: DeviceSettings, config2: DeviceSettings): boolean {
    return (
      config1.brightness !== config2.brightness ||
      config1.currentPattern !== config2.currentPattern ||
      config1.powerMode !== config2.powerMode ||
      config1.autoOff !== config2.autoOff ||
      config1.maxEffects !== config2.maxEffects ||
      config1.defaultColor[0] !== config2.defaultColor[0] ||
      config1.defaultColor[1] !== config2.defaultColor[1] ||
      config1.defaultColor[2] !== config2.defaultColor[2]
    );
  }

  /**
   * Get config differences (returns only changed fields)
   */
  getConfigDiff(oldConfig: DeviceSettings, newConfig: DeviceSettings): Partial<DeviceSettings> {
    const diff: Partial<DeviceSettings> = {};

    if (oldConfig.brightness !== newConfig.brightness) {
      diff.brightness = newConfig.brightness;
    }

    if (oldConfig.currentPattern !== newConfig.currentPattern) {
      diff.currentPattern = newConfig.currentPattern;
    }

    if (oldConfig.powerMode !== newConfig.powerMode) {
      diff.powerMode = newConfig.powerMode;
    }

    if (oldConfig.autoOff !== newConfig.autoOff) {
      diff.autoOff = newConfig.autoOff;
    }

    if (oldConfig.maxEffects !== newConfig.maxEffects) {
      diff.maxEffects = newConfig.maxEffects;
    }

    if (
      oldConfig.defaultColor[0] !== newConfig.defaultColor[0] ||
      oldConfig.defaultColor[1] !== newConfig.defaultColor[1] ||
      oldConfig.defaultColor[2] !== newConfig.defaultColor[2]
    ) {
      diff.defaultColor = newConfig.defaultColor;
    }

    return diff;
  }
}

export const configRepository = ConfigRepository.getInstance();

