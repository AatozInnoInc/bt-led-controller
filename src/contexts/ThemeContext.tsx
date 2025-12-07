/**
 * Theme Context
 * Manages dark mode state and provides theme colors
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { theme } from '../utils/theme';

const THEME_STORAGE_KEY = 'app_theme_preference';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  success: string;
  warning: string;
  error: string;
  gradientStart: string;
  gradientEnd: string;
}

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme() ?? "light";
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    // Load saved theme preference
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        setThemeModeState(saved as ThemeMode);
      }
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  const isDark = useMemo(() => {
    return themeMode === 'system' 
      ? systemColorScheme === 'dark' 
      : themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const colors = useMemo(() => {
    return isDark ? theme.dark : theme.light;
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

