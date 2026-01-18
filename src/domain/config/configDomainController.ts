import { Platform } from 'react-native';
import { ConfigRepository, configRepository } from './configRepository';
import { ConfigurationModule, configurationModule, ConfigModeStatus } from '../bluetooth/configurationModule';
import { BLECommandEncoder } from '../bluetooth/bleCommandEncoder';
import { ErrorEnvelope, createErrorEnvelope, ErrorCode } from '../common/errorEnvelope';
import { DeviceSettings, RGBColor } from '../../utils/bleConstants';
import { BluetoothDevice } from '../../types/bluetooth';
import { bluetoothService } from '../../utils/bluetoothService';
import { bluetoothWebService } from '../../utils/bluetoothWebService';
import { BLECommandEncoder as LegacyBLECommandEncoder } from '../../utils/bleCommandEncoder';
import { ParameterId } from '../../types/commands';
import { pairDevice, unpairDevice } from '../../utils/devicePairing';
import { BLEError } from '../../types/errors';

// Helper to get the correct Bluetooth service based on platform
const getBleService = () => Platform.OS === 'web' ? bluetoothWebService : bluetoothService;

export interface ConfigUpdateResult {
  success: boolean;
  error?: ErrorEnvelope;
}

export interface ConfigCommitResult {
  success: boolean;
  error?: ErrorEnvelope;
}

/**
 * Config Domain Controller
 * Coordinates config mode lifecycle, real-time updates, and commit workflow
 */
export class ConfigDomainController {
  private static instance: ConfigDomainController;
  private repository: ConfigRepository;
  private configModule: ConfigurationModule;
  private connectedDevice: BluetoothDevice | null = null;
  private deviceId: string | null = null;
  private updateListeners: Array<(config: DeviceSettings) => void> = [];
  private errorListeners: Array<(error: ErrorEnvelope) => void> = [];

  private constructor() {
    this.repository = configRepository;
    this.configModule = configurationModule;

    // Subscribe to config mode state changes
    this.configModule.subscribe((status: ConfigModeStatus) => {
      if (status.error) {
        this.notifyError(status.error);
      }
    });
  }

  static getInstance(): ConfigDomainController {
    if (!ConfigDomainController.instance) {
      ConfigDomainController.instance = new ConfigDomainController();
    }
    return ConfigDomainController.instance;
  }

