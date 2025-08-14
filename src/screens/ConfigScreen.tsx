import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    { id: 1, name: 'Solid', icon: 'radio-button-on' },
    { id: 2, name: 'Pulse', icon: 'pulse' },
    { id: 3, name: 'Rainbow', icon: 'color-palette' },
    { id: 4, name: 'Wave', icon: 'water' },
    { id: 5, name: 'Strobe', icon: 'flash' },
    { id: 6, name: 'Custom', icon: 'settings' },
  ];

  const handleSave = () => {
    Alert.alert('Success', 'Configuration saved successfully!');
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
  }> = ({ title, value, onValueChange, icon }) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Ionicons name={icon as any} size={20} color={theme.dark.primary} />
        <Text style={styles.sliderTitle}>{title}</Text>
        <Text style={styles.sliderValue}>{value}%</Text>
      </View>
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${value}%` }]} />
        <View style={[styles.sliderThumb, { left: `${value}%` }]} />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Power Control */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="power" size={24} color={theme.dark.primary} />
          <Text style={styles.sectionTitle}>Power Control</Text>
        </View>
        <View style={styles.powerCard}>
          <View style={styles.powerInfo}>
            <Text style={styles.powerTitle}>LED System</Text>
            <Text style={styles.powerSubtitle}>
              {isEnabled ? 'System is running' : 'System is off'}
            </Text>
          </View>
          <Switch
            trackColor={{ false: theme.dark.border, true: theme.dark.primary + '40' }}
            thumbColor={isEnabled ? theme.dark.primary : theme.dark.textSecondary}
            onValueChange={setIsEnabled}
            value={isEnabled}
          />
        </View>
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
            <TouchableOpacity key={effect.id} style={styles.effectCard}>
              <Ionicons name={effect.icon as any} size={24} color={theme.dark.primary} />
              <Text style={styles.effectName}>{effect.name}</Text>
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
            <TouchableOpacity key={index} style={styles.presetCard}>
              <View style={styles.presetInfo}>
                <Text style={styles.presetName}>{preset.name}</Text>
                <Text style={styles.presetDescription}>{preset.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.dark.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.saveSection}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Ionicons name="save" size={20} color={theme.dark.text} />
          <Text style={styles.saveButtonText}>Save Configuration</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.dark.background,
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
    marginLeft: 12,
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
    color: theme.dark.primary,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: theme.dark.border,
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: theme.dark.primary,
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    backgroundColor: theme.dark.primary,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.dark.background,
  },
  effectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
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
  effectName: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.dark.text,
    marginTop: 8,
    textAlign: 'center',
  },
  presetsList: {
    marginTop: 12,
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
    backgroundColor: theme.dark.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  saveButtonText: {
    color: theme.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ConfigScreen;
