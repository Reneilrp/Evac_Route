import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from './theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  iconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  title: {
    ...typography.hero,
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 6,
  },
  cityLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#38bdf8',
    textAlign: 'center',
    letterSpacing: 3,
  },
  buttonSection: {
    marginTop: spacing.xl,
    gap: spacing.base,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: spacing.base,
  },
  versionText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing['2xl'],
    letterSpacing: 1.5,
  },
  inputContainer: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  textInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: spacing.xs,
  },
  staffPortalButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  staffPortalText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default styles;
