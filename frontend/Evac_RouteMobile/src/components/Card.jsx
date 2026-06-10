import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows, typography } from '../styles/theme';

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
  return (
    <View style={[styles.card, !noPadding && styles.padding, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii['3xl'],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  padding: {
    padding: spacing.xl,
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.base,
  },
});
