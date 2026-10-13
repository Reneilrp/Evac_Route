import { useRef, useCallback } from 'react';
import { TouchableOpacity, Text, Animated, ActivityIndicator, Vibration, StyleSheet } from 'react-native';
import { radii, spacing } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

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
  const { colors, isDarkMode } = useTheme();
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

  const variantStyles = getVariantStyles(variant, colors, isDarkMode);
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

const getVariantStyles = (variant, colors, isDarkMode) => {
  const stylesMap = {
    primary: {
      container: { 
        backgroundColor: colors.primaryDark || '#0284c7', 
        borderWidth: 1, 
        borderColor: colors.primaryGlow || 'rgba(56, 189, 248, 0.4)',
        shadowColor: colors.primaryDark || '#0284c7',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
      },
      text: { color: '#ffffff', fontWeight: '900', letterSpacing: 0.8 },
      spinnerColor: '#ffffff',
    },
    danger: {
      container: { 
        backgroundColor: colors.danger || '#dc2626', 
        borderWidth: 1, 
        borderColor: colors.dangerLight || 'rgba(248, 113, 113, 0.4)',
        shadowColor: colors.danger || '#dc2626',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
      },
      text: { color: '#ffffff', fontWeight: '900', letterSpacing: 0.8 },
      spinnerColor: '#ffffff',
    },
    success: {
      container: { 
        backgroundColor: colors.success || '#16a34a', 
        borderWidth: 1, 
        borderColor: colors.successLight || 'rgba(74, 222, 128, 0.4)',
        shadowColor: colors.success || '#16a34a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
      },
      text: { color: '#ffffff', fontWeight: '900', letterSpacing: 0.8 },
      spinnerColor: '#ffffff',
    },
    outline: {
      container: { 
        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : colors.surface, 
        borderWidth: 1.5, 
        borderColor: colors.border,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      text: { color: colors.textPrimary, fontWeight: '800', letterSpacing: 0.5 },
      spinnerColor: colors.textPrimary,
    },
  };
  return stylesMap[variant] || stylesMap.primary;
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
