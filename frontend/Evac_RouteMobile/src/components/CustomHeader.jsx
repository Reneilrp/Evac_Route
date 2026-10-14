import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { radii, typography, shadows } from '../styles/theme';

/**
 * CustomHeader — Contextual, edge-to-edge top bar replacing native OS header.
 * Automatically respects translucent status bar with safe-area insets.
 */
export default function CustomHeader({
  title,
  subtitle,
  onBack,
  actions,
  transparent = false,
  elevated = true,
  style,
}) {
  const { top } = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(getStyles);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: top + 10 },
        transparent ? styles.transparentContainer : styles.solidContainer,
        elevated && !transparent && styles.elevated,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[
              styles.backBtn,
              transparent && styles.floatingPillBtn,
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}

        <View style={styles.titleContainer}>
          {typeof title === 'string' ? (
            <Text
              style={[
                styles.title,
                transparent && styles.floatingTitle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : (
            title
          )}
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.actionsContainer}>
          {actions || <View style={styles.spacer} />}
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      width: '100%',
      paddingHorizontal: 16,
      paddingBottom: 12,
      zIndex: 50,
    },
    solidContainer: {
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    transparentContainer: {
      backgroundColor: 'transparent',
      borderBottomWidth: 0,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    elevated: {
      ...shadows.sm,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 40,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    },
    floatingPillBtn: {
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      ...shadows.sm,
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    title: {
      ...typography.heading,
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    floatingTitle: {
      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    subtitle: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
      textAlign: 'center',
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      minWidth: 38,
    },
    spacer: {
      width: 38,
      height: 38,
    },
  });
