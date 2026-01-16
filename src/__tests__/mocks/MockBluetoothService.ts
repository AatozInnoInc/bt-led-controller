/**
 * Mock Bluetooth Service
 * Wraps MockMicrocontroller to simulate BluetoothService interface
 */

import { MockMicrocontroller } from './MockMicrocontroller';
import { CommandResponse, AnalyticsBatch, ResponseType } from '../../types/commands';
import { ErrorEnvelope, BLEError, ErrorCode } from '../../types/errors';
import { BLECommandEncoder } from '../../utils/bleCommandEncoder';

export class MockBluetoothService {
  private microcontroller: MockMicrocontroller;
  private connectedDeviceId: string | null = null;
  private isInitialized: boolean = false;
  private notificationCallback: ((response: CommandResponse | ErrorEnvelope | AnalyticsBatch) => void) | null = null;
  private disconnectionCallback: ((deviceId: string) => void) | null = null;
  private ownershipVerifiedCallback: ((verified: boolean) => void) | null = null;

  constructor(microcontroller?: MockMicrocontroller) {
    this.microcontroller = microcontroller || new MockMicrocontroller();
  }

  /**
   * Get the mock microcontroller for test manipulation
   */
  getMicrocontroller(): MockMicrocontroller {
    return this.microcontroller;
  }

  /**
   * Check if Bluetooth is available
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Initialize Bluetooth
   */
  async initialize(): Promise<boolean> {
    this.isInitialized = true;
    return true;
  }

  /**
   * Request Bluetooth permissions
   */
  async requestPermissions(): Promise<boolean> {
    return true;
  }

  /**
   * Start device scan (mock)
   */
  async startScan(onDeviceFound?: (device: any) => void): Promise<void> {
    // Mock scanning - simulate finding a device
    if (onDeviceFound) {
      setTimeout(() => {
        onDeviceFound({
          id: 'mock-device-001',
          name: 'LED Guitar',
          rssi: -50,
        });
      }, 100);
    }
  }

  /**
   * Stop device scan
   */
  async stopScan(): Promise<void> {
    // No-op for mock
  }

  /**
   * Connect to device
   */
  async connectToDevice(deviceId: string): Promise<any> {
    this.connectedDeviceId = deviceId;
    this.microcontroller.clearSessionOwnership();
    return {
      id: deviceId,
      name: 'LED Guitar',
      isConnected: () => true,
    };
  }

  /**
   * Check if device is connected
   */
  async isDeviceConnected(deviceId: string): Promise<boolean> {
    return this.connectedDeviceId === deviceId;
  }

  /**
   * Disconnect from device
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    if (this.connectedDeviceId === deviceId) {
      this.connectedDeviceId = null;
      this.microcontroller.clearSessionOwnership();
      if (this.disconnectionCallback) {
        this.disconnectionCallback(deviceId);
      }
    }
  }

  /**
   * Send command to device
   */
  async sendCommand(deviceId: string, command: Uint8Array, timeout: number = 5000): Promise<CommandResponse> {
    if (!this.connectedDeviceId || this.connectedDeviceId !== deviceId) {
      throw new BLEError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Device not connected',
      });
    }

    // Process command through mock microcontroller
    const response = await this.microcontroller.processCommand(command);
    
    // Decode response
    const decoded = BLECommandEncoder.decodeResponse(response);

    // If it's an error envelope, throw BLEError
    if ('code' in decoded && !('isSuccess' in decoded)) {
      throw new BLEError(decoded as ErrorEnvelope);
    }

    // If it's an analytics batch, notify callback
    if ('batchId' in decoded) {
      if (this.notificationCallback) {
        this.notificationCallback(decoded as AnalyticsBatch);
      }
    }

    return decoded as CommandResponse;
  }

  /**
   * Send message (legacy, for compatibility)
   */
  async sendMessage(deviceId: string, message: string): Promise<void> {
    if (!this.connectedDeviceId || this.connectedDeviceId !== deviceId) {
      throw new Error('Device not connected');
    }
    // No-op for mock
  }

  /**
   * Setup notification listener
   */
  setNotificationCallback(callback: (response: CommandResponse | ErrorEnvelope | AnalyticsBatch) => void): void {
    this.notificationCallback = callback;
  }

  /**
   * Setup disconnection listener
   */
  onDeviceDisconnected(callback: (deviceId: string) => void): void {
    this.disconnectionCallback = callback;
  }

  /**
   * Setup ownership verification callback
   */
  setOwnershipVerifiedCallback(callback: (verified: boolean) => void): void {
    this.ownershipVerifiedCallback = callback;
  }

  /**
   * Simulate disconnection (for testing)
   */
  simulateDisconnect(): void {
    if (this.connectedDeviceId) {
      const deviceId = this.connectedDeviceId;
      this.connectedDeviceId = null;
      this.microcontroller.clearSessionOwnership();
      if (this.disconnectionCallback) {
        this.disconnectionCallback(deviceId);
      }
    }
  }

  /**
   * Reset the mock service
   */
  reset(): void {
    this.connectedDeviceId = null;
    this.isInitialized = false;
    this.notificationCallback = null;
    this.disconnectionCallback = null;
    this.ownershipVerifiedCallback = null;
    this.microcontroller.reset();
  }
}



