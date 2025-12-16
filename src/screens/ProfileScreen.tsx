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
  TextInput,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../utils/linearGradientWrapper';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import GradientButton from '../components/GradientButton';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

const ProfileScreen: React.FC = () => {
  const tabBarHeight = useBottomTabBarHeight();
  const { colors, isDark, setThemeMode } = useTheme();
  const { user, updateName, clearUser, needsProfileCompletion } = useUser();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = React.useState(true);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [isEditingPersonal, setIsEditingPersonal] = React.useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const firstNameInputRef = React.useRef<TextInput>(null);
  const lastNameInputRef = React.useRef<TextInput>(null);
  const editCardRef = React.useRef<View>(null);

  // Update local state when user data changes
  React.useEffect(() => {
    if (user) {
      console.log('ProfileScreen: User data updated', {
        firstName: user.firstName || 'null',
        lastName: user.lastName || 'null',
        email: user.email || 'null',
      });
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      
      // Auto-open edit form if profile is incomplete
      if (needsProfileCompletion && !isEditingPersonal) {
        setIsEditingPersonal(true);
      }
    } else {
      console.log('ProfileScreen: No user data available');
      setFirstName('');
      setLastName('');
    }
  }, [user, needsProfileCompletion]);

  const email = user?.email || '';
  
  const handleDarkModeToggle = (value: boolean) => {
    setThemeMode(value ? 'dark' : 'light');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            await clearUser();
            // In a real app, you might navigate back to SignInScreen here
            console.log('User logged out');
          }
        },
      ]
    );
  };

  const handleSavePersonal = async () => {
    // Save name changes to user context
    await updateName(firstName.trim(), lastName.trim());
    setIsEditingPersonal(false);
  };

  const openAccountManagement = async () => {
    if (Platform.OS === 'ios') {
      // On iOS, try to open Settings > Passwords
      // Note: App-Prefs: URLs are deprecated but may still work on some iOS versions
      // For iOS 18+, users can access Passwords via the dedicated Passwords app
      try {
        // Try the Settings deep link first
        const passwordsURL = 'App-Prefs:root=PASSWORDS';
        const canOpen = await Linking.canOpenURL(passwordsURL);
        if (canOpen) {
          await Linking.openURL(passwordsURL);
        } else {
          // If Settings link doesn't work, show instructions
          Alert.alert(
            user?.authProvider === 'apple' ? 'Manage Apple Account' : 'Manage Google Account',
            'To manage your Apple ID password and security:\n\n1. Open the Passwords app (iOS 18+)\n2. Or go to Settings > [Your Name] > Sign-In & Security\n\nAlternatively, you can visit appleid.apple.com in Safari.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Safari', 
                onPress: () => Linking.openURL('https://appleid.apple.com/')
              }
            ]
          );
        }
      } catch (error) {
        // Fallback to web
        Linking.openURL('https://appleid.apple.com/').catch(() => {
          Alert.alert('Unable to open', 'Please manage your Apple ID from device settings or appleid.apple.com.');
        });
      }
    } else {
      // On other platforms, open web
      Linking.openURL('https://appleid.apple.com/').catch(() => {
        Alert.alert('Unable to open', 'Please manage your Apple ID from device settings or appleid.apple.com.');
      });
    }
  };

  // Scroll to edit form when it opens
  React.useEffect(() => {
    if (isEditingPersonal && scrollViewRef.current && editCardRef.current) {
      // Small delay to ensure the form is rendered
      setTimeout(() => {
        editCardRef.current?.measure((x, y, width, height, pageX, pageY) => {
          scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
        });
      }, 300);
    }
  }, [isEditingPersonal]);

  // Scroll to input when focused
  const handleInputFocus = (inputRef: React.RefObject<TextInput>) => {
    setTimeout(() => {
      if (scrollViewRef.current && inputRef.current) {
        inputRef.current.measure((x, y, width, height, pageX, pageY) => {
          scrollViewRef.current?.scrollTo({ y: pageY - 150, animated: true });
        });
      }
    }, 100);
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
    themeColors: any;
  }> = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true, 
    showSwitch = false,
    switchValue,
    onSwitchChange,
    themeColors
  }) => (
    <TouchableOpacity 
      style={[styles.menuItem, { borderBottomColor: themeColors.border }]} 
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color={themeColors.textSecondary} />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={[styles.menuItemTitle, { color: themeColors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.menuItemSubtitle, { color: themeColors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      {showSwitch ? (
        <Switch
          trackColor={{ false: '#C6C6C8', true: '#34C759' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#C6C6C8"
          onValueChange={onSwitchChange}
          value={switchValue}
        />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
      ) : null}
    </TouchableOpacity>
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
        <View style={[styles.blobPrimary, { backgroundColor: isDark ? 'rgba(0,122,255,0.16)' : 'rgba(0,122,255,0.08)' }]} />
        <View style={[styles.blobSecondary, { backgroundColor: isDark ? 'rgba(255,149,0,0.14)' : 'rgba(255,149,0,0.07)' }]} />
      </View>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.container} 
          contentInsetAdjustmentBehavior="never"
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }]}>
            <Ionicons name="person" size={40} color={colors.text} />
          </View>
          <TouchableOpacity style={[styles.editAvatarButton, { borderColor: colors.background }]}>
            <Ionicons name="camera" size={16} color={colors.background} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>
          {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'User'}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {email || 'Email not available'}
        </Text>
        {user?.authProvider && (
          <Text style={[styles.authProvider, { color: colors.textSecondary }]}>
            Signed in with {user.authProvider === 'apple' ? 'Apple' : 'Google'}
          </Text>
        )}
        <TouchableOpacity style={[styles.editProfileButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.editProfileText, { color: colors.text }]}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        {needsProfileCompletion && (
          <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.infoBanner, { backgroundColor: colors.warning || '#FFA500', borderColor: colors.border }]}>
            <Ionicons name="information-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={[styles.infoBannerText, { color: '#FFFFFF' }]}>
              Apple only provides your name and email on first sign-in. Please complete your profile below.
            </Text>
          </BlurView>
        )}
        <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="person-circle"
            title="Personal Information"
            subtitle={needsProfileCompletion ? "Complete your profile" : "Manage your account details"}
            onPress={() => setIsEditingPersonal((prev) => !prev)}
            themeColors={colors}
          />
          {isEditingPersonal && (
            <View style={[styles.editCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.editLabel, { color: colors.textSecondary }]}>First Name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="First name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
              <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Last Name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                style={[styles.editInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Last name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
              <Text style={[styles.editHelper, { color: colors.textSecondary }]}>
                Your sign-in is managed by Apple ID. Email and authentication are controlled via Apple.
              </Text>
              <View style={styles.editActions}>
                <TouchableOpacity onPress={() => setIsEditingPersonal(false)} style={[styles.ghostButton, { borderColor: colors.border }]}>
                  <Text style={[styles.ghostButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSavePersonal} style={[styles.primarySmallButton, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.primarySmallButtonText, { color: '#FFFFFF' }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <MenuItem
            icon="lock-closed"
            title={user?.authProvider === 'apple' ? 'Manage Apple Account' : 'Manage Google Account'}
            subtitle={`Password, 2FA, recovery are handled by ${user?.authProvider === 'apple' ? 'Apple' : 'Google'}`}
            onPress={openAccountManagement}
            themeColors={colors}
          />
        </BlurView>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
        <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="notifications"
            title="Notifications"
            showSwitch={true}
            switchValue={notificationsEnabled}
            onSwitchChange={setNotificationsEnabled}
            showArrow={false}
            themeColors={colors}
          />
          <MenuItem
            icon="moon"
            title="Dark Mode"
            showSwitch={true}
            switchValue={isDark}
            onSwitchChange={handleDarkModeToggle}
            showArrow={false}
            themeColors={colors}
          />
          <MenuItem
            icon="sync"
            title="Auto Sync"
            subtitle="Automatically sync your configurations"
            showSwitch={true}
            switchValue={autoSyncEnabled}
            onSwitchChange={setAutoSyncEnabled}
            showArrow={false}
            themeColors={colors}
          />
        </BlurView>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
        <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="help-circle"
            title="Help & Support"
            subtitle="Get help with the app"
            themeColors={colors}
          />
          <MenuItem
            icon="document-text"
            title="Terms of Service"
            themeColors={colors}
          />
          <MenuItem
            icon="shield"
            title="Privacy Policy"
            themeColors={colors}
          />
          <MenuItem
            icon="star"
            title="Rate App"
            themeColors={colors}
          />
        </BlurView>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="information-circle"
            title="App Version"
            subtitle="1.0.0"
            showArrow={false}
            themeColors={colors}
          />
        </BlurView>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <GradientButton
          text="Logout"
          onPress={handleLogout}
          colors={['#FF5A5F', 'rgba(198,40,40,0.88)']}
          glossColors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.0)']}
          iconName="log-out"
          style={styles.logoutButton}
        />
      </View>
        </ScrollView>
        </KeyboardAvoidingView>
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
    height: 240,
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
    top: -10,
    right: -30,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 8,
  },
  authProvider: {
    fontSize: 13,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  editProfileButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  editProfileText: {
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
    marginBottom: 12,
  },
  menuContainer: {
    borderRadius: 16,
    borderWidth: 1,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
  },
  infoBanner: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  editCard: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  editHelper: {
    fontSize: 12,
    lineHeight: 16,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  ghostButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  ghostButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  primarySmallButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primarySmallButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  logoutButton: {
    position: 'relative',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 28,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 18px 44px rgba(229,57,53,0.35)',
    } : {
      shadowColor: '#E53935',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.35,
      shadowRadius: 28,
      elevation: 18,
    }),
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ProfileScreen;
