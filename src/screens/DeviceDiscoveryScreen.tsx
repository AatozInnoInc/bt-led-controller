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
import { LinearGradient } from '../utils/linearGradientWrapper';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { BluetoothDevice } from '../types/bluetooth';
import { bluetoothService } from '../utils/bluetoothService';
import { isPotentialMicrocontroller } from '../utils/bleUtils';
import { useBluetooth } from '../hooks/useBluetooth';

interface DeviceDiscoveryScreenProps {
  navigation: any;
}

const DeviceDiscoveryScreen: React.FC<DeviceDiscoveryScreenProps> = ({ navigation }) => {
  const {
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
  } = useBluetooth();
  // moved into useBluetooth hook
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'microcontrollers' | 'named'>('all');

  useEffect(() => {
    initialize();
    return () => {
      if (Platform.OS !== 'web' && isScanning) {
        bluetoothService.stopScan();
      }
    };
  }, []);

  // moved to useBluetooth hook

  // moved to utils/bleUtils

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



  // moved to useBluetooth hook

  // moved to useBluetooth hook

  /* moved to hook
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
  */

  /* moved to hook
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
  */

  /* moved to hook
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
  */

  /* moved to hook
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
  */

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
          disconnect();
        }
      } else {
        Alert.alert(
          'Device Connected',
          `${device.name} is already connected. Would you like to disconnect?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Disconnect', onPress: () => disconnect() },
          ]
        );
      }
    } else {
      // For web, use browser's confirm dialog
      if (Platform.OS === 'web') {
        const shouldConnect = window.confirm(`Connect to ${device.name}?`);
        if (shouldConnect) {
          console.log('Connect confirmed for device:', device.name);
          connect(device);
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
              connect(device);
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
      <LinearGradient
        colors={[ '#0a0a0a', '#0b1736' ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      <View style={styles.backgroundDecor}>
        <View style={styles.blobPrimary} />
        <View style={styles.blobSecondary} />
      </View>
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
      {(() => {
        const isWebPlatform = Platform.OS === 'web';
        const platformIcon = isWebPlatform ? '🌐' : Platform.OS === 'ios' ? '📱' : '🤖';
        const platformName = isWebPlatform ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android';
        const isPlatformError = !isWebPlatform && !isBluetoothInitialized;
        const platformStatusText = isWebPlatform
          ? (isWebBluetoothSupported ? 'Bluetooth Supported' : 'Bluetooth Not Supported')
          : (isBluetoothInitialized
              ? 'Bluetooth Ready'
              : (!bluetoothService.isAvailable() ? 'Expo Go - UI Testing Only' : 'Bluetooth Initializing...'));
        return (
          <BlurView intensity={25} tint="dark" style={[styles.platformInfo, isPlatformError && styles.platformInfoError]}>
            <Text style={[styles.platformInfoText, isPlatformError && styles.platformInfoTextError]}>
              {platformIcon} {platformName} Platform - {platformStatusText}
            </Text>
          </BlurView>
        );
      })()}

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
          <BlurView intensity={18} tint="dark" style={styles.searchBar}>
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
          </BlurView>

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
              onPress={() => send('Hello World!')}
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
               onPress={sendFailureTest}
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
    position: 'relative',
  },
  backgroundDecor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  blobPrimary: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(88,86,214,0.18)',
    top: -50,
    left: -40,
  },
  blobSecondary: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0,122,255,0.14)',
    top: -10,
    right: -30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
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
