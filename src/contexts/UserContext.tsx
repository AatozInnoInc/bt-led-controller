/**
 * User Context
 * Manages Apple Sign-In user data
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';

const USER_STORAGE_KEY = 'apple_user_data';

interface UserData {
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface UserContextType {
  user: UserData | null;
  isSignedIn: boolean;
  needsProfileCompletion: boolean; // True if user is signed in but missing name/email
  isReady: boolean;
  setUser: (
    credential: AppleAuthentication.AppleAuthenticationCredential | null,
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
            });
          } catch (error) {
            console.error('Failed to load user data:', error);
          }
        } else {
          console.log('No user data found in storage');
        }
      })
      .finally(() => setIsReady(true));
  }, []);

  const setUser = async (
    credential: AppleAuthentication.AppleAuthenticationCredential | null,
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
    try {
      const existing = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        // Only use existing data if it's for the same user
        if (parsed.userId === credential.user) {
          existingUser = parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load existing user data:', error);
    }

    // Apple provides fullName and email only on FIRST sign-in
    // On subsequent sign-ins, these will be null/undefined
    // IMPORTANT: credential.fullName can be an object with null/empty string values
    // We need to check if the actual values are meaningful, not just if the object exists
    const hasNewEmail = credential.email !== null && 
                        credential.email !== undefined && 
                        credential.email !== 'null' &&
                        credential.email.trim() !== '';
    const hasNewGivenName = credential.fullName?.givenName !== null && 
                            credential.fullName?.givenName !== undefined && 
                            credential.fullName.givenName.trim() !== '' &&
                            credential.fullName.givenName !== 'null';
    const hasNewFamilyName = credential.fullName?.familyName !== null && 
                             credential.fullName?.familyName !== undefined && 
                             credential.fullName.familyName.trim() !== '' &&
                             credential.fullName.familyName !== 'null';
    const isFirstSignIn = !existingUser; // No existing data means this is likely first sign-in
    
    const userData: UserData = {
      userId: credential.user,
      // Only use credential email if it's actually provided and not empty
      // Otherwise, preserve existing email, or null if first sign-in
      email: hasNewEmail ? credential.email : (existingUser?.email ?? null),
      // Only use credential name if it's actually provided and not empty/null string
      // Otherwise, preserve existing name, or null if first sign-in
      firstName: hasNewGivenName ? credential.fullName!.givenName : (existingUser?.firstName ?? null),
      lastName: hasNewFamilyName ? credential.fullName!.familyName : (existingUser?.lastName ?? null),
    };

    console.log('Setting user data:', {
      userId: userData.userId,
      isFirstSignIn,
      hasNewEmail,
      hasNewGivenName,
      hasNewFamilyName,
      credentialEmail: credential.email === null ? 'null' : (credential.email === undefined ? 'undefined' : credential.email),
      credentialGivenName: credential.fullName?.givenName === null ? 'null' : (credential.fullName?.givenName === undefined ? 'undefined' : credential.fullName.givenName),
      credentialFamilyName: credential.fullName?.familyName === null ? 'null' : (credential.fullName?.familyName === undefined ? 'undefined' : credential.fullName.familyName),
      existingFirstName: existingUser?.firstName || 'none',
      existingLastName: existingUser?.lastName || 'none',
      existingEmail: existingUser?.email || 'none',
      storedEmail: userData.email === null ? 'null' : userData.email,
      storedFirstName: userData.firstName === null ? 'null' : userData.firstName,
      storedLastName: userData.lastName === null ? 'null' : userData.lastName,
    });

    setUserState(userData);
    if (remember) {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    } else {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
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
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  };

  const clearUser = async () => {
    setUserState(null);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  };

  // Check if user needs to complete their profile (signed in but missing name/email)
  const needsProfileCompletion = !!user && (!user.firstName || !user.lastName || !user.email);

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

