import { View, Text, StyleSheet } from 'react-native';
import { QrCode } from 'lucide-react-native';
import { colors, spacing, typography } from '../styles/theme';

/**
 * EmptyState — Styled placeholder for when no data is available.
 * 
 * Props:
 *   icon (ReactNode)    — Custom icon (default: QrCode icon)
 *   title (string)      — Main message
 *   subtitle (string)   — Secondary message
 *   style (object)      — Additional container styles
 */
export default function EmptyState({
  icon = null,
  title = 'No Data Available',
  subtitle = '',
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>
        {icon || <QrCode size={48} color={colors.textMuted} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
    borderRadius: 9999,
    marginBottom: spacing.base,
    opacity: 0.7,
  },
  title: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
