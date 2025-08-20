import React from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';

const ProfileScreen: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = React.useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => console.log('Logout') },
      ]
    );
  };

  const MenuItem: React.FC<{
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    showSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
  }> = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true, 
    showSwitch = false,
    switchValue,
    onSwitchChange 
  }) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color={theme.dark.primary} />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={styles.menuItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showSwitch ? (
        <Switch
          trackColor={{ false: theme.dark.border, true: theme.dark.primary + '40' }}
          thumbColor={switchValue ? theme.dark.primary : theme.dark.textSecondary}
          onValueChange={onSwitchChange}
          value={switchValue}
        />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={20} color={theme.dark.textSecondary} />
      ) : null}
    </TouchableOpacity>
  );

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
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={theme.dark.primary} />
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={16} color={theme.dark.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>John Doe</Text>
        <Text style={styles.userEmail}>john.doe@example.com</Text>
        <TouchableOpacity style={styles.editProfileButton}>
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <BlurView intensity={30} tint="dark" style={styles.menuContainer}>
          <MenuItem
            icon="person-circle"
            title="Personal Information"
            subtitle="Manage your account details"
          />
          <MenuItem
            icon="shield-checkmark"
            title="Security"
            subtitle="Password and authentication"
          />
          <MenuItem
            icon="card"
            title="Payment Methods"
            subtitle="Manage your payment options"
          />
          <MenuItem
            icon="cloud"
            title="Cloud Storage"
            subtitle="2.5 GB of 5 GB used"
          />
        </BlurView>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <BlurView intensity={30} tint="dark" style={styles.menuContainer}>
          <MenuItem
            icon="notifications"
            title="Notifications"
            showSwitch={true}
            switchValue={notificationsEnabled}
            onSwitchChange={setNotificationsEnabled}
            showArrow={false}
          />
          <MenuItem
            icon="moon"
            title="Dark Mode"
            showSwitch={true}
            switchValue={darkModeEnabled}
            onSwitchChange={setDarkModeEnabled}
            showArrow={false}
          />
          <MenuItem
            icon="sync"
            title="Auto Sync"
            subtitle="Automatically sync your configurations"
            showSwitch={true}
            switchValue={autoSyncEnabled}
            onSwitchChange={setAutoSyncEnabled}
            showArrow={false}
          />
          <MenuItem
            icon="language"
            title="Language"
            subtitle="English (US)"
          />
        </BlurView>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <BlurView intensity={30} tint="dark" style={styles.menuContainer}>
          <MenuItem
            icon="help-circle"
            title="Help & Support"
            subtitle="Get help with the app"
          />
          <MenuItem
            icon="document-text"
            title="Terms of Service"
          />
          <MenuItem
            icon="shield"
            title="Privacy Policy"
          />
          <MenuItem
            icon="star"
            title="Rate App"
          />
        </BlurView>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <BlurView intensity={30} tint="dark" style={styles.menuContainer}>
          <MenuItem
            icon="information-circle"
            title="App Version"
            subtitle="1.0.0"
            showArrow={false}
          />
          <MenuItem
            icon="code-slash"
            title="Open Source Licenses"
          />
        </BlurView>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <BlurView intensity={20} tint="dark" style={styles.logoutButton}>
          <Ionicons name="log-out" size={20} color={theme.dark.error} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </BlurView>
      </View>
    </ScrollView>
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
    height: 240,
  },
  blobPrimary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0,122,255,0.16)',
    top: -60,
    left: -40,
  },
  blobSecondary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,149,0,0.14)',
    top: -10,
    right: -30,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.dark.primary,
    shadowColor: theme.dark.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.dark.background,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.dark.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: theme.dark.textSecondary,
    marginBottom: 20,
  },
  editProfileButton: {
    backgroundColor: theme.dark.card,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.dark.border,
  },
  editProfileText: {
    color: theme.dark.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.dark.text,
    marginBottom: 12,
  },
  menuContainer: {
    backgroundColor: theme.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.dark.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.dark.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.dark.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.dark.text,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: theme.dark.textSecondary,
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  logoutButton: {
    backgroundColor: theme.dark.card,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.dark.error + '40',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoutButtonText: {
    color: theme.dark.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ProfileScreen;
