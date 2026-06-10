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
    container: { backgroundColor: colors.primaryDark, ...shadows.md, shadowColor: colors.primaryDark },
    text: { color: colors.white },
    spinnerColor: colors.white,
  },
  danger: {
    container: { backgroundColor: colors.danger, ...shadows.md, shadowColor: colors.danger },
    text: { color: colors.white },
    spinnerColor: colors.white,
  },
  success: {
    container: { backgroundColor: colors.success, ...shadows.md, shadowColor: colors.success },
    text: { color: colors.white },
    spinnerColor: colors.white,
  },
  outline: {
    container: { backgroundColor: colors.transparent, borderWidth: 2, borderColor: colors.border },
    text: { color: colors.textSecondary },
    spinnerColor: colors.textSecondary,
  },
};

const SIZE_STYLES = {
  large: {
    container: { paddingVertical: 18, borderRadius: radii.xl },
    text: { ...typography.buttonLarge },
  },
  medium: {
    container: { paddingVertical: 14, borderRadius: radii.lg },
    text: { ...typography.buttonMedium },
  },
  small: {
    container: { paddingVertical: 10, borderRadius: radii.md },
    text: { ...typography.label },
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
