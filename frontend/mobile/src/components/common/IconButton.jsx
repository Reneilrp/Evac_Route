import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { triggerCasualHaptic } from '../../utils/haptics';

/**
 * Universal Mobile Icon Button (HUD Controls, FABs, Header Actions)
 */
export default function IconButton({
  icon: Icon,
  size = 40,
  iconSize = 20,
  variant = 'default', // 'default' | 'primary' | 'danger' | 'ghost' | 'glass'
  badge = 0,
  onPress,
  disabled = false,
  style,
  active = false,
  ...props
}) {
  const { colors, isDarkMode } = useTheme();

  const handlePress = (e) => {
    triggerCasualHaptic();
    onPress?.(e);
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
          borderColor: colors.danger,
        };
      case 'glass':
        return {
          backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.88)' : 'rgba(255, 255, 255, 0.92)',
          borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.7)' : 'rgba(226, 232, 240, 0.8)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 4,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      case 'default':
      default:
        return {
          backgroundColor: active ? (colors.primaryGlow || '#e0f2fe') : (isDarkMode ? (colors.cardDark || '#1e293b') : (colors.cardLight || '#ffffff')),
          borderColor: active ? colors.primary : (colors.border || '#e2e8f0'),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 2,
        };
    }
  };

  const getIconColor = () => {
    if (variant === 'primary' || variant === 'danger') return '#ffffff';
    if (active) return colors.primary;
    return colors.text || '#0f172a';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={handlePress}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: disabled ? 0.45 : 1,
        },
        getVariantStyle(),
        style,
      ]}
      {...props}
    >
      {Icon && <Icon size={iconSize} color={getIconColor()} />}
      {badge > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.danger || '#ef4444' }]}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
});
