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
import { useAnalytics } from '../hooks/useAnalytics';
import { useTheme } from '../contexts/ThemeContext';
import { BluetoothDevice } from '../types/bluetooth';
import { bluetoothService } from '../utils/bluetoothService';
import { isPotentialMicrocontroller } from '../utils/bleUtils';
import { useBluetooth } from '../hooks/useBluetooth';

// Type declaration for web platform window object
declare const window: { confirm?: (message?: string) => boolean } | undefined;

interface DeviceDiscoveryScreenProps {
  navigation: any;
}

const DeviceDiscoveryScreen: React.FC<DeviceDiscoveryScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
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
      if (Platform.OS === 'web' && window?.confirm) {
        const shouldDisconnect = window.confirm!(
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
      if (Platform.OS === 'web' && window?.confirm) {
        const shouldConnect = window.confirm!(`Connect to ${device.name}?`);
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
          { backgroundColor: colors.card, borderColor: colors.border },
          item.isConnected && { borderColor: colors.success, backgroundColor: colors.success + '10' },
          isConnecting && { borderColor: colors.primary, backgroundColor: colors.primary + '10', opacity: 0.7 },
          isMicrocontroller && { borderColor: colors.warning, backgroundColor: colors.warning + '10' }
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
              color={item.isConnected ? colors.success : (isMicrocontroller ? colors.warning : colors.primary)} 
            />
            <Text style={[styles.deviceName, { color: colors.text }]}>{item.name}</Text>
            {item.isConnected && (
              <View style={[styles.connectedBadge, { backgroundColor: colors.success }]}>
                <Text style={[styles.connectedText, { color: colors.text }]}>Connected</Text>
              </View>
            )}
            {isMicrocontroller && !item.isConnected && (
              <View style={[styles.microcontrollerBadge, { backgroundColor: colors.warning }]}>
                <Text style={[styles.microcontrollerText, { color: colors.text }]}>MCU</Text>
              </View>
            )}
            {isConnecting && !item.isConnected && (
              <View style={[styles.connectingBadge, { backgroundColor: colors.primary }]}>
                <ActivityIndicator size="small" color={colors.text} />
                <Text style={[styles.connectingText, { color: colors.text }]}>Connecting...</Text>
              </View>
            )}
          </View>
          <View style={styles.deviceDetails}>
            <Text style={[styles.deviceDetail, { color: colors.textSecondary }]}>
              Signal: {item.rssi} dBm
            </Text>
            {item.manufacturerData && (
              <Text style={[styles.deviceDetail, { color: colors.textSecondary }]}>
                Manufacturer: {item.manufacturerData}
              </Text>
            )}
            {item.serviceUUIDs && item.serviceUUIDs.length > 0 && (
              <Text style={[styles.deviceDetail, { color: colors.textSecondary }]}>
                Services: {item.serviceUUIDs.length}
              </Text>
            )}
          </View>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={colors.textSecondary} 
        />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="bluetooth-outline" 
        size={64} 
        color={colors.textSecondary} 
      />
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Devices Found</Text>
      <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
        {isScanning 
          ? 'Scanning for Bluetooth devices...' 
          : 'Tap "Scan for Devices" to discover nearby Bluetooth devices'
        }
      </Text>
      
      {Platform.OS === 'web' ? (
        <View style={[styles.webNotice, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
          <Text style={[styles.webNoticeText, { color: colors.primary }]}>
            🌐 Using Web Bluetooth API
          </Text>
          <Text style={[styles.webNoticeSubtext, { color: colors.textSecondary }]}>
            {isWebBluetoothSupported 
              ? 'Real Bluetooth functionality available in supported browsers'
              : 'Web Bluetooth not supported. Try Chrome or Edge.'
            }
          </Text>
        </View>
      ) : (
        <View style={[styles.nativeNotice, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
          <Text style={[styles.nativeNoticeText, { color: colors.success }]}>
            {bluetoothService.isAvailable() ? '📱 Using Native Bluetooth API' : '⚠️ Expo Go - UI Testing Only'}
          </Text>
          <Text style={[styles.nativeNoticeSubtext, { color: colors.textSecondary }]}>
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
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      <View style={styles.backgroundDecor}>
        <View style={[styles.blobPrimary, { backgroundColor: isDark ? 'rgba(88,86,214,0.18)' : 'rgba(88,86,214,0.09)' }]} />
        <View style={[styles.blobSecondary, { backgroundColor: isDark ? 'rgba(0,122,255,0.14)' : 'rgba(0,122,255,0.07)' }]} />
      </View>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Device Discovery</Text>
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
          <BlurView intensity={25} tint={isDark ? "dark" : "light"} style={[
            styles.platformInfo, 
            { backgroundColor: isPlatformError ? colors.error + '20' : colors.primary + '20', borderColor: isPlatformError ? colors.error : colors.primary }
          ]}>
            <Text style={[styles.platformInfoText, { color: isPlatformError ? colors.error : colors.primary }]}>
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
            { backgroundColor: colors.primary },
            isScanning && { backgroundColor: colors.secondary },
            (!isBluetoothInitialized && Platform.OS !== 'web') && { backgroundColor: colors.textSecondary, opacity: 0.5 }
          ]}
          onPress={isScanning ? stopScan : startScan}
          disabled={isScanning || isConnecting || (!isBluetoothInitialized && Platform.OS !== 'web')}
        >
          {isScanning ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons 
              name="search" 
              size={20} 
              color="#FFFFFF" 
            />
          )}
          <Text style={[styles.scanButtonText, { color: '#FFFFFF' }]}>
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
          <BlurView intensity={18} tint={isDark ? "dark" : "light"} style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search devices..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </BlurView>

          {/* Filter Buttons */}
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                filterType === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[
                styles.filterButtonText,
                { color: colors.textSecondary },
                filterType === 'all' && { color: '#FFFFFF', fontWeight: '600' }
              ]}>
                All ({devices.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                filterType === 'microcontrollers' && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setFilterType('microcontrollers')}
            >
              <Text style={[
                styles.filterButtonText,
                { color: colors.textSecondary },
                filterType === 'microcontrollers' && { color: '#FFFFFF', fontWeight: '600' }
              ]}>
                Microcontrollers ({devices.filter(d => isPotentialMicrocontroller(d)).length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                filterType === 'named' && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setFilterType('named')}
            >
              <Text style={[
                styles.filterButtonText,
                { color: colors.textSecondary },
                filterType === 'named' && { color: '#FFFFFF', fontWeight: '600' }
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
                { backgroundColor: colors.success },
                isSending && { backgroundColor: colors.secondary }
              ]}
              onPress={() => send('Hello World!')}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={20} 
                  color="#FFFFFF" 
                />
              )}
              <Text style={[styles.sendMessageButtonText, { color: '#FFFFFF' }]}>
                {isSending ? 'Sending...' : 'Send Message'}
              </Text>
            </TouchableOpacity>

                         <TouchableOpacity
               style={[
                 styles.testFailureButton,
                 { backgroundColor: colors.warning },
                 isTestingFailure && { backgroundColor: colors.secondary }
               ]}
               onPress={sendFailureTest}
               disabled={isTestingFailure || isSending}
             >
               {isTestingFailure ? (
                 <ActivityIndicator color="#FFFFFF" size="small" />
               ) : (
                 <Ionicons 
                   name="warning" 
                   size={20} 
                   color="#FFFFFF" 
                 />
               )}
               <Text style={[styles.testFailureButtonText, { color: '#FFFFFF' }]}>
                 {isTestingFailure ? 'Testing...' : 'Test Failure'}
               </Text>
             </TouchableOpacity>
          </View>
          
          <Text style={[styles.connectedDeviceText, { color: colors.textSecondary }]}>
            Connected to: {connectedDevice.name}
          </Text>

          {/* Response Display */}
          {lastResponse && (
            <View style={[styles.responseContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.responseTitle, { color: colors.text }]}>Device Response:</Text>
              <Text style={[styles.responseText, { color: colors.textSecondary }]}>{lastResponse}</Text>
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
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
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
    top: -50,
    left: -40,
  },
  blobSecondary: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  platformInfo: {
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  platformInfoText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  platformInfoError: {
    // Applied inline
  },
  platformInfoTextError: {
    // Applied inline
  },
  scanSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {} : {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  scanButtonActive: {
    // Applied inline
  },
  scanButtonDisabled: {
    // Applied inline
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterButtonActive: {
    // Applied inline
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    // Applied inline
  },
  scanButtonText: {
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 8,
    ...(Platform.OS === 'web' ? {} : {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  sendMessageButtonActive: {
    // Applied inline
  },
  sendMessageButtonText: {
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    ...(Platform.OS === 'web' ? {} : {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  testFailureButtonActive: {
    // Applied inline
  },
  testFailureButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  connectedDeviceText: {
    fontSize: 14,
    textAlign: 'center',
  },
  responseContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 14,
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  deviceCardConnected: {
    // Applied inline
  },
  deviceCardConnecting: {
    // Applied inline
  },
  deviceCardMicrocontroller: {
    // Applied inline
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
    marginLeft: 12,
    flex: 1,
  },
  connectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectingText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  microcontrollerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  microcontrollerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deviceDetails: {
    marginLeft: 36,
  },
  deviceDetail: {
    fontSize: 14,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
    marginBottom: 20,
  },
  webNotice: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  webNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  webNoticeSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  mockNotice: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  mockNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  mockNoticeSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  nativeNotice: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  nativeNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  nativeNoticeSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  errorContainer: {
    padding: 16,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DeviceDiscoveryScreen;
