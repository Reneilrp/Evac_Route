import { StyleSheet } from 'react-native';
import { colors, spacing, radii, typography, shadows } from './theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.success,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: spacing.xl,
    ...shadows.md,
    shadowColor: colors.black,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  subtitle: {
    ...typography.title,
    color: colors.successText,
    marginBottom: spacing['3xl'],
  },
  card: {
    backgroundColor: colors.white,
    width: '100%',
    borderRadius: radii['3xl'],
    padding: spacing.xl,
    ...shadows.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    backgroundColor: colors.successText,
    padding: spacing.md,
    borderRadius: 30,
    marginRight: spacing.base,
  },
  cardTitle: {
    ...typography.heading,
    fontWeight: '900',
    color: colors.textInverse,
  },
  cardSubtitle: {
    ...typography.label,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  list: {
    marginBottom: spacing.xl,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  itemLabel: {
    ...typography.subheading,
    color: '#475569',
    fontWeight: 'bold',
  },
  itemValue: {
    ...typography.subheading,
    fontWeight: '900',
    color: colors.textInverse,
  },
  instructionBox: {
    backgroundColor: '#f0fdf4',
    padding: spacing.base,
    borderRadius: radii.lg,
  },
  instructionText: {
    color: colors.success,
    fontWeight: 'bold',
    textAlign: 'center',
    ...typography.label,
  },
  // Skeleton placeholders for loading
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  backBtnContainer: {
    marginTop: spacing['3xl'],
  },
});

export default styles;
