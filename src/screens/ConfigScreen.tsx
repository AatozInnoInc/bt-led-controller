import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../utils/linearGradientWrapper';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTheme } from '../contexts/ThemeContext';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import GradientButton from '../components/GradientButton';
import { useBluetooth } from '../hooks/useBluetooth';
import { configDomainController } from '../domain/configDomainController';
import { ParameterId } from '../types/commands';
import { EffectType, LEDConfig, HSVColor } from '../types/config';
import { BLEError } from '../types/errors';
import { BluetoothDevice } from '../types/bluetooth';
import { hsvToRgb, rgbToHsv, hsvToHex, hexToHsv } from '../utils/colorUtils';

// Development mode: Set to true to test UI without a real device connection
const DEV_MODE = __DEV__; // Automatically true in development builds

// Mock device for development/testing
const MOCK_DEVICE: BluetoothDevice = {
  id: 'mock-device-123',
  name: 'Mock LED Guitar Controller',
  rssi: -50,
  isConnected: true,
  manufacturerData: 'Mock Device',
};

// SliderControl component - defined outside to prevent recreation on parent re-renders
interface SliderControlProps {
  title: string;
  value: number;
  onValueChange: (value: number) => void;
  icon: string;
  parameterId: ParameterId;
  themeColors: any;
  isDark: boolean;
  onUpdateParameter: (parameterId: ParameterId, value: number, skipStateUpdate?: boolean) => void;
}

const SliderControl: React.FC<SliderControlProps> = React.memo(({ title, value, onValueChange, icon, parameterId, themeColors, isDark, onUpdateParameter }) => {
  // Use local state to prevent slider flashing
  const [localValue, setLocalValue] = useState(value);
  const isDraggingRef = useRef(false);
  const lastPropValueRef = useRef(value);
  const skipNextSyncRef = useRef(false);

  // Only sync with prop value when NOT dragging to prevent flashing
  useEffect(() => {
    // Skip sync if we just completed a drag (value will match localValue anyway)
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      lastPropValueRef.current = value;
      return;
    }
    
    // Only update if prop value changed and we're not dragging
    if (!isDraggingRef.current && value !== lastPropValueRef.current) {
      // Only sync if the difference is significant (prevents micro-updates from causing flashes)
      if (Math.abs(value - localValue) > 0.5) {
        setLocalValue(value);
        lastPropValueRef.current = value;
      }
    }
  }, [value, localValue]);

  const handleChange = useCallback((newValue: number) => {
    setLocalValue(newValue);
    // Don't update parent state while dragging - only update local state
    // Parent state will be updated on slide complete
  }, []);

  const handleSlidingStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleSlidingComplete = useCallback((newValue: number) => {
    isDraggingRef.current = false;
    lastPropValueRef.current = newValue;
    skipNextSyncRef.current = true; // Skip next prop sync since we're updating parent state
    // Update parent state first (slider already has correct local value, so this won't cause flash)
    onValueChange(newValue);
    // Then send BLE command (skip state update since we already did it)
    onUpdateParameter(parameterId, newValue, true);
  }, [parameterId, onValueChange, onUpdateParameter]);

  // Memoize the slider value text to prevent unnecessary re-renders
  const valueText = useMemo(() => `${Math.round(localValue)}%`, [localValue]);

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Ionicons name={icon as any} size={20} color={themeColors.text} />
        <Text style={[styles.sliderTitle, { color: themeColors.text }]}>{title}</Text>
        <Text style={[styles.sliderValue, { color: themeColors.text }]}>{valueText}</Text>
      </View>
      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={localValue}
          onValueChange={handleChange}
          onSlidingStart={handleSlidingStart}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={themeColors.text}
          maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}
          thumbTintColor={themeColors.text}
          step={1}
          tapToSeek={true}
        />
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if props actually changed
  // This prevents flashing during rapid state updates
  return prevProps.value === nextProps.value &&
         prevProps.title === nextProps.title &&
         prevProps.icon === nextProps.icon &&
         prevProps.parameterId === nextProps.parameterId &&
         prevProps.themeColors === nextProps.themeColors &&
         prevProps.isDark === nextProps.isDark;
});

