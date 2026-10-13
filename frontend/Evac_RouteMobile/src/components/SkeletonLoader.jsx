import { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { radii } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

/**
 * SkeletonLoader — Animated shimmer placeholder for loading states.
 */
export default function SkeletonLoader({
  width = '100%',
  height = 16,
  borderRadius = radii.md,
  style,
}) {
  const { colors } = useTheme();
  const shimmerAnimRef = useRef(new Animated.Value(0.3));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimRef.current, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnimRef.current, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          backgroundColor: colors.surfaceElevated,
          width,
          height,
          borderRadius,
          opacity: shimmerAnimRef.current,
        },
        style,
      ]}
    />
  );
}

/**
 * SkeletonGroup — Multiple skeleton lines for text-like loading states.
 */
export function SkeletonGroup({ lines = 3, gap = 10 }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={14}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
});

