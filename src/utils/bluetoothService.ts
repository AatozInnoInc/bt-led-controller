import { Platform } from 'react-native';
import { BluetoothDevice, BLEConnection } from '../types/bluetooth';
import { NUS_SERVICE_UUID, NUS_WRITE_CHAR_UUID, NUS_NOTIFY_CHAR_UUID, isUuidLikelyUart } from './bleConstants';
import { CommandResponse, AnalyticsBatch, ResponseType } from '../types/commands';
import { ErrorEnvelope, BLEError, ErrorCode } from '../types/errors';
import { BLECommandEncoder } from './bleCommandEncoder';
import { bluetoothWebService } from './bluetoothWebService';

// TODO For Agent
// - We have listeners and callbacks. They should be handled in a more centralized way. RIght now it feels a bit one-shotty.
// - We need to determine whether or not we need to use BLEConnection and NUS_SERVICE_UUID

// Only import react-native-ble-plx on native platforms
let BleManager: any, Device: any, State: any;
if (Platform.OS !== 'web') {
  try {
    const blePlx = require('react-native-ble-plx');
    BleManager = blePlx.BleManager;
    Device = blePlx.Device;
    State = blePlx.State;
  } catch (error) {
    console.warn('react-native-ble-plx not available:', error);
  }
}

class BluetoothService {
  private manager: any;
  private isInitialized: boolean = false;
  private connectedDevices: Map<string, any> = new Map();
  private notificationSubscriptions: Map<string, any> = new Map();
  private responseCallbacks: Map<string, (response: CommandResponse | ErrorEnvelope | AnalyticsBatch) => void> = new Map();
  private analyticsCallbacks: Map<string, (batch: AnalyticsBatch) => void> = new Map();
  private analyticsBuffers: Map<string, Uint8Array> = new Map(); // Buffer for multi-chunk analytics batches
  private disconnectionListeners: Map<string, (deviceId: string) => void> = new Map();

  constructor() {
    if (Platform.OS !== 'web' && BleManager) {
      this.manager = new BleManager();
    } else {
      this.manager = null;
    }
  }

  isAvailable(): boolean {
    return !!this.manager;
  }

