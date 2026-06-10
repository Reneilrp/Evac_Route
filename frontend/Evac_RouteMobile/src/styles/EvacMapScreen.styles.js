import { StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, radii, typography, shadows } from './theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  shelterPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  innerPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },

  // ─── Top Overlay (Status Box) ───
  overlay: {
    position: 'absolute',
    top: 50,
    left: spacing.lg,
    right: spacing.lg,
  },
  statusBox: {
    backgroundColor: colors.overlayMedium,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.lg,
  },
  offlineBadge: {
    backgroundColor: colors.dangerBg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  offlineText: {
    color: colors.dangerText,
    ...typography.small,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusText: {
    ...typography.label,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  // ─── Mode Selector ───
  modeSelectorRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    justifyContent: 'space-between',
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  modeButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  modeButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  modeButtonTextActive: {
    color: colors.white,
  },

  // ─── Draggable Bottom Sheet ───
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['4xl'],
    borderTopRightRadius: radii['4xl'],
    ...shadows.xl,
    minHeight: 120,
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  bottomSheetHandle: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  bottomSheetBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
  },
  bottomSheetContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  routingInfo: {
    marginBottom: spacing.lg,
  },
  destinationLabel: {
    ...typography.caption,
    color: colors.primary,
  },
  destinationName: {
    ...typography.title,
    color: colors.white,
    marginVertical: spacing.xs,
  },
  etaText: {
    ...typography.label,
    color: colors.successLight,
    fontWeight: 'bold',
  },

  // ─── Route Warnings (Pill Badges) ───
  warningsContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  warningPillText: {
    ...typography.small,
    color: colors.warningText,
    fontWeight: 'bold',
  },

  // ─── No Shelter Warning ───
  warningBox: {
    flexDirection: 'row',
    backgroundColor: colors.dangerBg,
    padding: spacing.base,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    marginLeft: spacing.md,
    color: colors.dangerText,
    ...typography.label,
    fontWeight: 'bold',
  },

  // ─── Critical Overlay ───
  criticalOverlay: {
    position: 'absolute',
    top: 40,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.dangerBg,
    padding: spacing.base,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.danger,
    zIndex: 1000,
    ...shadows.lg,
  },
  criticalTitle: {
    color: colors.white,
    ...typography.label,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  emergencyButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    ...typography.bodyBold,
    marginLeft: spacing.sm,
  },

  // ─── Panic Flash Overlay ───
  panicFlash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  panicText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  panicSubText: {
    color: 'rgba(255,255,255,0.8)',
    ...typography.heading,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default styles;
