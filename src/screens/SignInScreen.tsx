import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from '../utils/linearGradientWrapper';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { theme } from '../utils/theme';

interface SignInScreenProps {
  onSignedIn: () => void;
}

const SignInScreen: React.FC<SignInScreenProps> = ({ onSignedIn }) => {
  const [isAppleAvailable, setIsAppleAvailable] = React.useState(false);

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
        colors={[ '#0a0a0a', '#0b1736' ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      <View style={styles.hero}>
        <View style={styles.logoShadow}> 
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
        </View>
        <Text style={styles.appTitle}>BT LED Guitar</Text>
        <Text style={styles.appSubtitle}>Connect • Control • Play</Text>
      </View>

      <BlurView intensity={40} tint="dark" style={styles.card}>
        <Text style={styles.cardTitle}>Welcome</Text>
        <Text style={styles.cardSubtitle}>Sign in to sync profiles across devices</Text>

        {Platform.OS === 'ios' && isAppleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={12}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        ) : (
          <Text style={styles.helper}>Apple Sign-In is not available on this device.</Text>
        )}

        <TouchableOpacity onPress={onSignedIn} style={styles.secondaryCta}>
          <Text style={styles.secondaryCtaText}>Skip for now</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
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
		backgroundColor: theme.dark.card,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: theme.dark.primary,
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
		color: theme.dark.text,
		marginTop: 4,
	},
	appSubtitle: {
		fontSize: 15,
		color: theme.dark.textSecondary,
		marginTop: 6,
	},
	card: {
		backgroundColor: theme.dark.card,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: theme.dark.border,
		padding: 20,
		alignItems: 'center',
	},
	cardTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: theme.dark.text,
		marginBottom: 6,
	},
	cardSubtitle: {
		fontSize: 14,
		color: theme.dark.textSecondary,
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
		color: theme.dark.primary,
		fontWeight: '600',
		fontSize: 15,
	},
	termsText: {
		marginTop: 10,
		fontSize: 12,
		color: theme.dark.textSecondary,
		textAlign: 'center',
	},
	helper: {
		color: theme.dark.textSecondary,
		marginTop: 8,
		textAlign: 'center',
	},
});

export default SignInScreen;


