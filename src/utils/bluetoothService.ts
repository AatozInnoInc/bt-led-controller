import { BleManager, Device, State } from 'react-native-ble-plx';
import { BluetoothDevice, BLEConnection } from '../types/bluetooth';

class BluetoothService {
  private manager: BleManager;
  private isInitialized: boolean = false;

  constructor() {
    this.manager = new BleManager();
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
      // For iOS, permissions are requested automatically
      return true;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  async startScan(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Bluetooth not initialized');
    }

    try {
      await this.manager.startDeviceScan(
        null, // null means scan for all devices
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('Scan error:', error);
            return;
          }
          if (device) {
            // Device found - this will be handled by the component
            console.log('Found device:', device.name || device.id);
          }
        }
      );
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

  async connectToDevice(deviceId: string): Promise<Device> {
    try {
      const device = await this.manager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      return device;
    } catch (error) {
      console.error('Failed to connect to device:', error);
      throw error;
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      await this.manager.cancelDeviceConnection(deviceId);
    } catch (error) {
      console.error('Failed to disconnect device:', error);
    }
  }

  async sendMessage(deviceId: string, message: string): Promise<void> {
    try {
      const device = await this.manager.devices([deviceId]);
      if (device.length === 0) {
        throw new Error('Device not found');
      }

      const connectedDevice = device[0];
      if (!connectedDevice.isConnected()) {
        throw new Error('Device not connected');
      }

      // Find the UART service and characteristic
      const services = await connectedDevice.services();
      const uartService = services.find(service => 
        service.uuid.toLowerCase() === '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
      );

      if (!uartService) {
        throw new Error('UART service not found');
      }

      const characteristics = await uartService.characteristics();
      const writeCharacteristic = characteristics.find(char => 
        char.uuid.toLowerCase() === '6e400002-b5a3-f393-e0a9-e50e24dcca9e'
      );

      if (!writeCharacteristic) {
        throw new Error('Write characteristic not found');
      }

      // Convert message to base64 and send
      const messageBytes = Buffer.from(message, 'utf8');
      await writeCharacteristic.writeWithResponse(messageBytes.toString('base64'));
      
      console.log('Message sent successfully:', message);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async getConnectedDevices(): Promise<Device[]> {
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
