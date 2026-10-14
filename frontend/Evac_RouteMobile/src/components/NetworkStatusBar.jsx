import { useRef, useEffect } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, radii } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

/**
 * NetworkStatusBar — Floating pill banner sliding down below status bar when offline.
 * Sits safely below the phone's status bar / camera cutout.
 */
export default function NetworkStatusBar({ isOffline }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnimRef = useRef(new Animated.Value(-120));

  useEffect(() => {
    Animated.spring(slideAnimRef.current, {
      toValue: isOffline ? 0 : -120,
      useNativeDriver: true,
      speed: 14,
      bounciness: 4,
    }).start();
  }, [isOffline]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 6,
          backgroundColor: colors.danger,
          transform: [{ translateY: slideAnimRef.current }],
        },
      ]}
      pointerEvents="none"
    >
      <WifiOff size={13} color="#ffffff" />
      <Text style={styles.text}>OFFLINE MODE — Using Cached Data</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: radii.full,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
