import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../utils/linearGradientWrapper';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

interface SignInScreenProps {
  onSignedIn: () => void;
}

const SignInScreen: React.FC<SignInScreenProps> = ({ onSignedIn }) => {
  const { colors, isDark } = useTheme();
  const { setUser } = useUser();
  const [isAppleAvailable, setIsAppleAvailable] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);

  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync()
        .then(setIsAppleAvailable)
        .catch(() => setIsAppleAvailable(false));
    }
  }, []);
  const handleAppleSignIn = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      console.log('Apple Sign-In credential received:', {
        userId: credential.user,
        email: credential.email === null ? 'null' : (credential.email === undefined ? 'undefined' : credential.email),
        emailType: credential.email === null ? 'null' : (credential.email === undefined ? 'undefined' : 'string'),
        fullName: credential.fullName === null ? 'null' : (credential.fullName === undefined ? 'undefined' : {
          givenName: credential.fullName.givenName === null ? 'null' : (credential.fullName.givenName || 'empty string'),
          familyName: credential.fullName.familyName === null ? 'null' : (credential.fullName.familyName || 'empty string'),
        }),
        fullNameType: credential.fullName === null ? 'null' : (credential.fullName === undefined ? 'undefined' : 'object'),
      });
      
      // Save user data to context
      await setUser(credential, { remember: rememberMe });
      // You could verify credential.identityToken on a server here.
      onSignedIn();
    } catch (error: any) {
      if (error && error.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      console.warn('Apple Sign-In failed', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      <View style={styles.hero}>
        <View style={[styles.logoShadow, { backgroundColor: colors.card }]}> 
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
        </View>
        <Text style={[styles.appTitle, { color: colors.text }]}>BT LED Guitar</Text>
        <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>Connect • Control • Play</Text>
      </View>

      <BlurView intensity={40} tint={isDark ? "dark" : "light"} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Welcome</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Sign in to sync profiles across devices</Text>

        {Platform.OS === 'ios' && isAppleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={12}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        ) : (
          <Text style={[styles.helper, { color: colors.textSecondary }]}>Apple Sign-In is not available on this device.</Text>
        )}

        <View style={styles.rememberRow}>
          <Text style={[styles.rememberLabel, { color: colors.text }]}>Keep me signed in</Text>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            thumbColor={rememberMe ? colors.primary : isDark ? '#333' : '#ccc'}
            trackColor={{ true: colors.primary, false: isDark ? '#555' : '#ddd' }}
          />
        </View>

        <TouchableOpacity onPress={async () => {
          // "Skip for now" - don't set user data, just proceed
          console.log('User skipped sign-in');
          onSignedIn();
        }} style={styles.secondaryCta}>
          <Text style={[styles.secondaryCtaText, { color: colors.primary }]}>Skip for now</Text>
        </TouchableOpacity>

        <Text style={[styles.termsText, { color: colors.textSecondary }]}>
          By continuing you agree to our Terms and Privacy Policy
        </Text>
      </BlurView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 24,
		paddingBottom: 24,
	},
	hero: {
		alignItems: 'center',
		marginBottom: 24,
	},
	logoShadow: {
		width: 96,
		height: 96,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 16,
		elevation: 10,
		marginBottom: 16,
	},
	logo: {
		width: 80,
		height: 80,
		borderRadius: 20,
	},
	appTitle: {
		fontSize: 28,
		fontWeight: '700',
		marginTop: 4,
	},
	appSubtitle: {
		fontSize: 15,
		marginTop: 6,
	},
	card: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 20,
		alignItems: 'center',
	},
	cardTitle: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 6,
	},
	cardSubtitle: {
		fontSize: 14,
		marginBottom: 16,
		textAlign: 'center',
	},
	appleButton: {
		width: '100%',
		height: 50,
		marginTop: 4,
	},
	secondaryCta: {
		marginTop: 14,
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	secondaryCtaText: {
		fontWeight: '600',
		fontSize: 15,
	},
	termsText: {
		marginTop: 10,
		fontSize: 12,
		textAlign: 'center',
	},
	helper: {
		marginTop: 8,
		textAlign: 'center',
	},
  rememberRow: {
    marginTop: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SignInScreen;


