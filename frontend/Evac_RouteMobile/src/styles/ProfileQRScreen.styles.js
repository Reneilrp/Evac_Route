import { StyleSheet } from 'react-native';
import { colors, spacing, radii, typography, shadows } from './theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ─── Safe Mode Home Layout ───
  safeHomeScroll: {
    flex: 1,
  },
  safeHomeContent: {
    padding: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
    shadowColor: colors.primaryDark,
  },
  profileAvatarText: {
    ...typography.title,
    color: colors.white,
  },
  profileName: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  profileBarangay: {
    ...typography.label,
    color: colors.textSecondary,
  },
  profileTimestamp: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // ─── Quick Links Grid ───
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  quickLinkCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkLabel: {
    ...typography.small,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ─── Small QR Card ───
  qrCardSmall: {
    backgroundColor: colors.surface,
    borderRadius: radii['3xl'],
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  qrCardTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.base,
  },
  qrWrapper: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
  },
  qrHashText: {
    marginTop: spacing.md,
    ...typography.mono,
    color: colors.textMuted,
  },
  qrInfoBox: {
    alignItems: 'center',
    marginTop: spacing.base,
  },
  qrInfoText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headcountBadge: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    marginTop: spacing.sm,
  },
  headcountText: {
    color: colors.white,
    fontWeight: '900',
    ...typography.label,
  },
  qrInstruction: {
    textAlign: 'center',
    color: colors.textMuted,
    ...typography.label,
    lineHeight: 22,
    marginTop: spacing.xl,
  },

  // ─── Danger Mode Layout ───
  dangerActionArea: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  evacuateBtn: {
    backgroundColor: colors.danger,
    width: '100%',
    paddingVertical: spacing['3xl'],
    borderRadius: radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.dangerLight,
    ...shadows.lg,
    shadowColor: colors.danger,
  },
  evacuateText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },

  // ─── QR Card (Danger Mode — Full Size) ───
  qrCardFull: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['4xl'],
    borderTopRightRadius: radii['4xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
    marginTop: spacing.md,
  },
});

export default styles;
