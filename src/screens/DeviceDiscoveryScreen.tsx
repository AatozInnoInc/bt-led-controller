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

import { BluetoothDevice } from '../types/bluetooth';
import { bluetoothService } from '../utils/bluetoothService';
import { BlurView } from 'expo-blur';
import { getUserPairedDevices, isDevicePaired, getDeviceOwner } from '../utils/devicePairing';
import { Ionicons } from '@expo/vector-icons';
import { isLedGuitarDevice } from '../utils/bleConstants';
import { LinearGradient } from '../utils/linearGradientWrapper';
import { useBluetoothContext as useBluetooth } from '../contexts/BluetoothContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { PairedDevice } from '../utils/deviceStorage';

// Type declaration for web platform window object
declare const window: { confirm?: (message?: string) => boolean } | undefined;

interface DeviceDiscoveryScreenProps {
  navigation: any;
}

const DeviceDiscoveryScreen: React.FC<DeviceDiscoveryScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { user } = useUser();
  const {
    isScanning,
    isConnecting,
    isSending,
    isTestingFailure,
    devices,
    connectedDevice,
    error,
    lastResponse,
    pairedDevices,
    isAutoReconnecting,
    showReconnectionPrompt,
    isWebBluetoothSupported,
    isBluetoothInitialized,
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
  } = useBluetooth();
  // moved into BluetoothContext
  const [searchQuery, setSearchQuery] = useState('');
  // Auto-select microcontrollers filter on mount
  const [filterType, setFilterType] = useState<'all' | 'microcontrollers' | 'named'>('microcontrollers');
  const [pairedDeviceIds, setPairedDeviceIds] = useState<Set<string>>(new Set());
  const [showPairedDevices, setShowPairedDevices] = useState(true);

  useEffect(() => {
    initialize();
    return () => {
      if (Platform.OS !== 'web' && isScanning) {
        bluetoothService.stopScan();
      }
    };
  }, []);

  // Load paired devices on mount and when user changes
  useEffect(() => {
    const loadPairedDevices = async () => {
      if (user?.userId) {
        try {
          const paired = await getUserPairedDevices(user.userId);
          const deviceIds = new Set(paired.map(d => d.deviceId));
          setPairedDeviceIds(deviceIds);
        } catch (error) {
          console.error('Failed to load paired devices:', error);
        }
      } else {
        setPairedDeviceIds(new Set());
      }
    };
    loadPairedDevices();
  }, [user?.userId]);

  const getFilteredDevices = (): BluetoothDevice[] => {
    let filtered = devices;

    // Filter out devices already paired to current user (they will auto-connect)
    if (user?.userId) {
      filtered = filtered.filter(device => !pairedDeviceIds.has(device.id));
    }

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
        filtered = filtered.filter(device => isLedGuitarDevice(device));
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

  const handleRemovePairedDevice = (device: PairedDevice) => {
    // Use window.confirm for web and Alert.alert for native
    const confirmRemoval = () => {
      if (Platform.OS === 'web' && window?.confirm) {
        const shouldRemove = window.confirm(`Remove ${device.name} from paired devices?`);
        if (shouldRemove) {
          performRemoval();
        }
      } else {
        Alert.alert(
          'Remove Device',
          `Remove ${device.name} from paired devices?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Remove', 
              style: 'destructive',
              onPress: performRemoval
            },
          ]
        );
      }
    };

    const performRemoval = async () => {
      try {
        await removePairedDevice(device.id);
        // Also refresh paired devices to ensure UI is updated
        await refreshPairedDevices();
      } catch (error) {
        console.error('DeviceDiscoveryScreen: Failed to remove device:', error);
      }
    };

    confirmRemoval();
  };

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

  const renderPairedDevice = ({ item }: { item: PairedDevice }) => {
    // Check if this paired device is currently connected
    // Only show as connected if we have verified communication
    const isConnected = connectedDevice?.id === item.id && connectedDevice?.isConnected;
    
    const handleReconnect = async () => {
      try {
        const deviceToConnect: BluetoothDevice = {
          id: item.id,
          name: item.name,
          rssi: item.rssi || -50,
          isConnected: false,
          manufacturerData: item.manufacturerData || '',
          serviceUUIDs: item.serviceUUIDs || [],
        };
        await connect(deviceToConnect);
      } catch (error) {
        console.error('Failed to reconnect:', error);
      }
    };

    return (
      <View style={[
        styles.pairedDeviceCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        isConnected && { borderColor: colors.success, backgroundColor: colors.success + '10' }
      ]}>
        <View style={styles.pairedDeviceInfo}>
          <View style={styles.pairedDeviceHeader}>
            <Ionicons 
              name={isConnected ? "bluetooth" : "bluetooth-outline"} 
              size={20} 
              color={isConnected ? colors.success : colors.textSecondary} 
            />
            <Text 
              style={[styles.pairedDeviceName, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
            <View style={styles.badgeContainer}>
              <View style={[styles.pairedBadge, { backgroundColor: colors.warning }]}>
                <Text style={[styles.pairedText, { color: colors.text }]}>Paired</Text>
              </View>
              {isConnected && (
                <View style={[styles.connectedBadge, { backgroundColor: colors.success }]}>
                  <Text style={[styles.connectedText, { color: colors.text }]}>Connected</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.pairedDeviceDetails}>
            <Text style={[styles.pairedDeviceDetail, { color: colors.textSecondary }]}>
              Last connected: {item.lastConnected.toLocaleDateString()}
            </Text>
            <Text style={[styles.pairedDeviceDetail, { color: colors.textSecondary }]}>
              Connections: {item.connectionCount}
            </Text>
          </View>
        </View>
        <View style={styles.pairedDeviceActions}>
          {!isConnected && (
            <TouchableOpacity
              style={[
                styles.pairedDeviceAction,
                styles.reconnectAction,
                { backgroundColor: colors.primary + '20', borderColor: colors.primary }
              ]}
              onPress={handleReconnect}
              disabled={isConnecting}
            >
              <Ionicons 
                name="refresh" 
                size={18} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.pairedDeviceAction,
              styles.favoriteAction,
              { backgroundColor: colors.card, borderColor: colors.border },
              item.isFavorite && { backgroundColor: colors.warning + '20', borderColor: colors.warning }
            ]}
            onPress={() => toggleFavorite(item.id)}
          >
            <Ionicons 
              name={item.isFavorite ? "star" : "star-outline"} 
              size={18} 
              color={item.isFavorite ? colors.text : colors.warning} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pairedDeviceAction,
              styles.deleteAction,
              { backgroundColor: colors.card, borderColor: colors.border }
            ]}
            onPress={() => handleRemovePairedDevice(item)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDevice = ({ item }: { item: BluetoothDevice }) => {
    const isMicrocontroller = isLedGuitarDevice(item);
    // Only show "Paired" badge if device is actually paired to current user
    // Don't show it for all devices in the scanned list
    const isPaired = false; // Removed - paired devices are shown in separate section

    return (
      <TouchableOpacity
        style={[
          styles.deviceCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          item.isConnected && { borderColor: colors.success, backgroundColor: colors.success + '10' },
          isConnecting && { borderColor: colors.primary, backgroundColor: colors.primary + '10', opacity: 0.7 },
          isPaired && { borderColor: colors.warning, backgroundColor: colors.warning + '10' }
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
            <View style={styles.badgeContainer}>
              {item.isConnected && (
                <View style={[styles.connectedBadge, { backgroundColor: colors.success }]}>
                  <Text style={[styles.connectedText, { color: colors.text }]}>Connected</Text>
                </View>
              )}
              {isConnecting && !item.isConnected && (
                <View style={[styles.connectingBadge, { backgroundColor: colors.primary }]}>
                  <ActivityIndicator size="small" color={colors.text} />
                  <Text style={[styles.connectingText, { color: colors.text }]}>Connecting...</Text>
                </View>
              )}
            </View>
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
        <View style={styles.chevronContainer}>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={colors.textSecondary} 
          />
        </View>
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

      {/* Reconnection Prompt */}
      {showReconnectionPrompt && (
        <BlurView intensity={25} tint={isDark ? "dark" : "light"} style={[
          styles.reconnectionPrompt,
          { backgroundColor: colors.primary + '20', borderColor: colors.primary }
        ]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.reconnectionText, { color: colors.primary }]}>
            Looking for your LED Guitar controller...
          </Text>
        </BlurView>
      )}

      {/* Paired Devices Section */}
      {pairedDevices.length > 0 && (
        <View style={styles.pairedDevicesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Paired Devices</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowPairedDevices(!showPairedDevices)}
            >
              <Ionicons 
                name={showPairedDevices ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
          {showPairedDevices && (
            <FlatList
              data={pairedDevices}
              renderItem={renderPairedDevice}
              keyExtractor={(item) => item.id}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              style={styles.pairedDevicesList}
            />
          )}
        </View>
      )}

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
                Microcontrollers ({devices.filter(d => isLedGuitarDevice(d)).length})
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

      {/* Connection Controls */}
      {connectedDevice && (
        <View style={styles.sendMessageSection}>
          <View style={styles.buttonRow}>
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

            <TouchableOpacity
              style={[
                styles.verifyButton,
                { backgroundColor: colors.primary },
                isSending && { backgroundColor: colors.secondary }
              ]}
              onPress={verifyCurrentConnection}
              disabled={isSending || isTestingFailure}
            >
              {isSending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color="#FFFFFF" 
                />
              )}
              <Text style={[styles.verifyButtonText, { color: '#FFFFFF' }]}>
                {isSending ? 'Verifying...' : 'Verify Connection'}
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
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
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
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 4px 8px rgba(0,0,0,0.1)`,
    } : {
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
  reconnectionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  reconnectionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  pairedDevicesSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleButton: {
    padding: 4,
  },
  pairedDevicesList: {
    marginBottom: 12,
  },
  pairedDeviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  pairedDeviceCardConnected: {
    // Applied inline
  },
  pairedDeviceInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  pairedDeviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  pairedDeviceName: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  pairedDeviceDetails: {
    marginLeft: 28,
  },
  pairedDeviceDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
  pairedDeviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  pairedDeviceAction: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
    borderWidth: 1,
  },
  favoriteAction: {
    // Applied inline
  },
  favoriteActionActive: {
    // Applied inline
  },
  deleteAction: {
    // Applied inline
  },
  reconnectAction: {
    // Applied inline
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 4px 8px rgba(0,0,0,0.1)`,
    } : {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  verifyButtonActive: {
    // Applied inline
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
    marginRight: 12,
    flexShrink: 0,
  },
  pairedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pairedText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DeviceDiscoveryScreen;
