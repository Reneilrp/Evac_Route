import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from '../styles/theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@app_theme').then((savedTheme) => {
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
      setIsReady(true);
    }).catch(() => {
      setIsReady(true);
    });
  }, []);

  const toggleTheme = async () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    try {
      await AsyncStorage.setItem('@app_theme', nextMode ? 'dark' : 'light');
    } catch (err) {
      console.warn('Failed to save theme preference:', err);
    }
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors, isReady }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * useThemedStyles — Automatically re-creates styles when theme/colors change.
 * @param {(colors: object, isDarkMode: boolean) => object} stylesFactory
 */
export function useThemedStyles(stylesFactory) {
  const { colors, isDarkMode } = useTheme();
  return useMemo(() => stylesFactory(colors, isDarkMode), [colors, isDarkMode]);
}

