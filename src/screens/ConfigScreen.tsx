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
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../utils/linearGradientWrapper';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import Constants from 'expo-constants';
import { useTheme } from '../contexts/ThemeContext';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import GradientButton from '../components/GradientButton';
import { useBluetoothContext as useBluetooth } from '../contexts/BluetoothContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { configDomainController } from '../domain/config/configDomainController';
import { ParameterId } from '../types/commands';
import { EffectType } from '../types/config';
import { BLEError, ErrorCode } from '../types/errors';
import { ErrorEnvelope, ErrorHandler, formatErrorForUser } from '../domain/common/errorEnvelope';
import { createAlertFromError, createSuccessAlert, createErrorAlert, AlertMessages } from '../domain/common/alertEnvelope';
import { validateParameter, validateColor, validateColorAndPower, calculateTotalCurrent } from '../utils/parameterValidation';
import { BluetoothDevice } from '../types/bluetooth';
import { DeviceSettings, RGBColor } from '../utils/bleConstants';
import { ConfigModeStatus } from '../domain/bluetooth/configurationModule';
import { hexToRgb } from '../utils/colors';

// Development mode: Set to true to test UI without a real device connection
const forceDevMode = Constants.expoConfig?.extra?.forceDevMode === true;
const DEV_MODE = /* __DEV__ ||  */forceDevMode; // Enable in dev and TestFlight (via config)
console.log('DEV_MODE debug:', {
  DEV_MODE,
  forceDevMode,
  rawValue: Constants.expoConfig?.extra?.forceDevMode,
  extra: Constants.expoConfig?.extra,
});

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
  const { trackConfigChange } = useAnalytics();

  // Use mock device in dev mode if no real device is connected
  const connectedDevice = DEV_MODE && !realConnectedDevice ? MOCK_DEVICE : realConnectedDevice;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSeverity, setErrorSeverity] = useState<'error' | 'warning' | 'info'>('error');
  const [errorEnvelope, setErrorEnvelope] = useState<ErrorEnvelope | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [config, setConfig] = useState<DeviceSettings | null>(null);
  const [configModeState, setConfigModeState] = useState<ConfigModeStatus>({ state: 'inactive' });
  const [isInConfigMode, setIsInConfigMode] = useState(false);

  // Slider refs to prevent flashing (not used directly, kept for potential future use)
  // const brightnessSliderRef = useRef<Slider>(null);
  // const speedSliderRef = useRef<Slider>(null);
  const [brightness, setBrightness] = useState(50);
  const [speed, setSpeed] = useState(30);
  const [selectedColor, setSelectedColor] = useState<RGBColor>([0, 122, 255]); // RGB format: iOS blue
  const [effectType, setEffectType] = useState<EffectType>(EffectType.SOLID);

  // Predefined colors in HEX format (for UI display)
  const colors: string[] = [
    '#FF0000', // Red
    '#FF8000', // Orange
    '#FFFF00', // Yellow
    '#00FF00', // Green
    '#007AFF', // Blue (Standard iOS/System Blue)
    '#00FFFF', // Cyan
    '#8000FF', // Purple
    '#AA00FF', // Violet
    '#FF00FF', // Pink
  ];

  const effects = [
    { id: EffectType.SOLID, name: 'Solid', icon: 'radio-button-on' },
    { id: EffectType.PULSE, name: 'Pulse', icon: 'pulse' },
    { id: EffectType.RAINBOW, name: 'Rainbow', icon: 'color-palette' },
    { id: EffectType.WAVE, name: 'Wave', icon: 'water' },
    { id: EffectType.STROBE, name: 'Strobe', icon: 'flash' },
    { id: EffectType.CUSTOM, name: 'Custom', icon: 'settings' },
/*     { id: EffectType.SOLID, name: 'Solid', icon: 'radio-button-on', color: themeColors.text },
    { id: EffectType.PULSE, name: 'Pulse', icon: 'pulse', color: themeColors.primary },
    { id: EffectType.RAINBOW, name: 'Rainbow', icon: 'color-palette', color: themeColors.primary },
    { id: EffectType.WAVE, name: 'Wave', icon: 'water', color: themeColors.primary },
    { id: EffectType.STROBE, name: 'Strobe', icon: 'flash', color: themeColors.warning },
    { id: EffectType.CUSTOM, name: 'Custom', icon: 'settings', color: themeColors.text }, */
  ];

  // Animated effect icon component
  const AnimatedEffectIcon: React.FC<{ effect: typeof effects[0] }> = ({ effect }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const waveAnim = useRef(new Animated.Value(0)).current;
    const strobeAnim = useRef(new Animated.Value(1)).current;
    const [waveColor, setWaveColor] = useState('#4ECDC4');

    useEffect(() => {
      if (effect.name === 'Pulse') {
        const pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.3,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        );
        pulseAnimation.start();
        return () => pulseAnimation.stop();
      }

      if (effect.name === 'Wave') {
        const waveColors = ['#4ECDC4', '#45B7D1', '#96CEB4', '#4ECDC4'];
        let colorIndex = 0;
        
        const waveAnimation = Animated.loop(
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 7500,
            useNativeDriver: false,
          })
        );

        waveAnim.addListener(({ value }) => {
          const newIndex = Math.floor(value * 4) % 4;
          if (newIndex !== colorIndex) {
            colorIndex = newIndex;
            setWaveColor(waveColors[colorIndex]);
          }
        });

        waveAnimation.start();
        return () => {
          waveAnimation.stop();
          waveAnim.removeAllListeners();
        };
      }

      if (effect.name === 'Strobe') {
        const strobeAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(strobeAnim, {
              toValue: 0.3,
              duration: 750,
              useNativeDriver: true,
            }),
            Animated.timing(strobeAnim, {
              toValue: 1,
              duration: 750,
              useNativeDriver: true,
            }),
          ])
        );
        strobeAnimation.start();
        return () => strobeAnimation.stop();
      }
    }, [effect.name]);

    if (effect.name === 'Rainbow') {
      return (
        <View style={styles.rainbowIconContainer}>
          <LinearGradient
            colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rainbowGradient}
          >
            <Ionicons name={effect.icon as any} size={24} color="#FFFFFF" />
          </LinearGradient>
        </View>
      );
    }

    if (effect.name === 'Pulse') {
      return (
        <View style={styles.iconContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name={effect.icon as any} size={24} color={themeColors.primary} />
          </Animated.View>
        </View>
      );
    }

    if (effect.name === 'Wave') {
      return (
        <View style={styles.iconContainer}>
          <Ionicons name="analytics" size={24} color={waveColor} />
        </View>
      );
    }

    if (effect.name === 'Strobe') {
      return (
        <View style={styles.iconContainer}>
          <Animated.View style={{ opacity: strobeAnim }}>
            <Ionicons name={effect.icon as any} size={24} color={themeColors.warning} />
          </Animated.View>
        </View>
      );
    }

    return (
      <View style={styles.iconContainer}>
        <Ionicons name={effect.icon as any} size={24} color={themeColors.text} />
      </View>
    );
  };

  // Initialize config domain controller with subscription pattern
  useEffect(() => {
    const initialize = async () => {
      if (connectedDevice) {
        // Reset state before loading new config to prevent showing stale/default values
        setIsLoading(true);
        setError(null);
        setErrorEnvelope(null);
        setConfig(null);
        setIsInConfigMode(false);

        // Setup disconnection listener for graceful handling
        if (Platform.OS !== 'web' && connectedDevice.id !== MOCK_DEVICE.id) {
          const { bluetoothService } = require('../utils/bluetoothService');
          bluetoothService.onDisconnection(connectedDevice.id, (deviceId: string) => {
            handleDisconnection();
          });
        }
    }

    if (!DEV_MODE && connectedDevice) {
      // Initialize config mode for real device
        try {
          await configDomainController.initialize(connectedDevice);
          const result = await configDomainController.enterConfigMode();

          if (result.success && result.config) {
            setConfig(result.config);
            setBrightness(result.config.brightness);
            setSpeed(result.config.speed);
            setSelectedColor(result.config.color);
            // Map Arduino pattern to EffectType
            const mappedEffectType = arduinoPatternToEffectType(result.config.currentPattern);
            setEffectType(mappedEffectType);
            setConfigModeState({ state: 'active' });
            setIsInConfigMode(true);
          } else if (result.error) {
            setErrorEnvelope(result.error);
            setError(formatErrorForUser(result.error));
          }
        } catch (err: any) {
          if (err instanceof BLEError) {
            const envelope = ErrorHandler.fromError(err);
            setErrorEnvelope(envelope);
            setError(formatErrorForUser(envelope));
          } else {
            const envelope: ErrorEnvelope = {
              code: ErrorCode.UNKNOWN_ERROR,
              message: err?.message || 'Failed to initialize config mode',
              timestamp: Date.now(),
            };
            setErrorEnvelope(envelope);
            setError(formatErrorForUser(envelope));
          }
        } finally {
          setIsLoading(false);
        }
      } else if (!connectedDevice) {
        // No device connected, reset
        configDomainController.reset();
        setConfig(null);
        setConfigModeState({ state: 'inactive' });
        setIsInConfigMode(false);
      }
    };

    initialize();

    // Subscribe to config updates
    const unsubscribeConfig = configDomainController.subscribeToConfigUpdates((updatedConfig) => {
      setConfig(updatedConfig);
      setBrightness(updatedConfig.brightness);
      setSpeed(updatedConfig.speed);
      setSelectedColor(updatedConfig.color);
      // Map Arduino pattern to EffectType
      const mappedEffectType = arduinoPatternToEffectType(updatedConfig.currentPattern);
      setEffectType(mappedEffectType);
    });

    // Subscribe to errors
    const unsubscribeErrors = configDomainController.subscribeToErrors((errorEnvelope) => {
      setErrorEnvelope(errorEnvelope);
      setError(formatErrorForUser(errorEnvelope));
    });

    // Get initial config mode state
    setConfigModeState(configDomainController.getConfigModeState());

    // Setup disconnection listener for graceful handling
    let disconnectionCleanup: (() => void) | null = null;
    if (connectedDevice && Platform.OS !== 'web' && connectedDevice.id !== MOCK_DEVICE.id) {
      const { bluetoothService } = require('../utils/bluetoothService');
      bluetoothService.onDisconnection(connectedDevice.id, (deviceId: string) => {
        handleDisconnection();
      });
      disconnectionCleanup = () => {
        bluetoothService.removeDisconnectionListener(connectedDevice.id);
      };
    }

    return () => {
      unsubscribeConfig();
      unsubscribeErrors();
      if (disconnectionCleanup) {
        disconnectionCleanup();
      }
      if (connectedDevice && !DEV_MODE) {
        configDomainController.exitConfigMode().catch(() => {});
      }
    };
  }, [connectedDevice]);

  // Map EffectType to Arduino pattern numbers
  const effectTypeToArduinoPattern = useCallback((effectType: EffectType): number => {
    // Arduino patterns: OFF=0, SOLID_WHITE=1, RAINBOW=2, PULSE=3, FADE=4, CHASE=5, TWINKLE=6, WAVE=7, BREATH=8, STROBE=9
    // EffectType: SOLID=0, PULSE=1, RAINBOW=2, WAVE=3, STROBE=4, CUSTOM=5
    switch (effectType) {
      case EffectType.SOLID:
        return 1; // PATTERN_SOLID_WHITE
      case EffectType.PULSE:
        return 3; // PATTERN_PULSE
      case EffectType.RAINBOW:
        return 2; // PATTERN_RAINBOW
      case EffectType.WAVE:
        return 7; // PATTERN_WAVE
      case EffectType.STROBE:
        return 9; // PATTERN_STROBE
      case EffectType.CUSTOM:
        return 1; // Default to SOLID_WHITE for custom
      default:
        return 1; // Default to SOLID_WHITE
    }
  }, []);
  
  // Map Arduino pattern to EffectType
  const arduinoPatternToEffectType = useCallback((pattern: number): EffectType => {
    switch (pattern) {
      case 0:
        return EffectType.SOLID; // OFF maps to SOLID
      case 1:
        return EffectType.SOLID; // PATTERN_SOLID_WHITE
      case 2:
        return EffectType.RAINBOW; // PATTERN_RAINBOW
      case 3:
        return EffectType.PULSE; // PATTERN_PULSE
      case 7:
        return EffectType.WAVE; // PATTERN_WAVE
      case 9:
        return EffectType.STROBE; // PATTERN_STROBE
      default:
        return EffectType.SOLID;
    }
  }, []);

  // Handle graceful disconnection
  const handleDisconnection = useCallback(() => {
    // Clean up debounce timers
    parameterDebounceTimers.current.forEach((timer) => clearTimeout(timer));
    parameterDebounceTimers.current.clear();
    if (colorDebounceTimer.current) {
      clearTimeout(colorDebounceTimer.current);
      colorDebounceTimer.current = null;
    }
    
    // Reset config state
    configDomainController.reset();
    setConfig(null);
    setIsInConfigMode(false);
    setError('Device disconnected. Please reconnect to continue.');
    
    // Show alert
    Alert.alert(
      'Device Disconnected',
      'The device has been disconnected. Please reconnect to continue configuring.',
      [{ text: 'OK' }]
    );
  }, []);

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

  // Ensure we exit config mode whenever navigating away from this screen
  useFocusEffect(
    useCallback(() => {
      // Screen is focused; no action needed on enter
      return () => {
        // Screen is losing focus (navigating away, tab change, etc.)
        console.log('Exiting config mode on blur');
        if (!DEV_MODE || (connectedDevice && connectedDevice.id !== MOCK_DEVICE.id)) {
          console.log('Starting exit');
          configDomainController.exitConfigMode().catch((err: any) => {
            console.error('Failed to exit config mode on blur:', err);
          });
        }
      };
    }, [connectedDevice])
  );


  // Debounce timers per parameter to prevent crosstalk
  const parameterDebounceTimers = useRef<Map<ParameterId, NodeJS.Timeout>>(new Map());
  const colorDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  const updateParameter = useCallback(async (parameterId: ParameterId, value: number, skipStateUpdate: boolean = false) => {
    if (!connectedDevice || !config) return;

    // Validate parameter before sending
    const validation = validateParameter(parameterId, value);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid parameter value');
      // Use corrected value if available
      if (validation.correctedValue !== undefined) {
        // Update with corrected value
        const correctedValue = validation.correctedValue;
        if (!skipStateUpdate) {
          switch (parameterId) {
            case ParameterId.BRIGHTNESS:
              setBrightness(correctedValue);
              break;
            case ParameterId.SPEED:
              setSpeed(correctedValue);
              break;
            case ParameterId.EFFECT_TYPE:
              setEffectType(correctedValue);
              break;
          }
        }
        // Clear validation error after a moment
        setTimeout(() => setValidationError(null), 2000);
        // Continue with corrected value
        value = correctedValue;
      } else {
        // Invalid and no correction available - don't send
        return;
      }
    } else {
      setValidationError(null);
    }

    // Get old value for analytics (before potential revert)
    let oldValue: number | undefined;
    switch (parameterId) {
      case ParameterId.BRIGHTNESS:
        oldValue = brightness;
        break;
      case ParameterId.SPEED:
        oldValue = speed;
        break;
      case ParameterId.EFFECT_TYPE:
        oldValue = effectType;
        break;
    }

    // Validate power consumption if brightness is changing
    if (parameterId === ParameterId.BRIGHTNESS) {
      const powerValidation = validateColorAndPower(selectedColor, value, true);
      if (!powerValidation.isValid) {
        setValidationError(powerValidation.error || 'Power consumption too high');
        // Revert to previous safe value
        if (!skipStateUpdate && oldValue !== undefined) {
          setBrightness(oldValue);
        }
        // Do not send the command
        return;
      } else if (powerValidation.error) {
        // Warning (high but still safe)
        setValidationError(powerValidation.error);
        setTimeout(() => setValidationError(null), 3000);
      }
    }

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
        // Note: Color components are handled separately via updateColor()
      }
    }

    // Track analytics (only if value actually changed)
    if (oldValue !== undefined && oldValue !== value) {
      const parameterName = ParameterId[parameterId] || `parameter_${parameterId}`;
      trackConfigChange(parameterName, oldValue, value, connectedDevice.id);
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
        // Check connection before proceeding
        if (!connectedDevice || (Platform.OS !== 'web' && connectedDevice.id !== MOCK_DEVICE.id)) {
          const { bluetoothService } = require('../utils/bluetoothService');
          const isConnected = await bluetoothService.isDeviceConnected(connectedDevice.id);
          if (!isConnected) {
            handleDisconnection();
            return;
          }
        }

        // Ensure we're in config mode
        if (!isInConfigMode) {
          await configDomainController.enterConfigMode();
          setIsInConfigMode(true);
        }

        await configDomainController.updateParameter(parameterId, value);
        setError(null);
        setErrorEnvelope(null);
      } catch (err) {
        if (err instanceof BLEError) {
          const envelope = ErrorHandler.fromError(err);
          const message = ErrorHandler.processError(envelope);
          const severity = ErrorHandler.getSeverity(envelope);
          setErrorEnvelope(envelope);
          setErrorSeverity(severity);
          setError(message);
          
          // If connection error, handle disconnection
          if (err.message.includes('not connected')) {
            handleDisconnection();
          }

          // Auto-recover for recoverable errors
          if (ErrorHandler.isRecoverable(envelope) && envelope.code === ErrorCode.NOT_IN_CONFIG_MODE) {
            // Try to re-enter config mode and retry
            setTimeout(async () => {
              try {
                await configDomainController.enterConfigMode();
                setIsInConfigMode(true);
                await configDomainController.updateParameter(parameterId, value);
                setError(null);
                setErrorEnvelope(null);
              } catch (retryErr) {
                console.error('Auto-recovery failed:', retryErr);
              }
            }, 500);
          }
        } else {
          setError('Failed to update parameter');
          setErrorSeverity('error');
          setErrorEnvelope(null);
        }
        console.error('Parameter update error:', err);
      } finally {
        // Clean up timer reference
        parameterDebounceTimers.current.delete(parameterId);
      }
    }, 150); // 150ms debounce

    // Store timer reference for this parameter
    parameterDebounceTimers.current.set(parameterId, timer);
  }, [connectedDevice, config, isInConfigMode, brightness, speed, effectType, trackConfigChange]);

  // Update color as RGB value
  const updateColor = useCallback(async (hexColor: string) => {
    if (!connectedDevice || !config) return;

    // Convert HEX to RGB for internal processing
    const color = hexToRgb(hexColor);

    // Validate color before sending
    const validation = validateColor(color);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid color value');
      // Clear validation error after a moment
      setTimeout(() => setValidationError(null), 2000);
      // Don't send invalid color
      return;
    } else {
      setValidationError(null);
    }

    // Validate power consumption
    const powerValidation = validateColorAndPower(color, brightness, true);
    if (!powerValidation.isValid) {
      setValidationError(powerValidation.error || 'Power consumption too high');
      // Revert to previous safe color
      setSelectedColor(selectedColor);
      return; // Block sending
    } else if (powerValidation.error) {
      // Warning (high but still safe)
      setValidationError(powerValidation.error);
      setTimeout(() => setValidationError(null), 3000);
    }

    // Get old color for analytics
    const oldColor = selectedColor;
    const colorChanged = 
      oldColor[0] !== color[0] ||
      oldColor[1] !== color[1] ||
      oldColor[2] !== color[2];

    // Clear existing timeout
    if (colorDebounceTimer.current) {
      clearTimeout(colorDebounceTimer.current);
      colorDebounceTimer.current = null;
    }

    // Update local state immediately
    setSelectedColor(color);

    // Track analytics if color actually changed
    if (colorChanged) {
      trackConfigChange('color', oldColor, color, connectedDevice.id);
    }

    // In dev mode with mock device, skip actual BLE commands
    if (DEV_MODE && connectedDevice.id === MOCK_DEVICE.id) {
      // Just update local state, no BLE communication
      setError(null);
      return;
    }

    // Debounce BLE command to prevent flooding
    colorDebounceTimer.current = setTimeout(async () => {
      await handleColorChange(color);
      colorDebounceTimer.current = null;
    }, 150); // 150ms debounce
  }, [connectedDevice, config, isInConfigMode, selectedColor, trackConfigChange, brightness]);

  const handleSave = async () => {
    if (!connectedDevice || !config) {
      const alert = createErrorAlert(AlertMessages.NO_DEVICE_CONNECTED);
      Alert.alert(alert.title, alert.message);
      return;
    }

    setIsSaving(true);
    setError(null);
    setErrorEnvelope(null);

    try {
      // In dev mode with mock device, simulate save
      if (DEV_MODE && connectedDevice.id === MOCK_DEVICE.id) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const alert = createSuccessAlert(AlertMessages.CONFIG_SAVED);
        Alert.alert(alert.title, alert.message + ' (Mock Mode)');
        setIsSaving(false);
        return;
      }

      const result = await configDomainController.commitConfig();

      if (result.success) {
        const alert = createSuccessAlert(AlertMessages.CONFIG_SAVED);
        Alert.alert(alert.title, alert.message);
        await configDomainController.exitConfigMode();
        setIsInConfigMode(false);
      } else if (result.error) {
        setErrorEnvelope(result.error);
        setError(formatErrorForUser(result.error));
        const alert = createAlertFromError(result.error);
        Alert.alert(alert.title, alert.message);
      }
    } catch (err: any) {
      const errorEnvelope: ErrorEnvelope = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: err?.message || AlertMessages.CONFIG_FAILED,
        timestamp: Date.now(),
      };
      setErrorEnvelope(errorEnvelope);
      setError(formatErrorForUser(errorEnvelope));
      const alert = createAlertFromError(errorEnvelope);
      Alert.alert(alert.title, alert.message);
    } finally {
      setIsSaving(false);
    }
  };


  const handleBrightnessChange = async (value: number) => {
    if (!connectedDevice) return;

    try {
      const result = await configDomainController.updateBrightness(Math.round(value));
      if (!result.success && result.error) {
        setErrorEnvelope(result.error);
        setError(formatErrorForUser(result.error));
      }
    } catch (err: any) {
      console.error('Failed to update brightness:', err);
    }
  };

  const handlePatternChange = async (pattern: number) => {
    if (!connectedDevice) return;

    try {
      const result = await configDomainController.updatePattern(pattern);
      if (!result.success && result.error) {
        setErrorEnvelope(result.error);
        setError(formatErrorForUser(result.error));
      }
    } catch (err: any) {
      console.error('Failed to update pattern:', err);
    }
  };

  const handleEffectSelect = async (effectId: EffectType) => {
    setEffectType(effectId);
    // Update pattern immediately when effect is selected
    const arduinoPattern = effectTypeToArduinoPattern(effectId);
    await handlePatternChange(arduinoPattern);
  };

  const handleColorSelect = async (hexColor: string) => {
    await updateColor(hexColor);
  };

  const handleColorChange = async (color: RGBColor) => {
    if (!connectedDevice) return;

    try {
      const result = await configDomainController.updateColor(color);
      if (!result.success && result.error) {
        setErrorEnvelope(result.error);
        setError(formatErrorForUser(result.error));
      }
    } catch (err: any) {
      console.error('Failed to update color:', err);
    }
  };

  const handleSpeedChange = async (value: number) => {
    if (!connectedDevice) return;

    try {
      const result = await configDomainController.updateSpeed(Math.round(value));
      if (!result.success && result.error) {
        setErrorEnvelope(result.error);
        setError(formatErrorForUser(result.error));
      }
    } catch (err: any) {
      console.error('Failed to update speed:', err);
    }
  };

  const ColorPicker: React.FC = () => {
    // Convert predefined HEX colors to RGB for comparison
    const colorRgbValues = colors.map(hex => hexToRgb(hex));
    
    return (
    <View style={styles.colorPickerContainer}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Color</Text>
      <View style={styles.colorGrid}>
          {colors.map((hexColor: string, index: number) => {
            // Compare RGB values directly (with small tolerance for rounding)
            const colorRgb = colorRgbValues[index];
            const isSelected = 
              Math.abs(selectedColor[0] - colorRgb[0]) < 2 &&
              Math.abs(selectedColor[1] - colorRgb[1]) < 2 &&
              Math.abs(selectedColor[2] - colorRgb[2]) < 2;

            return (
          <TouchableOpacity
            key={index}
            style={[
              styles.colorOption,
                  { backgroundColor: hexColor },
                  isSelected && { borderColor: themeColors.text, borderWidth: 2 },
            ]}
                onPress={() => handleColorSelect(hexColor)}
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
          <ScrollView 
            style={styles.container} 
            contentInsetAdjustmentBehavior="never"
            scrollIndicatorInsets={{ bottom: tabBarHeight }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.section, { paddingTop: Platform.OS === 'ios' ? 60 : 16 }]}>
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.loadingCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <ActivityIndicator size="large" color={themeColors.primary} />
                <Text style={[styles.loadingText, { color: themeColors.text }]}>Entering config mode...</Text>
              </BlurView>
            </View>
          </ScrollView>
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

          {/* Connection Status Indicator */}
          {connectedDevice && (
            <View style={[styles.statusBar, { backgroundColor: isDark ? 'rgba(52,199,89,0.2)' : 'rgba(52,199,89,0.1)', borderColor: isDark ? 'rgba(52,199,89,0.3)' : 'rgba(52,199,89,0.2)' }]}>
              <View style={[styles.statusIndicator, { backgroundColor: themeColors.success }]} />
              <Text style={[styles.statusText, { color: themeColors.success }]}>
                Connected: {connectedDevice.name || 'Unknown Device'}
              </Text>
            </View>
          )}

          {/* Power Consumption Indicator */}
          {config && (
            (() => {
              const currentDraw = calculateTotalCurrent(selectedColor, brightness);
              const percentage = (currentDraw / 400) * 100; // Percentage of safe limit
              const isHigh = currentDraw > 400 * 0.8; // Above 80% of safe limit
              const isOverLimit = currentDraw > 400;
              
              return (
                <View style={[
                  styles.statusBar,
                  isOverLimit
                    ? { backgroundColor: isDark ? 'rgba(255,59,48,0.2)' : 'rgba(255,59,48,0.1)', borderColor: isDark ? 'rgba(255,59,48,0.3)' : 'rgba(255,59,48,0.2)' }
                    : isHigh
                    ? { backgroundColor: isDark ? 'rgba(255,149,0,0.2)' : 'rgba(255,149,0,0.1)', borderColor: isDark ? 'rgba(255,149,0,0.3)' : 'rgba(255,149,0,0.2)' }
                    : { backgroundColor: isDark ? 'rgba(52,199,89,0.2)' : 'rgba(52,199,89,0.1)', borderColor: isDark ? 'rgba(52,199,89,0.3)' : 'rgba(52,199,89,0.2)' }
                ]}>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: isOverLimit ? themeColors.error : isHigh ? themeColors.warning : themeColors.success }
                  ]} />
                  <Text style={[
                    styles.statusText,
                    { color: isOverLimit ? themeColors.error : isHigh ? themeColors.warning : themeColors.success }
                  ]}>
                    Power: {currentDraw.toFixed(0)}mA / {400}mA ({percentage.toFixed(0)}%)
                  </Text>
                </View>
              );
            })()
          )}

          {/* Connection Status */}
          {!connectedDevice && !DEV_MODE && (
            <View style={[styles.section, { paddingTop: Platform.OS === 'ios' ? 60 : 16 }]}>
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.errorCard, { backgroundColor: themeColors.card, borderColor: themeColors.warning }]}>
                <Ionicons name="warning" size={24} color={themeColors.warning} />
                <Text style={[styles.errorText, { color: themeColors.text }]}>No device connected. Please connect a device first.</Text>
              </BlurView>
            </View>
          )}

          {/* Error Display */}
          {error && errorEnvelope && (
            <View style={[styles.section, { paddingTop: Platform.OS === 'ios' ? 60 : 16 }]}>
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.errorCard, { backgroundColor: themeColors.card, borderColor: errorSeverity === 'warning' ? themeColors.warning : errorSeverity === 'info' ? themeColors.primary : themeColors.error }]}>
                <Ionicons 
                  name={errorSeverity === 'warning' ? 'warning' : errorSeverity === 'info' ? 'information-circle' : 'alert-circle'} 
                  size={24} 
                  color={errorSeverity === 'warning' ? themeColors.warning : errorSeverity === 'info' ? themeColors.primary : themeColors.error} 
                />
                <Text style={[styles.errorText, { color: themeColors.text }]}>{error}</Text>
                <TouchableOpacity onPress={() => { setError(null); setErrorEnvelope(null); }} style={styles.dismissButton}>
                  <Text style={[styles.dismissButtonText, { color: errorSeverity === 'warning' ? themeColors.warning : errorSeverity === 'info' ? themeColors.primary : themeColors.error }]}>Dismiss</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
          )}

          {/* Config Mode Status */}
          {connectedDevice && configModeState.state !== 'inactive' && (
            <View style={[styles.section, { paddingTop: Platform.OS === 'ios' ? 60 : 16 }]}>
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.statusCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={styles.statusRow}>
                  <Ionicons 
                    name={configModeState.state === 'active' ? 'checkmark-circle' : 'time-outline'} 
                    size={20} 
                    color={configModeState.state === 'active' ? themeColors.success : themeColors.warning} 
                  />
                  <Text style={[styles.statusText, { color: themeColors.text }]}>
                    Config Mode: {configModeState.state === 'active' ? 'Active' : configModeState.state}
                  </Text>
                </View>
                {configDomainController.hasUnsavedChanges() && (
                  <Text style={[styles.unsavedText, { color: themeColors.textSecondary }]}>You have unsaved changes</Text>
                )}
              </BlurView>
            </View>
          )}

          {validationError && (
            <View style={[styles.section, { paddingTop: Platform.OS === 'ios' ? 60 : 16 }]}>
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.errorCard, { backgroundColor: themeColors.card, borderColor: themeColors.warning }]}>
                <Ionicons name="warning" size={24} color={themeColors.warning} />
                <Text style={[styles.errorText, { color: themeColors.text }]}>
                  {validationError}
                </Text>
              </BlurView>
            </View>
          )}


      {/* Color Picker */}
      {config && (
        <View style={styles.section}>
          <ColorPicker />
        </View>
      )}

      {/* Brightness Control */}
      {config && (
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
            onUpdateParameter={async (paramId, value) => {
              await handleBrightnessChange(value);
            }}
          />
        </View>
      )}

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
              onUpdateParameter={async (paramId, value) => {
              await handleSpeedChange(value);
            }}
        />
      </View>

      {/* Effects */}
      {config && (
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
                  <AnimatedEffectIcon effect={effect} />
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
      )}

      {/* Presets */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Presets</Text>
        <View style={styles.presetsList}>
          {[
            { name: 'Rock Mode', description: 'High energy, fast pulse' },
            { name: 'Jazz Mode', description: 'Smooth, slow fade' },
            { name: 'Classical Mode', description: 'Gentle, solid glow' },
          ].map((preset, index) => (
            <TouchableOpacity key={index} activeOpacity={0.7} style={styles.presetCardWrapper}>
              <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.presetCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <View style={styles.presetInfo}>
                  <Text style={[styles.presetName, { color: themeColors.text }]}>{preset.name}</Text>
                  <Text style={[styles.presetDescription, { color: themeColors.textSecondary }]}>{preset.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
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
    ...(Platform.OS === 'web' && {
      // @ts-ignore - Web-specific styles
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
    }),
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
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  recoveryButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  recoveryButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
    ...(Platform.OS === 'web' && { cursor: 'pointer' }),
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
  rainbowIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rainbowGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetsList: {
    marginTop: 12,
  },
  presetCardWrapper: {
    ...(Platform.OS === 'web' && { cursor: 'pointer' }),
  },
  presetCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 14,
  },
  errorCard: {
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  loadingCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  statusCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  unsavedText: {
    fontSize: 12,
    marginTop: 8,
  },
  dismissButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  dismissButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ConfigScreen;
