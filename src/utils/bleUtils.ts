import { BluetoothDevice } from '../types/bluetooth';
import { ADAFRUIT_KEYWORDS, isUuidLikelyUart } from './bleConstants';

export const isPotentialMicrocontroller = (device: Partial<BluetoothDevice> & any): boolean => {
  const serviceUUIDs: string[] | undefined = device.serviceUUIDs;
  const name: string | undefined = device.name || device.localName;
  const manufacturerData: string | undefined = device.manufacturerData || device.manufacturerDataRaw;

  const hasNordicUART = serviceUUIDs?.some((uuid: string) => isUuidLikelyUart(uuid)) || false;

  const hasAdafruitUART = serviceUUIDs?.some((uuid: string) => {
    const lower = uuid.toLowerCase();
    return isUuidLikelyUart(lower) || ADAFRUIT_KEYWORDS.some(k => lower.includes(k));
  }) || false;

  const hasAdafruitPattern = !!manufacturerData && ADAFRUIT_KEYWORDS.some(k => manufacturerData.toLowerCase().includes(k));

  const hasMicrocontrollerName = !!name && (
    name.toLowerCase().includes('feather') ||
    name.toLowerCase().includes('itsybitsy') ||
    name.toLowerCase().includes('nrf52') ||
    name.toLowerCase().includes('arduino') ||
    name.toLowerCase().includes('esp32') ||
    name.toLowerCase().includes('microcontroller') ||
    name.toLowerCase().includes('bluefruit') ||
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


