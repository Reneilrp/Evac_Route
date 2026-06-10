import { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, radii } from '../styles/theme';

/**
 * SkeletonLoader — Animated shimmer placeholder for loading states.
 */
export default function SkeletonLoader({
  width = '100%',
  height = 16,
  borderRadius = radii.md,
  style,
}) {
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
        { width, height, borderRadius, opacity: shimmerAnimRef.current },
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
  skeleton: { backgroundColor: colors.surfaceElevated },
});
