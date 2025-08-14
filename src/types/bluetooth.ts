export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
  isConnected: boolean;
  manufacturerData?: string;
  // Real BLE properties
  localName?: string;
  txPowerLevel?: number;
  serviceUUIDs?: string[];
  overflowServiceUUIDs?: string[];
  solicitedServiceUUIDs?: string[];
  serviceData?: { [key: string]: string };
  manufacturerDataRaw?: string;
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

// New interfaces for BLE communication
export interface BLEService {
  uuid: string;
  isPrimary: boolean;
  characteristics: BLECharacteristic[];
}

export interface BLECharacteristic {
  uuid: string;
  properties: {
    read: boolean;
    write: boolean;
    writeWithoutResponse: boolean;
    notify: boolean;
    indicate: boolean;
    broadcast: boolean;
    authenticatedSignedWrites: boolean;
    extendedProperties: boolean;
  };
  value?: string;
}

export interface BLEConnection {
  deviceId: string;
  isConnected: boolean;
  services: BLEService[];
  error?: string;
}
