import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect, ReactNode } from 'react';
import { Platform, AppState } from 'react-native';
import { BluetoothDevice } from '../types/bluetooth';
import { bluetoothWebService } from '../utils/bluetoothWebService';
import { bluetoothService } from '../utils/bluetoothService';
import { useAnalytics } from '../hooks/useAnalytics';
import { AnalyticsEventType } from '../types/analytics';
import { getUserPairedDevices, isDevicePaired } from '../utils/devicePairing';
import { useUser } from './UserContext';
import { configDomainController } from '../domain/config/configDomainController';
import { deviceStorage, PairedDevice } from '../utils/deviceStorage';
import { getDeviceDisplayName } from '../utils/bleConstants';

export type FilterType = 'all' | 'microcontrollers' | 'named';

interface BluetoothContextValue {
  isScanning: boolean;
  isConnecting: boolean;
  isSending: boolean;
  isTestingFailure: boolean;
  devices: BluetoothDevice[];
  connectedDevice: BluetoothDevice | null;
  error: string | null;
  lastResponse: string | null;
  isWebBluetoothSupported: boolean;
  isBluetoothInitialized: boolean;
  pairedDevices: PairedDevice[];
  isAutoReconnecting: boolean;
  showReconnectionPrompt: boolean;
  initialize: () => Promise<boolean>;
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (device: BluetoothDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  send: (message: string) => Promise<void>;
  sendFailureTest: () => Promise<void>;
  removePairedDevice: (deviceId: string) => Promise<void>;
  toggleFavorite: (deviceId: string) => Promise<void>;
  refreshPairedDevices: () => Promise<void>;
  verifyCurrentConnection: () => Promise<void>;
}

const BluetoothContext = createContext<BluetoothContextValue | null>(null);

export const BluetoothProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);
  const [showReconnectionPrompt, setShowReconnectionPrompt] = useState(false);
  const autoConnectAttempted = useRef<Set<string>>(new Set());

  const isWebBluetoothSupported = useMemo(
    () => (Platform.OS === 'web' ? bluetoothWebService.isWebBluetoothSupported() : false),
    []
  );

  const isBluetoothInitializedRef = useRef<boolean>(false);
  const [isBluetoothInitialized, setIsBluetoothInitialized] = useState<boolean>(false);

  const initialize = useCallback(async () => {
    // Initialize device storage and load saved devices
    try {
      await deviceStorage.initialize();
      const savedDevices = deviceStorage.getPairedDevices();
      if (savedDevices.length > 0) {
        // Convert saved devices to BluetoothDevice format and add to devices list
        const bluetoothDevices: BluetoothDevice[] = savedDevices.map(device => ({
          id: device.id,
          name: device.name,
          rssi: device.rssi,
          isConnected: false, // Always start as not connected
          manufacturerData: device.manufacturerData,
          serviceUUIDs: device.serviceUUIDs,
          localName: device.localName,
          txPowerLevel: device.txPowerLevel,
        }));
        setDevices(bluetoothDevices);
        console.log(`Loaded ${bluetoothDevices.length} saved device(s) from storage`);
      }
    } catch (error) {
      console.error('Failed to load saved devices:', error);
    }
    
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

      // Load saved devices first, then scan will add newly discovered devices
      try {
        await deviceStorage.reloadPairedDevices();
        const savedDevices = deviceStorage.getPairedDevices();
        if (savedDevices.length > 0) {
          const bluetoothDevices: BluetoothDevice[] = savedDevices.map(device => ({
            id: device.id,
            name: device.name,
            rssi: device.rssi,
            isConnected: false, // Always start as not connected
            manufacturerData: device.manufacturerData,
            serviceUUIDs: device.serviceUUIDs,
            localName: device.localName,
            txPowerLevel: device.txPowerLevel,
          }));
          setDevices(bluetoothDevices);
        } else {
          setDevices([]);
        }
      } catch (error) {
        console.error('Failed to load saved devices before scan:', error);
        setDevices([]);
      }

      if (Platform.OS === 'web') {
        if (!isWebBluetoothSupported) {
          throw new Error('Web Bluetooth is not supported in this browser');
        }
        const webDevices = await bluetoothWebService.startScan();
        setDevices(webDevices);

        // Save discovered web devices to local storage
        webDevices.forEach(device => {
          deviceStorage.addPairedDevice(device).catch((err) => {
            console.error('Failed to save discovered device to storage:', err);
          });
        });
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
            if (prev.some(d => d.id === unifiedDevice.id)) {
              return prev;
            }

            const updated = [...prev, unifiedDevice];

            // Save discovered device to local storage for easy reconnection
            deviceStorage.addPairedDevice(unifiedDevice).then(() => {
              refreshPairedDevices();
            }).catch((err) => {
              console.error('Failed to save discovered device to storage:', err);
            });
            
            if (user?.userId && !autoConnectAttempted.current.has(unifiedDevice.id)) {
              autoConnectAttempted.current.add(unifiedDevice.id);
              
              // Check auto-reconnect setting before attempting connection
              deviceStorage.getAutoReconnectEnabled().then((isAutoReconnectEnabled) => {
                if (!isAutoReconnectEnabled) {
                  autoConnectAttempted.current.delete(unifiedDevice.id);
                  return;
                }
                
                return isDevicePaired(unifiedDevice.id, user.userId);
              }).then((isPaired) => {
                if (isPaired && !connectedDevice) {
                  setTimeout(() => {
                    connect(unifiedDevice).catch((err) => {
                      console.log('Auto-connect failed:', err);
                      autoConnectAttempted.current.delete(unifiedDevice.id);
                    });
                  }, 500);
                }
              }).catch((err) => {
                console.error('Failed to check auto-reconnect or pairing status:', err);
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
  }, [isWebBluetoothSupported, user?.userId, connectedDevice]);

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
        // For web Bluetooth, we need to request the device if not already selected
        if (!bluetoothWebService.hasSelectedDevice()) {
          console.log('No device selected, requesting device for reconnect...');
          const requestedDevice = await bluetoothWebService.requestDeviceForReconnect(device.name);
          if (!requestedDevice) {
            throw new Error('Device selection cancelled or failed');
          }
          // Verify the selected device matches the one we want to connect to
          if (requestedDevice.id !== device.id) {
            throw new Error(`Selected device (${requestedDevice.name}) does not match the requested device (${device.name}). Please try again.`);
          }
        } else {
          // Check if the selected device matches
          const selectedDevice = bluetoothWebService.getSelectedDevice();
          if (selectedDevice?.id !== device.id) {
            console.log('Selected device mismatch, requesting new device...');
            const requestedDevice = await bluetoothWebService.requestDeviceForReconnect(device.name);
            if (!requestedDevice) {
              throw new Error('Device selection cancelled or failed');
            }
            if (requestedDevice.id !== device.id) {
              throw new Error(`Selected device (${requestedDevice.name}) does not match the requested device (${device.name}). Please try again.`);
            }
          }
        }
        await bluetoothWebService.connectToDevice(device.id);
      } else {
        await bluetoothService.connectToDevice(device.id);
      }

      const connectedDeviceWithStatus = { ...device, isConnected: true };
      setConnectedDevice(connectedDeviceWithStatus);
      setDevices(prev => prev.map(d => (d.id === device.id ? { ...d, isConnected: true } : d)));

      // Update device storage connection status and refresh paired devices
      try {
        await deviceStorage.updateDeviceConnection(device.id, true);
        await refreshPairedDevices();
      } catch (err) {
        console.error('Failed to update device connection in storage:', err);
      }

      if (user?.userId) {
        try {
          const isPaired = await isDevicePaired(device.id, user.userId);
          if (isPaired) {
            try {
              await configDomainController.verifyOwnership(device.id, user.userId);
              console.log('Ownership verified for device:', device.id);
            } catch (verifyError) {
              console.warn('Ownership verification failed:', verifyError);
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

      if (Platform.OS !== 'web') {
        try {
          bluetoothService.setAnalyticsCallback(device.id, async (batch) => {
            await processAnalyticsBatch(batch, device.id, device.name);
            try {
              await bluetoothService.confirmAnalytics(device.id, batch.batchId);
            } catch (confirmError) {
              console.error('Failed to confirm analytics:', confirmError);
            }
          });
          
          setTimeout(async () => {
            try {
              const batch = await bluetoothService.requestAnalytics(device.id);
              await processAnalyticsBatch(batch, device.id, device.name);
              await bluetoothService.confirmAnalytics(device.id, batch.batchId);
            } catch (analyticsError) {
              console.log('No analytics available:', analyticsError);
            }
          }, 1000);
        } catch (analyticsError) {
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
  }, [trackConnection, user, processAnalyticsBatch]);

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

      // Update device storage connection status and refresh paired devices
      try {
        await deviceStorage.updateDeviceConnection(deviceId, false);
        await refreshPairedDevices();
      } catch (err) {
        console.error('Failed to update device disconnection in storage:', err);
      }

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

  const removePairedDevice = useCallback(async (deviceId: string) => {
    try {
      await deviceStorage.removePairedDevice(deviceId);
      await refreshPairedDevices();
    } catch (err) {
      console.error('Failed to remove paired device:', err);
      throw err;
    }
  }, []);

  const toggleFavorite = useCallback(async (deviceId: string) => {
    try {
      await deviceStorage.toggleFavorite(deviceId);
      await refreshPairedDevices();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      throw err;
    }
  }, []);

  const refreshPairedDevices = useCallback(async () => {
    try {
      await deviceStorage.reloadPairedDevices();
      const devices = deviceStorage.getPairedDevices();
      setPairedDevices(devices);
    } catch (err) {
      console.error('Failed to refresh paired devices:', err);
    }
  }, []);

  const verifyCurrentConnection = useCallback(async () => {
    if (!connectedDevice || !user?.userId) {
      setError('No device connected or user not logged in');
      return;
    }
    try {
      setIsSending(true);
      setError(null);
      setLastResponse(null);
      
      await configDomainController.verifyOwnership(connectedDevice.id, user.userId);
      setLastResponse('Connection verified successfully');
    } catch (err) {
      const errorMessage = (err as Error).message || 'Failed to verify connection';
      setError(errorMessage);
      setLastResponse(null);
    } finally {
      setIsSending(false);
    }
  }, [connectedDevice, user?.userId]);

  // Load paired devices on mount and when user changes
  useEffect(() => {
    refreshPairedDevices();
  }, [refreshPairedDevices]);

  // Auto-connect to paired devices on app launch/restore
  useEffect(() => {
    const autoConnectOnLaunch = async () => {
      if (!user?.userId || !isBluetoothInitializedRef.current || Platform.OS === 'web') {
        return;
      }

      try {
        // Check if auto-reconnect is enabled
        const isAutoReconnectEnabled = await deviceStorage.getAutoReconnectEnabled();
        if (!isAutoReconnectEnabled) {
          console.log('Auto-reconnect is disabled, skipping auto-connect');
          return;
        }

        const userPairedDevices = await getUserPairedDevices(user.userId);
        if (userPairedDevices.length === 0 || connectedDevice) {
          return;
        }
        
        console.log(`Auto-connect: Found ${userPairedDevices.length} paired device(s), starting scan to reconnect...`);
        setIsAutoReconnecting(true);
        setShowReconnectionPrompt(true);
        // Start scanning to find and auto-connect to paired devices
        await startScan();
        // Hide prompt after a delay
        setTimeout(() => {
          setShowReconnectionPrompt(false);
          setIsAutoReconnecting(false);
        }, 10000);
      } catch (error) {
        console.error('Failed to check paired devices on launch:', error);
        setIsAutoReconnecting(false);
        setShowReconnectionPrompt(false);
      }
    };

    if (isBluetoothInitialized) {
      autoConnectOnLaunch();
    }
  }, [user?.userId, isBluetoothInitialized, connectedDevice, startScan]);

  // Handle app state changes (foreground/background) for auto-reconnect
  useEffect(() => {
    if (Platform.OS === 'web') {
      return; // AppState is not reliable on web
    }

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // When app comes to foreground
      if (nextAppState === 'active') {
        // Check if we should auto-reconnect
        if (!connectedDevice && user?.userId && isBluetoothInitializedRef.current) {
          try {
            const isAutoReconnectEnabled = await deviceStorage.getAutoReconnectEnabled();
            if (!isAutoReconnectEnabled) {
              return;
            }

            const userPairedDevices = await getUserPairedDevices(user.userId);
            if (userPairedDevices.length > 0) {
              console.log('App resumed: Starting scan to reconnect to paired devices...');
              setIsAutoReconnecting(true);
              setShowReconnectionPrompt(true);
              await startScan();
              setTimeout(() => {
                setShowReconnectionPrompt(false);
                setIsAutoReconnecting(false);
              }, 10000);
            }
          } catch (error) {
            console.error('Failed to auto-reconnect on app resume:', error);
            setIsAutoReconnecting(false);
            setShowReconnectionPrompt(false);
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user?.userId, connectedDevice, startScan]);

  const value = useMemo(() => ({
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
    pairedDevices,
    isAutoReconnecting,
    showReconnectionPrompt,
    initialize,
    startScan,
    stopScan,
    connect,
    disconnect,
    send,
    sendFailureTest,
    removePairedDevice,
    toggleFavorite,
    refreshPairedDevices,
    verifyCurrentConnection,
  }), [
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
    pairedDevices,
    isAutoReconnecting,
    showReconnectionPrompt,
    initialize,
    startScan,
    stopScan,
    connect,
    disconnect,
    send,
    sendFailureTest,
    removePairedDevice,
    toggleFavorite,
    refreshPairedDevices,
    verifyCurrentConnection,
  ]);

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
};

export const useBluetoothContext = (): BluetoothContextValue => {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error('useBluetoothContext must be used within a BluetoothProvider');
  }
  return context;
};

