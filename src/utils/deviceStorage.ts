import AsyncStorage from '@react-native-async-storage/async-storage';
import { BluetoothDevice } from '../types/bluetooth';

export interface PairedDevice extends BluetoothDevice {
  lastConnected: Date;
  connectionCount: number;
  isFavorite: boolean;
  deviceType: 'adafruit' | 'other';
  firmwareVersion?: string;
}

const STORAGE_KEYS = {
  PAIRED_DEVICES: 'paired_devices',
  LAST_CONNECTED_DEVICE: 'last_connected_device',
  AUTO_RECONNECT_ENABLED: 'auto_reconnect_enabled',
};

export class DeviceStorageService {
  private static instance: DeviceStorageService;
  private pairedDevices: PairedDevice[] = [];
  private lastConnectedDeviceId: string | null = null;

  static getInstance(): DeviceStorageService {
    if (!DeviceStorageService.instance) {
      DeviceStorageService.instance = new DeviceStorageService();
    }
    return DeviceStorageService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadPairedDevices();
      await this.loadLastConnectedDevice();
    } catch (error) {
      console.error('Failed to initialize device storage:', error);
    }
  }

  private async loadPairedDevices(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PAIRED_DEVICES);
      
      if (stored) {
        const devices = JSON.parse(stored);
        this.pairedDevices = devices.map((device: any) => ({
          ...device,
          lastConnected: new Date(device.lastConnected),
        }));
      } else {
        this.pairedDevices = [];
      }
    } catch (error) {
      console.error('Failed to load paired devices:', error);
      this.pairedDevices = [];
    }
  }

  private async loadLastConnectedDevice(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CONNECTED_DEVICE);
      this.lastConnectedDeviceId = stored || null;
    } catch (error) {
      console.error('Failed to load last connected device:', error);
      this.lastConnectedDeviceId = null;
    }
  }

  private async savePairedDevices(): Promise<void> {
    try {
      const dataToSave = JSON.stringify(this.pairedDevices);
      
      await AsyncStorage.setItem(STORAGE_KEYS.PAIRED_DEVICES, dataToSave);
      
      // Verify the save worked by reading it back
      const savedData = await AsyncStorage.getItem(STORAGE_KEYS.PAIRED_DEVICES);
      
    } catch (error) {
      console.error('Failed to save paired devices:', error);
      throw error; // Re-throw to let caller know about the failure
    }
  }

  private async saveLastConnectedDevice(): Promise<void> {
    try {
      if (this.lastConnectedDeviceId) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_CONNECTED_DEVICE, this.lastConnectedDeviceId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.LAST_CONNECTED_DEVICE);
      }
    } catch (error) {
      console.error('Failed to save last connected device:', error);
    }
  }

  async addPairedDevice(device: BluetoothDevice): Promise<void> {
    const existingIndex = this.pairedDevices.findIndex(d => d.id === device.id);
    
    if (existingIndex >= 0) {
      // Update existing device - don't overwrite connection status from storage
      this.pairedDevices[existingIndex] = {
        ...this.pairedDevices[existingIndex],
        name: device.name, // Update name in case it changed
        rssi: device.rssi,
        manufacturerData: device.manufacturerData,
        serviceUUIDs: device.serviceUUIDs,
        lastConnected: new Date(),
        connectionCount: this.pairedDevices[existingIndex].connectionCount + 1,
        // Don't set isConnected here - it should be managed by actual connection state
      };
    } else {
      // Add new device
      const pairedDevice: PairedDevice = {
        ...device,
        lastConnected: new Date(),
        connectionCount: 1,
        isFavorite: false,
        deviceType: this.isAdafruitDevice(device) ? 'adafruit' : 'other',
        isConnected: false, // Always start as not connected
      };
      this.pairedDevices.push(pairedDevice);
    }

    await this.savePairedDevices();
  }

  async updateDeviceConnection(deviceId: string, isConnected: boolean): Promise<void> {
    const deviceIndex = this.pairedDevices.findIndex(d => d.id === deviceId);
    if (deviceIndex >= 0) {
      this.pairedDevices[deviceIndex].isConnected = isConnected;
      if (isConnected) {
        this.pairedDevices[deviceIndex].lastConnected = new Date();
        this.pairedDevices[deviceIndex].connectionCount += 1;
        this.lastConnectedDeviceId = deviceId;
        await this.saveLastConnectedDevice();
      }
      await this.savePairedDevices();
    }
  }

  // Add method to reset all connection statuses (call this on app start)
  async resetAllConnectionStatuses(): Promise<void> {
    this.pairedDevices.forEach(device => {
      device.isConnected = false;
    });
    await this.savePairedDevices();
  }

  // Force reload paired devices from storage
  async reloadPairedDevices(): Promise<void> {
    await this.loadPairedDevices();
  }

  // Clear all storage (for testing purposes)
  async clearAllStorage(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PAIRED_DEVICES,
        STORAGE_KEYS.LAST_CONNECTED_DEVICE,
        STORAGE_KEYS.AUTO_RECONNECT_ENABLED
      ]);
      this.pairedDevices = [];
      this.lastConnectedDeviceId = null;
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  async removePairedDevice(deviceId: string): Promise<void> {
    const beforeCount = this.pairedDevices.length;
    this.pairedDevices = this.pairedDevices.filter(d => d.id !== deviceId);
    
    if (this.lastConnectedDeviceId === deviceId) {
      this.lastConnectedDeviceId = null;
      await this.saveLastConnectedDevice();
    }
    
    await this.savePairedDevices();
  }

  async toggleFavorite(deviceId: string): Promise<void> {
    const deviceIndex = this.pairedDevices.findIndex(d => d.id === deviceId);
    if (deviceIndex >= 0) {
      this.pairedDevices[deviceIndex].isFavorite = !this.pairedDevices[deviceIndex].isFavorite;
      await this.savePairedDevices();
    }
  }

  getPairedDevices(): PairedDevice[] {
    return [...this.pairedDevices];
  }

  getAdafruitDevices(): PairedDevice[] {
    return this.pairedDevices.filter(d => d.deviceType === 'adafruit');
  }

  getLastConnectedDevice(): PairedDevice | null {
    if (!this.lastConnectedDeviceId) return null;
    return this.pairedDevices.find(d => d.id === this.lastConnectedDeviceId) || null;
  }

  getFavoriteDevices(): PairedDevice[] {
    return this.pairedDevices.filter(d => d.isFavorite);
  }

  isDevicePaired(deviceId: string): boolean {
    return this.pairedDevices.some(d => d.id === deviceId);
  }

  private isAdafruitDevice(device: BluetoothDevice): boolean {
    // Import the LED Guitar device detection function
    const { isLedGuitarDevice } = require('./bleConstants');
    return isLedGuitarDevice(device);
  }

  async setAutoReconnectEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_RECONNECT_ENABLED, JSON.stringify(enabled));
    } catch (error) {
      console.error('Failed to save auto reconnect setting:', error);
    }
  }

  async getAutoReconnectEnabled(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_RECONNECT_ENABLED);
      return stored ? JSON.parse(stored) : true; // Default to true
    } catch (error) {
      console.error('Failed to load auto reconnect setting:', error);
      return true;
    }
  }
}

export const deviceStorage = DeviceStorageService.getInstance();
