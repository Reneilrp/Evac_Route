/**
 * Evac_Route Design System — Centralized Theme Tokens
 * 
 * All colors, spacing, radii, typography, and shadows are defined here.
 * Import from this file instead of hardcoding values in style files.
 */

export const darkColors = {
  // Backgrounds
  background:       '#0f172a',
  surface:          '#1e293b',
  surfaceElevated:  '#334155',
  
  // Borders
  border:           '#334155',
  borderLight:      '#475569',

  // Text
  textPrimary:      '#f8fafc',
  textSecondary:    '#94a3b8',
  textMuted:        '#64748b',
  textInverse:      '#0f172a',

  // Brand / Primary
  primary:          '#3b82f6',
  primaryDark:      '#2563eb',
  primaryDarker:    '#1d4ed8',
  primaryGlow:      'rgba(59, 130, 246, 0.3)',

  // Semantic: Danger
  danger:           '#dc2626',
  dangerLight:      '#f87171',
  dangerBg:         '#7f1d1d',
  dangerText:       '#fecaca',
  dangerGlow:       'rgba(220, 38, 38, 0.6)',

  // Semantic: Success
  success:          '#16a34a',
  successLight:     '#22c55e',
  successBg:        '#166534',
  successText:      '#dcfce7',

  // Semantic: Warning
  warning:          '#f59e0b',
  warningLight:     '#fbbf24',
  warningBg:        '#78350f',
  warningText:      '#fef3c7',

  // Overlays
  overlayDark:      'rgba(15, 23, 42, 0.95)',
  overlayMedium:    'rgba(30, 41, 59, 0.95)',
  overlayLight:     'rgba(0, 0, 0, 0.6)',

  // Misc
  white:            '#ffffff',
  black:            '#000000',
  transparent:      'transparent',

  // Hazard map specific
  hazardFill:       'rgba(239, 68, 68, 0.4)',
  hazardStroke:     'rgba(239, 68, 68, 0.8)',
  routeLine:        '#eab308',
};

export const lightColors = {
  // Backgrounds
  background:       '#f8fafc',
  surface:          '#ffffff',
  surfaceElevated:  '#f1f5f9',
  
  // Borders
  border:           '#e2e8f0',
  borderLight:      '#cbd5e1',

  // Text
  textPrimary:      '#0f172a',
  textSecondary:    '#475569',
  textMuted:        '#94a3b8',
  textInverse:      '#ffffff',

  // Brand / Primary
  primary:          '#0284c7',
  primaryDark:      '#0369a1',
  primaryDarker:    '#075985',
  primaryGlow:      'rgba(2, 132, 199, 0.25)',

  // Semantic: Danger
  danger:           '#dc2626',
  dangerLight:      '#ef4444',
  dangerBg:         '#fee2e2',
  dangerText:       '#991b1b',
  dangerGlow:       'rgba(220, 38, 38, 0.3)',

  // Semantic: Success
  success:          '#16a34a',
  successLight:     '#22c55e',
  successBg:        '#dcfce7',
  successText:      '#166534',

  // Semantic: Warning
  warning:          '#d97706',
  warningLight:     '#f59e0b',
  warningBg:        '#fef3c7',
  warningText:      '#92400e',

  // Overlays
  overlayDark:      'rgba(248, 250, 252, 0.95)',
  overlayMedium:    'rgba(255, 255, 255, 0.95)',
  overlayLight:     'rgba(0, 0, 0, 0.4)',

  // Misc
  white:            '#ffffff',
  black:            '#000000',
  transparent:      'transparent',

  // Hazard map specific
  hazardFill:       'rgba(239, 68, 68, 0.3)',
  hazardStroke:     'rgba(239, 68, 68, 0.7)',
  routeLine:        '#d97706',
};

// Default export backward compatibility (dark mode default)
export const colors = darkColors;

export const getThemeColors = (isDarkMode) => (isDarkMode ? darkColors : lightColors);

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const radii = {
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 30,
  full: 9999,
};

export const typography = {
  hero: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
  },
  subheading: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '700',
  },
  caption: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  small: {
    fontSize: 11,
    fontWeight: '400',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonLarge: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  buttonMedium: {
    fontSize: 16,
    fontWeight: '700',
  },
  mono: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  }),
};

const theme = { colors, spacing, radii, typography, shadows };
export default theme;
