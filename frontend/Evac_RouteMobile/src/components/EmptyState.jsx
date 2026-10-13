import { View, Text, StyleSheet } from 'react-native';
import { QrCode } from 'lucide-react-native';
import { spacing, typography } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

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
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
        {icon || <QrCode size={48} color={colors.textMuted} />}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
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
    padding: spacing.lg,
    borderRadius: 9999,
    marginBottom: spacing.base,
    opacity: 0.85,
  },
  title: {
    ...typography.bodyBold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.small,
    textAlign: 'center',
    lineHeight: 18,
  },
});

