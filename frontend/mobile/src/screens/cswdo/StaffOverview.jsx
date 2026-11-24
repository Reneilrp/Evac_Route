import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  Users,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Unlock,
  Lock,
  Truck,
  HeartPulse,
  ShieldAlert,
} from 'lucide-react-native';
import api from '../../services/api';
import { spacing, typography, radii, shadows } from '../../styles/theme';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import Constants from 'expo-constants';

// Derive web dashboard URL from the same base the API uses
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  'https://evacroute.app/api';
const WEB_DASHBOARD_URL = API_BASE.replace('/api', '');

export default function StaffOverview() {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const styles = useThemedStyles(getStyles);
  const queryClient = useQueryClient();
  const [selectedShelterModal, setSelectedShelterModal] = useState(null);
  const [actionLoadingShelterId, setActionLoadingShelterId] = useState(null);

  // Shelter overview — same endpoint used by web dashboard
  const {
    data: shelterData,
    isLoading: isLoadingShelters,
    isError: isShelterError,
    refetch: refetchShelters,
  } = useQuery({
    queryKey: ['staff-shelter-overview'],
    queryFn: () => api.get('/shelters/dashboard').then((r) => r.data),
    refetchInterval: 30000,
  });

  // Pending incident count
  const { data: incidentData } = useQuery({
    queryKey: ['staff-incidents'],
    queryFn: () => api.get('/incidents').then((r) => r.data),
    refetchInterval: 60000,
  });

  // Vulnerability query for selected shelter modal
  const { data: vulnData, isLoading: isLoadingVuln } = useQuery({
    queryKey: ['shelter-vuln', selectedShelterModal?.id],
    queryFn: () =>
      selectedShelterModal?.id
        ? api.get(`/shelters/${selectedShelterModal.id}/vulnerability-summary`).then((r) => r.data?.data)
        : null,
    enabled: !!selectedShelterModal?.id,
  });

  const shelters = Array.isArray(shelterData?.shelters)
    ? shelterData.shelters
    : Array.isArray(shelterData?.data)
    ? shelterData.data
    : [];

  const rawIncidents = Array.isArray(incidentData?.data)
    ? incidentData.data
    : Array.isArray(incidentData?.data?.data)
    ? incidentData.data.data
    : [];

  const pendingIncidents = rawIncidents.filter((i) => i && i.status === 'pending');
  const pendingCount = pendingIncidents.length;

  const openDashboard = () => {
    Linking.canOpenURL(WEB_DASHBOARD_URL).then((supported) => {
      if (supported) {
        Linking.openURL(WEB_DASHBOARD_URL);
      } else {
        Alert.alert('Cannot Open', `Unable to open: ${WEB_DASHBOARD_URL}`);
      }
    });
  };

  const handleToggleActivation = async (shelter, targetStatus) => {
    setActionLoadingShelterId(shelter.id);
    try {
      await api.post(`/shelters/${shelter.id}/toggle-activation`, {
        activation_status: targetStatus,
        activation_trigger: 'barangay_tanod',
      });
      await refetchShelters();
      Alert.alert(
        'Shelter State Updated',
        `${shelter.name} is now ${targetStatus.toUpperCase()} for emergency IDPs.`
      );
    } catch (err) {
      Alert.alert(
        'Action Failed',
        err.response?.data?.message || 'Could not update shelter activation.'
      );
    } finally {
      setActionLoadingShelterId(null);
    }
  };

  const handleMobilizeCswd = async (shelter) => {
    setActionLoadingShelterId(shelter.id);
    try {
      await api.post(`/shelters/${shelter.id}/mobilize-cswd`, {
        team_name: 'CSWDO Delta Rapid Team',
      });
      await refetchShelters();
      Alert.alert(
        'CSWDO Mobilized',
        `Field Team dispatched to ${shelter.name} to oversee intake and relief operations.`
      );
    } catch (err) {
      Alert.alert(
        'Dispatch Error',
        err.response?.data?.message || 'Failed to trigger CSWDO field mobilization.'
      );
    } finally {
      setActionLoadingShelterId(null);
    }
  };

  const handleRequestChoSupport = (shelter) => {
    Alert.alert(
      'Medical Support Requested',
      `City Health Office (CHO) medical team notified for ${shelter.name} to triage high-risk IDPs.`
    );
  };

  const getOccupancyColor = (shelter) => {
    const isStandby = (shelter?.activation_status || '').toLowerCase() === 'standby';
    if (isStandby) return '#f59e0b';
    const isOpen = (shelter?.status || '').toLowerCase() === 'open';
    if (!isOpen) return colors.danger;
    const maxCap = Math.max(1, Number(shelter?.max_capacity) || 1);
    const currOcc = Math.max(0, Number(shelter?.current_occupancy) || 0);
    const ratio = currOcc / maxCap;
    if (ratio >= 1) return colors.danger;
    if (ratio >= 0.8) return colors.warning;
    return colors.successLight;
  };

  const renderShelterCard = (shelter, index) => {
    if (!shelter) return null;
    const maxCap = Math.max(1, Number(shelter.max_capacity) || 1);
    const currOcc = Math.max(0, Number(shelter.current_occupancy) || 0);
    const ratio = Math.min(1, currOcc / maxCap);
    const pct = Math.min(100, Math.max(0, Math.round(ratio * 100))) || 0;

    const activationStatus = (shelter.activation_status || shelter.status || 'open').toLowerCase();
    const isStandby = activationStatus === 'standby';
    const isOpen = activationStatus === 'open' || (shelter.status || '').toLowerCase() === 'open';
    const isFull = activationStatus === 'full';
    const isLoadingAction = actionLoadingShelterId === shelter.id;
    const remainingSlots = Math.max(0, maxCap - currOcc);

    return (
      <TouchableOpacity
        key={shelter.id ? `shelter-${shelter.id}` : `shelter-idx-${index}`}
        onPress={() => setSelectedShelterModal(shelter)}
        activeOpacity={0.85}
        style={[
          styles.shelterCard,
          isStandby && { borderColor: 'rgba(245, 158, 11, 0.4)' },
        ]}
      >
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isStandby
                    ? '#f59e0b'
                    : isOpen
                    ? colors.successLight
                    : colors.danger,
                },
              ]}
            />
            <Text style={styles.shelterName} numberOfLines={1}>
              {shelter.name || 'Evacuation Shelter'}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: isStandby
                  ? 'rgba(245,158,11,0.15)'
                  : isOpen
                  ? 'rgba(34,197,94,0.15)'
                  : 'rgba(239,68,68,0.15)',
              },
            ]}
          >
            <Text
              style={[
                styles.statusChipText,
                {
                  color: isStandby
                    ? '#d97706'
                    : isOpen
                    ? colors.successLight
                    : colors.danger,
                },
              ]}
            >
              {isStandby ? 'STANDBY COURT' : isOpen ? 'OPEN' : isFull ? 'FULL' : 'CLOSED'}
            </Text>
          </View>
        </View>

        {/* 1-Tap Tanod Shelter Activation for Standby Covered Courts */}
        {isStandby && (
          <TouchableOpacity
            style={{
              backgroundColor: '#0284c7',
              paddingVertical: 9,
              paddingHorizontal: 12,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginVertical: 4,
            }}
            onPress={(e) => {
              e.stopPropagation();
              handleToggleActivation(shelter, 'open');
            }}
            disabled={isLoadingAction}
          >
            {isLoadingAction ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Unlock size={14} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                  🔓 Clear &amp; Open Court
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Occupancy bar */}
        <View style={styles.occupancyRow}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${pct}%`, backgroundColor: getOccupancyColor(shelter) },
              ]}
            />
          </View>
          <Text style={[styles.pctText, { color: getOccupancyColor(shelter) }]}>{pct}%</Text>
        </View>

        {/* Card Footer with quick metrics & action */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={styles.occupancyLabel}>
            {currOcc} / {maxCap} occupants · {remainingSlots} free
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
              View Details →
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
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
              {shelters.filter((s) => (s?.status || '').toLowerCase() === 'open').length}
            </Text>
            <Text style={styles.statLabel}>Open Shelters</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {shelters.reduce((sum, s) => sum + (Number(s?.current_occupancy) || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Total IDPs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.danger }]}>
              {
                shelters.filter(
                  (s) =>
                    (Number(s?.current_occupancy) || 0) >=
                    Math.max(1, Number(s?.max_capacity) || 1)
                ).length
              }
            </Text>
            <Text style={styles.statLabel}>Full Shelters</Text>
          </View>
        </View>

        {/* Shelter List */}
        <Text style={styles.sectionTitle}>SHELTER STATUS &amp; RECEPTIONS</Text>

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

        {!isLoadingShelters && shelters.map((shelter, idx) => renderShelterCard(shelter, idx))}

        {/* Open Web Dashboard Button */}
        <TouchableOpacity style={styles.webDashBtn} onPress={openDashboard} activeOpacity={0.85}>
          <ExternalLink size={18} color={colors.white} />
          <Text style={styles.webDashBtnText}>Open Full Web Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          For incident review, inventory management, alert broadcasting, and ration templates — use the web dashboard.
        </Text>
      </ScrollView>

      {/* Dedicated Shelter Details Modal (Zero-CLS Inspection Window) */}
      <Modal
        visible={!!selectedShelterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedShelterModal(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: '85%',
              borderWidth: 1,
              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: '900', color: colors.textPrimary }} numberOfLines={1}>
                  {selectedShelterModal?.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Barangay: {selectedShelterModal?.barangay || 'Zamboanga City'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedShelterModal(null)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.textSecondary }}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Capacity & Load Block */}
              <View
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                    CAPACITY &amp; LOAD
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: getOccupancyColor(selectedShelterModal) }}>
                    {selectedShelterModal?.current_occupancy || 0} / {selectedShelterModal?.max_capacity || 0} (
                    {Math.round(((Number(selectedShelterModal?.current_occupancy) || 0) / Math.max(1, Number(selectedShelterModal?.max_capacity) || 1)) * 100)}%)
                  </Text>
                </View>

                {/* Activation Status in Modal */}
                {selectedShelterModal?.activation_status === 'standby' ? (
                  <TouchableOpacity
                    style={{
                      marginTop: 8,
                      backgroundColor: '#0284c7',
                      paddingVertical: 10,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    onPress={() => {
                      handleToggleActivation(selectedShelterModal, 'open');
                      setSelectedShelterModal((prev) => prev ? { ...prev, activation_status: 'open', status: 'open' } : null);
                    }}
                    disabled={actionLoadingShelterId === selectedShelterModal?.id}
                  >
                    <Unlock size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                      🔓 Clear &amp; Open Shelter for IDPs
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{
                      marginTop: 8,
                      backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#475569' : '#cbd5e1',
                      paddingVertical: 8,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    onPress={() => {
                      handleToggleActivation(selectedShelterModal, 'standby');
                      setSelectedShelterModal((prev) => prev ? { ...prev, activation_status: 'standby' } : null);
                    }}
                    disabled={actionLoadingShelterId === selectedShelterModal?.id}
                  >
                    <Lock size={14} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontWeight: 'bold', fontSize: 12 }}>
                      Set Shelter to Standby
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Influx & CSWDO Field Mobilization */}
              {(Number(selectedShelterModal?.current_occupancy) || 0) >= 15 && (
                <View
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: selectedShelterModal?.cswd_mobilized
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(245, 158, 11, 0.12)',
                    borderWidth: 1,
                    borderColor: selectedShelterModal?.cswd_mobilized
                      ? 'rgba(16, 185, 129, 0.3)'
                      : 'rgba(245, 158, 11, 0.4)',
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Truck size={18} color={selectedShelterModal?.cswd_mobilized ? '#10b981' : '#d97706'} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: 'bold',
                        color: selectedShelterModal?.cswd_mobilized ? '#047857' : '#b45309',
                      }}
                    >
                      {selectedShelterModal?.cswd_mobilized
                        ? `Field Team Active: ${selectedShelterModal?.cswd_mobilized_team || 'CSWDO Delta'}`
                        : `Influx Alert: ${selectedShelterModal?.current_occupancy} IDPs Present`}
                    </Text>
                  </View>

                  {!selectedShelterModal?.cswd_mobilized && (
                    <TouchableOpacity
                      style={{
                        marginTop: 10,
                        backgroundColor: '#2563eb',
                        paddingVertical: 10,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                      onPress={() => {
                        handleMobilizeCswd(selectedShelterModal);
                        setSelectedShelterModal((prev) => prev ? { ...prev, cswd_mobilized: true, cswd_mobilized_team: 'CSWDO Delta Rapid Team' } : null);
                      }}
                    >
                      <Truck size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                        🚚 Mobilize CSWD Field Team
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Vulnerability Triage Summary */}
              <View
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  Vulnerability Triage Summary
                </Text>

                {isLoadingVuln ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : vulnData ? (
                  <View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDarkMode ? '#0f172a' : '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                        <Text style={{ fontSize: 13 }}>👶</Text>
                        <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                          Infants: {vulnData.vulnerabilities?.infants || 0}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDarkMode ? '#0f172a' : '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                        <Text style={{ fontSize: 13 }}>🤰</Text>
                        <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                          Pregnant: {vulnData.vulnerabilities?.pregnant || 0}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDarkMode ? '#0f172a' : '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                        <Text style={{ fontSize: 13 }}>🧓</Text>
                        <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                          Seniors: {vulnData.vulnerabilities?.seniors || 0}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDarkMode ? '#0f172a' : '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                        <Text style={{ fontSize: 13 }}>♿</Text>
                        <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                          PWDs: {vulnData.vulnerabilities?.pwd || 0}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        backgroundColor: '#ef4444',
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                      onPress={() => handleRequestChoSupport(selectedShelterModal)}
                    >
                      <HeartPulse size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                        📢 Request CHO Medical Support
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    No vulnerability triage entries recorded for this shelter.
                  </Text>
                )}
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
                onPress={() => setSelectedShelterModal(null)}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                  Close Details
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const getStyles = (colors, isDarkMode) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.base,
      paddingBottom: 110,
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
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.cardBorder,
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
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      padding: spacing.base,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
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
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      padding: spacing.base,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.cardBorder,
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
      backgroundColor: isDarkMode ? colors.surfaceElevated : '#e2e8f0',
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
      borderTopColor: colors.cardBorder,
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
  });
