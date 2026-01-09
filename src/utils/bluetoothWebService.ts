import { BluetoothDevice } from '../types/bluetooth';
import { NUS_SERVICE_UUID, NUS_NOTIFY_CHAR_UUID, NUS_WRITE_CHAR_UUID } from './bleConstants';
import { CommandResponse, ResponseType } from '../types/commands';
import { BLECommandEncoder } from './bleCommandEncoder';
import { BLEError } from '../types/errors';
import { configurationModule } from '../domain/bluetooth/configurationModule';

class BluetoothWebService {
  private isSupported: boolean = false;
  private selectedDevice: any = null;
  private gattServer: any = null;
  private notifyCharacteristic: any = null;
  private responseCallback: ((response: string) => void) | null = null;
  private rawResponseBytes: Uint8Array | null = null;

  constructor() {
    this.isSupported = this.checkWebBluetoothSupport();
  }

  private checkWebBluetoothSupport(): boolean {
    const nav: any = (typeof navigator !== 'undefined' ? navigator : undefined) as any;
    return !!(nav && nav.bluetooth && typeof nav.bluetooth.requestDevice === 'function');
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
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [NUS_SERVICE_UUID]
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

  async requestDeviceForReconnect(deviceName?: string): Promise<BluetoothDevice | null> {
    if (!this.isSupported) {
      throw new Error('Web Bluetooth is not supported');
    }

    try {
      console.log('Requesting device for reconnect, deviceName:', deviceName);

      // Request device - try to filter by name if provided, otherwise show all devices
      const requestOptions: any = {
        optionalServices: [NUS_SERVICE_UUID]
      };

      if (deviceName) {
        // Try to filter by name (if supported by browser)
        requestOptions.filters = [{ name: deviceName }];
      } else {
        // Fallback to accept all devices
        requestOptions.acceptAllDevices = true;
      }

      const device = await (navigator as any).bluetooth.requestDevice(requestOptions);
      console.log('Device selected for reconnect:', device.name, 'ID:', device.id);

      // Store the selected device
      this.selectedDevice = device;

      const bluetoothDevice: BluetoothDevice = {
        id: device.id,
        name: device.name || 'Unknown Device',
        rssi: -50,
        isConnected: false,
        localName: device.name,
      };

      return bluetoothDevice;
    } catch (error: any) {
      // User cancelled the device picker
      if (error.name === 'NotFoundError' || error.name === 'SecurityError') {
        console.log('User cancelled device selection or permission denied');
        return null;
      }
      console.error('Failed to request device for reconnect:', error);
      throw error;
    }
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
      throw new Error('No device selected. Please request device first.');
    }

    // Check if the device IDs match
    if (this.selectedDevice.id !== deviceId) {
      console.log('Device ID mismatch! Selected:', this.selectedDevice.id, 'Requested:', deviceId);
      throw new Error('Device ID mismatch. Please request device again.');
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
      const service = await server.getPrimaryService(NUS_SERVICE_UUID);
      
      // Get the notify characteristic
      this.notifyCharacteristic = await service.getCharacteristic(NUS_NOTIFY_CHAR_UUID);
      
      console.log('Got notify characteristic, starting notifications...');
      
      // Start notifications
      await this.notifyCharacteristic.startNotifications();
      console.log('Notifications started successfully');
      
      // Set up event listener for responses
      this.notifyCharacteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        console.log('Response event received:', event);
        
        try {
          const value = event.target.value as DataView;
          console.log('Raw response value:', value);
          
          // Convert DataView to Uint8Array for easier handling
          const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
          
          // Format as hex for display (more useful for binary protocol)
          const hexString = Array.from(bytes)
            .map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
          console.log('Response bytes:', hexString);
          
          // Store the raw bytes for sendCommand to use
          this.rawResponseBytes = bytes;

          // Also pass config responses directly to ConfigurationModule (for async notifications)
          console.log('[WebBLE] Notification: Checking bytes length and bytes:', bytes.length, 'bytes:', Array.from(bytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
          if (bytes.length === 8 && bytes[0] === 0x90) {
            try {
              console.log('[WebBLE] Notification: About to call handleResponse with bytes:', Array.from(bytes));
              console.log('[WebBLE] Notification: Using imported configurationModule instance');
              configurationModule.handleResponse(bytes);
              console.log('[WebBLE] Passed config response to ConfigurationModule from notification');
            } catch (error) {
              console.error('[WebBLE] Failed to handle config response in notification:', error);
              console.error('[WebBLE] Error stack:', error instanceof Error ? error.stack : 'No stack');
            }
          }

          // Try to decode as text if it looks like ASCII
          let responseText: string;
          if (bytes.length > 0 && bytes.every(b => b >= 32 && b <= 126)) {
            const decoder = new TextDecoder();
            responseText = decoder.decode(value);
            console.log('Decoded as text:', responseText);
          } else {
            // Format binary response with meaning (for logging/display)
            responseText = this.formatBinaryResponse(bytes);
            console.log('Formatted binary response:', responseText);
          }
          
          // Call the callback if it exists (for text-based responses)
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

  async sendRawBytes(deviceId: string, bytes: Uint8Array): Promise<void> {
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
      const service = await server.getPrimaryService(NUS_SERVICE_UUID);
      
      // Get the write characteristic
      const writeCharacteristic = await service.getCharacteristic(NUS_WRITE_CHAR_UUID);

      // Set up response promise before sending message
      const responsePromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('Response timeout - no response received');
          this.responseCallback = null;
          resolve();
        }, 5000);

        this.responseCallback = (response: string) => {
          console.log('Response callback triggered with:', response);
          clearTimeout(timeout);
          resolve();
        };
      });

      // Write the raw bytes directly (no encoding!)
      await writeCharacteristic.writeValue(bytes);
      const hexBytes = Array.from(bytes).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
      console.log('Raw bytes sent successfully via Web Bluetooth:', hexBytes);
      
      // Give the Arduino a moment to process the message
      await new Promise(resolve => setTimeout(resolve, 100));

      // Wait for response
      await responsePromise;
    } catch (error) {
      console.error('Web Bluetooth send raw bytes error:', error);
      throw new Error('Failed to send raw bytes: ' + (error as Error).message);
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
      const service = await server.getPrimaryService(NUS_SERVICE_UUID);
      
      // Get the write characteristic
      const writeCharacteristic = await service.getCharacteristic(NUS_WRITE_CHAR_UUID);

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

  async isDeviceConnected(deviceId: string): Promise<boolean> {
    if (!this.selectedDevice || this.selectedDevice.id !== deviceId) {
      return false;
    }
    return this.gattServer?.connected ?? false;
  }

  async verifyConnection(deviceId: string): Promise<boolean> {
    return this.isDeviceConnected(deviceId);
  }


  async sendCommand(deviceId: string, command: Uint8Array, timeout: number = 5000): Promise<CommandResponse> {
    // Clear any previous response bytes
    this.rawResponseBytes = null;

    // Send command as raw bytes (this will trigger the notification callback which stores raw bytes)
    await this.sendRawBytes(deviceId, command);

    // Wait for response (simple polling since binary responses are fast and fit in one packet)
    const responseBytes = await new Promise<Uint8Array>((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.rawResponseBytes) {
          clearInterval(checkInterval);
          resolve(this.rawResponseBytes);
        }
      }, 50);

      // Timeout fallback
      setTimeout(() => {
        clearInterval(checkInterval);
        if (this.rawResponseBytes) {
          resolve(this.rawResponseBytes);
        } else {
          reject(new Error('No response received from device'));
        }
      }, timeout);
    });