  /**
   TODO FOR AGENT:: DO WE REMOVE THIS? OR DO WE MOVE IT SOMEWHER EELSE?
   * Helper to check if device is connected (DRY pattern from legacy)
   */
  private async ensureDeviceConnected(): Promise<void> {
    if (!this.deviceId && !this.connectedDevice) {
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'No device connected',
      });
    }

    const id = this.deviceId || this.connectedDevice?.id;
    if (id) {
      const isConnected = await getBleService().isDeviceConnected(id);
      if (!isConnected) {
        throw new BLEError({
          code: ErrorCode.UNKNOWN_ERROR,
          message: 'Device is not connected. Please reconnect and try again.',
        });
      }
    }
  }

  /**
   * Initialize with connected device
   */
  async initialize(device: BluetoothDevice | null): Promise<void> {
    this.connectedDevice = device;
    this.deviceId = device?.id || null;
    this.configModule.setConnectedDevice(device);

    if (device) {
      // Load cached config - handle null return gracefully
      try {
        const cachedConfig = await this.repository.loadCachedConfig();
        if (!cachedConfig) {
          // No cached config found, use defaults
          const defaultConfig = this.repository.getDefaultConfig();
          await this.repository.saveCachedConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Failed to load cached config:', error);
        // Use defaults if loading fails
        const defaultConfig = this.repository.getDefaultConfig();
        try {
          await this.repository.saveCachedConfig(defaultConfig);
        } catch (saveError) {
          console.error('Failed to save default config:', saveError);
        }
      }
    }
  }

  /**
   * Enter config mode and load current config
   */
  async enterConfigMode(): Promise<{ success: boolean; error?: ErrorEnvelope; config?: DeviceSettings }> {
    if (!this.connectedDevice) {
      const error = createErrorEnvelope(ErrorCode.INVALID_COMMAND, 'No device connected');
      return { success: false, error };
    }

    // Clear any previously received config
    this.configModule.clearLastReceivedConfig();

    // Enter config mode (this will trigger device to send config)
    const enterResult = await this.configModule.enterConfigMode();
    if (!enterResult.success) {
      return { success: false, error: enterResult.error };
    }

    // Wait for config response with polling (more reliable than fixed timeout)
    let deviceConfig = null;
    for (let i = 0; i < 20; i++) { // Poll up to 20 times (2 seconds total)
      deviceConfig = this.configModule.getLastReceivedConfig();
      if (deviceConfig) {
        console.log('[ConfigDomainController] Got config from device after', i * 100, 'ms');
        break;
      }
      if (i === 0 || i === 9 || i === 19) {
        // Log periodically to debug
        console.log(`[ConfigDomainController] Polling for config... (attempt ${i + 1}/20)`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final check with logging
    if (!deviceConfig) {
      console.warn('[ConfigDomainController] No config received after polling, checking one more time...');
      deviceConfig = this.configModule.getLastReceivedConfig();
      if (!deviceConfig) {
        console.warn('[ConfigDomainController] Config still not available. State:', this.configModule.getState());
      }
    }

    let config: DeviceSettings;

    if (deviceConfig) {
      // Convert device config to DeviceSettings format
      const defaultConfig = this.repository.getDefaultConfig();
      config = {
        ...defaultConfig,
        brightness: deviceConfig.brightness,
        speed: deviceConfig.speed,
        color: deviceConfig.color,
        effectType: deviceConfig.effectType,
        powerState: deviceConfig.powerState,
        currentPattern: deviceConfig.effectType,
      };
      console.log('[ConfigDomainController] Using config from device:', config);

      // Cache the device config
      await this.repository.saveCachedConfig(config);
    } else {
      // Fallback to cached config or defaults if device didn't send config
      console.log('[ConfigDomainController] No config from device, using cached/defaults');
      const cachedConfig = this.repository.getCachedConfig();
      if (cachedConfig) {
        config = cachedConfig;
      } else {
        config = this.repository.getDefaultConfig();
        await this.repository.saveCachedConfig(config);
      }
    }

    // Notify listeners of current config
    this.notifyConfigUpdate(config);

    return { success: true, config };
  }

  /**
   * Exit config mode
   */
  async exitConfigMode(): Promise<{ success: boolean; error?: ErrorEnvelope }> {
    const exitResult = await this.configModule.exitConfigMode();
    return exitResult;
  }

  /**
   * Update configuration parameter (real-time)
   */
  async updateConfig(updates: Partial<DeviceSettings>): Promise<ConfigUpdateResult> {
    if (!this.connectedDevice) {
      const error = createErrorEnvelope(ErrorCode.INVALID_COMMAND, 'No device connected');
      return { success: false, error };
    }

    if (!this.configModule.isConfigModeActive()) {
      const error = createErrorEnvelope(ErrorCode.INVALID_COMMAND, 'Config mode not active');
      return { success: false, error };
    }

    try {
      // Update cached config
      const updatedConfig = this.repository.updateCachedConfig(updates);

      // Send real-time update to device
      const commands = BLECommandEncoder.encodeSettingsUpdate(updates);
      console.log(`📤 Sending ${commands.length} command(s) for updates:`, updates);
      
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const hexBytes = Array.from(command).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
        console.log(`  Command ${i + 1}/${commands.length}:`, hexBytes);

        // Use sendCommand which handles response checking and errors
        const response = await getBleService().sendCommand(this.connectedDevice.id, command);
        console.log(`  Response ${i + 1}:`, response);

        if (!response.isSuccess) {
          throw new Error(`Command failed with response: ${JSON.stringify(response)}`);
        }
      }

      // Notify listeners
      this.notifyConfigUpdate(updatedConfig);

      return { success: true };
    } catch (error: any) {
      const errorEnvelope = createErrorEnvelope(
        ErrorCode.INVALID_PARAMETER,
        error?.message || 'Failed to update config'
      );
      this.notifyError(errorEnvelope);
      return { success: false, error: errorEnvelope };
    }
  }

  /**
   * Update brightness (convenience method)
   */
  async updateBrightness(brightness: number): Promise<ConfigUpdateResult> {
    return this.updateConfig({ brightness });
  }

  /**
   * Update pattern (convenience method)
   */
  async updatePattern(pattern: number): Promise<ConfigUpdateResult> {
    return this.updateConfig({ currentPattern: pattern });
  }

  /**
   * Update color (RGB format - Arduino will convert to HSV for FastLED)
   */
  async updateColor(color: RGBColor): Promise<ConfigUpdateResult> {
    return this.updateConfig({ color });
  }

  /**
   * Update power mode (convenience method)
   */
  async updatePowerMode(powerMode: number): Promise<ConfigUpdateResult> {
    return this.updateConfig({ powerMode });
  }

  /**
   * Update speed (convenience method)
   */
  async updateSpeed(speed: number): Promise<ConfigUpdateResult> {
    return this.updateConfig({ speed });
  }

  /**
    TODO FOR AGENT: REMOVE UPDATE PAREMTER. KEEP DEVICE CLAIMING THINGS
   * Update individual parameter (legacy method for finer-grained control)
   */
  async updateParameter(parameterId: ParameterId, value: number): Promise<ConfigUpdateResult> {
    if (!this.connectedDevice) {
      const error = createErrorEnvelope(ErrorCode.INVALID_COMMAND, 'No device connected');
      return { success: false, error };
    }

    // Ensure we're in config mode
    if (!this.configModule.isConfigModeActive()) {
      const enterResult = await this.enterConfigMode();
      if (!enterResult.success) {
        return { success: false, error: enterResult.error };
      }
    }

    try {
      // Send command to device
      const command = LegacyBLECommandEncoder.encodeUpdateParameter({ parameterId, value });
      const response = await getBleService().sendCommand(this.connectedDevice.id, command);
      
      if (!response.isSuccess) {
        const error = createErrorEnvelope(ErrorCode.INVALID_PARAMETER, 'Failed to update parameter');
        return { success: false, error };
      }

      return { success: true };
    } catch (error: any) {
      const errorEnvelope = createErrorEnvelope(
        ErrorCode.INVALID_PARAMETER,
        error?.message || 'Failed to update parameter'
      );
      this.notifyError(errorEnvelope);
      return { success: false, error: errorEnvelope };
    }
  }

  /**
   * Claim device ownership (one-time operation)
   */
  async claimDevice(deviceId: string, userId: string, deviceName?: string): Promise<void> {
    if (!deviceId) {
      throw new Error('Device ID is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Check if device is actually connected
    const isConnected = await getBleService().isDeviceConnected(deviceId);
    if (!isConnected) {
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Device is not connected. Please connect and try again.',
      });
    }

    try {
      const command = LegacyBLECommandEncoder.encodeClaimDevice(userId);
      const response = await getBleService().sendCommand(deviceId, command);
      
      if (!response.isSuccess) {
        throw new BLEError({
          code: ErrorCode.UNKNOWN_ERROR,
          message: 'Failed to claim device',
        });
      }

      // Store pairing in AsyncStorage
      await pairDevice(deviceId, userId, deviceName);
      
      // Verify ownership for this session
      await this.verifyOwnership(deviceId, userId);
    } catch (error) {
      if (error instanceof BLEError) {
        throw error;
      }
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: `Failed to claim device: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Unclaim device ownership (E2E - removes from both app and microcontroller)
   */
  async unclaimDevice(deviceId: string, userId: string): Promise<void> {
    if (!deviceId) {
      throw new Error('Device ID is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Check if device is actually connected
    const isConnected = await getBleService().isDeviceConnected(deviceId);
    if (!isConnected) {
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Device is not connected. Please connect and try again.',
      });
    }

    try {
      // Unclaim on microcontroller first
      const command = LegacyBLECommandEncoder.encodeUnclaimDevice(userId);
      const response = await getBleService().sendCommand(deviceId, command);
      
      if (!response.isSuccess) {
        throw new BLEError({
          code: ErrorCode.UNKNOWN_ERROR,
          message: 'Failed to unclaim device on microcontroller',
        });
      }

      // Remove pairing from app storage
      await unpairDevice(deviceId);
    } catch (error) {
      if (error instanceof BLEError) {
        throw error;
      }
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: `Failed to unclaim device: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Verify ownership for current session
   */
  async verifyOwnership(deviceId: string, userId: string): Promise<void> {
    if (!deviceId) {
      throw new Error('Device ID is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Check if device is actually connected
    const isConnected = await getBleService().isDeviceConnected(deviceId);
    if (!isConnected) {
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Device is not connected. Please connect and try again.',
      });
    }

    try {
      const command = LegacyBLECommandEncoder.encodeVerifyOwnership(userId);
      const response = await getBleService().sendCommand(deviceId, command);
      
      if (!response.isSuccess) {
        throw new BLEError({
          code: ErrorCode.NOT_OWNER,
          message: 'You are not the owner of this device',
        });
      }
    } catch (error) {
      if (error instanceof BLEError) {
        throw error;
      }
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: `Failed to verify ownership: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Commit configuration to flash
   */
  async commitConfig(): Promise<ConfigCommitResult> {
    if (!this.connectedDevice) {
      const error = createErrorEnvelope(ErrorCode.INVALID_COMMAND, 'No device connected');
      return { success: false, error };
    }

    if (!this.configModule.isConfigModeActive()) {
      const error = createErrorEnvelope(ErrorCode.INVALID_COMMAND, 'Config mode not active');
      return { success: false, error };
    }

    try {
      // Send commit command
      const command = BLECommandEncoder.encodeCommitConfig();
      const hexBytes = Array.from(command).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
      console.log('💾 Committing config with command:', hexBytes);

      const response = await getBleService().sendCommand(this.connectedDevice.id, command);
      console.log('💾 Commit response:', response);

      if (!response.isSuccess) {
        throw new Error(`Commit failed with response: ${JSON.stringify(response)}`);
      }

      // Save to local cache
      const config = this.repository.getCachedConfig();
      if (config) {
        await this.repository.saveCachedConfig(config);
        this.repository.markAsSaved();
      }

      return { success: true };
    } catch (error: any) {
      const errorEnvelope = createErrorEnvelope(
        ErrorCode.FLASH_FAILURE,
        error?.message || 'Failed to commit config'
      );
      this.notifyError(errorEnvelope);
      return { success: false, error: errorEnvelope };
    }
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): DeviceSettings | null {
    return this.repository.getCachedConfig();
  }

  /**
   * Check if config has unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.repository.hasUnsavedChanges();
  }

  /**
   * Get config mode state
   */
  getConfigModeState(): ConfigModeStatus {
    return {
      state: this.configModule.getState(),
    };
  }

  /**
   * Subscribe to config updates
   */
  subscribeToConfigUpdates(listener: (config: DeviceSettings) => void): () => void {
    this.updateListeners.push(listener);
    return () => {
      this.updateListeners = this.updateListeners.filter(l => l !== listener);
    };
  }

  /**
   * Subscribe to errors
   */
  subscribeToErrors(listener: (error: ErrorEnvelope) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify config update
   */
  private notifyConfigUpdate(config: DeviceSettings): void {
    this.updateListeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.error('Error in config update listener:', error);
      }
    });
  }

  /**
   * Notify error
   */
  private notifyError(error: ErrorEnvelope): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  /**
   * Reset controller
   */
  reset(): void {
    this.deviceId = null;
    this.connectedDevice = null;
    this.configModule.reset();
    this.repository.clearCache();
    this.updateListeners = [];
    this.errorListeners = [];
  }
}

export const configDomainController = ConfigDomainController.getInstance();


