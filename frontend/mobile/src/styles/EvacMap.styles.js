import { StyleSheet, Dimensions } from 'react-native';
import { darkColors, spacing, radii, typography, shadows } from './theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const getStyles = (colors, isDarkMode) => StyleSheet.create({
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
    borderTopWidth: 1,
    borderColor: colors.border,
    ...shadows.xl,
    minHeight: 120,
    maxHeight: SCREEN_HEIGHT * 0.75,
    zIndex: 40,
    elevation: 20,
  },
  bottomSheetHandle: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    minHeight: 38,
  },
  bottomSheetBar: {
    width: 44,
    height: 4.5,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    marginBottom: 4,
  },
  handleIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  handleHintText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  etaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.3)',
  },
  etaBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.successLight,
  },
  sheetActionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  externalNavBtn: {
    borderWidth: 1,
    borderRadius: radii.lg,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.textPrimary,
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

  // ─── Mode Icon ───
  modeIcon: {
    fontSize: 16,
    marginBottom: 2,
  },

  // ─── Map Style Switcher (floating, bottom-left) ───
  mapStyleSwitcher: {
    position: 'absolute',
    bottom: 200,
    left: 16,
    flexDirection: 'column',
    gap: 6,
    zIndex: 10,
  },
  mapStyleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)',
    ...shadows.md,
  },
  mapStyleBtnActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryGlow,
  },
  mapStyleBtnText: {
    fontSize: 18,
  },

  // ─── Occupancy Bar ───
  occupancyBarTrack: {
    height: 5,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    marginTop: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: 5,
    borderRadius: 3,
  },
  occupancyText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
});

export default getStyles(darkColors, true);
