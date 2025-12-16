import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { BluetoothDevice } from '../types/bluetooth';
import { bluetoothWebService } from '../utils/bluetoothWebService';
import { bluetoothService } from '../utils/bluetoothService';
import { getDeviceDisplayName } from '../utils/bleUtils';
import { useAnalytics } from './useAnalytics';
import { AnalyticsEventType } from '../types/analytics';
import { BLECommandEncoder } from '../utils/bleCommandEncoder';
import { getUserPairedDevices, isDevicePaired } from '../utils/devicePairing';
import { useUser } from '../contexts/UserContext';
import { configDomainController } from '../domain/configDomainController';

export type FilterType = 'all' | 'microcontrollers' | 'named';

export const useBluetooth = () => {
  const { trackConnection, processAnalyticsBatch } = useAnalytics();
  const { user } = useUser();
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTestingFailure, setIsTestingFailure] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const autoConnectAttempted = useRef<Set<string>>(new Set());

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

  // Auto-connect to paired devices on app launch/restore
  useEffect(() => {
    const autoConnectOnLaunch = async () => {
      if (!user?.userId || !isBluetoothInitializedRef.current || Platform.OS === 'web') {
        return;
      }

      try {
        const pairedDevices = await getUserPairedDevices(user.userId);
        if (pairedDevices.length === 0 || connectedDevice) {
          return; // No paired devices or already connected
        }

        // Start a brief scan to discover paired devices, then auto-connect
        // This provides seamless UX - devices will auto-connect when discovered
        console.log(`Auto-connect: Found ${pairedDevices.length} paired device(s), will connect when discovered`);
      } catch (error) {
        console.error('Failed to check paired devices on launch:', error);
      }
    };

    if (isBluetoothInitialized) {
      autoConnectOnLaunch();
    }
  }, [user?.userId, isBluetoothInitialized, connectedDevice]);

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

        await bluetoothService.startScan(async (device: any) => {
          const unifiedDevice: BluetoothDevice = {
            id: device.id,
            name: getDeviceDisplayName(device),
            rssi: device.rssi || -50,
            isConnected: false,
            manufacturerData: device.manufacturerData || 'Unknown',
            serviceUUIDs: device.serviceUUIDs || [],
          };

          setDevices(prev => {
            // Don't add duplicates
            if (prev.some(d => d.id === unifiedDevice.id)) {
              return prev;
            }
            
            const updated = [...prev, unifiedDevice];
            
            // Auto-connect to paired devices
            if (user?.userId && !autoConnectAttempted.current.has(unifiedDevice.id)) {
              autoConnectAttempted.current.add(unifiedDevice.id);
              
              // Check if device is paired to current user
              isDevicePaired(unifiedDevice.id, user.userId).then((isPaired) => {
                if (isPaired && !connectedDevice) {
                  // Auto-connect after a short delay to avoid race conditions
                  setTimeout(() => {
                    connect(unifiedDevice).catch((err) => {
                      console.log('Auto-connect failed:', err);
                      autoConnectAttempted.current.delete(unifiedDevice.id);
                    });
                  }, 500);
                }
              }).catch((err) => {
                console.error('Failed to check pairing status:', err);
                autoConnectAttempted.current.delete(unifiedDevice.id);
              });
            }
            
            return updated;
          });
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

      await trackConnection(
        AnalyticsEventType.CONNECTION_STARTED,
        device.id,
        device.name,
        undefined,
        device.rssi
      );

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
      
      // Verify ownership if device is paired and user is signed in
      if (user?.userId) {
        try {
          const isPaired = await isDevicePaired(device.id, user.userId);
          if (isPaired) {
            // Automatically verify ownership after connection
            try {
              await configDomainController.verifyOwnership(device.id, user.userId);
              console.log('Ownership verified for device:', device.id);
            } catch (verifyError) {
              console.warn('Ownership verification failed:', verifyError);
              // Don't fail the connection, but log the warning
            }
          }
        } catch (pairingError) {
          console.error('Failed to check pairing status:', pairingError);
        }
      }
      
      await trackConnection(
        AnalyticsEventType.CONNECTION_SUCCESS,
        device.id,
        device.name,
        undefined,
        device.rssi
      );

      // Request analytics batch from microcontroller (if available)
      // The microcontroller will auto-send on connection, but we can also request explicitly
      if (Platform.OS !== 'web') {
        try {
          // Set up analytics callback
          bluetoothService.setAnalyticsCallback(device.id, async (batch) => {
            await processAnalyticsBatch(batch, device.id, device.name);
            // Confirm receipt
            try {
              await bluetoothService.confirmAnalytics(device.id, batch.batchId);
            } catch (confirmError) {
              console.error('Failed to confirm analytics:', confirmError);
            }
          });
          
          // Request analytics (microcontroller may have already sent it, but this ensures we get it)
          setTimeout(async () => {
            try {
              const batch = await bluetoothService.requestAnalytics(device.id);
              await processAnalyticsBatch(batch, device.id, device.name);
              await bluetoothService.confirmAnalytics(device.id, batch.batchId);
            } catch (analyticsError) {
              // Analytics not available or no data - this is OK
              console.log('No analytics available:', analyticsError);
            }
          }, 1000); // Wait 1 second for connection to stabilize
        } catch (analyticsError) {
          // Analytics not supported or failed - continue normally
          console.log('Analytics request failed (non-critical):', analyticsError);
        }
      }
    } catch (err) {
      const errorMessage = `Failed to connect to device: ${(err as Error).message}`;
      setError(errorMessage);
      await trackConnection(
        AnalyticsEventType.CONNECTION_FAILED,
        device.id,
        device.name,
        errorMessage,
        device.rssi
      );
    } finally {
      setIsConnecting(false);
    }
  }, [trackConnection, user]);

  const disconnect = useCallback(async () => {
    if (!connectedDevice) return;
    const deviceId = connectedDevice.id;
    const deviceName = connectedDevice.name;
    try {
      if (Platform.OS === 'web') {
        await bluetoothWebService.disconnectDevice(deviceId);
      } else {
        await bluetoothService.disconnectDevice(deviceId);
      }
      setDevices(prev => prev.map(d => (d.id === deviceId ? { ...d, isConnected: false } : d)));
      setConnectedDevice(null);
      autoConnectAttempted.current.delete(deviceId);
      
      await trackConnection(
        AnalyticsEventType.CONNECTION_DISCONNECTED,
        deviceId,
        deviceName
      );
    } catch (err) {
      setError('Failed to disconnect device');
      await trackConnection(
        AnalyticsEventType.CONNECTION_DISCONNECTED,
        deviceId,
        deviceName,
        (err as Error).message
      );
    }
  }, [connectedDevice, trackConnection]);

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


