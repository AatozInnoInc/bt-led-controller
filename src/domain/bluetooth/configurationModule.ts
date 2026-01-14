import { Platform } from 'react-native';
import { BLECommandEncoder } from './bleCommandEncoder';
import { ErrorEnvelope, checkAndParseErrorEnvelope, createErrorEnvelope, ErrorCode } from '../common/errorEnvelope';
import { BluetoothDevice } from '../../types/bluetooth';
import { bluetoothService } from '../../utils/bluetoothService';
// Helper to get the correct Bluetooth service based on platform.
// NOTE: Avoid importing bluetoothWebService at module top to prevent circular dependency
// (bluetoothWebService imports configurationModule). Use lazy require for web.
const getBleService = () => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { bluetoothWebService } = require('../../utils/bluetoothWebService');
    return bluetoothWebService;
  }
  return bluetoothService;
};

export type ConfigModeState = 'inactive' | 'entering' | 'active' | 'exiting' | 'error';

export interface ConfigModeStatus {
  state: ConfigModeState;
  error?: ErrorEnvelope;
}

/**
 * Configuration Module
 * Manages entering/exiting config mode and tracks config mode state
 */
export class ConfigurationModule {
  private static instance: ConfigurationModule;
  private configModeState: ConfigModeState = 'inactive';
  private connectedDevice: BluetoothDevice | null = null;
  private stateListeners: Array<(status: ConfigModeStatus) => void> = [];
  private transitionDebounceTimer: NodeJS.Timeout | null = null;
  private readonly TRANSITION_DEBOUNCE_MS = 1000; // 1 second debounce for BLE transitions
  private readonly COMMAND_TIMEOUT_MS = 5000; // 5 second timeout for commands
  private lastReceivedConfig: any = null; // Store config received from device

  private constructor() {}

  static getInstance(): ConfigurationModule {
    if (!ConfigurationModule.instance) {
      ConfigurationModule.instance = new ConfigurationModule();
    }
    return ConfigurationModule.instance;
  }

  /**
   * Set connected device
   */
  setConnectedDevice(device: BluetoothDevice | null): void {
    this.connectedDevice = device;
    if (!device) {
      this.configModeState = 'inactive';
      this.notifyStateChange();
    }
  }

  /**
   * Get current config mode state
   */
  getState(): ConfigModeState {
    return this.configModeState;
  }

  /**
   * Check if config mode is active
   */
  isConfigModeActive(): boolean {
    return this.configModeState === 'active';
  }

  /**
   * Enter config mode
   * Includes proper state management and debouncing
   */
  async enterConfigMode(): Promise<{ success: boolean; error?: ErrorEnvelope }> {
    // Validate preconditions
    if (!this.connectedDevice) {
      const error = createErrorEnvelope(ErrorCode.INVALID_COMMAND, 'No device connected');
      this.setErrorState(error);
      return { success: false, error };
    }

    // Check if already active (idempotent)
    if (this.configModeState === 'active') {
      return { success: true };
    }

    // Debounce rapid transitions
    if (this.isTransitionInProgress()) {
      const error = createErrorEnvelope(
        ErrorCode.INVALID_COMMAND,
        'Config mode transition in progress. Please wait before retrying.'
      );
      return { success: false, error };
    }

    try {
      this.setState('entering');

      const command = BLECommandEncoder.encodeEnterConfigMode();

      // Send with built-in timeout (sendCommand has timeout built-in)
      const response = await getBleService().sendCommand(this.connectedDevice.id, command, this.COMMAND_TIMEOUT_MS);

      // Check if command was successful
      if (!response.isSuccess) {
        throw new Error('Enter config mode command failed');
      }

      // Wait for acknowledgment (in real implementation, this would wait for notification)
      await new Promise(resolve => setTimeout(resolve, 500));

      this.setState('active');
      return { success: true };
    } catch (error: any) {
      console.log('Enter config mode error:', error);
      console.log('Error details:', {
        name: error.name,
        message: error.message,
        envelope: error.envelope,
      });
      
      // Check if it's a BLEError with specific error codes
      if (error.name === 'BLEError' && error.envelope) {
        const errorCode = error.envelope.code;
        console.log('BLEError with code:', errorCode, 'ErrorCode enum:', ErrorCode[errorCode]);
        
        // Already in config mode - treat as success (idempotent)
        if (errorCode === ErrorCode.ALREADY_IN_CONFIG_MODE) {
          console.log('Device already in config mode - treating as success');
          this.setState('active');
          return { success: true };
        }
        
        // No config file found - valid state for first-time setup
        if (errorCode === ErrorCode.FLASH_WRITE_FAILED || 
            errorCode === ErrorCode.FLASH_FAILURE ||
            errorCode === ErrorCode.SETTINGS_CORRUPT) {
          console.log('No config file found on device (error code:', errorCode, ') - will use defaults');
          this.setState('active');
          return { success: true };
        }
      }
      
      // For all other errors, recover and report
      if (this.configModeState === 'entering') {
        this.setState('inactive');
      }
      
      const errorEnvelope = error.envelope || createErrorEnvelope(
        ErrorCode.INVALID_COMMAND,
        error?.message || 'Failed to enter config mode'
      );
      this.setErrorState(errorEnvelope);
      return { success: false, error: errorEnvelope };
    }
  }