const ConfigScreen: React.FC = () => {
  const tabBarHeight = useBottomTabBarHeight();
  const { colors: themeColors, isDark } = useTheme();
  const { connectedDevice: realConnectedDevice } = useBluetooth();
  
  // Use mock device in dev mode if no real device is connected
  const connectedDevice = DEV_MODE && !realConnectedDevice ? MOCK_DEVICE : realConnectedDevice;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<LEDConfig | null>(null);
  const [isInConfigMode, setIsInConfigMode] = useState(false);
  
  // Slider refs to prevent flashing (not used directly, kept for potential future use)
  // const brightnessSliderRef = useRef<Slider>(null);
  // const speedSliderRef = useRef<Slider>(null);
  const [brightness, setBrightness] = useState(50);
  const [speed, setSpeed] = useState(30);
  const [selectedColor, setSelectedColor] = useState<HSVColor>({ h: 160, s: 255, v: 255 }); // HSV format
  const [effectType, setEffectType] = useState<EffectType>(EffectType.SOLID);
  const [powerState, setPowerState] = useState(false);

  // Predefined colors in HSV format (for FastLED)
  const colors: HSVColor[] = [
    { h: 0, s: 255, v: 255 },     // Red
    { h: 30, s: 255, v: 255 },   // Orange
    { h: 60, s: 255, v: 255 },   // Yellow
    { h: 120, s: 255, v: 255 },  // Green
    { h: 160, s: 255, v: 255 },  // Blue (iOS blue)
    { h: 200, s: 255, v: 255 },  // Cyan
    { h: 220, s: 255, v: 255 },  // Purple
    { h: 240, s: 255, v: 255 },  // Violet
    { h: 300, s: 255, v: 255 },  // Pink
  ];

  const effects = [
    { id: EffectType.SOLID, name: 'Solid', icon: 'radio-button-on' },
    { id: EffectType.PULSE, name: 'Pulse', icon: 'pulse' },
    { id: EffectType.RAINBOW, name: 'Rainbow', icon: 'color-palette' },
    { id: EffectType.WAVE, name: 'Wave', icon: 'water' },
    { id: EffectType.STROBE, name: 'Strobe', icon: 'flash' },
    { id: EffectType.CUSTOM, name: 'Custom', icon: 'settings' },
  ];

  // Initialize config when device connects
    useEffect(() => {
    if (connectedDevice) {
      initializeConfig();
    } else if (!DEV_MODE) {
      // Only reset if not in dev mode (dev mode uses mock device)
      // Clean up debounce timers on disconnect
      parameterDebounceTimers.current.forEach((timer) => clearTimeout(timer));
      parameterDebounceTimers.current.clear();
      if (colorDebounceTimer.current) {
        clearTimeout(colorDebounceTimer.current);
        colorDebounceTimer.current = null;
      }
      
      configDomainController.reset();
      setConfig(null);
      setIsInConfigMode(false);
    }
  }, [connectedDevice]);

  // Cleanup on unmount
  useEffect(() => {
        return () => {
      // Clear all debounce timers on unmount
      parameterDebounceTimers.current.forEach((timer) => clearTimeout(timer));
      parameterDebounceTimers.current.clear();
      if (colorDebounceTimer.current) {
        clearTimeout(colorDebounceTimer.current);
        colorDebounceTimer.current = null;
      }
        };
  }, []);

  const initializeConfig = async () => {
    if (!connectedDevice) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In dev mode with mock device, skip actual BLE initialization
      if (DEV_MODE && connectedDevice.id === MOCK_DEVICE.id) {
        // Initialize controller with mock device ID (for caching purposes)
        const defaultConfig = await configDomainController.initializeConfig(connectedDevice.id);
        setConfig(defaultConfig);
        setBrightness(defaultConfig.brightness);
        setSpeed(defaultConfig.speed);
        setSelectedColor(defaultConfig.color);
        setEffectType(defaultConfig.effectType);
        setPowerState(defaultConfig.powerState);
        setIsLoading(false);
        return;
      }
      
      const loadedConfig = await configDomainController.initializeConfig(connectedDevice.id);
      setConfig(loadedConfig);
      setBrightness(loadedConfig.brightness);
      setSpeed(loadedConfig.speed);
      setSelectedColor(loadedConfig.color); // Already HSV format
      setEffectType(loadedConfig.effectType);
      setPowerState(loadedConfig.powerState);
    } catch (err) {
      const message = err instanceof BLEError ? err.message : 'Failed to initialize configuration';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce timers per parameter to prevent crosstalk
  const parameterDebounceTimers = useRef<Map<ParameterId, NodeJS.Timeout>>(new Map());
  const colorDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  const updateParameter = useCallback(async (parameterId: ParameterId, value: number, skipStateUpdate: boolean = false) => {
    if (!connectedDevice || !config) return;

    // Clear existing timeout for this specific parameter
    const existingTimer = parameterDebounceTimers.current.get(parameterId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      parameterDebounceTimers.current.delete(parameterId);
    }

    // Update local state immediately for responsive UI (unless called from slider which already has correct state)
    if (!skipStateUpdate) {
      switch (parameterId) {
        case ParameterId.BRIGHTNESS:
          setBrightness(value);
          break;
        case ParameterId.SPEED:
          setSpeed(value);
          break;
        case ParameterId.EFFECT_TYPE:
          setEffectType(value);
          break;
        case ParameterId.POWER_STATE:
          setPowerState(value > 0);
          break;
        // Note: Color components are handled separately via updateColor()
      }
    }

    // In dev mode with mock device, skip actual BLE commands
    if (DEV_MODE && connectedDevice.id === MOCK_DEVICE.id) {
      // Just update local state, no BLE communication
      setError(null);
      return;
    }

    // Debounce BLE command to prevent flooding (per parameter)
    const timer = setTimeout(async () => {
      try {
        // Ensure we're in config mode
        if (!isInConfigMode) {
          await configDomainController.enterConfigMode();
          setIsInConfigMode(true);
        }

        await configDomainController.updateParameter(parameterId, value);
        setError(null);
      } catch (err) {
        const message = err instanceof BLEError ? err.message : 'Failed to update parameter';
        setError(message);
        console.error('Parameter update error:', err);
      } finally {
        // Clean up timer reference
        parameterDebounceTimers.current.delete(parameterId);
      }
    }, 150); // 150ms debounce

    // Store timer reference for this parameter
    parameterDebounceTimers.current.set(parameterId, timer);
  }, [connectedDevice, config, isInConfigMode]);

  // Update color as a whole HSV value
  const updateColor = useCallback(async (color: HSVColor) => {
    if (!connectedDevice || !config) return;

    // Clear existing timeout
    if (colorDebounceTimer.current) {
      clearTimeout(colorDebounceTimer.current);
      colorDebounceTimer.current = null;
    }

    // Update local state immediately
    setSelectedColor(color);

    // In dev mode with mock device, skip actual BLE commands
    if (DEV_MODE && connectedDevice.id === MOCK_DEVICE.id) {
      // Just update local state, no BLE communication
      setError(null);
      return;
    }

    // Debounce BLE command to prevent flooding
    colorDebounceTimer.current = setTimeout(async () => {
      try {
        // Ensure we're in config mode
        if (!isInConfigMode) {
          await configDomainController.enterConfigMode();
          setIsInConfigMode(true);
        }

        await configDomainController.updateColor(color);
        setError(null);
      } catch (err) {
        const message = err instanceof BLEError ? err.message : 'Failed to update color';
        setError(message);
        console.error('Color update error:', err);
      } finally {
        colorDebounceTimer.current = null;
      }
    }, 150); // 150ms debounce
  }, [connectedDevice, config, isInConfigMode]);

  const handleSave = async () => {
    if (!connectedDevice) {
      Alert.alert('Error', 'No device connected');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // In dev mode with mock device, simulate save
      if (DEV_MODE && connectedDevice.id === MOCK_DEVICE.id) {
        // Simulate save delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update config to reflect current state
        const savedConfig: LEDConfig = {
          brightness,
          speed,
          color: selectedColor,
          effectType,
          powerState,
        };
        setConfig(savedConfig);
        setIsInConfigMode(false);
        
        Alert.alert('Success', 'Configuration saved successfully! (Mock Mode)');
        setIsSaving(false);
        return;
      }

      await configDomainController.saveConfiguration();
      await configDomainController.exitConfigMode();
      setIsInConfigMode(false);
      
      // Reload config to reflect saved state
      const savedConfig = configDomainController.getCurrentConfig();
      setConfig(savedConfig);
      
      Alert.alert('Success', 'Configuration saved successfully!');
    } catch (err) {
      const message = err instanceof BLEError ? err.message : 'Failed to save configuration';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePowerToggle = async (value: boolean) => {
    setPowerState(value);
    await updateParameter(ParameterId.POWER_STATE, value ? 1 : 0);
  };

  const handleEffectSelect = async (effectId: EffectType) => {
    setEffectType(effectId);
    await updateParameter(ParameterId.EFFECT_TYPE, effectId);
  };

  const handleColorSelect = async (color: HSVColor) => {
    await updateColor(color);
  };

  const ColorPicker: React.FC = () => {
    // Convert selected HSV to RGB for comparison
    const selectedRgb = hsvToRgb(selectedColor);
    
    return (
    <View style={styles.colorPickerContainer}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Color</Text>
      <View style={styles.colorGrid}>
          {colors.map((hsvColor: HSVColor, index: number) => {
            // Convert HSV to RGB for display
            const rgbColor = hsvToRgb(hsvColor);
            const isSelected = 
              selectedColor.h === hsvColor.h && 
              selectedColor.s === hsvColor.s && 
              selectedColor.v === hsvColor.v;
            
            return (
          <TouchableOpacity
                key={index}
            style={[
              styles.colorOption,
                  { backgroundColor: `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})` },
                  isSelected && { borderColor: themeColors.text, borderWidth: 2 },
            ]}
                onPress={() => handleColorSelect(hsvColor)}
          >
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={isDark ? "white" : themeColors.text} />
            )}
          </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };


  // Only show "no device" screen if not in dev mode
  if (!connectedDevice && !DEV_MODE) {
    return (
      <View style={styles.fullScreen}>
        <LinearGradient
              colors={[themeColors.gradientStart, themeColors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject as any}
        />
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.noDeviceContainer}>
            <Ionicons name="bluetooth-outline" size={64} color={themeColors.textSecondary} />
            <Text style={[styles.noDeviceText, { color: themeColors.text }]}>No Device Connected</Text>
            <Text style={[styles.noDeviceSubtext, { color: themeColors.textSecondary }]}>
              Please connect a device to configure LED settings
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.fullScreen}>
        <LinearGradient
              colors={[themeColors.gradientStart, themeColors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject as any}
        />
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Loading configuration...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <LinearGradient
              colors={[themeColors.gradientStart, themeColors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      <View style={styles.backgroundDecor}>
        <View style={[styles.blobPrimary, { backgroundColor: isDark ? 'rgba(0,122,255,0.16)' : 'rgba(0,122,255,0.08)' }]} />
        <View style={[styles.blobSecondary, { backgroundColor: isDark ? 'rgba(52,199,89,0.14)' : 'rgba(52,199,89,0.07)' }]} />
      </View>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView 
          style={styles.container} 
          contentInsetAdjustmentBehavior="never"
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
          showsVerticalScrollIndicator={false}
        >
          {/* Dev Mode Indicator */}
          {DEV_MODE && connectedDevice?.id === MOCK_DEVICE.id && (
            <View style={[styles.statusBar, { backgroundColor: 'rgba(255,149,0,0.2)', borderColor: 'rgba(255,149,0,0.3)' }]}>
              <View style={[styles.statusIndicator, { backgroundColor: '#FF9500' }]} />
              <Text style={[styles.statusText, { color: '#FF9500' }]}>Development Mode - Mock Device</Text>
            </View>
          )}

          {/* Status Bar */}
          {isInConfigMode && (
            <View style={[styles.statusBar, { backgroundColor: isDark ? 'rgba(0,122,255,0.2)' : 'rgba(0,122,255,0.1)', borderColor: isDark ? 'rgba(0,122,255,0.3)' : 'rgba(0,122,255,0.2)' }]}>
              <View style={[styles.statusIndicator, { backgroundColor: themeColors.primary }]} />
              <Text style={[styles.statusText, { color: themeColors.primary }]}>Configuration Mode Active</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBar}>
              <Ionicons name="alert-circle" size={16} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

      {/* Power Control */}
      <View style={[styles.section, { paddingTop: Platform.OS === 'ios' ? 60 : 16 }]}>
        <View style={styles.sectionHeader}>
              <Ionicons name="hardware-chip" size={24} color={themeColors.text} />
          <View style={styles.sectionTitleContainer}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Microcontroller</Text>
                <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>Control LED system power and effects</Text>
          </View>
        </View>
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.powerCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.powerInfo}>
                <Text style={[styles.powerTitle, { color: themeColors.text }]}>Guitar LED Controller</Text>
                <Text style={[styles.powerSubtitle, { color: themeColors.textSecondary }]}>
                  {powerState ? 'LED system active' : 'LED system disabled'}
            </Text>
          </View>
          <Switch
                trackColor={{ false: '#3A3A3C', true: 'rgba(0,122,255,0.5)' }}
                thumbColor={powerState ? '#007AFF' : '#FFFFFF'}
                ios_backgroundColor="#3A3A3C"
                onValueChange={handlePowerToggle}
                value={powerState}
          />
        </BlurView>
      </View>

      {/* Color Picker */}
      <View style={styles.section}>
        <ColorPicker />
      </View>

      {/* Brightness Control */}
      <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Brightness</Text>
        <SliderControl
          title="Brightness"
          value={brightness}
          onValueChange={setBrightness}
          icon="sunny"
              parameterId={ParameterId.BRIGHTNESS}
              themeColors={themeColors}
              isDark={isDark}
              onUpdateParameter={updateParameter}
        />
      </View>

      {/* Speed Control */}
      <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Animation Speed</Text>
        <SliderControl
          title="Speed"
          value={speed}
          onValueChange={setSpeed}
          icon="speedometer"
              parameterId={ParameterId.SPEED}
              themeColors={themeColors}
              isDark={isDark}
              onUpdateParameter={updateParameter}
        />
      </View>

      {/* Effects */}
      <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Effects</Text>
        <View style={styles.effectsGrid}>
          {effects.map((effect) => (
                <TouchableOpacity
                  key={effect.id}
                  activeOpacity={0.7}
                  style={styles.effectCardWrapper}
                  onPress={() => handleEffectSelect(effect.id)}
                >
                  <BlurView
                    intensity={20}
                    tint={isDark ? "dark" : "light"}
                    style={[
                      styles.effectCard,
                      { backgroundColor: themeColors.card, borderColor: themeColors.border },
                      effectType === effect.id && { borderColor: themeColors.primary, backgroundColor: isDark ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.05)' },
                    ]}
                  >
                    <Ionicons
                      name={effect.icon as any}
                      size={24}
                      color={effectType === effect.id ? themeColors.primary : themeColors.text}
                    />
                    <Text
                      style={[
                        styles.effectName,
                        { color: themeColors.text },
                        effectType === effect.id && { color: themeColors.primary, fontWeight: '600' },
                      ]}
                    >
                      {effect.name}
                    </Text>
              </BlurView>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.saveSection}>
        <GradientButton
              text={isSaving ? 'Saving...' : 'Save Configuration'}
          onPress={handleSave}
          colors={['#2F7CFF', 'rgba(0,86,204,0.85)']}
          glossColors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.00)']}
          iconName="save"
          style={styles.saveButton}
              disabled={isSaving}
        />
      </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundDecor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
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
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: Platform.OS === 'ios' ? 60 : 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.3)',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 8,
  },
  statusText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  noDeviceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noDeviceText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noDeviceSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  sectionTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  powerCard: {
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  powerInfo: {
    flex: 1,
  },
  powerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  powerSubtitle: {
    fontSize: 14,
  },
  colorPickerContainer: {
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    // Border color applied inline
  },
  sliderContainer: {
    marginTop: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sliderTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sliderWrapper: {
    // Container for slider
  },
  slider: {
    width: '100%',
    height: 40,
  },
  effectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  effectCardWrapper: {
    // Wrapper for effect card
  },
  effectCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
  },
  effectCardSelected: {
    // Colors applied inline
  },
  effectName: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  effectNameSelected: {
    fontWeight: '600',
  },
  saveSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  saveButton: {
    position: 'relative',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 28,
    overflow: 'hidden',
  },
});

export default ConfigScreen;
