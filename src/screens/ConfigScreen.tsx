import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from '../utils/linearGradientWrapper';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { theme } from '../utils/theme';

const ConfigScreen: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [brightness, setBrightness] = useState(50);
  const [speed, setSpeed] = useState(30);
  const [selectedColor, setSelectedColor] = useState('#007AFF');

  const colors = [
    '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
    '#007AFF', '#5856D6', '#AF52DE', '#FF2D92',
  ];

  const effects = [
    { id: 1, name: 'Solid', icon: 'radio-button-on', color: '#FFFFFF' },
    { id: 2, name: 'Pulse', icon: 'pulse', color: '#FF6B6B' },
    { id: 3, name: 'Rainbow', icon: 'color-palette', color: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7, #DDA0DD)' },
    { id: 4, name: 'Wave', icon: 'water', color: '#4ECDC4' },
    { id: 5, name: 'Strobe', icon: 'flash', color: '#FFD93D' },
    { id: 6, name: 'Custom', icon: 'settings', color: '#FF6B9D' },
  ];

  const handleSave = () => {
    Alert.alert('Success', 'Configuration saved successfully!');
  };

  // Animated effect components
  const AnimatedEffectIcon: React.FC<{ effect: any }> = ({ effect }) => {
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
            <Ionicons name={effect.icon as any} size={24} color={effect.color} />
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
            <Ionicons name={effect.icon as any} size={24} color={effect.color} />
          </Animated.View>
        </View>
      );
    }

    return (
      <View style={styles.iconContainer}>
        <Ionicons name={effect.icon as any} size={24} color={effect.color} />
      </View>
    );
  };

  const ColorPicker: React.FC = () => (
    <View style={styles.colorPickerContainer}>
      <Text style={styles.sectionTitle}>Color</Text>
      <View style={styles.colorGrid}>
        {colors.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              selectedColor === color && styles.selectedColor,
            ]}
            onPress={() => setSelectedColor(color)}
          >
            {selectedColor === color && (
              <Ionicons name="checkmark" size={20} color="white" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const SliderControl: React.FC<{
    title: string;
    value: number;
    onValueChange: (value: number) => void;
    icon: string;
  }> = ({ title, value, onValueChange, icon }) => {
    const [sliderValue, setSliderValue] = useState(value);

    // Only sync on initial mount
    useEffect(() => {
      setSliderValue(value);
    }, []); // Empty dependency array - only runs once

    const handleSliderChange = (newValue: number) => {
      setSliderValue(newValue);
    };

    // Remove all parent state updates - slider is completely self-contained

    return (
      <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
          <Ionicons name={icon as any} size={20} color="#FFFFFF" />
          <Text style={styles.sliderTitle}>{title}</Text>
          <Text style={styles.sliderValue}>{Math.round(sliderValue)}%</Text>
        </View>
        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={sliderValue}
            onValueChange={handleSliderChange}
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
      {/* Power Control */}
      <View style={styles.section}>
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
              {isEnabled ? 'LED system active' : 'LED system disabled'}
            </Text>
          </View>
          <Switch
            trackColor={{ false: theme.dark.border, true: theme.dark.primary + '40' }}
            thumbColor={isEnabled ? theme.dark.primary : theme.dark.textSecondary}
            onValueChange={setIsEnabled}
            value={isEnabled}
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
        />
      </View>

      {/* Effects */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Effects</Text>
        <View style={styles.effectsGrid}>
          {effects.map((effect) => (
            <TouchableOpacity key={effect.id} activeOpacity={0.7} style={styles.effectCardWrapper}>
              <BlurView intensity={20} tint="dark" style={styles.effectCard}>
                <AnimatedEffectIcon effect={effect} />
                <Text style={styles.effectName}>{effect.name}</Text>
              </BlurView>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Presets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Presets</Text>
        <View style={styles.presetsList}>
          {[
            { name: 'Rock Mode', description: 'High energy, fast pulse' },
            { name: 'Jazz Mode', description: 'Smooth, slow fade' },
            { name: 'Classical Mode', description: 'Gentle, solid glow' },
          ].map((preset, index) => (
            <TouchableOpacity key={index} activeOpacity={0.7} style={styles.presetCardWrapper}>
              <BlurView intensity={20} tint="dark" style={styles.presetCard}>
                <View style={styles.presetInfo}>
                  <Text style={styles.presetName}>{preset.name}</Text>
                  <Text style={styles.presetDescription}>{preset.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.dark.textSecondary} />
              </BlurView>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.saveSection}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <LinearGradient
            colors={['#007AFF', '#0056CC', '#0033AA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.saveButtonContent}>
            <View style={styles.saveIconContainer}>
              <Ionicons name="save" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.saveButtonText}>Save Configuration</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
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
    borderColor: theme.dark.text,
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
    // Prevent text selection on web
  },
  slider: {
    width: '100%',
    height: 40,
    ...(Platform.OS === 'web' && { 
      WebkitAppearance: 'none',
      appearance: 'none',
    }),
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
    backgroundColor: theme.dark.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: theme.dark.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  effectName: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.dark.text,
    marginTop: 8,
    textAlign: 'center',
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
  waveOverlay: {
    position: 'absolute',
    width: 8,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    opacity: 0.6,
  },
  presetsList: {
    marginTop: 12,
  },
  presetCardWrapper: {
    ...(Platform.OS === 'web' && { cursor: 'pointer' }),
  },
  presetCard: {
    backgroundColor: theme.dark.card,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.dark.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.dark.text,
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 14,
    color: theme.dark.textSecondary,
  },
  saveSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  saveButton: {
    position: 'relative',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 20,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 12px 32px rgba(0,122,255,0.4)',
    } : {
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 32,
      elevation: 16,
    }),
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ConfigScreen;
