import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from '../utils/linearGradientWrapper';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { BluetoothDevice, DeviceProfile, LEDConfiguration } from '../types/bluetooth';

interface CreateProfileScreenProps {
  navigation: any;
  route: {
    params: {
      device: BluetoothDevice;
    };
  };
}

const CreateProfileScreen: React.FC<CreateProfileScreenProps> = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { device } = route.params;
  
  const [profileName, setProfileName] = useState('');
  const [ledConfigs, setLedConfigs] = useState<LEDConfiguration[]>([
    {
      id: '1',
      name: 'Main LED',
      brightness: 50,
      color: '#FF0000',
      pattern: 'solid',
      speed: 50,
    },
  ]);

  const addLEDConfig = () => {
    const newConfig: LEDConfiguration = {
      id: Date.now().toString(),
      name: `LED ${ledConfigs.length + 1}`,
      brightness: 50,
      color: '#00FF00',
      pattern: 'solid',
      speed: 50,
    };
    setLedConfigs([...ledConfigs, newConfig]);
  };

  const updateLEDConfig = (id: string, updates: Partial<LEDConfiguration>) => {
    setLedConfigs(ledConfigs.map(config => 
      config.id === id ? { ...config, ...updates } : config
    ));
  };

  const removeLEDConfig = (id: string) => {
    if (ledConfigs.length > 1) {
      setLedConfigs(ledConfigs.filter(config => config.id !== id));
    } else {
      showToast('At least one LED configuration is required.', 'error');
    }
  };

  const saveProfile = () => {
    if (!profileName.trim()) {
      showToast('Please enter a name for your configuration profile.', 'error');
      return;
    }

    const newProfile: DeviceProfile = {
      id: Date.now().toString(),
      name: profileName.trim(),
      deviceId: device.id,
      deviceName: device.name,
      createdAt: new Date(),
      updatedAt: new Date(),
      ledConfigurations: ledConfigs,
      isActive: true,
    };

    // Here you would typically save to storage/database
    console.log('Saving profile:', newProfile);
    
    showToast('Your configuration profile has been created successfully!', 'success');
    
    // Navigate to Home after a short delay to allow toast to be visible
    setTimeout(() => {
      navigation.navigate('Home');
    }, 1500);
  };

  const renderLEDConfig = (config: LEDConfiguration) => (
    <View key={config.id} style={[styles.ledConfigCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.ledConfigHeader}>
        <TextInput
          style={[styles.ledNameInput, { color: colors.text }]}
          value={config.name}
          onChangeText={(text) => updateLEDConfig(config.id, { name: text })}
          placeholder="LED Name"
          placeholderTextColor={colors.textSecondary}
        />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeLEDConfig(config.id)}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Brightness Control */}
      <View style={styles.controlGroup}>
        <Text style={[styles.controlLabel, { color: colors.text }]}>Brightness</Text>
        <View style={styles.sliderContainer}>
          <Text style={[styles.sliderValue, { color: colors.textSecondary }]}>{config.brightness}%</Text>
          <View style={[styles.sliderTrack, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.sliderFill, 
                { width: `${config.brightness}%`, backgroundColor: colors.primary }
              ]} 
            />
            <TouchableOpacity
              style={[
                styles.sliderThumb,
                { left: `${config.brightness}%`, backgroundColor: colors.primary }
              ]}
              onPress={() => {
                // In a real app, this would be a proper slider
                const newValue = config.brightness === 100 ? 0 : config.brightness + 25;
                updateLEDConfig(config.id, { brightness: newValue });
              }}
            />
          </View>
        </View>
      </View>

      {/* Color Selection */}
      <View style={styles.controlGroup}>
        <Text style={[styles.controlLabel, { color: colors.text }]}>Color</Text>
        <View style={styles.colorGrid}>
          {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                config.color === color && { borderColor: colors.text, borderWidth: 2 }
              ]}
              onPress={() => updateLEDConfig(config.id, { color })}
            >
              {config.color === color && (
                <Ionicons name="checkmark" size={16} color={isDark ? "#FFFFFF" : "#000000"} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pattern Selection */}
      <View style={styles.controlGroup}>
        <Text style={[styles.controlLabel, { color: colors.text }]}>Pattern</Text>
        <View style={styles.patternGrid}>
          {['solid', 'pulse', 'rainbow', 'custom'].map((pattern) => (
            <TouchableOpacity
              key={pattern}
              style={[
                styles.patternOption,
                { backgroundColor: colors.card, borderColor: colors.border },
                config.pattern === pattern && { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.05)' }
              ]}
              onPress={() => updateLEDConfig(config.id, { pattern: pattern as any })}
            >
              <Text style={[
                styles.patternText,
                { color: colors.text },
                config.pattern === pattern && { color: colors.primary, fontWeight: '600' }
              ]}>
                {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Speed Control */}
      <View style={styles.controlGroup}>
        <Text style={[styles.controlLabel, { color: colors.text }]}>Speed</Text>
        <View style={styles.sliderContainer}>
          <Text style={[styles.sliderValue, { color: colors.textSecondary }]}>{config.speed}%</Text>
          <View style={[styles.sliderTrack, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.sliderFill, 
                { width: `${config.speed}%`, backgroundColor: colors.primary }
              ]} 
            />
            <TouchableOpacity
              style={[
                styles.sliderThumb,
                { left: `${config.speed}%`, backgroundColor: colors.primary }
              ]}
              onPress={() => {
                const newValue = config.speed === 100 ? 0 : config.speed + 25;
                updateLEDConfig(config.id, { speed: newValue });
              }}
            />
          </View>
        </View>
      </View>
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
        <View style={[styles.blobPrimary, { backgroundColor: isDark ? 'rgba(0,122,255,0.16)' : 'rgba(0,122,255,0.08)' }]} />
        <View style={[styles.blobSecondary, { backgroundColor: isDark ? 'rgba(88,86,214,0.14)' : 'rgba(88,86,214,0.07)' }]} />
      </View>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Device Info */}
        <BlurView intensity={25} tint={isDark ? "dark" : "light"} style={[styles.deviceInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="bluetooth" size={24} color={colors.primary} />
          <View style={styles.deviceInfo}>
            <Text style={[styles.deviceName, { color: colors.text }]}>{device.name}</Text>
            <Text style={[styles.deviceDetail, { color: colors.textSecondary }]}>Signal: {device.rssi} dBm</Text>
          </View>
        </BlurView>

        {/* Profile Name */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Name</Text>
          <TextInput
            style={[styles.profileNameInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={profileName}
            onChangeText={setProfileName}
            placeholder="Enter profile name"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* LED Configurations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>LED Configurations</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={addLEDConfig}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          {ledConfigs.map(renderLEDConfig)}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={saveProfile}
        >
          <Ionicons name="save" size={20} color="#FFFFFF" />
          <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>Create Profile</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  deviceInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  deviceInfo: {
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  deviceDetail: {
    fontSize: 14,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
  },
  profileNameInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  ledConfigCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  ledConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ledNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
  },
  controlGroup: {
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: 14,
    width: 40,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginLeft: 12,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    // Applied inline
  },
  patternGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  patternOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  patternOptionSelected: {
    // Applied inline
  },
  patternText: {
    fontSize: 14,
  },
  patternTextSelected: {
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
  },
  saveButton: {
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
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CreateProfileScreen;
