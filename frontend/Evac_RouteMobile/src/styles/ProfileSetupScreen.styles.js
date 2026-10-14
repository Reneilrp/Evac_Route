import { StyleSheet } from 'react-native';
import { darkColors, spacing, radii, typography } from './theme';

export const getStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 48,
  },
  title: {
    ...typography.hero,
    fontSize: 32,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.subheading,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radii.lg,
    padding: spacing.base,
    ...typography.subheading,
    color: colors.textPrimary,
  },
  counterBox: {
    backgroundColor: colors.card,
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: spacing['2xl'],
    alignItems: 'center',
  },
  counterLabel: {
    ...typography.subheading,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  circleBtn: {
    backgroundColor: colors.surfaceElevated,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  helperText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    ...typography.label,
    lineHeight: 20,
  },
  chipLabel: {
    ...typography.subheading,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chipSection: {
    marginBottom: spacing.xl,
  },
});

export default getStyles(darkColors, true);
