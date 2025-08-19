import { BluetoothDevice } from '../types/bluetooth';

export const isPotentialMicrocontroller = (device: Partial<BluetoothDevice> & any): boolean => {
  const serviceUUIDs: string[] | undefined = device.serviceUUIDs;
  const name: string | undefined = device.name || device.localName;
  const manufacturerData: string | undefined = device.manufacturerData || device.manufacturerDataRaw;

  const hasNordicUART = serviceUUIDs?.some((uuid: string) =>
    uuid.toLowerCase().includes('6e400') ||
    uuid.toLowerCase().includes('b5a3-f393-e0a9-e50e24dcca9e')
  ) || false;

  const hasAdafruitUART = serviceUUIDs?.some((uuid: string) =>
    uuid.toLowerCase().includes('6e400001') ||
    uuid.toLowerCase().includes('6e400002') ||
    uuid.toLowerCase().includes('6e400003') ||
    uuid.toLowerCase().includes('adafruit') ||
    uuid.toLowerCase().includes('feather')
  ) || false;

  const hasAdafruitPattern = !!manufacturerData && (
    manufacturerData.includes('Adafruit') ||
    manufacturerData.includes('adafruit') ||
    manufacturerData.includes('Bluefruit') ||
    manufacturerData.includes('Feather')
  );

  const hasMicrocontrollerName = !!name && (
    name.toLowerCase().includes('feather') ||
    name.toLowerCase().includes('itsybitsy') ||
    name.toLowerCase().includes('nrf52') ||
    name.toLowerCase().includes('arduino') ||
    name.toLowerCase().includes('esp32') ||
    name.toLowerCase().includes('microcontroller') ||
    name.toLowerCase().includes('bluefruit') ||
    name.toLowerCase().includes('led guitar controller') ||
    name.toLowerCase().includes('guitar controller') ||
    name.toLowerCase().includes('led guitar')
  );

  const hasAnyServices = Array.isArray(serviceUUIDs) && serviceUUIDs.length > 0;

  return hasNordicUART || hasAdafruitUART || hasAdafruitPattern || hasMicrocontrollerName || hasAnyServices;
};

export const getDeviceDisplayName = (device: Partial<BluetoothDevice> & any): string => {
  if (device.name) {
    return device.name as string;
  }
  if (isPotentialMicrocontroller(device)) {
    const idPart = (device.id || '').toString().substring(0, 8);
    return `Possible Microcontroller (${idPart}...)`;
  }
  const idPart = (device.id || '').toString().substring(0, 8);
  return `Unknown Device (${idPart}...)`;
};


