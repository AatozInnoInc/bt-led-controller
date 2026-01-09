/**
 * User Context
 * Manages Apple and Google Sign-In user data
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleCredential } from '../utils/googleAuth';

const USER_STORAGE_KEY = 'user_data';

export type AuthProvider = 'apple' | 'google';

interface UserData {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  authProvider: AuthProvider;
}

type AuthCredential = AppleAuthentication.AppleAuthenticationCredential | GoogleCredential;

interface UserContextType {
  user: UserData | null;
  isSignedIn: boolean;
  needsProfileCompletion: boolean; // True if user is signed in but missing name/email
  isReady: boolean;
  setUser: (
    credential: AuthCredential | null,
    provider: AuthProvider,
    options?: { remember?: boolean }
  ) => Promise<void>;
  clearUser: () => Promise<void>;
  updateName: (firstName: string, lastName: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserData | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load saved user data on mount
    AsyncStorage.getItem(USER_STORAGE_KEY)
      .then((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            setUserState(parsed);
            console.log('Loaded user data from storage:', {
              userId: parsed.userId,
              email: parsed.email || 'null',
              firstName: parsed.firstName || 'null',
              lastName: parsed.lastName || 'null',
              provider: parsed.authProvider || 'apple',
            });
          } catch (error) {
            console.error('Failed to parse user data from storage:', error);
            console.log('Raw data:', data);
          }
        } else {
          console.log('No user data found in storage');
        }
      })
      .catch((error) => {
        console.error('Failed to load user data from storage:', error);
      })
      .finally(() => setIsReady(true));
  }, []);

  const setUser = async (
    credential: AuthCredential | null,
    provider: AuthProvider,
    options?: { remember?: boolean }
  ) => {
    const remember = options?.remember !== false;

    if (!credential) {
      setUserState(null);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      return;
    }

    // Load existing user data to preserve name/email if credential doesn't have them
    // (Apple only provides fullName/email on first sign-in)
    let existingUser: UserData | null = null;
    
    // Extract user ID first (both Apple and Google credentials have 'user' property)
    const userId = (credential as any).user;
    
    try {
      const existing = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        // Only use existing data if it's for the same user
        if (parsed.userId === userId) {
          existingUser = parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load existing user data:', error);
    }
    
    // Handle Apple vs Google credentials
    let hasNewEmail = false;
    let hasNewGivenName = false;
    let hasNewFamilyName = false;
    let email: string | null = null;
    let firstName: string | null = null;
    let lastName: string | null = null;

    if (provider === 'apple') {
      const appleCred = credential as AppleAuthentication.AppleAuthenticationCredential;
      // Apple provides fullName and email only on FIRST sign-in
      hasNewEmail = appleCred.email !== null && 
                    appleCred.email !== undefined && 
                    appleCred.email !== 'null' &&
                    appleCred.email.trim() !== '';
      hasNewGivenName = appleCred.fullName?.givenName !== null && 
                        appleCred.fullName?.givenName !== undefined && 
                        appleCred.fullName.givenName.trim() !== '' &&
                        appleCred.fullName.givenName !== 'null';
      hasNewFamilyName = appleCred.fullName?.familyName !== null &&
                         appleCred.fullName?.familyName !== undefined && 
                         appleCred.fullName.familyName.trim() !== '' &&
                         appleCred.fullName.familyName !== 'null';
      
      email = hasNewEmail ? appleCred.email : (existingUser?.email ?? null);
      firstName = hasNewGivenName ? appleCred.fullName!.givenName : (existingUser?.firstName ?? null);
      lastName = hasNewFamilyName ? appleCred.fullName!.familyName : (existingUser?.lastName ?? null);
    } else if (provider === 'google') {
      const googleCred = credential as GoogleCredential;
      // Google typically provides email and name on every sign-in
      hasNewEmail = googleCred.email !== null && 
                    googleCred.email !== undefined && 
                    googleCred.email !== 'null' &&
                    googleCred.email.trim() !== '';
      hasNewGivenName = googleCred.fullName?.givenName !== null && 
                        googleCred.fullName?.givenName !== undefined && 
                        googleCred.fullName.givenName.trim() !== '' &&
                        googleCred.fullName.givenName !== 'null';
      hasNewFamilyName = googleCred.fullName?.familyName !== null &&
                         googleCred.fullName?.familyName !== undefined && 
                         googleCred.fullName.familyName.trim() !== '' &&
                         googleCred.fullName.familyName !== 'null';
      
      email = hasNewEmail ? googleCred.email : (existingUser?.email ?? null);
      firstName = hasNewGivenName ? googleCred.fullName!.givenName : (existingUser?.firstName ?? null);
      lastName = hasNewFamilyName ? googleCred.fullName!.familyName : (existingUser?.lastName ?? null);
    }
    
    const userData: UserData = {
      userId,
      email,
      firstName,
      lastName,
      authProvider: provider,
    };

    console.log('Setting user data:', {
      userId: userData.userId,
      provider: userData.authProvider,
      hasNewEmail,
      hasNewGivenName,
      hasNewFamilyName,
      storedEmail: userData.email === null ? 'null' : userData.email,
      storedFirstName: userData.firstName === null ? 'null' : userData.firstName,
      storedLastName: userData.lastName === null ? 'null' : userData.lastName,
    });

    setUserState(userData);
    if (remember) {
      try {
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        console.log('User data saved to storage successfully');
        
        // Verify the save worked by reading it back (especially important for web)
        const verify = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (verify) {
          console.log('User data verified in storage');
        } else {
          console.warn('User data save verification failed - data not found after save');
        }
      } catch (error) {
        console.error('Failed to save user data to storage:', error);
        // Still set the user state even if storage fails (for session-only use)
        console.warn('User data will only persist for this session');
      }
    } else {
      try {
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
      } catch (error) {
        console.error('Failed to remove user data from storage:', error);
      }
    }
  };

  const updateName = async (firstName: string, lastName: string) => {
    if (!user) return;

    const updatedUser: UserData = {
      ...user,
      firstName,
      lastName,
    };

    setUserState(updatedUser);
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      console.log('User name updated in storage');
    } catch (error) {
      console.error('Failed to save updated user name to storage:', error);
    }
  };

  const clearUser = async () => {
    setUserState(null);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  };

  // Check if user needs to complete their profile (signed in but missing name/email)
  const needsProfileCompletion = !!user && (!user.firstName || !user.lastName);

  return (
    <UserContext.Provider
      value={{
        user,
        isSignedIn: !!user,
        needsProfileCompletion,
        isReady,
        setUser,
        clearUser,
        updateName,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