  async initialize(): Promise<boolean> {
    try {
      const state = await this.manager.state();
      this.isInitialized = state === State.PoweredOn;
      return this.isInitialized;
    } catch (error) {
      console.error('Failed to initialize Bluetooth:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // For Android, permissions are handled by the library
      // For iOS, permissions are requested automatically when scanning
      if (!this.manager) {
        console.warn('Bluetooth manager not available');
        return false;
      }

      const state = await this.manager.state();
      console.log('Bluetooth state:', state);

      // Check if we need to request permissions
      if (state === State.Unauthorized) {
        console.log('Bluetooth permissions not granted');
        return false;
      }

      return state === State.PoweredOn;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  async startScan(onDeviceFound?: (device: any) => void): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Bluetooth not initialized');
    }

    if (!this.manager) {
      throw new Error('Bluetooth manager not available');
    }

    try {
      console.log('Starting Bluetooth scan...');
      await this.manager.startDeviceScan(
        null, // null means scan for all devices
        { allowDuplicates: false },
        (error: any, device: any) => {
          if (error) {
            console.error('Scan error:', error);
            return;
          }
          if (device) {
            // Device found - this will be handled by the component
            console.log('Found device:', {
              id: device.id,
              name: device.name,
              rssi: device.rssi,
              manufacturerData: device.manufacturerData,
              serviceUUIDs: device.serviceUUIDs,
              localName: device.localName
            });

            // Special logging for our specific device
            if (device.name && device.name.includes('LED Guitar Controller')) {
              console.log('🎯 POTENTIAL MICROCONTROLLER FOUND:', device.name);
              console.log('🎯 Device details:', {
                id: device.id,
                name: device.name,
                rssi: device.rssi,
                serviceUUIDs: device.serviceUUIDs
              });
            }

            if (onDeviceFound) {
              onDeviceFound(device);
            }
          }
        }
      );
      console.log('Bluetooth scan started successfully');
    } catch (error) {
      console.error('Failed to start scan:', error);
      throw error;
    }
  }

  async stopScan(): Promise<void> {
    try {
      this.manager.stopDeviceScan();
    } catch (error) {
      console.error('Failed to stop scan:', error);
    }
  }

  async connectToDevice(deviceId: string): Promise<any> {
    try {
      if (Platform.OS === 'web')
        return await bluetoothWebService.connectToDevice(deviceId);

      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      console.log('Successfully connected to device:', device.name || deviceId);

      // Store connected device
      this.connectedDevices.set(deviceId, device);

      // Setup disconnection listener
      device.onDisconnected((error: any, device: any) => {
        console.log('Device disconnected:', deviceId, error);
        this.handleDisconnection(deviceId);
      });

      // Setup notification listener
      await this.setupNotifications(deviceId, device);

      return device;
    } catch (error) {
      console.error('Failed to connect to device:', error);
      throw new Error(`Connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a device is currently connected
   */
  async isDeviceConnected(deviceId: string): Promise<boolean> {
    try {
      const device = this.connectedDevices.get(deviceId);
      if (!device) {
        return false;
      }
      // Check if device is still connected
      return device.isConnected();
    } catch (error) {
      console.error('Failed to check device connection:', error);
      return false;
    }
  }

  /**
   * Handle device disconnection
   */
  private handleDisconnection(deviceId: string): void {
    // Remove notification subscription
    const subscription = this.notificationSubscriptions.get(deviceId);
    if (subscription) {
      subscription.remove();
      this.notificationSubscriptions.delete(deviceId);
    }

    // Remove callbacks and buffers
    this.responseCallbacks.delete(deviceId);
    this.analyticsCallbacks.delete(deviceId);
    this.analyticsBuffers.delete(deviceId);
    
    // Remove from connected devices
    this.connectedDevices.delete(deviceId);
    
    // Notify listeners
    const listener = this.disconnectionListeners.get(deviceId);
    if (listener) {
      listener(deviceId);
    }
  }

  /**
   * Register a disconnection listener for a device
   */
  onDisconnection(deviceId: string, callback: (deviceId: string) => void): void {
    this.disconnectionListeners.set(deviceId, callback);
  }

  /**
   * Remove a disconnection listener
   */
  removeDisconnectionListener(deviceId: string): void {
    this.disconnectionListeners.delete(deviceId);
  }

  // TODO FOR Agent: The old version used this pattern of subscriptions, with push for responses
  // Which is a more stable approach?
  // Implications: converting callbacks to subscriptions

 /*    * Subscribe to response notifications
  subscribeToResponses(listener: (data: Uint8Array | string) => void): () => void {
    // Delegate to web service if on web platform
    if (Platform.OS === 'web') {
      return bluetoothWebService.subscribeToResponses(listener);
    }

    this.responseListeners.push(listener);
    return () => {
      this.responseListeners = this.responseListeners.filter(l => l !== listener);
    };
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    // Delegate to web service if on web platform
    if (Platform.OS === 'web') {
      return await bluetoothWebService.disconnectDevice(deviceId);
    }

    try {
      // Remove notification subscription
      const subscription = this.notificationSubscriptions.get(deviceId);
      if (subscription) {
        subscription.remove();
        this.notificationSubscriptions.delete(deviceId);
      }

      await this.manager.cancelDeviceConnection(deviceId);
    } catch (error) {
      console.error('Failed to disconnect device:', error);
    }
  } */

  /**
   * Setup notification listener for device responses
   */
  private async setupNotifications(deviceId: string, device: any): Promise<void> {
    try {
      const services = await device.services();
      const uartService = services.find((service: any) => isUuidLikelyUart(service.uuid));
      
      if (!uartService) {
        console.warn('UART service not found for notifications');
        return;
      }

      const characteristics = await uartService.characteristics();
      const notifyCharacteristic = characteristics.find((char: any) => {
        const uuid = char.uuid.toLowerCase();
        return uuid === NUS_NOTIFY_CHAR_UUID || uuid.includes('6e400003');
      });

      if (!notifyCharacteristic) {
        console.warn('Notify characteristic not found');
        return;
      }

      // Subscribe to notifications
      const subscription = notifyCharacteristic.monitor((error: any, characteristic: any) => {
        if (error) {
          console.error('Notification error:', error);
          return;
        }

        if (characteristic && characteristic.value) {
          // Decode base64 response
          const base64Value = characteristic.value;
          const binaryString = atob(base64Value);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Decode response
          try {
            // Check if this is an analytics batch (starts with RESP_ANALYTICS_BATCH)
            if (bytes[0] === ResponseType.ANALYTICS_BATCH) {
              // Buffer analytics data (may come in multiple chunks)
              const existingBuffer = this.analyticsBuffers.get(deviceId);
              const combinedBuffer = existingBuffer 
                ? new Uint8Array([...existingBuffer, ...bytes])
                : bytes;
              
              // Try to decode (may need more chunks)
              try {
                const batch = BLECommandEncoder.decodeAnalyticsBatch(combinedBuffer);
                // Successfully decoded - clear buffer and call callback
                this.analyticsBuffers.delete(deviceId);
                const analyticsCallback = this.analyticsCallbacks.get(deviceId);
                if (analyticsCallback) {
                  analyticsCallback(batch);
                  this.analyticsCallbacks.delete(deviceId);
                }
              } catch (decodeError) {
                // Not enough data yet - buffer it
                this.analyticsBuffers.set(deviceId, combinedBuffer);
              }
              return;
            }

            // Pass raw bytes to ConfigurationModule to parse config (if it's an enter config response)
            // This must happen before decodeResponse to preserve the full response
            // Format: 8 bytes [0x90, brightness, speed, r, g, b, effectType, powerState]
            if (bytes.length === 8 && bytes[0] === 0x90) {
              try {
                const { configurationModule } = require('../domain/bluetooth/configurationModule');
                configurationModule.handleResponse(bytes);
                // Skip decodeResponse for config responses - they're handled by ConfigurationModule
                // Still check for callback in case sendCommand is waiting
                const callback = this.responseCallbacks.get(deviceId);
                if (callback) {
                  // Return a success response for the command
                  callback({
                    type: ResponseType.ACK_CONFIG_MODE,
                    isSuccess: true,
                    data: bytes.slice(1),
                  });
                  this.responseCallbacks.delete(deviceId);
                }
                return; // Don't process further
              } catch (error) {
                // TODO FOR AGENT: Error envelope pattern
                console.error('[BluetoothService] Failed to handle config response:', error);
                // Continue to normal processing if config handling fails
              }
            }

            const response = BLECommandEncoder.decodeResponse(bytes);

            // Find callback for this device (if any)
            const callback = this.responseCallbacks.get(deviceId);
            if (callback) {
              callback(response);
              this.responseCallbacks.delete(deviceId);
            }
          } catch (error) {
            console.error('Failed to decode response:', error);

            // Pass the error to the callback so the promise can reject immediately
            const callback = this.responseCallbacks.get(deviceId);
            if (callback) {
              // If it's a BLEError, pass it as an ErrorEnvelope
              if (error instanceof BLEError) {
                callback(error.envelope);
              } else {
                // For other errors, wrap in ErrorEnvelope
                callback({
                  code: ErrorCode.UNKNOWN_ERROR,
                  message: (error as Error).message || 'Failed to decode response',
                });
              }
              this.responseCallbacks.delete(deviceId);
            }
          }
        }
      });

      this.notificationSubscriptions.set(deviceId, subscription);
    } catch (error) {
      console.error('Failed to setup notifications:', error);
    }
  }

  /**
   * Set callback for analytics batches
   */
  setAnalyticsCallback(deviceId: string, callback: (batch: AnalyticsBatch) => void): void {
    this.analyticsCallbacks.set(deviceId, callback);
  }

  /**
   * Request analytics batch from device
   */
  async requestAnalytics(deviceId: string): Promise<AnalyticsBatch> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.analyticsCallbacks.delete(deviceId);
        this.analyticsBuffers.delete(deviceId);
        reject(new Error('Analytics request timeout'));
      }, 10000); // 10 second timeout

      this.setAnalyticsCallback(deviceId, (batch) => {
        clearTimeout(timeout);
        resolve(batch);
      });

      const command = BLECommandEncoder.encodeRequestAnalytics();
      this.sendCommand(deviceId, command).catch((error) => {
        clearTimeout(timeout);
        this.analyticsCallbacks.delete(deviceId);
        this.analyticsBuffers.delete(deviceId);
        reject(error);
      });
    });
  }

  /**
   * Confirm receipt of analytics batch
   */
  async confirmAnalytics(deviceId: string, batchId: number): Promise<CommandResponse> {
    if (Platform.OS === 'web') {
      console.error('Confirm analytics not supported on web'); // return await bluetoothWebService.confirmAnalytics(deviceId, batchId);
      throw new Error('Confirm analytics not yet supported on web');
    }

    const command = BLECommandEncoder.encodeConfirmAnalytics(batchId);
    return this.sendCommand(deviceId, command);
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      if (Platform.OS === 'web')
        return await bluetoothWebService.disconnectDevice(deviceId);

      // Remove notification subscription
      const subscription = this.notificationSubscriptions.get(deviceId);
      if (subscription) {
        subscription.remove();
        this.notificationSubscriptions.delete(deviceId);
      }
      
      // Remove response callback
      this.responseCallbacks.delete(deviceId);
      
      // Remove from connected devices
      this.connectedDevices.delete(deviceId);
      
      await this.manager.cancelDeviceConnection(deviceId);
    } catch (error) {
      console.error('Failed to disconnect device:', error);
    }
  }

  /**
   * Send a BLE command and wait for response
   */
  async sendCommand(deviceId: string, command: Uint8Array, timeout: number = 5000): Promise<CommandResponse> {
    return new Promise((resolve, reject) => {
      const device = this.connectedDevices.get(deviceId);
      if (!device) {
        reject(new Error('Device not connected'));
        return;
      }

      // Setup timeout
      const timeoutId = setTimeout(() => {
        this.responseCallbacks.delete(deviceId);
        reject(new Error('Command timeout'));
      }, timeout);

      // Setup response callback
      this.responseCallbacks.set(deviceId, (response: CommandResponse | ErrorEnvelope | AnalyticsBatch) => {
        clearTimeout(timeoutId);

        if ('code' in response) {
          // It's an ErrorEnvelope
          reject(new BLEError(response));
        } else if ('batchId' in response) {
          // It's an AnalyticsBatch (shouldn't happen here, but handle for type safety)
          reject(new Error('Analytics batch received in command response callback'));
        } else if ('type' in response && 'isSuccess' in response) {
          // It's a CommandResponse
          resolve(response as CommandResponse);
        } else {
          reject(new Error('Unknown response type'));
        }
      });

      // Send command
      this.sendCommandData(deviceId, command).catch((error) => {
        clearTimeout(timeoutId);
        this.responseCallbacks.delete(deviceId);
        reject(error);
      });
    });
  }

  /**
   * Send command data to device
   */
  private async sendCommandData(deviceId: string, data: Uint8Array): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error('Device not connected');
    }

    if (!device.isConnected()) {
      throw new Error('Device not connected');
    }

    try {
      const services = await device.services();
      const uartService = services.find((service: any) => isUuidLikelyUart(service.uuid));

      if (!uartService) {
        throw new Error('UART service not found');
      }

      const characteristics = await uartService.characteristics();
      const writeCharacteristic = characteristics.find((char: any) => {
        const uuid = char.uuid.toLowerCase();
        return uuid === NUS_WRITE_CHAR_UUID || uuid.includes('6e400002');
      });

      if (!writeCharacteristic) {
        throw new Error('Write characteristic not found');
      }

      // Convert Uint8Array to base64
      const binaryString = String.fromCharCode(...Array.from(data));
      const base64Message = btoa(binaryString);

      // Try writeWithoutResponse first (faster), then writeWithResponse
      try {
        await writeCharacteristic.writeWithoutResponse(base64Message);
      } catch (error) {
        await writeCharacteristic.writeWithResponse(base64Message);
      }
    } catch (error) {
      console.error('Failed to send command data:', error);
      throw new Error(`Send failed: ${(error as Error).message}`);
    }
  }

  async sendMessage(deviceId: string, message: string): Promise<void> {
    try {
      console.log('🔍 Attempting to send message to device:', deviceId);
      console.log('📝 Message:', message);

      if (Platform.OS === 'web') {
        await bluetoothWebService.sendMessage(deviceId, message);
        return;
      }

      const device = await this.manager.devices([deviceId]);
      if (device.length === 0) {
        throw new Error('Device not found');
      }

      const connectedDevice = device[0];
      console.log('📱 Connected device:', connectedDevice.name || deviceId);

      if (!connectedDevice.isConnected()) {
        throw new Error('Device not connected');
      }

      // Find the UART service and characteristic
      const services = await connectedDevice.services();
      console.log('🔧 Available services:', services.map((s: any) => s.uuid));

      // Look for Nordic UART Service (standard) or Adafruit BLE UART service
      const uartService = services.find((service: any) => isUuidLikelyUart(service.uuid));

      if (!uartService) {
        console.warn('❌ UART service not found, trying to list available services...');
        const serviceList = services.map((s: any) => s.uuid);
        console.log('📋 Available services:', serviceList);
        throw new Error('UART service not found. Available services: ' + serviceList.join(', '));
      }

      console.log('✅ Found UART service:', uartService.uuid);
      const characteristics = await uartService.characteristics();
      console.log('🔧 Available characteristics:', characteristics.map((c: any) => ({
        uuid: c.uuid,
        properties: c.properties
      })));

      // Look for write characteristic (Nordic UART Write or similar)
      const writeCharacteristic = characteristics.find((char: any) => {
        const uuid = char.uuid.toLowerCase();
        return uuid === NUS_WRITE_CHAR_UUID || uuid.includes('6e400002');
      });

      if (!writeCharacteristic) {
        console.warn('❌ Write characteristic not found, trying to list available characteristics...');
        const charList = characteristics.map((c: any) => ({
          uuid: c.uuid,
          properties: c.properties
        }));
        console.log('📋 Available characteristics:', charList);
        throw new Error('Write characteristic not found. Available characteristics: ' + charList.map((c: any) => c.uuid).join(', '));
      }

      console.log('✅ Found write characteristic:', writeCharacteristic.uuid);
      console.log('📝 Characteristic properties:', writeCharacteristic.properties);

      // Since properties are undefined, try both write methods
      try {
        console.log('📤 Trying writeWithoutResponse...');
        // Convert message to base64 for proper data format
        const base64Message = btoa(message);
        console.log('📝 Sending message as base64:', base64Message);
        await writeCharacteristic.writeWithoutResponse(base64Message);
        console.log('✅ Message sent successfully with writeWithoutResponse');
      } catch (error) {
        console.log('📤 writeWithoutResponse failed, trying writeWithResponse...');
        try {
          // Convert message to base64 for proper data format
          const base64Message = btoa(message);
          console.log('📝 Sending message as base64:', base64Message);
          await writeCharacteristic.writeWithResponse(base64Message);
          console.log('✅ Message sent successfully with writeWithResponse');
        } catch (writeError) {
          console.error('❌ Both write methods failed:', writeError);
          throw new Error(`Write failed: ${(writeError as Error).message}`);
        }
      }
      
      console.log('✅ Message sent successfully:', message);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw new Error(`Send failed: ${(error as Error).message}`);
    }
  }

  async getConnectedDevices(): Promise<any[]> {
    try {
      if (Platform.OS === 'web')
        return await bluetoothWebService.getConnectedDevices();

      return await this.manager.connectedDevices([]);
    } catch (error) {
      console.error('Failed to get connected devices:', error);
      return [];
    }
  }

  destroy(): void {
    this.manager.destroy();
  }
}

export const bluetoothService = new BluetoothService();