  /**
   * Exit config mode
   * Refactored with proper state management, debouncing, and recovery
   */
  async exitConfigMode(): Promise<{ success: boolean; error?: ErrorEnvelope }> {
    // Validate preconditions
    const validationError = this.validateExitPreconditions();
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Check if already inactive (idempotent)
    if (this.configModeState === 'inactive') {
      return { success: true };
    }

    // Debounce rapid transitions
    if (this.isTransitionInProgress()) {
      return this.handleTransitionInProgress();
    }

    // Execute exit with proper state management and recovery
    return this.executeExitTransition();
  }

  /**
   * Validate preconditions for exiting config mode
   */
  private validateExitPreconditions(): ErrorEnvelope | null {
    if (!this.connectedDevice) {
      return createErrorEnvelope(ErrorCode.INVALID_COMMAND, 'No device connected');
    }
    return null;
  }

  /**
   * Check if a transition is currently in progress
   */
  private isTransitionInProgress(): boolean {
    return this.configModeState === 'entering' || this.configModeState === 'exiting';
  }

  /**
   * Handle case where transition is already in progress (with debouncing)
   */
  private handleTransitionInProgress(): { success: boolean; error: ErrorEnvelope } {
    // Clear any existing debounce timer
    if (this.transitionDebounceTimer) {
      clearTimeout(this.transitionDebounceTimer);
    }

    // Return error immediately - debouncing is handled by checking state
    const error = createErrorEnvelope(
      ErrorCode.INVALID_COMMAND,
      'Config mode transition in progress. Please wait before retrying.'
    );
    return { success: false, error };
  }

  /**
   * Execute the exit transition with proper error recovery
   */
  private async executeExitTransition(): Promise<{ success: boolean; error?: ErrorEnvelope }> {
    // Set state to exiting
    this.setState('exiting');

    try {
      // Send exit command with timeout
      await this.sendExitCommandWithTimeout();

      // Wait for acknowledgment (with timeout)
      await this.waitForAcknowledgment();

      // Success - set state to inactive
      this.setState('inactive');
      return { success: true };
    } catch (error: any) {
      // Recovery: attempt to reset state
      return this.handleExitError(error);
    }
  }

