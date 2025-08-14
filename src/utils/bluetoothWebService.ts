import { BluetoothDevice } from '../types/bluetooth';

class BluetoothWebService {
  private isSupported: boolean = false;
  private selectedDevice: any = null;
  private gattServer: any = null;
  private notifyCharacteristic: any = null;
  private responseCallback: ((response: string) => void) | null = null;

  constructor() {
    this.isSupported = this.checkWebBluetoothSupport();
  }

  private checkWebBluetoothSupport(): boolean {
    return 'bluetooth' in navigator && 'requestDevice' in navigator.bluetooth;
  }

  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      throw new Error('Web Bluetooth is not supported in this browser');
    }
    return true;
  }

  async requestPermissions(): Promise<boolean> {
    // Web Bluetooth permissions are handled automatically by the browser
    return true;
  }

  async startScan(): Promise<BluetoothDevice[]> {
    if (!this.isSupported) {
      throw new Error('Web Bluetooth is not supported');
    }

    try {
      console.log('Starting Web Bluetooth scan...');
      
      // Request device with specific filters for your nRF52
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true, // For testing - you can filter by services later
        optionalServices: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] // UART service
      });

      console.log('Device selected via Web Bluetooth:', device.name, 'ID:', device.id);

      // Store the selected device for later use
      this.selectedDevice = device;
      console.log('Device stored for later connection');

      const bluetoothDevice: BluetoothDevice = {
        id: device.id,
        name: device.name || 'Unknown Device',
        rssi: -50, // Web Bluetooth doesn't provide RSSI
        isConnected: false,
        localName: device.name,
      };

      console.log('Returning device for UI:', bluetoothDevice);
      return [bluetoothDevice];
    } catch (error) {
      console.error('Web Bluetooth scan error:', error);
      throw new Error('Failed to scan for devices: ' + (error as Error).message);
    }
  }

  async stopScan(): Promise<void> {
    // Web Bluetooth doesn't support continuous scanning
    // The scan stops automatically after device selection
  }

  async connectToDevice(deviceId: string): Promise<any> {
    if (!this.isSupported) {
      throw new Error('Web Bluetooth is not supported');
    }

    console.log('connectToDevice called with deviceId:', deviceId);
    console.log('Has selected device:', this.hasSelectedDevice());
    console.log('Selected device:', this.selectedDevice?.name);
    console.log('Selected device ID:', this.selectedDevice?.id);
    console.log('Requested device ID:', deviceId);

    if (!this.selectedDevice) {
      throw new Error('No device selected. Please scan for devices first.');
    }

    // Check if the device IDs match
    if (this.selectedDevice.id !== deviceId) {
      console.log('Device ID mismatch! Selected:', this.selectedDevice.id, 'Requested:', deviceId);
      throw new Error('Device ID mismatch. Please scan for devices again.');
    }

    try {
      console.log('Attempting to connect to GATT server...');
      
      // Connect to GATT server using the stored device
      const server = await this.selectedDevice.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      console.log('GATT server connected successfully');

      // Store the GATT server for later use
      this.gattServer = server;

      // Set up notifications for responses
      await this.setupNotifications(server);

      console.log('Successfully connected to device via Web Bluetooth');
      return { device: this.selectedDevice, server };
    } catch (error) {
      console.error('Web Bluetooth connection error:', error);
      throw new Error('Failed to connect to device: ' + (error as Error).message);
    }
  }

  private async setupNotifications(server: any): Promise<void> {
    try {
      console.log('Setting up notifications for responses...');
      
      // Get the UART service
      const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
      
      // Get the notify characteristic
      this.notifyCharacteristic = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
      
      console.log('Got notify characteristic, starting notifications...');
      
      // Start notifications
      await this.notifyCharacteristic.startNotifications();
      console.log('Notifications started successfully');
      
      // Set up event listener for responses
      this.notifyCharacteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        console.log('Response event received:', event);
        
        try {
          const value = event.target.value;
          console.log('Raw response value:', value);
          const decoder = new TextDecoder();
          const responseText = decoder.decode(value);
          console.log('Decoded response:', responseText);
          
          // Call the callback if it exists
          if (this.responseCallback) {
            this.responseCallback(responseText);
            this.responseCallback = null; // Clear the callback after use
          }
        } catch (decodeError) {
          console.error('Error decoding response:', decodeError);
        }
      });
      
      console.log('Event listener added for characteristic value changes');
    } catch (error) {
      console.error('Failed to setup notifications:', error);
      throw error;
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      if (this.notifyCharacteristic) {
        await this.notifyCharacteristic.stopNotifications();
        this.notifyCharacteristic = null;
      }
      if (this.gattServer) {
        await this.gattServer.disconnect();
        this.gattServer = null;
        console.log('Device disconnected via Web Bluetooth');
      }
    } catch (error) {
      console.error('Web Bluetooth disconnect error:', error);
    }
  }

  async sendMessage(deviceId: string, message: string): Promise<string> {
    if (!this.isSupported) {
      throw new Error('Web Bluetooth is not supported');
    }

    if (!this.selectedDevice) {
      throw new Error('No device selected. Please scan for devices first.');
    }

    try {
      // Use existing connection or connect if needed
      let server = this.gattServer;
      if (!server) {
        const connection = await this.connectToDevice(deviceId);
        server = connection.server;
      }

      // Get the UART service
      const service = await server.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
      
      // Get the write characteristic
      const writeCharacteristic = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');

      // Convert message to ArrayBuffer
      const encoder = new TextEncoder();
      const messageBuffer = encoder.encode(message);

      // Set up response promise before sending message
      const responsePromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('Response timeout - no response received');
          this.responseCallback = null;
          resolve('No response received (timeout)');
        }, 5000);

        this.responseCallback = (response: string) => {
          console.log('Response callback triggered with:', response);
          clearTimeout(timeout);
          resolve(response);
        };
      });

      // Write the message
      await writeCharacteristic.writeValue(messageBuffer);
      console.log('Message sent successfully via Web Bluetooth:', message);
      
      // Give the Arduino a moment to process the message
      await new Promise(resolve => setTimeout(resolve, 100));

      // Wait for response
      const response = await responsePromise;
      console.log('Final response:', response);
      
      return response;
    } catch (error) {
      console.error('Web Bluetooth send message error:', error);
      throw new Error('Failed to send message: ' + (error as Error).message);
    }
  }

  async getConnectedDevices(): Promise<any[]> {
    // Web Bluetooth doesn't provide a way to get currently connected devices
    return [];
  }

  destroy(): void {
    // Clean up connections
    if (this.gattServer) {
      this.gattServer.disconnect();
      this.gattServer = null;
    }
    this.selectedDevice = null;
  }

  isWebBluetoothSupported(): boolean {
    return this.isSupported;
  }

  // Helper method to check if we have a selected device
  hasSelectedDevice(): boolean {
    return this.selectedDevice !== null;
  }

  // Helper method to get the selected device
  getSelectedDevice(): any {
    return this.selectedDevice;
  }
}

export const bluetoothWebService = new BluetoothWebService();
