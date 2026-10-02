import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LifeBuoy,
  QrCode,
  LogOut,
  Mail,
  Building,
  Radio,
  ChevronRight,
  Navigation,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from '../components/ConfirmationModal';
import { colors, spacing, radii, typography, shadows } from '../styles/theme';

export default function StaffProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isRescue =
    user?.operator_type === 'rescue' ||
    !!user?.assigned_rescue_unit_id ||
    !!user?.rescue_role ||
    user?.email?.toLowerCase().includes('rescue');

  const isScanner =
    user?.operator_type === 'scanner' ||
    !!user?.assigned_shelter_id ||
    user?.email?.toLowerCase().includes('scanner');

  const isAdmin = user?.role === 'admin';

  // Role display logic
  const rescueRoleTitles = {
    boat_pilot: 'Boat Pilot / Vessel Commander',
    lead_medic: 'Lead Paramedic / Emergency Medic',
    heavy_driver: 'Heavy 4x4 Driver / Evacuation Transporter',
    rescue_swimmer: 'Field Rescue Swimmer / Rescuer',
    crew: 'Logistics & Dispatch Radio Operator',
  };

  const agencyName = isRescue
    ? 'CDRRMO — Quick Response Team (QRT)'
    : isScanner
    ? 'CSWDO — Evacuation & Relief Operations'
    : 'CDRRMO & CSWDO Joint Operations';

  const operationalRole = isRescue
    ? rescueRoleTitles[user?.rescue_role] || 'Search & Rescue Field Operator'
    : isScanner
    ? 'Gate Marshal & Relief Intake Specialist'
    : 'Emergency Operations Administrator';

  const assignedPost = isRescue
    ? user?.assigned_rescue_unit?.name
      ? `${user.assigned_rescue_unit.name} (${user.assigned_rescue_unit.call_sign || 'QRT'})`
      : 'QRT 4x4 Heavy Rescue Unit 03 (DELTA-3)'
    : isScanner
    ? user?.assigned_shelter?.name || 'Baliwasan Gym Evacuation Center'
    : 'EOC Central Command Headquarters';

  const initials = (user?.name || 'Staff')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>OFFICIAL DUTY PROFILE</Text>
          <View style={styles.dutyBadge}>
            <View style={styles.dutyDot} />
            <Text style={styles.dutyBadgeText}>ON DUTY</Text>
          </View>
        </View>

        {/* Profile Identity Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View
              style={[
                styles.avatarCircle,
                isRescue ? styles.avatarRescue : styles.avatarScanner,
              ]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.identityDetails}>
              <Text style={styles.userName}>{user?.name || 'Official Staff'}</Text>
              <Text style={styles.userRoleBadge}>{operationalRole}</Text>
              <View style={styles.emailRow}>
                <Mail size={13} color={colors.textMuted} />
                <Text style={styles.userEmail}>{user?.email || 'staff@lgu.gov.ph'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Agency & Deployment Info */}
          <View style={styles.deploymentGrid}>
            <View style={styles.deploymentItem}>
              <Building size={16} color="#38bdf8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.deploymentLabel}>AGENCY / DIVISION</Text>
                <Text style={styles.deploymentValue}>{agencyName}</Text>
              </View>
            </View>

            <View style={styles.deploymentItem}>
              {isRescue ? (
                <LifeBuoy size={16} color="#f87171" />
              ) : (
                <QrCode size={16} color="#38bdf8" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.deploymentLabel}>ASSIGNED POST / FLEET</Text>
                <Text style={styles.deploymentValue}>{assignedPost}</Text>
              </View>
            </View>

            <View style={styles.deploymentItem}>
              <Radio size={16} color="#34d399" />
              <View style={{ flex: 1 }}>
                <Text style={styles.deploymentLabel}>DUTY CHANNEL</Text>
                <Text style={styles.deploymentValue}>ZAMBOANGA-EOC-CH7 (ENCRYPTED)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Operational Quick Actions */}
        <Text style={styles.sectionHeader}>DUTY NAVIGATION</Text>
        <View style={styles.menuContainer}>
          {isRescue && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Rescue')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <LifeBuoy size={18} color="#f87171" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Rescue Missions Stepper</Text>
                <Text style={styles.menuSubtitle}>Current mission details, triage badges &amp; citizen coordination</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {isRescue && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('RescueMap')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                <Navigation size={18} color="#06b6d4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Turn-by-Turn Rescue Map</Text>
                <Text style={styles.menuSubtitle}>Tactical Mapbox HUD, automated 20m arrival &amp; shelter re-route</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {isScanner && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Scanner')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <QrCode size={18} color="#38bdf8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Gate Intake &amp; Relief Scanner</Text>
                <Text style={styles.menuSubtitle}>Scan resident QR codes for admission &amp; ration claim</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {isRescue && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Dispatch')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Radio size={18} color="#f87171" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Missions Dispatch Queue</Text>
                <Text style={styles.menuSubtitle}>View pending rescue requests assigned to fleet</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {(!isRescue || isAdmin) && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Overview')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Building size={18} color="#34d399" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Shelter Command Overview</Text>
                <Text style={styles.menuSubtitle}>Real-time citywide capacity and pending incidents</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Security & System Info */}
        <Text style={styles.sectionHeader}>ACCOUNT &amp; PROTOCOL</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role Authorization</Text>
            <Text style={styles.infoValue}>
              {isAdmin ? 'ADMINISTRATOR' : isRescue ? 'QRT RESCUER' : 'INTAKE SCANNER'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Session Protocol</Text>
            <Text style={styles.infoValue}>Bearer Sanctum (Encrypted)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Field Telemetry</Text>
            <Text style={[styles.infoValue, { color: '#34d399' }]}>Active (Zero GPS Leak)</Text>
          </View>
        </View>

        {/* Sign Out CTA Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#ffffff" />
          <Text style={styles.logoutButtonText}>SIGN OUT OF DUTY DESK</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Signing out concludes your active duty session on this mobile device.
        </Text>
        <Text style={styles.versionText}>EVAC_ROUTE MOBILE • v1.0.1</Text>
      </ScrollView>

      {/* Styled Logout Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Confirm Duty Sign Out"
        message="Are you sure you want to end your shift and sign out? You will stop receiving live field dispatch telemetry until you log back in."
        confirmText="Yes, Sign Out"
        cancelText="Stay on Duty"
        variant="danger"
        icon={LogOut}
        onConfirm={handleConfirmLogout}
        onClose={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
    marginTop: 4,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    letterSpacing: 2,
    fontSize: 16,
  },
  dutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  dutyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  dutyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 1,
  },
  profileCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarRescue: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  avatarScanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  identityDetails: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  userRoleBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: spacing.md,
  },
  deploymentGrid: {
    gap: spacing.sm,
  },
  deploymentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  deploymentLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  deploymentValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionHeader: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  menuSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    gap: 10,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: radii.lg,
    paddingVertical: 14,
    ...shadows.md,
    shadowColor: '#dc2626',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  footerNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  versionText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.md,
    letterSpacing: 1.5,
  },
});
