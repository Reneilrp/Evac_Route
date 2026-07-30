import { useRef, useCallback } from 'react';
import { TouchableOpacity, Text, Animated, ActivityIndicator, Vibration, StyleSheet } from 'react-native';
import { colors, radii, shadows, typography, spacing } from '../styles/theme';

/**
 * PrimaryButton — Animated pressable button with haptic feedback.
 */
export default function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  size = 'large',
  loading = false,
  disabled = false,
  icon = null,
  style,
  textStyle,
  haptic = true,
}) {
  const scaleAnimRef = useRef(new Animated.Value(1));

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnimRef.current, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnimRef.current, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, []);

  const handlePress = useCallback(() => {
    if (haptic) {
      Vibration.vibrate(10);
    }
    onPress?.();
  }, [haptic, onPress]);

  const variantStyles = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const sizeStyles = SIZE_STYLES[size] || SIZE_STYLES.large;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnimRef.current }] }}>
      <TouchableOpacity
        style={[
          styles.base,
          variantStyles.container,
          sizeStyles.container,
          disabled && styles.disabled,
          style,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator size="small" color={variantStyles.spinnerColor} />
        ) : (
          <>
            {icon && icon}
            <Text
              style={[
                styles.text,
                variantStyles.text,
                sizeStyles.text,
                icon && { marginLeft: spacing.sm },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const VARIANT_STYLES = {
  primary: {
    container: { 
      backgroundColor: '#0284c7', 
      borderWidth: 1, 
      borderColor: 'rgba(56, 189, 248, 0.4)',
      shadowColor: '#0284c7',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 8,
    },
    text: { color: '#ffffff', fontWeight: '900', letterSpacing: 0.8 },
    spinnerColor: '#ffffff',
  },
  danger: {
    container: { 
      backgroundColor: '#dc2626', 
      borderWidth: 1, 
      borderColor: 'rgba(248, 113, 113, 0.4)',
      shadowColor: '#dc2626',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 8,
    },
    text: { color: '#ffffff', fontWeight: '900', letterSpacing: 0.8 },
    spinnerColor: '#ffffff',
  },
  success: {
    container: { 
      backgroundColor: '#16a34a', 
      borderWidth: 1, 
      borderColor: 'rgba(74, 222, 128, 0.4)',
      shadowColor: '#16a34a',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 8,
    },
    text: { color: '#ffffff', fontWeight: '900', letterSpacing: 0.8 },
    spinnerColor: '#ffffff',
  },
  outline: {
    container: { 
      backgroundColor: 'rgba(15, 23, 42, 0.6)', 
      borderWidth: 1.5, 
      borderColor: 'rgba(255, 255, 255, 0.2)',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    text: { color: '#e2e8f0', fontWeight: '800', letterSpacing: 0.5 },
    spinnerColor: '#e2e8f0',
  },
};

const SIZE_STYLES = {
  large: {
    container: { paddingVertical: 16, borderRadius: radii.xl },
    text: { fontSize: 15, fontWeight: '900' },
  },
  medium: {
    container: { paddingVertical: 12, borderRadius: radii.lg },
    text: { fontSize: 13, fontWeight: '800' },
  },
  small: {
    container: { paddingVertical: 8, borderRadius: radii.md },
    text: { fontSize: 11, fontWeight: '700' },
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  text: { textAlign: 'center' },
  disabled: { opacity: 0.5 },
});
