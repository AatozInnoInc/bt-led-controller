import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { theme } from '../utils/theme';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import GradientButton from '../components/GradientButton';
import { useBluetooth } from '../hooks/useBluetooth';
import { configDomainController } from '../domain/configDomainController';
import { ParameterId } from '../types/commands';
import { EffectType, LEDConfig, HSVColor } from '../types/config';
import { BLEError } from '../types/errors';
import { hsvToRgb, rgbToHsv, hsvToHex, hexToHsv } from '../utils/colorUtils';

const ConfigScreen: React.FC = () => {
  const tabBarHeight = useBottomTabBarHeight();
  const { connectedDevice } = useBluetooth();
  
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
    } else {
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
  
  const updateParameter = useCallback(async (parameterId: ParameterId, value: number) => {
    if (!connectedDevice || !config) return;

    // Clear existing timeout for this specific parameter
    const existingTimer = parameterDebounceTimers.current.get(parameterId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      parameterDebounceTimers.current.delete(parameterId);
    }

    // Update local state immediately for responsive UI
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
        <Text style={styles.sectionTitle}>Color</Text>
        <View style={styles.colorGrid}>
          {colors.map((hsvColor, index) => {
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
                  isSelected && styles.selectedColor,
                ]}
                onPress={() => handleColorSelect(hsvColor)}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color="white" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  interface SliderControlProps {
    title: string;
    value: number;
    onValueChange: (value: number) => void;
    icon: string;
    parameterId: ParameterId;
  }

  const SliderControl: React.FC<SliderControlProps> = ({ title, value, onValueChange, icon, parameterId }) => {
    // Use local state to prevent slider flashing
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const handleChange = (newValue: number) => {
      setLocalValue(newValue);
      onValueChange(newValue);
      updateParameter(parameterId, newValue);
    };

    return (
      <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
          <Ionicons name={icon as any} size={20} color="#FFFFFF" />
          <Text style={styles.sliderTitle}>{title}</Text>
          <Text style={styles.sliderValue}>{Math.round(localValue)}%</Text>
        </View>
        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={localValue}
            onValueChange={handleChange}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor="#FFFFFF"
            step={1}
            tapToSeek={true}
          />
        </View>
      </View>
    );
  };

  if (!connectedDevice) {
    return (
      <View style={styles.fullScreen}>
        <LinearGradient
          colors={['#0a0a0a', '#0b1736']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject as any}
        />
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.noDeviceContainer}>
            <Ionicons name="bluetooth-outline" size={64} color={theme.dark.textSecondary} />
            <Text style={styles.noDeviceText}>No Device Connected</Text>
            <Text style={styles.noDeviceSubtext}>
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
          colors={['#0a0a0a', '#0b1736']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject as any}
        />
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.dark.primary} />
            <Text style={styles.loadingText}>Loading configuration...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <LinearGradient
        colors={['#0a0a0a', '#0b1736']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      <View style={styles.backgroundDecor}>
        <View style={styles.blobPrimary} />
        <View style={styles.blobSecondary} />
      </View>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentInsetAdjustmentBehavior="never"
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Bar */}
          {isInConfigMode && (
            <View style={styles.statusBar}>
              <View style={styles.statusIndicator} />
              <Text style={styles.statusText}>Configuration Mode Active</Text>
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
              <Ionicons name="hardware-chip" size={24} color="#FFFFFF" />
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Microcontroller</Text>
                <Text style={styles.sectionSubtitle}>Control LED system power and effects</Text>
              </View>
            </View>
            <BlurView intensity={30} tint="dark" style={styles.powerCard}>
              <View style={styles.powerInfo}>
                <Text style={styles.powerTitle}>Guitar LED Controller</Text>
                <Text style={styles.powerSubtitle}>
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
            <Text style={styles.sectionTitle}>Brightness</Text>
            <SliderControl
              title="Brightness"
              value={brightness}
              onValueChange={setBrightness}
              icon="sunny"
              parameterId={ParameterId.BRIGHTNESS}
            />
          </View>

          {/* Speed Control */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Animation Speed</Text>
            <SliderControl
              title="Speed"
              value={speed}
              onValueChange={setSpeed}
              icon="speedometer"
              parameterId={ParameterId.SPEED}
            />
          </View>

          {/* Effects */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Effects</Text>
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
                    tint="dark"
                    style={[
                      styles.effectCard,
                      effectType === effect.id && styles.effectCardSelected,
                    ]}
                  >
                    <Ionicons
                      name={effect.icon as any}
                      size={24}
                      color={effectType === effect.id ? theme.dark.primary : theme.dark.text}
                    />
                    <Text
                      style={[
                        styles.effectName,
                        effectType === effect.id && styles.effectNameSelected,
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
    backgroundColor: 'rgba(0,122,255,0.16)',
    top: -50,
    left: -40,
  },
  blobSecondary: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(52,199,89,0.14)',
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
    color: theme.dark.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noDeviceSubtext: {
    fontSize: 14,
    color: theme.dark.textSecondary,
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
    color: theme.dark.textSecondary,
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
    color: theme.dark.text,
  },
  sectionTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.dark.textSecondary,
    marginTop: 2,
  },
  powerCard: {
    backgroundColor: theme.dark.card,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.dark.border,
  },
  powerInfo: {
    flex: 1,
  },
  powerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.dark.text,
    marginBottom: 4,
  },
  powerSubtitle: {
    fontSize: 14,
    color: theme.dark.textSecondary,
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
    borderColor: '#FFFFFF',
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
    color: theme.dark.text,
    flex: 1,
    marginLeft: 8,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: theme.dark.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: theme.dark.border,
  },
  effectCardSelected: {
    borderColor: theme.dark.primary,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  effectName: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.dark.text,
    marginTop: 8,
    textAlign: 'center',
  },
  effectNameSelected: {
    color: theme.dark.primary,
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
