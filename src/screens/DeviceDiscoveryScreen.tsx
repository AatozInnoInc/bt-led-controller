import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { BluetoothDevice } from '../types/bluetooth';
import { bluetoothWebService } from '../utils/bluetoothWebService';
import { bluetoothService } from '../utils/bluetoothService';

interface DeviceDiscoveryScreenProps {
  navigation: any;
}

const DeviceDiscoveryScreen: React.FC<DeviceDiscoveryScreenProps> = ({ navigation }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTestingFailure, setIsTestingFailure] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [isWebBluetoothSupported, setIsWebBluetoothSupported] = useState(false);
  const [isBluetoothInitialized, setIsBluetoothInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'microcontrollers' | 'named'>('all');

  useEffect(() => {
    checkWebBluetoothSupport();
    initializeBluetooth();

    // Cleanup function to stop scan when component unmounts
    return () => {
      if (Platform.OS !== 'web' && isScanning) {
        bluetoothService.stopScan();
      }
    };
  }, []);

  const checkWebBluetoothSupport = () => {
    if (Platform.OS === 'web') {
      const supported = bluetoothWebService.isWebBluetoothSupported();
      setIsWebBluetoothSupported(supported);
      if (!supported) {
        setError('Web Bluetooth is not supported in this browser. Try Chrome or Edge.');
      }
    }
  };

  const initializeBluetooth = async () => {
    if (Platform.OS !== 'web') {
      try {
        // Check if we're in Expo Go (native module not available)
        if (!bluetoothService.isAvailable()) {
          setIsBluetoothInitialized(false);
          setError('Bluetooth requires a development build. Use Expo Go for UI testing only.');
          return;
        }
        
        const initialized = await bluetoothService.initialize();
        setIsBluetoothInitialized(initialized);
        if (!initialized) {
          setError('Failed to initialize Bluetooth. Please check your Bluetooth settings.');
        }
      } catch (error) {
        console.error('Bluetooth initialization error:', error);
        if ((error as Error).message.includes('native module')) {
          setError('Bluetooth requires a development build. Use Expo Go for UI testing only.');
        } else {
          setError('Failed to initialize Bluetooth: ' + (error as Error).message);
        }
      }
    }
  };

  const isPotentialMicrocontroller = (device: any): boolean => {
    // Check for Nordic UART Service UUID (standard NUS)
    const hasNordicUART = device.serviceUUIDs?.some((uuid: string) => 
      uuid.toLowerCase().includes('6e400') || 
      uuid.toLowerCase().includes('b5a3-f393-e0a9-e50e24dcca9e')
    );
    
    // Check for Adafruit Bluefruit BLE UART service UUIDs
    const hasAdafruitUART = device.serviceUUIDs?.some((uuid: string) => 
      uuid.toLowerCase().includes('6e400001') ||  // Nordic UART Service
      uuid.toLowerCase().includes('6e400002') ||  // Nordic UART Write
      uuid.toLowerCase().includes('6e400003') ||  // Nordic UART Read
      uuid.toLowerCase().includes('adafruit') ||  // Adafruit services
      uuid.toLowerCase().includes('feather')      // Feather services
    );
    
    // Check for Adafruit manufacturer data patterns
    const hasAdafruitPattern = device.manufacturerData && (
      device.manufacturerData.includes('Adafruit') ||
      device.manufacturerData.includes('adafruit') ||
      device.manufacturerData.includes('Bluefruit') ||
      device.manufacturerData.includes('Feather')
    );
    
    // Check for common microcontroller names
    const hasMicrocontrollerName = device.name && (
      device.name.toLowerCase().includes('feather') ||
      device.name.toLowerCase().includes('itsybitsy') ||
      device.name.toLowerCase().includes('nrf52') ||
      device.name.toLowerCase().includes('arduino') ||
      device.name.toLowerCase().includes('esp32') ||
      device.name.toLowerCase().includes('microcontroller') ||
      device.name.toLowerCase().includes('bluefruit') ||
      device.name.toLowerCase().includes('led guitar controller') ||
      device.name.toLowerCase().includes('guitar controller')
    );
    
    // Check for any service UUIDs (many microcontrollers advertise services)
    const hasAnyServices = device.serviceUUIDs && device.serviceUUIDs.length > 0;
    
    return hasNordicUART || hasAdafruitUART || hasAdafruitPattern || hasMicrocontrollerName || hasAnyServices;
  };

  const getDeviceDisplayName = (device: any): string => {
    if (device.name) {
      return device.name;
    }
    
    if (isPotentialMicrocontroller(device)) {
      return `Possible Microcontroller (${device.id.substring(0, 8)}...)`;
    }
    
    return `Unknown Device (${device.id.substring(0, 8)}...)`;
  };

  const getFilteredDevices = (): BluetoothDevice[] => {
    let filtered = devices;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(device => 
        device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.manufacturerData?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply type filter
    switch (filterType) {
      case 'microcontrollers':
        filtered = filtered.filter(device => isPotentialMicrocontroller(device));
        break;
      case 'named':
        filtered = filtered.filter(device => device.name && device.name.trim() !== '');
        break;
      case 'all':
      default:
        break;
    }
    
    return filtered;
  };



  const startScan = async () => {
    try {
      setIsScanning(true);
      setError(null);
      setDevices([]);

      if (Platform.OS === 'web') {
        if (!isWebBluetoothSupported) {
          setError('Web Bluetooth is not supported in this browser');
          setIsScanning(false);
          return;
        }

        // Use real Web Bluetooth
        const webDevices = await bluetoothWebService.startScan();
        setDevices(webDevices);
      } else {
        // Use real Bluetooth for mobile
        if (!isBluetoothInitialized) {
          // In Expo Go, show mock data for UI testing
          if (!bluetoothService.isAvailable()) {
            console.log('Using mock data for Expo Go testing');
            setTimeout(() => {
              const mockDevices: BluetoothDevice[] = [
                {
                  id: '1',
                  name: 'Bluefruit Feather52',
                  rssi: -45,
                  isConnected: false,
                  manufacturerData: 'Adafruit Industries',
                },
                {
                  id: '2',
                  name: 'ItsyBitsy nRF52840 Express',
                  rssi: -52,
                  isConnected: false,
                  manufacturerData: 'Adafruit',
                },
                {
                  id: '3',
                  name: 'LED Guitar Controller',
                  rssi: -67,
                  isConnected: false,
                  manufacturerData: 'Custom',
                },
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

        // Request permissions first
        const hasPermissions = await bluetoothService.requestPermissions();
        if (!hasPermissions) {
          setError('Bluetooth permissions are required to scan for devices.');
          setIsScanning(false);
          return;
        }

        // Start real Bluetooth scan with device discovery callback
        await bluetoothService.startScan((device: any) => {
          // Log ALL devices found for debugging
          console.log('📱 DEVICE FOUND:', {
            id: device.id,
            name: device.name || 'NO NAME',
            rssi: device.rssi,
            manufacturerData: device.manufacturerData || 'NO MANUFACTURER DATA',
            serviceUUIDs: device.serviceUUIDs || 'NO SERVICES',
            localName: device.localName || 'NO LOCAL NAME'
          });
          
          // Check if this might be our microcontroller
          const isMCU = isPotentialMicrocontroller(device);
          if (isMCU) {
            console.log('🎯 POTENTIAL MICROCONTROLLER FOUND:', {
              id: device.id,
              name: device.name,
              serviceUUIDs: device.serviceUUIDs,
              manufacturerData: device.manufacturerData
            });
          }
          
          // Check if this matches our web device
          if (device.name === 'ItsyBitsy nRF52840 Express' || 
              device.localName === 'ItsyBitsy nRF52840 Express' ||
              device.name?.includes('nRF52840') ||
              device.localName?.includes('nRF52840')) {
            console.log('🎯 ITSYBITSY NRF52840 FOUND!:', {
              id: device.id,
              name: device.name,
              localName: device.localName,
              serviceUUIDs: device.serviceUUIDs,
              manufacturerData: device.manufacturerData
            });
          }
          
          // Check if this matches our new device name
          if (device.name === 'LED Guitar' || 
              device.localName === 'LED Guitar' ||
              device.name?.includes('LED Guitar') ||
              device.localName?.includes('LED Guitar')) {
            console.log('🎯 LED GUITAR CONTROLLER FOUND!:', {
              id: device.id,
              name: device.name,
              localName: device.localName,
              serviceUUIDs: device.serviceUUIDs,
              manufacturerData: device.manufacturerData
            });
          }
          
          // Show all devices, even those without names
          const newDevice: BluetoothDevice = {
            id: device.id,
            name: getDeviceDisplayName(device),
            rssi: device.rssi || -50,
            isConnected: false,
            manufacturerData: device.manufacturerData || 'Unknown',
            serviceUUIDs: device.serviceUUIDs || [],
          };
          
          setDevices(prevDevices => {
            // Check if device already exists
            const exists = prevDevices.find(d => d.id === device.id);
            if (!exists) {
              console.log('Adding new device to list:', newDevice.name);
              return [...prevDevices, newDevice];
            }
            return prevDevices;
          });
        });

        // Stop scan after 10 seconds
        setTimeout(async () => {
          await bluetoothService.stopScan();
          setIsScanning(false);
        }, 10000);
        
        return;
      }

      setIsScanning(false);
    } catch (error) {
      console.error('Scan error:', error);
      setError('Failed to scan for devices: ' + (error as Error).message);
      setIsScanning(false);
    }
  };

  const stopScan = async () => {
    setIsScanning(false);
    if (Platform.OS !== 'web') {
      try {
        await bluetoothService.stopScan();
      } catch (error) {
        console.error('Error stopping scan:', error);
      }
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      setIsConnecting(true);
      setError(null);

      console.log('Starting connection process for device:', device.name);

      if (Platform.OS === 'web') {
        // Use real Web Bluetooth connection
        console.log('Attempting to connect to device via Web Bluetooth:', device.name);
        
        // Check if we have a selected device
        if (!bluetoothWebService.hasSelectedDevice()) {
          console.log('No device selected, need to scan first');
          setError('Please scan for devices first to select a device');
          return;
        }

        // Get the selected device to verify it matches
        const selectedDevice = bluetoothWebService.getSelectedDevice();
        console.log('Selected device from service:', selectedDevice?.name);
        console.log('Target device:', device.name);
        console.log('Device IDs match:', selectedDevice?.id === device.id);

        await bluetoothWebService.connectToDevice(device.id);
        console.log('Web Bluetooth connection successful');
      } else {
        // Use real Bluetooth connection for mobile
        console.log('Attempting to connect to device via native Bluetooth:', device.name);
        
        try {
          await bluetoothService.connectToDevice(device.id);
          console.log('Native Bluetooth connection successful');
        } catch (error) {
          console.error('Native Bluetooth connection failed:', error);
          throw new Error('Failed to connect to device: ' + (error as Error).message);
        }
      }

      // Update device status
      setConnectedDevice({
        ...device,
        isConnected: true,
      });

      // Update device in list
      setDevices(prevDevices =>
        prevDevices.map(d =>
          d.id === device.id ? { ...d, isConnected: true } : d
        )
      );

      console.log('Device state updated - connected:', device.name);

      Alert.alert(
        'Connected!',
        `Successfully connected to ${device.name}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Connection error:', error);
      setError('Failed to connect to device: ' + (error as Error).message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    if (!connectedDevice) return;

    try {
      if (Platform.OS === 'web') {
        await bluetoothWebService.disconnectDevice(connectedDevice.id);
      } else {
        // Use real Bluetooth disconnection for mobile
        await bluetoothService.disconnectDevice(connectedDevice.id);
      }
      
      setConnectedDevice(null);
      setDevices(prevDevices =>
        prevDevices.map(d =>
          d.id === connectedDevice.id ? { ...d, isConnected: false } : d
        )
      );

      Alert.alert('Disconnected', 'Device disconnected successfully');
    } catch (error) {
      console.error('Disconnect error:', error);
      setError('Failed to disconnect device');
    }
  };

  const sendMessage = async () => {
    if (!connectedDevice) {
      setError('No device connected');
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      setLastResponse(null);

      if (Platform.OS === 'web') {
        // Use real Web Bluetooth to send message
        const response = await bluetoothWebService.sendMessage(connectedDevice.id, 'Hello World!');
        setLastResponse(response);
      } else {
        // Use real Bluetooth to send message for mobile
        await bluetoothService.sendMessage(connectedDevice.id, 'Hello World!');
        setLastResponse('Message sent successfully via Bluetooth');
      }

    } catch (error) {
      console.error('Send message error:', error);
      setError('Failed to send message: ' + (error as Error).message);
      setLastResponse(null);
    } finally {
      setIsSending(false);
    }
  };

  const testFailure = async () => {
    if (!connectedDevice) {
      setError('No device connected');
      return;
    }

    try {
      setIsTestingFailure(true);
      setError(null);
      setLastResponse(null);

      if (Platform.OS === 'web') {
        // Send a message that should trigger an error response
        const response = await bluetoothWebService.sendMessage(connectedDevice.id, 'ERROR_TEST');
        setLastResponse(response);
      } else {
        // Use real Bluetooth to send error test message for mobile
        try {
          await bluetoothService.sendMessage(connectedDevice.id, 'ERROR_TEST');
          setLastResponse('Error test message sent via Bluetooth');
        } catch (error) {
          setLastResponse('Error test triggered: ' + (error as Error).message);
        }
      }

    } catch (error) {
      console.error('Test failure error:', error);
      setError('Test failure triggered: ' + (error as Error).message);
      setLastResponse(null);
    } finally {
      setIsTestingFailure(false);
    }
  };

  const selectDevice = (device: BluetoothDevice) => {
    console.log('Device selected:', device.name, 'Connected:', device.isConnected);
    console.log('About to show connect dialog for device:', device.name);
    
    if (device.isConnected) {
      // For web, use browser's confirm dialog
      if (Platform.OS === 'web') {
        const shouldDisconnect = window.confirm(
          `${device.name} is already connected. Would you like to disconnect?`
        );
        if (shouldDisconnect) {
          disconnectDevice();
        }
      } else {
        Alert.alert(
          'Device Connected',
          `${device.name} is already connected. Would you like to disconnect?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Disconnect', onPress: () => disconnectDevice() },
          ]
        );
      }
    } else {
      // For web, use browser's confirm dialog
      if (Platform.OS === 'web') {
        const shouldConnect = window.confirm(`Connect to ${device.name}?`);
        if (shouldConnect) {
          console.log('Connect confirmed for device:', device.name);
          connectToDevice(device);
        } else {
          console.log('Connect cancelled for device:', device.name);
        }
      } else {
        Alert.alert(
          'Connect Device',
          `Connect to ${device.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Connect', onPress: () => {
              console.log('Connect button pressed for device:', device.name);
              connectToDevice(device);
            }},
          ]
        );
      }
    }
  };

  const renderDevice = ({ item }: { item: BluetoothDevice }) => {
    const isMicrocontroller = isPotentialMicrocontroller(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.deviceCard,
          item.isConnected && styles.deviceCardConnected,
          isConnecting && styles.deviceCardConnecting,
          isMicrocontroller && styles.deviceCardMicrocontroller
        ]}
        onPress={() => selectDevice(item)}
        activeOpacity={0.7}
        disabled={isConnecting}
      >
        <View style={styles.deviceInfo}>
          <View style={styles.deviceHeader}>
            <Ionicons 
              name={item.isConnected ? "bluetooth" : (isMicrocontroller ? "hardware-chip" : "bluetooth-outline")} 
              size={24} 
              color={item.isConnected ? theme.dark.success : (isMicrocontroller ? theme.dark.warning : theme.dark.primary)} 
            />
            <Text style={styles.deviceName}>{item.name}</Text>
            {item.isConnected && (
              <View style={styles.connectedBadge}>
                <Text style={styles.connectedText}>Connected</Text>
              </View>
            )}
            {isMicrocontroller && !item.isConnected && (
              <View style={styles.microcontrollerBadge}>
                <Text style={styles.microcontrollerText}>MCU</Text>
              </View>
            )}
            {isConnecting && !item.isConnected && (
              <View style={styles.connectingBadge}>
                <ActivityIndicator size="small" color={theme.dark.text} />
                <Text style={styles.connectingText}>Connecting...</Text>
              </View>
            )}
          </View>
          <View style={styles.deviceDetails}>
            <Text style={styles.deviceDetail}>
              Signal: {item.rssi} dBm
            </Text>
            {item.manufacturerData && (
              <Text style={styles.deviceDetail}>
                Manufacturer: {item.manufacturerData}
              </Text>
            )}
            {item.serviceUUIDs && item.serviceUUIDs.length > 0 && (
              <Text style={styles.deviceDetail}>
                Services: {item.serviceUUIDs.length}
              </Text>
            )}
          </View>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={theme.dark.textSecondary} 
        />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="bluetooth-outline" 
        size={64} 
        color={theme.dark.textSecondary} 
      />
      <Text style={styles.emptyStateTitle}>No Devices Found</Text>
      <Text style={styles.emptyStateText}>
        {isScanning 
          ? 'Scanning for Bluetooth devices...' 
          : 'Tap "Scan for Devices" to discover nearby Bluetooth devices'
        }
      </Text>
      
      {Platform.OS === 'web' ? (
        <View style={styles.webNotice}>
          <Text style={styles.webNoticeText}>
            🌐 Using Web Bluetooth API
          </Text>
          <Text style={styles.webNoticeSubtext}>
            {isWebBluetoothSupported 
              ? 'Real Bluetooth functionality available in supported browsers'
              : 'Web Bluetooth not supported. Try Chrome or Edge.'
            }
          </Text>
        </View>
      ) : (
        <View style={styles.nativeNotice}>
          <Text style={styles.nativeNoticeText}>
            {bluetoothService.isAvailable() ? '📱 Using Native Bluetooth API' : '⚠️ Expo Go - UI Testing Only'}
          </Text>
          <Text style={styles.nativeNoticeSubtext}>
            {bluetoothService.isAvailable() 
              ? (isBluetoothInitialized 
                  ? 'Real Bluetooth functionality available'
                  : 'Initializing Bluetooth...')
              : 'Use development build for real Bluetooth functionality'
            }
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Discovery</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Platform Info */}
      {Platform.OS === 'web' && (
        <View style={styles.platformInfo}>
          <Text style={styles.platformInfoText}>
            🌐 Web Platform - {isWebBluetoothSupported ? 'Bluetooth Supported' : 'Bluetooth Not Supported'}
          </Text>
        </View>
      )}
      {Platform.OS === 'ios' && (
        <View style={[styles.platformInfo, !isBluetoothInitialized && styles.platformInfoError]}>
          <Text style={[styles.platformInfoText, !isBluetoothInitialized && styles.platformInfoTextError]}>
            📱 iOS Platform - {isBluetoothInitialized ? 'Bluetooth Ready' : 
             !bluetoothService.isAvailable() ? 'Expo Go - UI Testing Only' : 'Bluetooth Initializing...'}
          </Text>
        </View>
      )}
      {Platform.OS === 'android' && (
        <View style={[styles.platformInfo, !isBluetoothInitialized && styles.platformInfoError]}>
          <Text style={[styles.platformInfoText, !isBluetoothInitialized && styles.platformInfoTextError]}>
            🤖 Android Platform - {isBluetoothInitialized ? 'Bluetooth Ready' : 
             !bluetoothService.isAvailable() ? 'Expo Go - UI Testing Only' : 'Bluetooth Initializing...'}
          </Text>
        </View>
      )}

      {/* Scan Button */}
      <View style={styles.scanSection}>
        <TouchableOpacity
          style={[
            styles.scanButton,
            isScanning && styles.scanButtonActive,
            (!isBluetoothInitialized && Platform.OS !== 'web') && styles.scanButtonDisabled
          ]}
          onPress={isScanning ? stopScan : startScan}
          disabled={isScanning || isConnecting || (!isBluetoothInitialized && Platform.OS !== 'web')}
        >
          {isScanning ? (
            <ActivityIndicator color={theme.dark.text} size="small" />
          ) : (
            <Ionicons 
              name="search" 
              size={20} 
              color={theme.dark.text} 
            />
          )}
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 
             (!isBluetoothInitialized && Platform.OS !== 'web') ? 
               (!bluetoothService.isAvailable() ? 'Test UI (Mock Data)' : 'Bluetooth Not Ready') : 
             'Scan for Devices'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter Section */}
      {devices.length > 0 && (
        <View style={styles.searchSection}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={theme.dark.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search devices..."
              placeholderTextColor={theme.dark.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.dark.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'all' && styles.filterButtonActive
              ]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[
                styles.filterButtonText,
                filterType === 'all' && styles.filterButtonTextActive
              ]}>
                All ({devices.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'microcontrollers' && styles.filterButtonActive
              ]}
              onPress={() => setFilterType('microcontrollers')}
            >
              <Text style={[
                styles.filterButtonText,
                filterType === 'microcontrollers' && styles.filterButtonTextActive
              ]}>
                Microcontrollers ({devices.filter(d => isPotentialMicrocontroller(d)).length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterType === 'named' && styles.filterButtonActive
              ]}
              onPress={() => setFilterType('named')}
            >
              <Text style={[
                styles.filterButtonText,
                filterType === 'named' && styles.filterButtonTextActive
              ]}>
                Named ({devices.filter(d => d.name && d.name.trim() !== '').length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Send Message Button */}
      {connectedDevice && (
        <View style={styles.sendMessageSection}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.sendMessageButton,
                isSending && styles.sendMessageButtonActive
              ]}
              onPress={sendMessage}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color={theme.dark.text} size="small" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={theme.dark.text} 
                />
              )}
              <Text style={styles.sendMessageButtonText}>
                {isSending ? 'Sending...' : 'Send Message'}
              </Text>
            </TouchableOpacity>

                         <TouchableOpacity
               style={[
                 styles.testFailureButton,
                 isTestingFailure && styles.testFailureButtonActive
               ]}
               onPress={testFailure}
               disabled={isTestingFailure || isSending}
             >
               {isTestingFailure ? (
                 <ActivityIndicator color={theme.dark.text} size="small" />
               ) : (
                 <Ionicons 
                   name="warning" 
                   size={20} 
                   color={theme.dark.text} 
                 />
               )}
               <Text style={styles.testFailureButtonText}>
                 {isTestingFailure ? 'Testing...' : 'Test Failure'}
               </Text>
             </TouchableOpacity>
          </View>
          
          <Text style={styles.connectedDeviceText}>
            Connected to: {connectedDevice.name}
          </Text>

          {/* Response Display */}
          {lastResponse && (
            <View style={styles.responseContainer}>
              <Text style={styles.responseTitle}>Device Response:</Text>
              <Text style={styles.responseText}>{lastResponse}</Text>
            </View>
          )}
        </View>
      )}

      {/* Device List */}
      <FlatList
        data={getFilteredDevices()}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.deviceList}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.dark.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: theme.dark.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  platformInfo: {
    backgroundColor: theme.dark.primary + '20',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.dark.primary,
  },
  platformInfoText: {
    color: theme.dark.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  platformInfoError: {
    backgroundColor: theme.dark.error + '20',
    borderColor: theme.dark.error,
  },
  platformInfoTextError: {
    color: theme.dark.error,
  },
  scanSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.dark.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 4px 8px ${theme.dark.primary}4D`,
    } : {
      shadowColor: theme.dark.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  scanButtonActive: {
    backgroundColor: theme.dark.secondary,
  },
  scanButtonDisabled: {
    backgroundColor: theme.dark.textSecondary,
    opacity: 0.5,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.dark.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.dark.border,
  },
  searchInput: {
    flex: 1,
    color: theme.dark.text,
    fontSize: 16,
    marginLeft: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: theme.dark.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.dark.border,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: theme.dark.primary,
    borderColor: theme.dark.primary,
  },
  filterButtonText: {
    color: theme.dark.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: theme.dark.text,
    fontWeight: '600',
  },
  scanButtonText: {
    color: theme.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sendMessageSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sendMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.dark.success,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 4px 8px ${theme.dark.success}4D`,
    } : {
      shadowColor: theme.dark.success,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  sendMessageButtonActive: {
    backgroundColor: theme.dark.secondary,
  },
  sendMessageButtonText: {
    color: theme.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  testFailureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.dark.warning,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 4px 8px ${theme.dark.warning}4D`,
    } : {
      shadowColor: theme.dark.warning,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  testFailureButtonActive: {
    backgroundColor: theme.dark.secondary,
  },
  testFailureButtonText: {
    color: theme.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  connectedDeviceText: {
    fontSize: 14,
    color: theme.dark.textSecondary,
    textAlign: 'center',
  },
  responseContainer: {
    backgroundColor: theme.dark.card,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.dark.border,
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.dark.text,
    marginBottom: 8,
  },
  responseText: {
    fontSize: 14,
    color: theme.dark.textSecondary,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  deviceList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.dark.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.dark.border,
  },
  deviceCardConnected: {
    borderColor: theme.dark.success,
    backgroundColor: theme.dark.success + '10',
  },
  deviceCardConnecting: {
    borderColor: theme.dark.primary,
    backgroundColor: theme.dark.primary + '10',
    opacity: 0.7,
  },
  deviceCardMicrocontroller: {
    borderColor: theme.dark.warning,
    backgroundColor: theme.dark.warning + '10',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.dark.text,
    marginLeft: 12,
    flex: 1,
  },
  connectedBadge: {
    backgroundColor: theme.dark.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  connectedText: {
    fontSize: 12,
    color: theme.dark.text,
    fontWeight: '600',
  },
  connectingBadge: {
    backgroundColor: theme.dark.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectingText: {
    fontSize: 12,
    color: theme.dark.text,
    fontWeight: '600',
    marginLeft: 4,
  },
  microcontrollerBadge: {
    backgroundColor: theme.dark.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  microcontrollerText: {
    fontSize: 12,
    color: theme.dark.text,
    fontWeight: '600',
  },
  deviceDetails: {
    marginLeft: 36,
  },
  deviceDetail: {
    fontSize: 14,
    color: theme.dark.textSecondary,
    marginBottom: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.dark.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
    marginBottom: 20,
  },
  webNotice: {
    backgroundColor: theme.dark.primary + '20',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.dark.primary,
    marginTop: 20,
  },
  webNoticeText: {
    color: theme.dark.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  webNoticeSubtext: {
    color: theme.dark.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  mockNotice: {
    backgroundColor: theme.dark.warning + '20',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.dark.warning,
    marginTop: 20,
  },
  mockNoticeText: {
    color: theme.dark.warning,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  mockNoticeSubtext: {
    color: theme.dark.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  nativeNotice: {
    backgroundColor: theme.dark.success + '20',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.dark.success,
    marginTop: 20,
  },
  nativeNoticeText: {
    color: theme.dark.success,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  nativeNoticeSubtext: {
    color: theme.dark.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: theme.dark.error + '20',
    padding: 16,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.dark.error,
  },
  errorText: {
    color: theme.dark.error,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DeviceDiscoveryScreen;
