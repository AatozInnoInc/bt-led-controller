export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
  isConnected: boolean;
  manufacturerData?: string;
}

export interface LEDConfiguration {
  id: string;
  name: string;
  brightness: number;
  color: string;
  pattern: 'solid' | 'pulse' | 'rainbow' | 'custom';
  speed: number;
}

export interface DeviceProfile {
  id: string;
  name: string;
  deviceId: string;
  deviceName: string;
  createdAt: Date;
  updatedAt: Date;
  ledConfigurations: LEDConfiguration[];
  isActive: boolean;
}

export interface BluetoothState {
  isEnabled: boolean;
  isScanning: boolean;
  devices: BluetoothDevice[];
  connectedDevice: BluetoothDevice | null;
  error: string | null;
}
