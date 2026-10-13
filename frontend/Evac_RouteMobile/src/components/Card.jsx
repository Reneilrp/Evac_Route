import { View, Text, StyleSheet } from 'react-native';
import { spacing, radii, shadows, typography } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

/**
 * Card — Themed card wrapper component.
 * 
 * Props:
 *   title (string)      — Optional card header title
 *   children (ReactNode) — Card content
 *   style (object)       — Additional container styles
 *   noPadding (boolean)  — Remove inner padding
 */
export default function Card({ title, children, style, noPadding = false }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
        !noPadding && styles.padding,
        style,
      ]}
    >
      {title && <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii['3xl'],
    borderWidth: 1,
    ...shadows.md,
  },
  padding: {
    padding: spacing.xl,
  },
  title: {
    ...typography.caption,
    marginBottom: spacing.base,
  },
});