    if (!responseBytes) {
      throw new Error('No response received from device');
    }

    // TypeScript type narrowing - responseBytes is now definitely Uint8Array
    const responseBytesArray: Uint8Array = responseBytes;

    const hexBytes = Array.from(responseBytesArray).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
    console.log('📥 Received response bytes:', hexBytes);

    // Pass to ConfigurationModule if it's a config response (8 bytes: 0x90 + 7 config bytes)
    if (responseBytesArray.length === 8 && responseBytesArray[0] === 0x90) {
      try {
        console.log('[WebBLE] Passing config response to ConfigurationModule');
        console.log('[WebBLE] Response bytes:', Array.from(responseBytesArray).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        
        // Directly parse the config and set it on the module
        // Format: [0x90, brightness, speed, h, s, v, effectType, powerState]
        const config = {
          brightness: responseBytesArray[1],
          speed: responseBytesArray[2],
          color: {
            h: responseBytesArray[3],
            s: responseBytesArray[4],
            v: responseBytesArray[5],
          },
          effectType: responseBytesArray[6],
          powerState: responseBytesArray[7] > 0,
        };
        
        console.log('[WebBLE] Directly parsed config:', config);
        
        // Try calling handleResponse first
        try {
          console.log('[WebBLE] About to call handleResponse...');
          configurationModule.handleResponse(responseBytesArray);
          console.log('[WebBLE] handleResponse returned');
        } catch (error) {
          console.error('[WebBLE] Error calling handleResponse:', error);
          console.error('[WebBLE] Error stack:', error instanceof Error ? error.stack : 'No stack');
        }
        
        // Check if the config was set by handleResponse
        let parsedConfig = configurationModule.getLastReceivedConfig();
        if (parsedConfig) {
          console.log('[WebBLE] Config successfully parsed by handleResponse:', parsedConfig);
        } else {
          console.warn('[WebBLE] handleResponse did not set config, using direct method...');
          // Fallback: set config directly when available to avoid runtime errors if the method is missing
          try {
            if (typeof (configurationModule as any).setConfigDirectly === 'function') {
              configurationModule.setConfigDirectly(config);
              parsedConfig = configurationModule.getLastReceivedConfig();
              if (parsedConfig) {
                console.log('[WebBLE] Config set directly, now available:', parsedConfig);
              } else {
                console.error('[WebBLE] Failed to set config even with direct method!');
              }
            } else {
              console.warn('[WebBLE] configurationModule.setConfigDirectly is not available - skipping direct set');
            }
          } catch (error) {
            console.error('[WebBLE] Error setting config directly:', error);
          }
        }
      } catch (error) {
        console.error('[WebBLE] Failed to handle config response:', error);
      }
    }

    // Use BLECommandEncoder to properly decode the response
    const decoded = BLECommandEncoder.decodeResponse(responseBytesArray);

    // Check if it's an ErrorEnvelope
    if ('code' in decoded && 'message' in decoded) {
      // It's an ErrorEnvelope - throw as BLEError
      throw new BLEError(decoded);
    }

    // It's a CommandResponse
    return decoded as CommandResponse;
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

  // Format binary response with meaning
  private formatBinaryResponse(bytes: Uint8Array): string {
    if (bytes.length === 0) {
      return '[empty response]';
    }

    const firstByte = bytes[0];
    const hexString = Array.from(bytes)
      .map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');

    // Interpret response based on protocol
    switch (firstByte) {
      case 0x90:
        return `✓ ACK_SUCCESS [${hexString}]`;
      case 0x91:
        const errorCode = bytes.length > 1 ? bytes[1] : 0;
        const errorMessages: Record<number, string> = {
          0x01: 'Invalid command',
          0x02: 'Invalid parameter',
          0x03: 'Out of range',
          0x04: 'Not in config mode',
          0x05: 'Already in config mode',
          0x06: 'Flash write failed',
          0x07: 'Validation failed',
          0x08: 'Not owner',
          0x09: 'Already claimed',
          0xFF: 'Unknown error',
        };
        const errorMsg = errorMessages[errorCode] || `Error 0x${errorCode.toString(16)}`;
        return `✗ ACK_ERROR: ${errorMsg} [${hexString}]`;
      case 0xA0:
        return `📊 Analytics batch [${hexString}]`;
      default:
        return `[${hexString}]`;
    }
  }
}

export const bluetoothWebService = new BluetoothWebService();
