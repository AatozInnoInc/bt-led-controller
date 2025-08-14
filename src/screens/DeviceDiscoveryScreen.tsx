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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { BluetoothDevice } from '../types/bluetooth';
import { bluetoothWebService } from '../utils/bluetoothWebService';

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

  useEffect(() => {
    checkWebBluetoothSupport();
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

  // Mock data for development - replace with actual Bluetooth scanning
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
        // Use mock data for mobile (since we need development build for real Bluetooth)
        setTimeout(() => {
          setDevices(mockDevices);
          setIsScanning(false);
        }, 2000);
        return;
      }

      setIsScanning(false);
    } catch (error) {
      console.error('Scan error:', error);
      setError('Failed to scan for devices: ' + (error as Error).message);
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    setIsScanning(false);
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
        // Simulate connection delay for mobile
        await new Promise(resolve => setTimeout(resolve, 1500));
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
        // Simulate disconnection delay for mobile
        await new Promise(resolve => setTimeout(resolve, 500));
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
        // Simulate sending delay for mobile
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLastResponse('Message sent successfully (mock mode)');
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
        // Simulate error for mobile
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLastResponse('Error test completed (mock mode)');
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

  const renderDevice = ({ item }: { item: BluetoothDevice }) => (
    <TouchableOpacity
      style={[
        styles.deviceCard,
        item.isConnected && styles.deviceCardConnected,
        isConnecting && styles.deviceCardConnecting
      ]}
      onPress={() => selectDevice(item)}
      activeOpacity={0.7}
      disabled={isConnecting}
    >
      <View style={styles.deviceInfo}>
        <View style={styles.deviceHeader}>
          <Ionicons 
            name={item.isConnected ? "bluetooth" : "bluetooth-outline"} 
            size={24} 
            color={item.isConnected ? theme.dark.success : theme.dark.primary} 
          />
          <Text style={styles.deviceName}>{item.name}</Text>
          {item.isConnected && (
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>Connected</Text>
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
        </View>
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={theme.dark.textSecondary} 
      />
    </TouchableOpacity>
  );

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
        <View style={styles.mockNotice}>
          <Text style={styles.mockNoticeText}>
            ⚠️ Currently using mock data for Expo Go testing
          </Text>
          <Text style={styles.mockNoticeSubtext}>
            Use development build for real Bluetooth functionality
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

      {/* Scan Button */}
      <View style={styles.scanSection}>
        <TouchableOpacity
          style={[
            styles.scanButton,
            isScanning && styles.scanButtonActive
          ]}
          onPress={isScanning ? stopScan : startScan}
          disabled={isScanning || isConnecting}
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
            {isScanning ? 'Scanning...' : 'Scan for Devices'}
          </Text>
        </TouchableOpacity>
      </View>

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
        data={devices}
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
