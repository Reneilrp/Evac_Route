import { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, Linking, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Home, Users, AlertTriangle,
  ExternalLink, RefreshCw,
} from 'lucide-react-native';
import api from '../services/api';
import { colors, spacing, typography, radii, shadows } from '../styles/theme';
import Constants from 'expo-constants';

// Derive web dashboard URL from the same base the API uses
const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8000/api';
const WEB_DASHBOARD_URL = API_BASE.replace('/api', '');

export default function StaffOverviewScreen() {
  const insets = useSafeAreaInsets();
  const [expandedShelterId, setExpandedShelterId] = useState(null);

  // Shelter overview — same endpoint used by web dashboard
  const {
    data: shelterData,
    isLoading: isLoadingShelters,
    isError: isShelterError,
    refetch: refetchShelters,
  } = useQuery({
    queryKey: ['staff-shelter-overview'],
    queryFn: () => api.get('/shelters/dashboard').then(r => r.data),
    refetchInterval: 30000,
  });

  // Pending incident count
  const { data: incidentData } = useQuery({
    queryKey: ['staff-incidents'],
    queryFn: () => api.get('/incidents').then(r => r.data),
    refetchInterval: 60000,
  });

  const shelters = shelterData?.shelters ?? [];
  const pendingIncidents = (incidentData?.data ?? []).filter(i => i.status === 'pending');
  const pendingCount = pendingIncidents.length;

  const openDashboard = () => {
    Linking.canOpenURL(WEB_DASHBOARD_URL).then(supported => {
      if (supported) {
        Linking.openURL(WEB_DASHBOARD_URL);
      } else {
        Alert.alert('Cannot Open', `Unable to open: ${WEB_DASHBOARD_URL}`);
      }
    });
  };

  const getOccupancyColor = (shelter) => {
    const ratio = shelter.current_occupancy / shelter.max_capacity;
    if (ratio >= 1) return colors.danger;
    if (ratio >= 0.8) return colors.warning;
    return colors.successLight;
  };

  const renderShelterCard = ({ item: shelter }) => {
    const ratio = shelter.current_occupancy / shelter.max_capacity;
    const pct = Math.min(100, Math.round(ratio * 100));
    const isExpanded = expandedShelterId === shelter.id;

    return (
      <TouchableOpacity
        onPress={() => setExpandedShelterId(isExpanded ? null : shelter.id)}
        activeOpacity={0.85}
        style={styles.shelterCard}
      >
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.statusDot, { backgroundColor: shelter.status === 'open' ? colors.successLight : colors.danger }]} />
            <Text style={styles.shelterName} numberOfLines={1}>{shelter.name}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: shelter.status === 'open' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
            <Text style={[styles.statusChipText, { color: shelter.status === 'open' ? colors.successLight : colors.danger }]}>
              {shelter.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Occupancy bar */}
        <View style={styles.occupancyRow}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: getOccupancyColor(shelter) }]} />
          </View>
          <Text style={[styles.pctText, { color: getOccupancyColor(shelter) }]}>{pct}%</Text>
        </View>
        <Text style={styles.occupancyLabel}>
          {shelter.current_occupancy} / {shelter.max_capacity} occupants
        </Text>

        {/* Expanded detail */}
        {isExpanded && (
          <View style={styles.expandedDetail}>
            <View style={styles.detailRow}>
              <Users size={14} color={colors.textMuted} />
              <Text style={styles.detailText}>
                {shelter.max_capacity - shelter.current_occupancy} slots remaining
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Home size={14} color={colors.textMuted} />
              <Text style={styles.detailText}>
                Status: {shelter.status}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COMMAND OVERVIEW</Text>
        <TouchableOpacity onPress={refetchShelters} style={styles.refreshBtn}>
          <RefreshCw size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.headerSub}>Live shelter status · Updates every 30s</Text>

      {/* Pending Incidents Banner */}
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.incidentBanner} onPress={openDashboard} activeOpacity={0.8}>
          <View style={styles.incidentBannerLeft}>
            <AlertTriangle size={20} color={colors.warningText} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.incidentBannerTitle}>
                {pendingCount} Pending Incident Report{pendingCount > 1 ? 's' : ''}
              </Text>
              <Text style={styles.incidentBannerSub}>Tap to review on web dashboard</Text>
            </View>
          </View>
          <ExternalLink size={16} color={colors.warningText} />
        </TouchableOpacity>
      )}

      {/* Summary Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {shelters.filter(s => s.status === 'open').length}
          </Text>
          <Text style={styles.statLabel}>Open Shelters</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {shelters.reduce((sum, s) => sum + (s.current_occupancy || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Total Evacuees</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.danger }]}>
            {shelters.filter(s => s.current_occupancy >= s.max_capacity).length}
          </Text>
          <Text style={styles.statLabel}>Full Shelters</Text>
        </View>
      </View>

      {/* Shelter List */}
      <Text style={styles.sectionTitle}>SHELTER STATUS</Text>

      {isLoadingShelters && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading shelter data...</Text>
        </View>
      )}

      {isShelterError && !isLoadingShelters && (
        <View style={styles.errorBox}>
          <AlertTriangle size={24} color={colors.danger} />
          <Text style={styles.errorText}>Could not load shelter data. Check network connection.</Text>
        </View>
      )}

      {!isLoadingShelters && shelters.map(shelter => (
        <View key={shelter.id}>
          {renderShelterCard({ item: shelter })}
        </View>
      ))}

      {/* Open Web Dashboard Button */}
      <TouchableOpacity style={styles.webDashBtn} onPress={openDashboard} activeOpacity={0.85}>
        <ExternalLink size={18} color={colors.white} />
        <Text style={styles.webDashBtnText}>Open Full Web Dashboard</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        For incident review, inventory management, alert broadcasting, and ration templates — use the web dashboard.
      </Text>
    </ScrollView>
  );
}

const styles = {
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
    marginBottom: 4,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    letterSpacing: 2,
    fontSize: 18,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  headerSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.base,
  },
  incidentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningBg,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  incidentBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incidentBannerTitle: {
    color: colors.warningText,
    fontWeight: '700',
    fontSize: 14,
  },
  incidentBannerSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.successLight,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  shelterCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shelterName: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  occupancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  occupancyLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  expandedDetail: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceElevated,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: radii.lg,
    padding: spacing.base,
    gap: 12,
    marginBottom: spacing.base,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: 13,
    flex: 1,
  },
  webDashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginTop: spacing.lg,
    ...shadows.md,
  },
  webDashBtnText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  footer: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.base,
    lineHeight: 17,
  },
};
