/**
 * Google Sign-In Utility
 * Implements Google Sign-In for Android using Expo AuthSession
 */

import { Platform } from 'react-native';

// Conditional imports for Expo modules
let AuthSession: any;
let WebBrowser: any;

try {
  AuthSession = require('expo-auth-session');
  WebBrowser = require('expo-web-browser');
  
  // Complete the auth session (required for web)
  if (Platform.OS === 'web' && WebBrowser?.maybeCompleteAuthSession) {
    WebBrowser.maybeCompleteAuthSession();
  }
} catch (error) {
  console.warn('expo-auth-session or expo-web-browser not available:', error);
}

// Google OAuth configuration
// These should be set in app.json or environment variables
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

// Helper to get redirect URI (only if AuthSession is available)
const getGoogleRedirectUri = () => {
  if (AuthSession?.makeRedirectUri) {
    return AuthSession.makeRedirectUri({
      scheme: 'com.aatozinnovations.myledguitar',
      path: 'auth',
    });
  }
  return '';
};

const GOOGLE_REDIRECT_URI = getGoogleRedirectUri();

export interface GoogleCredential {
  user: string; // User ID
  email: string | null;
  fullName: {
    givenName: string | null;
    familyName: string | null;
  } | null;
}

/**
 * Sign in with Google
 * Returns credential similar to Apple Sign-In format for consistency
 */
export async function signInWithGoogle(): Promise<GoogleCredential> {
  if (Platform.OS !== 'android' && Platform.OS !== 'web') {
    throw new Error('Google Sign-In is only available on Android and web');
  }

  if (!AuthSession || !WebBrowser) {
    throw new Error('expo-auth-session and expo-web-browser are required for Google Sign-In. Please install them: npx expo install expo-auth-session expo-web-browser');
  }

  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your environment.');
  }

  try {
    // Request configuration
    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri: GOOGLE_REDIRECT_URI,
      usePKCE: true,
    });

    // Discovery document URL for Google
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    // Perform authentication
    const result = await request.promptAsync(discovery, {
      useProxy: true,
      showInRecents: true,
    });

    if (result.type === 'success') {
      // Decode the ID token to get user info
      const idToken = result.params.id_token;
      
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      // Decode JWT (simple base64 decode, no verification for client-side)
      // In production, you should verify the token on a backend
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid ID token format');
      }

      // Base64 decode for React Native
      // Use a simple base64 decoder that works across platforms
      let base64Payload = parts[1];
      // Add padding if needed
      while (base64Payload.length % 4) {
        base64Payload += '=';
      }
      
      // Decode base64 - atob is available in React Native via global
      let decodedPayload: string;
      if (typeof atob !== 'undefined') {
        decodedPayload = atob(base64Payload);
      } else if (Platform.OS === 'web') {
        // For web, use global atob
        const globalAtob = (global as any).atob || (typeof window !== 'undefined' ? (window as any).atob : null);
        if (globalAtob) {
          decodedPayload = globalAtob(base64Payload);
        } else {
          throw new Error('Base64 decoding not available on web platform.');
        }
      } else {
        // For React Native, atob should be available globally
        // If not, we'd need a base64 library
        throw new Error('Base64 decoding not available. Please ensure atob is available in React Native environment.');
      }
      
      const payload = JSON.parse(decodedPayload);

      // Extract user information
      const credential: GoogleCredential = {
        user: payload.sub || payload.email || '', // Use 'sub' (subject) as user ID
        email: payload.email || null,
        fullName: {
          givenName: payload.given_name || null,
          familyName: payload.family_name || null,
        },
      };

      return credential;
    } else if (result.type === 'cancel') {
      throw new Error('Google Sign-In was cancelled');
    } else {
      throw new Error(`Google Sign-In failed: ${result.type}`);
    }
  } catch (error) {
    console.error('Google Sign-In error:', error);
    throw error;
  }
}

/**
 * Check if Google Sign-In is available
 */
export function isGoogleSignInAvailable(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'web';
}

