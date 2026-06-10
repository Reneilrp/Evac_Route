import { useRef, useEffect } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../styles/theme';

/**
 * NetworkStatusBar — Slides in from top when offline.
 */
export default function NetworkStatusBar({ isOffline }) {
  const insets = useSafeAreaInsets();
  const slideAnimRef = useRef(new Animated.Value(-60));

  useEffect(() => {
    Animated.spring(slideAnimRef.current, {
      toValue: isOffline ? 0 : -60,
      useNativeDriver: true,
      speed: 14,
      bounciness: 4,
    }).start();
  }, [isOffline]);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.xs },
        { transform: [{ translateY: slideAnimRef.current }] },
      ]}
      pointerEvents="none"
    >
      <WifiOff size={14} color={colors.dangerText} />
      <Text style={styles.text}>OFFLINE MODE — Using Cached Data</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: colors.dangerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  text: {
    ...typography.small,
    color: colors.dangerText,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