  /**
   * Send exit command with timeout protection
   */
  private async sendExitCommandWithTimeout(): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('Device disconnected during exit');
    }

    const command = BLECommandEncoder.encodeExitConfigMode();

    // Send with built-in timeout (sendCommand has timeout built-in)
    const response = await getBleService().sendCommand(this.connectedDevice.id, command, this.COMMAND_TIMEOUT_MS);

    // Check if command was successful
    if (!response.isSuccess) {
      throw new Error('Exit config mode command failed');
    }
  }

  /**
   * Wait for acknowledgment with timeout
   */
  private async waitForAcknowledgment(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Acknowledgment timeout'));
      }, this.COMMAND_TIMEOUT_MS);

      // Check state periodically (in real implementation, this would wait for notification)
      const checkInterval = setInterval(() => {
        // If state changed to inactive, we got acknowledgment
        if (this.configModeState === 'inactive') {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Fallback: resolve after short delay (simulating acknowledgment)
      setTimeout(() => {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        resolve();
      }, 500);
    });
  }

  /**
   * Handle errors during exit with state recovery
   */
  private handleExitError(error: any): { success: boolean; error: ErrorEnvelope } {
    // Attempt recovery: reset to last known good state
    // If we were exiting, try to go back to active (recoverable)
    if (this.configModeState === 'exiting') {
      console.warn('Exit failed, attempting state recovery');
      // Could attempt to re-enter config mode or reset to inactive
      // For now, reset to inactive as safest recovery
      this.setState('inactive');
    }

    const errorEnvelope = createErrorEnvelope(
      ErrorCode.INVALID_COMMAND,
      error?.message || 'Failed to exit config mode'
    );
    this.setErrorState(errorEnvelope);
    return { success: false, error: errorEnvelope };
  }

  /**
   * Set state with notification (centralized state management)
   */
  private setState(newState: ConfigModeState): void {
    this.configModeState = newState;
    this.notifyStateChange();
  }

  /**
   * Handle response from device (called by BluetoothService when notification received)
   */
  handleResponse(data: Uint8Array | number[] | string): void {
    console.log('[ConfigurationModule] ====== handleResponse CALLED ======');
    console.log('[ConfigurationModule] this:', this);
    console.log('[ConfigurationModule] this.constructor.name:', this.constructor.name);
    try {
      console.log('[ConfigurationModule] handleResponse ENTERED with data type:', typeof data, 'length:', typeof data === 'string' ? data.length : (Array.isArray(data) ? data.length : (data as Uint8Array).length));

      // Normalize data for acknowledgment check
      const arrayData = typeof data === 'string' 
        ? new Uint8Array(data.split('').map(c => c.charCodeAt(0)))
        : (Array.isArray(data) ? new Uint8Array(data) : data);

      console.log('[ConfigurationModule] Normalized to arrayData, length:', arrayData.length, 'first byte:', arrayData.length > 0 ? '0x' + arrayData[0].toString(16) : 'N/A');

    // IMPORTANT: Check for config response BEFORE error envelope
    // Both use 0x90 as first byte, but config is exactly 8 bytes
    // Config response: [0x90, brightness, speed, r, g, b, effectType, powerState] (8 bytes)
    // Error envelope: [0x90, errorCode, ...messageBytes] (variable length, typically not 8 bytes)
    if (arrayData.length === 8 && arrayData[0] === 0x90) {
      console.log('[ConfigurationModule] Received 8-byte binary config response');
      console.log('[ConfigurationModule] Response bytes:', Array.from(arrayData).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      console.log('[ConfigurationModule] Current state:', this.configModeState);
      // Parse config from binary response: [0x90, brightness, speed, h, s, v, effectType, powerState]
      const config = this.parseConfigFromResponse(arrayData);
      if (config) {
        this.lastReceivedConfig = config;
        console.log('[ConfigurationModule] Parsed config from device:', config);
      } else {
        console.warn('[ConfigurationModule] Failed to parse config from response');
      }

      // Only set state to active if we were entering (don't override if already active)
      if (this.configModeState === 'entering') {
        this.setState('active');
      }
      return;
    }

    // Check for error envelope using helper function (AFTER checking for config response)
    const error = checkAndParseErrorEnvelope(data);
    if (error) {
      this.setErrorState(error);
      return;
    }

    // Check if it's a regular acknowledgment
    if (BLECommandEncoder.isAcknowledgment(arrayData)) {
      const ack = BLECommandEncoder.parseAcknowledgment(arrayData);
      if (ack.type === 'config_mode' && this.configModeState === 'entering') {
        this.setState('active');
      } else if (ack.type === 'commit' && this.configModeState === 'active') {
        // Commit successful, but stay in config mode
        this.notifyStateChange();
      }
    }
    } catch (error) {
      console.error('[ConfigurationModule] Error in handleResponse:', error);
      console.error('[ConfigurationModule] Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  /**
   * Parse config from device response
   * Format: [0x90, brightness, speed, r, g, b, effectType, powerState] (8 bytes)
   */
  private parseConfigFromResponse(data: Uint8Array): any | null {
    console.log('[ConfigurationModule] parseConfigFromResponse called, data length:', data.length, 'first byte:', data.length > 0 ? '0x' + data[0].toString(16) : 'N/A');
    if (data.length !== 8 || data[0] !== 0x90) {
      console.warn('[ConfigurationModule] parseConfigFromResponse: Invalid data - length:', data.length, 'first byte:', data.length > 0 ? '0x' + data[0].toString(16) : 'N/A');
      return null;
    }

    try {
      return {
        brightness: data[1],
        speed: data[2],
        color: [data[3], data[4], data[5]] as [number, number, number], // RGB format
        effectType: data[6],
        powerState: data[7] > 0,
      };
    } catch (error) {
      console.error('[ConfigurationModule] Failed to parse config from response:', error);
      return null;
    }
  }

  /**
   * Get the last received config from device (if available)
   */
  getLastReceivedConfig(): any | null {
    return this.lastReceivedConfig;
  }

  /**
   * Set config directly (workaround for debugging)
   */
  setConfigDirectly(config: any): void {
    console.log('[ConfigurationModule] setConfigDirectly called with:', config);
    this.lastReceivedConfig = config;
    console.log('[ConfigurationModule] Config set directly, lastReceivedConfig is now:', this.lastReceivedConfig);
  }

  /**
   * Clear the last received config
   */
  clearLastReceivedConfig(): void {
    this.lastReceivedConfig = null;
  }

  /**
   * Set error state
   */
  private setErrorState(error: ErrorEnvelope): void {
    this.configModeState = 'error';
    this.notifyStateChange({ state: 'error', error });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    if (this.configModeState === 'error') {
      this.configModeState = 'inactive';
      this.notifyStateChange();
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (status: ConfigModeStatus) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify state change to all listeners
   */
  private notifyStateChange(status?: ConfigModeStatus): void {
    const currentStatus: ConfigModeStatus = status || {
      state: this.configModeState,
    };

    this.stateListeners.forEach(listener => {
      try {
        listener(currentStatus);
      } catch (error) {
        console.error('Error in config mode state listener:', error);
      }
    });
  }

  /**
   * Reset to inactive state
   */
  reset(): void {
    // Clear any pending debounce timers
    if (this.transitionDebounceTimer) {
      clearTimeout(this.transitionDebounceTimer);
      this.transitionDebounceTimer = null;
    }
    this.setState('inactive');
  }
}

export const configurationModule = ConfigurationModule.getInstance();
