import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { BluetoothDevice } from '../types/bluetooth';
import { bluetoothWebService } from '../utils/bluetoothWebService';
import { bluetoothService } from '../utils/bluetoothService';
import { getDeviceDisplayName } from '../utils/bleUtils';

export type FilterType = 'all' | 'microcontrollers' | 'named';

export const useBluetooth = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTestingFailure, setIsTestingFailure] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const isWebBluetoothSupported = useMemo(
    () => (Platform.OS === 'web' ? bluetoothWebService.isWebBluetoothSupported() : false),
    []
  );

  const isBluetoothInitializedRef = useRef<boolean>(false);
  const [isBluetoothInitialized, setIsBluetoothInitialized] = useState<boolean>(false);

  const initialize = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        if (!bluetoothService.isAvailable()) {
          isBluetoothInitializedRef.current = false;
          setError('Bluetooth requires a development build. Use Expo Go for UI testing only.');
          return false;
        }
        const initialized = await bluetoothService.initialize();
        isBluetoothInitializedRef.current = initialized;
        setIsBluetoothInitialized(initialized);
        if (!initialized) {
          setError('Failed to initialize Bluetooth. Please check your Bluetooth settings.');
        }
        return initialized;
      } catch (err) {
        const message = (err as Error).message || 'Unknown error';
        setError(message.includes('native module')
          ? 'Bluetooth requires a development build. Use Expo Go for UI testing only.'
          : `Failed to initialize Bluetooth: ${message}`);
        setIsBluetoothInitialized(false);
        return false;
      }
    }
    return true;
  }, []);

  const startScan = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);
      setDevices([]);

      if (Platform.OS === 'web') {
        if (!isWebBluetoothSupported) {
          throw new Error('Web Bluetooth is not supported in this browser');
        }
        const webDevices = await bluetoothWebService.startScan();
        setDevices(webDevices);
      } else {
        if (!isBluetoothInitializedRef.current) {
          if (!bluetoothService.isAvailable()) {
            setTimeout(() => {
              const mockDevices: BluetoothDevice[] = [
                { id: '1', name: 'Bluefruit Feather52', rssi: -45, isConnected: false, manufacturerData: 'Adafruit Industries' },
                { id: '2', name: 'ItsyBitsy nRF52840 Express', rssi: -52, isConnected: false, manufacturerData: 'Adafruit' },
                { id: '3', name: 'LED Guitar Controller', rssi: -67, isConnected: false, manufacturerData: 'Custom' },
              ];
              setDevices(mockDevices);
              setIsScanning(false);
            }, 2000);
            return;
          }
          setError('Bluetooth not initialized. Please check your Bluetooth settings.');
          setIsScanning(false);
          return;
        }

        const hasPermissions = await bluetoothService.requestPermissions();
        if (!hasPermissions) {
          throw new Error('Bluetooth permissions are required to scan for devices.');
        }

        await bluetoothService.startScan((device: any) => {
          const unifiedDevice: BluetoothDevice = {
            id: device.id,
            name: getDeviceDisplayName(device),
            rssi: device.rssi || -50,
            isConnected: false,
            manufacturerData: device.manufacturerData || 'Unknown',
            serviceUUIDs: device.serviceUUIDs || [],
          };

          setDevices(prev => (prev.some(d => d.id === unifiedDevice.id) ? prev : [...prev, unifiedDevice]));
        });

        setTimeout(async () => {
          await bluetoothService.stopScan();
          setIsScanning(false);
        }, 10000);

        return;
      }
      setIsScanning(false);
    } catch (err) {
      setError(`Failed to scan for devices: ${(err as Error).message}`);
      setIsScanning(false);
    }
  }, [isWebBluetoothSupported]);

  const stopScan = useCallback(async () => {
    setIsScanning(false);
    if (Platform.OS !== 'web') {
      try { await bluetoothService.stopScan(); } catch {}
    }
  }, []);

  const connect = useCallback(async (device: BluetoothDevice) => {
    try {
      setIsConnecting(true);
      setError(null);

      if (Platform.OS === 'web') {
        if (!bluetoothWebService.hasSelectedDevice()) {
          throw new Error('Please scan for devices first to select a device');
        }
        await bluetoothWebService.connectToDevice(device.id);
      } else {
        await bluetoothService.connectToDevice(device.id);
      }

      setConnectedDevice({ ...device, isConnected: true });
      setDevices(prev => prev.map(d => (d.id === device.id ? { ...d, isConnected: true } : d)));
    } catch (err) {
      setError(`Failed to connect to device: ${(err as Error).message}`);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!connectedDevice) return;
    try {
      if (Platform.OS === 'web') {
        await bluetoothWebService.disconnectDevice(connectedDevice.id);
      } else {
        await bluetoothService.disconnectDevice(connectedDevice.id);
      }
      setDevices(prev => prev.map(d => (d.id === connectedDevice.id ? { ...d, isConnected: false } : d)));
      setConnectedDevice(null);
    } catch (err) {
      setError('Failed to disconnect device');
    }
  }, [connectedDevice]);

  const send = useCallback(async (message: string) => {
    if (!connectedDevice) {
      setError('No device connected');
      return;
    }
    try {
      setIsSending(true);
      setError(null);
      setLastResponse(null);

      if (Platform.OS === 'web') {
        const response = await bluetoothWebService.sendMessage(connectedDevice.id, message);
        setLastResponse(response);
      } else {
        await bluetoothService.sendMessage(connectedDevice.id, message);
        setLastResponse('Message sent successfully via Bluetooth');
      }
    } catch (err) {
      setError(`Failed to send message: ${(err as Error).message}`);
      setLastResponse(null);
    } finally {
      setIsSending(false);
    }
  }, [connectedDevice]);

  const sendFailureTest = useCallback(async () => {
    if (!connectedDevice) {
      setError('No device connected');
      return;
    }
    try {
      setIsTestingFailure(true);
      setError(null);
      setLastResponse(null);

      if (Platform.OS === 'web') {
        const response = await bluetoothWebService.sendMessage(connectedDevice.id, 'ERROR_TEST');
        setLastResponse(response);
      } else {
        try {
          await bluetoothService.sendMessage(connectedDevice.id, 'ERROR_TEST');
          setLastResponse('Error test message sent via Bluetooth');
        } catch (err) {
          setLastResponse(`Error test triggered: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      setError(`Test failure triggered: ${(err as Error).message}`);
      setLastResponse(null);
    } finally {
      setIsTestingFailure(false);
    }
  }, [connectedDevice]);

  return {
    isScanning,
    isConnecting,
    isSending,
    isTestingFailure,
    devices,
    connectedDevice,
    error,
    lastResponse,
    isWebBluetoothSupported,
    isBluetoothInitialized,
    initialize,
    startScan,
    stopScan,
    connect,
    disconnect,
    send,
    sendFailureTest,
  } as const;
};


