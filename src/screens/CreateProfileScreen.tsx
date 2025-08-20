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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
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
      Alert.alert('Cannot Remove', 'At least one LED configuration is required.');
    }
  };

  const saveProfile = () => {
    if (!profileName.trim()) {
      Alert.alert('Profile Name Required', 'Please enter a name for your configuration profile.');
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
    
    Alert.alert(
      'Profile Created',
      'Your configuration profile has been created successfully!',
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Home'),
        },
      ]
    );
  };

  const renderLEDConfig = (config: LEDConfiguration) => (
    <View key={config.id} style={styles.ledConfigCard}>
      <View style={styles.ledConfigHeader}>
        <TextInput
          style={styles.ledNameInput}
          value={config.name}
          onChangeText={(text) => updateLEDConfig(config.id, { name: text })}
          placeholder="LED Name"
          placeholderTextColor={theme.dark.textSecondary}
        />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeLEDConfig(config.id)}
        >
          <Ionicons name="trash-outline" size={20} color={theme.dark.error} />
        </TouchableOpacity>
      </View>

      {/* Brightness Control */}
      <View style={styles.controlGroup}>
        <Text style={styles.controlLabel}>Brightness</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderValue}>{config.brightness}%</Text>
          <View style={styles.sliderTrack}>
            <View 
              style={[
                styles.sliderFill, 
                { width: `${config.brightness}%` }
              ]} 
            />
            <TouchableOpacity
              style={[
                styles.sliderThumb,
                { left: `${config.brightness}%` }
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
        <Text style={styles.controlLabel}>Color</Text>
        <View style={styles.colorGrid}>
          {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                config.color === color && styles.colorOptionSelected
              ]}
              onPress={() => updateLEDConfig(config.id, { color })}
            >
              {config.color === color && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pattern Selection */}
      <View style={styles.controlGroup}>
        <Text style={styles.controlLabel}>Pattern</Text>
        <View style={styles.patternGrid}>
          {['solid', 'pulse', 'rainbow', 'custom'].map((pattern) => (
            <TouchableOpacity
              key={pattern}
              style={[
                styles.patternOption,
                config.pattern === pattern && styles.patternOptionSelected
              ]}
              onPress={() => updateLEDConfig(config.id, { pattern: pattern as any })}
            >
              <Text style={[
                styles.patternText,
                config.pattern === pattern && styles.patternTextSelected
              ]}>
                {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Speed Control */}
      <View style={styles.controlGroup}>
        <Text style={styles.controlLabel}>Speed</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderValue}>{config.speed}%</Text>
          <View style={styles.sliderTrack}>
            <View 
              style={[
                styles.sliderFill, 
                { width: `${config.speed}%` }
              ]} 
            />
            <TouchableOpacity
              style={[
                styles.sliderThumb,
                { left: `${config.speed}%` }
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
        <Text style={styles.headerTitle}>Create Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Device Info */}
        <BlurView intensity={25} tint="dark" style={styles.deviceInfoCard}>
          <Ionicons name="bluetooth" size={24} color={theme.dark.primary} />
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceDetail}>Signal: {device.rssi} dBm</Text>
          </View>
        </BlurView>

        {/* Profile Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Name</Text>
          <TextInput
            style={styles.profileNameInput}
            value={profileName}
            onChangeText={setProfileName}
            placeholder="Enter profile name"
            placeholderTextColor={theme.dark.textSecondary}
          />
        </View>

        {/* LED Configurations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LED Configurations</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={addLEDConfig}
            >
              <Ionicons name="add" size={20} color={theme.dark.primary} />
            </TouchableOpacity>
          </View>
          
          {ledConfigs.map(renderLEDConfig)}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveProfile}
        >
          <Ionicons name="save" size={20} color={theme.dark.text} />
          <Text style={styles.saveButtonText}>Create Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.dark.background,
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
    backgroundColor: 'rgba(175,82,222,0.14)',
    top: -10,
    right: -30,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  deviceInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.dark.card,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.dark.border,
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
    color: theme.dark.text,
  },
  deviceDetail: {
    fontSize: 14,
    color: theme.dark.textSecondary,
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
    color: theme.dark.text,
  },
  addButton: {
    padding: 8,
  },
  profileNameInput: {
    backgroundColor: theme.dark.card,
    borderWidth: 1,
    borderColor: theme.dark.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.dark.text,
  },
  ledConfigCard: {
    backgroundColor: theme.dark.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.dark.border,
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
    color: theme.dark.text,
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
    color: theme.dark.text,
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: 14,
    color: theme.dark.textSecondary,
    width: 40,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: theme.dark.border,
    borderRadius: 2,
    marginLeft: 12,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: theme.dark.primary,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    backgroundColor: theme.dark.primary,
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
    borderColor: theme.dark.text,
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
    borderColor: theme.dark.border,
    alignItems: 'center',
  },
  patternOptionSelected: {
    backgroundColor: theme.dark.primary,
    borderColor: theme.dark.primary,
  },
  patternText: {
    fontSize: 14,
    color: theme.dark.text,
  },
  patternTextSelected: {
    color: theme.dark.text,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.dark.border,
  },
  saveButton: {
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
  saveButtonText: {
    color: theme.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CreateProfileScreen;
