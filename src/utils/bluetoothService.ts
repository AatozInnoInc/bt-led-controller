import { Platform } from 'react-native';
import { BluetoothDevice, BLEConnection } from '../types/bluetooth';
import { NUS_SERVICE_UUID, NUS_WRITE_CHAR_UUID, NUS_NOTIFY_CHAR_UUID, isUuidLikelyUart } from './bleConstants';
import { CommandResponse } from '../types/commands';
import { ErrorEnvelope, BLEError, ErrorCode } from '../types/errors';
import { BLECommandEncoder } from './bleCommandEncoder';

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
  private responseCallbacks: Map<string, (response: CommandResponse | ErrorEnvelope) => void> = new Map();

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
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      console.log('Successfully connected to device:', device.name || deviceId);
      
      // Store connected device
      this.connectedDevices.set(deviceId, device);
      
      // Setup notification listener
      await this.setupNotifications(deviceId, device);
      
      return device;
    } catch (error) {
      console.error('Failed to connect to device:', error);
      throw new Error(`Connection failed: ${(error as Error).message}`);
    }
  }

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

  async disconnectDevice(deviceId: string): Promise<void> {
    try {
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
      this.responseCallbacks.set(deviceId, (response: CommandResponse | ErrorEnvelope) => {
        clearTimeout(timeoutId);
        
        if ('code' in response) {
          // It's an ErrorEnvelope
          reject(new BLEError(response));
        } else {
          // It's a CommandResponse
          resolve(response);
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
