import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../utils/linearGradientWrapper';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const tabBarHeight = useBottomTabBarHeight();
  const { colors, isDark } = useTheme();
  const features = [
    {
      id: 1,
      title: 'LED Control',
      description: 'Control your guitar\'s LED system with precision and ease.',
      icon: 'musical-notes',
      color: colors.primary,
    },
    {
      id: 2,
      title: 'Mobile Friendly',
      description: 'Access your dashboard from any device, anywhere.',
      icon: 'phone-portrait',
      color: colors.secondary,
    },
    {
      id: 3,
      title: 'Syncronization',
      description: 'Your configurations are safely stored on your device.',
      icon: 'cloud',
      color: colors.success,
    },
  ];

  const FeatureCard: React.FC<{
    title: string;
    description: string;
    icon: string;
    color: string;
    themeColors: any;
  }> = ({ title, description, icon, color, themeColors }) => (
    <View style={[styles.featureCard, { backgroundColor: themeColors.card + 'B3', borderColor: themeColors.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[styles.featureTitle, { color: themeColors.text }]}>{title}</Text>
      <Text style={[styles.featureDescription, { color: themeColors.textSecondary }]}>{description}</Text>
    </View>
  );

  return (
    <View style={styles.fullScreen}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      <View style={styles.backgroundDecor}>
        <View style={[styles.blobPrimary, { backgroundColor: isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.09)' }]} />
        <View style={[styles.blobSecondary, { backgroundColor: isDark ? 'rgba(88,86,214,0.16)' : 'rgba(88,86,214,0.08)' }]} />
      </View>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView 
          style={styles.container} 
          contentInsetAdjustmentBehavior="never"
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
          showsVerticalScrollIndicator={false}
        >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroContent}>
          <View style={[styles.logoContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="musical-notes" size={60} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>BT LED Guitar Dashboard</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Control your guitar's LED system with ease
          </Text>
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('DeviceDiscovery')}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={[styles.primaryButtonText, { color: '#FFFFFF' }]}>Add New Configuration</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <BlurView key={feature.id} intensity={30} tint={isDark ? "dark" : "light"} style={{ borderRadius: 16 }}>
              <FeatureCard
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                color={feature.color}
                themeColors={colors}
              />
            </BlurView>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="settings" size={24} color={colors.primary} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="analytics" size={24} color={colors.secondary} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="help-circle" size={24} color={colors.warning} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Help</Text>
          </TouchableOpacity>
        </View>
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
    height: 260,
    overflow: 'visible',
  },
  blobPrimary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -60,
    left: -40,
  },
  blobSecondary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -20,
    right: -30,
  },
  heroSection: {
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...(Platform.OS === 'web' ? {} : {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {} : {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  aboutSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HomeScreen;
