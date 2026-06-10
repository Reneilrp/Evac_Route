import { StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from './theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing['3xl'],
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
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.base,
    ...typography.subheading,
    color: colors.textPrimary,
  },
  counterBox: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.border,
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

export default styles;
