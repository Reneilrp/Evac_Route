import { StyleSheet } from 'react-native';
import { darkColors, spacing, radii, typography, shadows } from './theme';

export const getStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.label,
    color: colors.textSecondary,
  },
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.base,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  alertIconStrip: {
    width: 4,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  alertMessage: {
    ...typography.label,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  alertTime: {
    ...typography.small,
    color: colors.textMuted,
  },
  alertBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default getStyles(darkColors, true);
