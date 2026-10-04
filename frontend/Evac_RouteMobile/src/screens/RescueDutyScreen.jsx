import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LifeBuoy,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Clock,
  Shield,
  RefreshCw,
  LogOut,
  MessageSquare,
  Activity,
  ChevronRight,
  Compass,
  Building,
  Users,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import api from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { getEcho } from '../services/echoService';
import { colors, spacing, radii, shadows } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { clampToZamboanga, ZAMBOANGA_RESCUER_BASE } from '../utils/zamboangaGeo';

export default function RescueDutyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 1. Fetch active rescue missions
  const {
    data: missionsData,
    isLoading: isLoadingMissions,
    refetch: refetchMissions,
  } = useQuery({
    queryKey: ['rescue-missions-active'],
    queryFn: () => api.get('/rescue/missions?active_only=1').then((r) => r.data.data),
    refetchInterval: 10000,
  });

  // 2. Fetch available shelters
  const { data: sheltersData } = useQuery({
    queryKey: ['shelters-list-rescue'],
    queryFn: () => api.get('/shelters').then((r) => r.data.data),
  });

  // 3. Fetch rescue fleet unit info
  const { data: unitsData } = useQuery({
    queryKey: ['rescue-units-duty'],
    queryFn: () => api.get('/rescue/units').then((r) => r.data.data),
  });

  // 4. Fetch active hazards for tactical situational awareness
  const { data: hazardsData } = useQuery({
    queryKey: ['hazards-list-rescue'],
    queryFn: () => api.get('/hazards').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const [readinessStatus, setReadinessStatus] = useState('ready');
  const [rescuerGps, setRescuerGps] = useState(ZAMBOANGA_RESCUER_BASE);

  useEffect(() => {
    let locSub;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (current?.coords) {
            setRescuerGps(clampToZamboanga([current.coords.longitude, current.coords.latitude]));
          }
          locSub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 },
            (loc) => {
              if (loc?.coords) {
                setRescuerGps(clampToZamboanga([loc.coords.longitude, loc.coords.latitude]));
              }
            }
          );
        }
      } catch (e) {
        console.warn('[RescueDutyScreen] GPS tracking error:', e);
      }
    })();
    return () => locSub?.remove();
  }, []);

  const assignedUnit =
    unitsData?.find((u) => u.id === user?.assigned_rescue_unit_id) ||
    (user?.role === 'admin' ? unitsData?.[0] : null);

  const roleDisplayNames = {
    boat_pilot: '🚤 Boat Pilot / Vessel Commander',
    lead_medic: '🚑 Lead Paramedic / Medic',
    heavy_driver: '🛻 Heavy 4x4 Driver / Navigator',
    rescue_swimmer: '🦺 Field Rescue Swimmer / Rescuer',
    crew: '📋 Logistics & Radio Operator',
  };
  const rescuerRoleTitle = roleDisplayNames[user?.rescue_role] || '🦺 Rescue Field Operator';

  const [selectedMissionId, setSelectedMissionId] = useState(null);

  const allActiveMissions = missionsData ?? [];
  const activeMissions = assignedUnit
    ? allActiveMissions.filter((m) => m.rescue_unit_id === assignedUnit.id)
    : (user?.role === 'admin' ? allActiveMissions : []);
  const currentMission =
    (selectedMissionId ? activeMissions.find((m) => m.id === selectedMissionId) : null) ||
    activeMissions[0] ||
    (user?.role === 'admin' ? allActiveMissions[0] : null);
  const shelters = sheltersData ?? [];

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    detail: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary',
    icon: null,
    loading: false,
    onConfirm: null,
  });

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, visible: false }));
  };

  // Real-time notification for newly assigned mission
  useEffect(() => {
    const echo = getEcho();
    if (!echo || !echo.channel) return;

    const channel = echo.channel('rescue-alerts');
    channel.listen('.rescue.mission.dispatched', () => {
      queryClient.invalidateQueries({ queryKey: ['rescue-missions-active'] });
      Alert.alert(
        '🚨 NEW RESCUE MISSION!',
        'A search and rescue mission has been assigned to your unit by CDRRMO EOC.'
      );
    });

    return () => {
      if (echo.leaveChannel) {
        echo.leaveChannel('rescue-alerts');
      }
    };
  }, [queryClient]);

  // Status Stepper Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, target_shelter_id, staging_point_id }) =>
      api.put(`/rescue/missions/${id}/status`, {
        status,
        target_shelter_id,
        staging_point_id,
        current_latitude: rescuerGps[1],
        current_longitude: rescuerGps[0],
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rescue-missions-active'] });
      queryClient.invalidateQueries({ queryKey: ['rescue-units-duty'] });
      const statusLabel = res.data.data.status.replace(/_/g, ' ').toUpperCase();
      Alert.alert('Status Updated', `Mission is now: ${statusLabel}`);
    },
    onError: (err) => {
      Alert.alert('Update Failed', err?.response?.data?.message || 'Could not update mission status.');
    },
  });

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert('No Number', 'Victim did not provide a contact phone number.');
      return;
    }
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Cannot Call', `Dial manually: ${phoneNumber}`);
    });
  };

  const handleQuickSms = (phoneNumber, victimName, barangay) => {
    if (!phoneNumber) {
      Alert.alert('No Contact Number', 'Victim did not provide a contact phone number.');
      return;
    }
    const callSign = assignedUnit?.call_sign || 'QRT DELTA-3';
    const msg = encodeURIComponent(
      `[CDRRMO RESCUE] Unit ${callSign} is actively En Route to your location in ${
        barangay || 'Zamboanga'
      }. Move to the highest safe floor/roof, keep phone dry, and signal rescuers with a flashlight or bright cloth.`
    );
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${phoneNumber}${separator}body=${msg}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
      else Alert.alert('SMS Details', `Send to ${phoneNumber}: ${decodeURIComponent(msg)}`);
    });
  };

  const getVulnerabilities = (mission) => {
    const list = [];
    const text = `${mission?.situation_description || ''} ${mission?.special_needs || ''} ${
      mission?.victim_name || ''
    }`.toLowerCase();
    if (
      text.includes('elderly') ||
      text.includes('senior') ||
      text.includes('lolo') ||
      text.includes('lola')
    ) {
      list.push('🧓 Elderly');
    }
    if (
      text.includes('infant') ||
      text.includes('baby') ||
      text.includes('child') ||
      text.includes('bata')
    ) {
      list.push('👶 Infant / Child');
    }
    if (
      text.includes('wheelchair') ||
      text.includes('pwd') ||
      text.includes('bedridden') ||
      text.includes('injured')
    ) {
      list.push('♿ Mobility / PWD');
    }
    if (text.includes('pregnant') || text.includes('buntis')) {
      list.push('🤰 Pregnant');
    }
    if (text.includes('roof') || text.includes('attic') || text.includes('bubong')) {
      list.push('🏠 Rooftop Trapped');
    }
    return list;
  };

  const isTransportPhase = currentMission?.status === 'transporting';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.iconCircle}>
            <LifeBuoy color={colors.white} size={20} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{user?.name || 'FIELD RESCUER'}</Text>
            <Text style={styles.headerSubtitle}>
              {assignedUnit
                ? `${assignedUnit.name} (${assignedUnit.call_sign}) • ${rescuerRoleTitle}`
                : rescuerRoleTitle}
            </Text>
          </View>
        </View>

        <View style={styles.headerActionRow}>
          <TouchableOpacity onPress={refetchMissions} style={styles.refreshBtn}>
            <RefreshCw color={colors.textSecondary} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowLogoutModal(true)}
            style={styles.logoutBtn}
            accessibilityLabel="Sign Out of Duty"
          >
            <LogOut color="#f87171" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── READINESS STRIP ─── */}
      <View style={styles.readinessBar}>
        <TouchableOpacity
          style={[
            styles.readinessPill,
            readinessStatus === 'ready' ? styles.readinessReady : styles.readinessStandby,
          ]}
          onPress={() => {
            const next = readinessStatus === 'ready' ? 'standby' : 'ready';
            setReadinessStatus(next);
            Alert.alert(
              'Operational Status Updated',
              next === 'ready'
                ? 'Unit set to: 🟢 READY FOR DISPATCH'
                : 'Unit set to: 🟡 STANDBY / MAINTENANCE (Refueling or Inspection)'
            );
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.readinessDot,
              readinessStatus === 'ready' ? styles.dotGreen : styles.dotYellow,
            ]}
          />
          <Text style={styles.readinessText}>
            {readinessStatus === 'ready' ? 'READY FOR DISPATCH' : 'STANDBY / REFUELING'}
          </Text>
        </TouchableOpacity>

        <View style={styles.hazardsIndicator}>
          <Activity size={12} color="#f59e0b" />
          <Text style={styles.hazardsIndicatorText}>
            {(hazardsData ?? []).length} Active Flood Zones
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingMissions}
            onRefresh={refetchMissions}
            tintColor={colors.primary}
          />
        }
      >
        {isLoadingMissions ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Connecting to CDRRMO Dispatch...</Text>
          </View>
        ) : currentMission ? (
          /* Active Mission View */
          <View style={styles.activeMissionContainer}>
            {/* Multiple Assigned Missions Switcher */}
            {activeMissions.length > 1 && (
              <View style={styles.missionSwitcherBox}>
                <Text style={styles.missionSwitcherLabel}>ASSIGNED ACTIVE MISSIONS ({activeMissions.length}):</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.missionChipScroll}
                >
                  {activeMissions.map((m) => {
                    const isSelected = currentMission?.id === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.missionChip, isSelected && styles.missionChipActive]}
                        onPress={() => setSelectedMissionId(m.id)}
                        activeOpacity={0.8}
                      >
                        <AlertTriangle size={12} color={isSelected ? '#ffffff' : '#f59e0b'} />
                        <Text
                          style={[styles.missionChipText, isSelected && styles.missionChipTextActive]}
                          numberOfLines={1}
                        >
                          {m.victim_name} ({m.headcount}p • {m.barangay || 'Sector'})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* 1. Priority & Control Banner */}
            <View
              style={[
                styles.priorityBanner,
                currentMission.triage_level === 'critical'
                  ? styles.criticalBanner
                  : styles.urgentBanner,
              ]}
            >
              <AlertTriangle color={colors.white} size={16} />
              <Text style={styles.priorityText}>
                {currentMission.triage_level?.toUpperCase() || 'HIGH'} PRIORITY RESCUE •{' '}
                {currentMission.control_no}
              </Text>
            </View>

            {/* 2. Hero Navigation CTA Button (Prominent, High-Visibility) */}
            <TouchableOpacity
              style={[
                styles.heroNavigationCta,
                isTransportPhase ? styles.heroCtaCyan : styles.heroCtaBlue,
              ]}
              onPress={() => navigation.navigate('RescueMap', { missionId: currentMission.id })}
              activeOpacity={0.85}
              accessibilityLabel="Launch Tactical Navigation Map"
            >
              <View style={styles.heroCtaIconCircle}>
                <Compass size={24} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroCtaTitle}>
                  {isTransportPhase
                    ? 'START ROUTE TO SHELTER (MAP)'
                    : 'START ROUTE TO FAMILY (MAP)'}
                </Text>
                <Text style={styles.heroCtaSub}>
                  {isTransportPhase
                    ? `Navigating to ${currentMission.target_shelter?.name || 'Safe Shelter'}`
                    : `Turn-by-turn routing to ${currentMission.victim_name || 'Target'}`}
                </Text>
              </View>
              <ChevronRight size={22} color="#ffffff" />
            </TouchableOpacity>

            {/* 3. Family / Rescue Target Card */}
            <View style={styles.familyCard}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardEyebrow}>DISTRESS VICTIM / FAMILY</Text>
                  <Text style={styles.victimName} numberOfLines={1}>
                    {currentMission.victim_name}
                  </Text>
                </View>

                <View style={styles.headcountBadge}>
                  <Users size={14} color="#38bdf8" />
                  <Text style={styles.headcountText}>{currentMission.headcount} Persons</Text>
                </View>
              </View>

              {/* Vulnerabilities Chips */}
              <View style={styles.vulnerabilitiesRow}>
                {getVulnerabilities(currentMission).map((v, idx) => (
                  <View key={idx} style={styles.vulnerabilityChip}>
                    <Text style={styles.vulnerabilityChipText}>{v}</Text>
                  </View>
                ))}
              </View>

              {/* Location Detail */}
              <View style={styles.locationDetailRow}>
                <MapPin size={16} color="#ef4444" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationTitle}>
                    {currentMission.barangay || 'Zamboanga City'} Sector
                  </Text>
                  <Text style={styles.locationCoordinates}>
                    GPS: {Number(currentMission.victim_latitude).toFixed(4)}°N,{' '}
                    {Number(currentMission.victim_longitude).toFixed(4)}°E
                  </Text>
                </View>
              </View>

              {/* Citizen Situation Report Quote */}
              {currentMission.situation_description ? (
                <View style={styles.situationQuoteBox}>
                  <Text style={styles.situationQuoteTitle}>CITIZEN SITREP:</Text>
                  <Text style={styles.situationQuoteText}>
                    &ldquo;{currentMission.situation_description}&rdquo;
                  </Text>
                </View>
              ) : null}

              {/* Fast Direct Communication Row */}
              <View style={styles.communicationRow}>
                <TouchableOpacity
                  style={[styles.commBtn, styles.commCallBtn]}
                  onPress={() => handleCall(currentMission.victim_phone)}
                  activeOpacity={0.8}
                >
                  <Phone size={16} color="#ffffff" />
                  <Text style={styles.commBtnText}>Call Family</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commBtn, styles.commSmsBtn]}
                  onPress={() =>
                    handleQuickSms(
                      currentMission.victim_phone,
                      currentMission.victim_name,
                      currentMission.barangay
                    )
                  }
                  activeOpacity={0.8}
                >
                  <MessageSquare size={16} color="#ffffff" />
                  <Text style={styles.commBtnText}>Quick SMS Alert</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. Assigned Drop-Off Evacuation Shelter Card */}
            <View style={styles.shelterCard}>
              <View style={styles.shelterHeaderRow}>
                <Building size={16} color="#34d399" />
                <Text style={styles.shelterSectionTitle}>ASSIGNED DROP-OFF SHELTER</Text>
              </View>
              <Text style={styles.shelterNameText}>
                {currentMission.target_shelter?.name ||
                  shelters[0]?.name ||
                  'Tetuan Covered Court Evacuation Center'}
              </Text>
              <Text style={styles.shelterMetaText}>
                Barangay {currentMission.target_shelter?.barangay || 'Tetuan'} • Automatic CSWDO intake
                intake verified upon arrival.
              </Text>
            </View>

            {/* 5. Linear Single-Action Operational Stepper */}
            <View style={styles.stepperContainer}>
              <View style={styles.stepperHeaderRow}>
                <Text style={styles.stepperHeaderTitle}>MISSION OPERATIONAL STEPPER</Text>
                <View style={styles.currentStatusPill}>
                  <Text style={styles.currentStatusPillText}>
                    {currentMission.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Progress Milestones */}
              <View style={styles.progressMilestonesRow}>
                <View
                  style={[
                    styles.milestoneDot,
                    ['dispatched', 'en_route', 'on_scene', 'transporting', 'completed'].includes(
                      currentMission.status
                    ) && styles.milestoneDotActive,
                  ]}
                />
                <View
                  style={[
                    styles.milestoneLine,
                    ['en_route', 'on_scene', 'transporting', 'completed'].includes(
                      currentMission.status
                    ) && styles.milestoneLineActive,
                  ]}
                />
                <View
                  style={[
                    styles.milestoneDot,
                    ['en_route', 'on_scene', 'transporting', 'completed'].includes(
                      currentMission.status
                    ) && styles.milestoneDotActive,
                  ]}
                />
                <View
                  style={[
                    styles.milestoneLine,
                    ['on_scene', 'transporting', 'completed'].includes(currentMission.status) &&
                      styles.milestoneLineActive,
                  ]}
                />
                <View
                  style={[
                    styles.milestoneDot,
                    ['on_scene', 'transporting', 'completed'].includes(currentMission.status) &&
                      styles.milestoneDotActive,
                  ]}
                />
                <View
                  style={[
                    styles.milestoneLine,
                    ['transporting', 'completed'].includes(currentMission.status) &&
                      styles.milestoneLineActive,
                  ]}
                />
                <View
                  style={[
                    styles.milestoneDot,
                    currentMission.status === 'completed' && styles.milestoneDotActive,
                  ]}
                />
              </View>

              {/* ONLY THE SINGLE NEXT VALID ACTION BUTTON IS RENDERED */}
              {currentMission.status === 'dispatched' && (
                <TouchableOpacity
                  style={[styles.stepperActionBtn, styles.btnBlue]}
                  onPress={() =>
                    updateStatusMutation.mutate({ id: currentMission.id, status: 'en_route' })
                  }
                  disabled={updateStatusMutation.isPending}
                  activeOpacity={0.85}
                >
                  <Navigation size={18} color="#ffffff" />
                  <Text style={styles.stepperActionBtnText}>1. ACCEPT MISSION &amp; EN ROUTE</Text>
                </TouchableOpacity>
              )}

              {currentMission.status === 'en_route' && (
                <TouchableOpacity
                  style={[styles.stepperActionBtn, styles.btnAmber]}
                  onPress={() =>
                    updateStatusMutation.mutate({ id: currentMission.id, status: 'on_scene' })
                  }
                  disabled={updateStatusMutation.isPending}
                  activeOpacity={0.85}
                >
                  <MapPin size={18} color="#ffffff" />
                  <Text style={styles.stepperActionBtnText}>2. CONFIRM ARRIVED ON SCENE</Text>
                </TouchableOpacity>
              )}

              {currentMission.status === 'on_scene' && (
                <View style={{ gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.stepperActionBtn, styles.btnCyan]}
                    onPress={() =>
                      updateStatusMutation.mutate({
                        id: currentMission.id,
                        status: 'transporting',
                        target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                    activeOpacity={0.85}
                  >
                    <Shield size={18} color="#ffffff" />
                    <Text style={styles.stepperActionBtnText}>
                      3. START TRANSPORT TO SHELTER
                    </Text>
                  </TouchableOpacity>

                  {/* Optional Shoreline Staging Unload for Flood Boats */}
                  <TouchableOpacity
                    style={[styles.stepperActionBtn, styles.btnDarkOutline]}
                    onPress={() => {
                      const stagingPoint =
                        shelters.find(
                          (s) =>
                            s.facility_type === 'assembly_point' || s.facility_type === 'safe_zone'
                        ) || shelters[0];
                      setConfirmModal({
                        visible: true,
                        title: 'Water-to-Land Staging Handover',
                        message: `Unload ${currentMission.headcount} evacuees at ${
                          stagingPoint?.name || 'Shoreline Assembly Point'
                        } and transfer to ground crew? This will instantly free ${
                          assignedUnit?.name || 'Boat Alpha'
                        } to return to floodwaters for the next rescue.`,
                        detail: `Assembly Point: ${stagingPoint?.name || 'Shoreline Safe Point'}`,
                        confirmText: 'CONFIRM & FREE BOAT',
                        cancelText: 'Cancel',
                        variant: 'primary',
                        icon: Shield,
                        loading: updateStatusMutation.isPending,
                        onConfirm: () => {
                          closeConfirmModal();
                          updateStatusMutation.mutate({
                            id: currentMission.id,
                            status: 'staged_at_assembly',
                            staging_point_id: stagingPoint?.id,
                          });
                        },
                      });
                    }}
                    disabled={updateStatusMutation.isPending}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.stepperActionBtnTextSubtle}>
                      🌊 Optional: Unload at Shoreline Staging
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {currentMission.status === 'transporting' && (
                <TouchableOpacity
                  style={[styles.stepperActionBtn, styles.btnGreen]}
                  onPress={() =>
                    updateStatusMutation.mutate({
                      id: currentMission.id,
                      status: 'completed',
                      target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                  activeOpacity={0.85}
                >
                  <CheckCircle2 size={18} color="#ffffff" />
                  <Text style={styles.stepperActionBtnText}>
                    4. CONFIRM INTAKE HANDOVER &amp; COMPLETE
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          /* Standby View */
          <View style={styles.standbyCard}>
            <View style={styles.standbyGlow}>
              <LifeBuoy color={colors.successLight} size={48} />
            </View>
            <Text style={styles.standbyTitle}>ON ACTIVE STANDBY</Text>
            <Text style={styles.standbySubtitle}>
              {assignedUnit
                ? `${assignedUnit.name} (${assignedUnit.call_sign}) is ready for dispatch`
                : 'Ready for emergency search & rescue dispatch'}
            </Text>
            <View style={styles.standbyInfoBox}>
              <View style={styles.infoRow}>
                <Shield color={colors.primary} size={16} />
                <Text style={styles.infoText}>Assigned Duty: {rescuerRoleTitle}</Text>
              </View>
              <View style={styles.infoRow}>
                <Clock color={colors.textSecondary} size={16} />
                <Text style={styles.infoText}>Listening for real-time CDRRMO dispatch orders</Text>
              </View>
              <View style={styles.infoRow}>
                <MapPin color={colors.textSecondary} size={16} />
                <Text style={styles.infoText}>GPS location active &amp; ready for A* flood routing</Text>
              </View>
              <View style={styles.infoRow}>
                <Phone color={colors.textSecondary} size={16} />
                <Text style={styles.infoText}>
                  Hotline: {assignedUnit?.contact_number || '0917-RESCUE-911'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Styled Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        icon={confirmModal.icon}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onClose={closeConfirmModal}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Confirm Duty Sign Out"
        message="Are you sure you want to end your shift and sign out? You will stop receiving live field dispatch telemetry until you log back in."
        confirmText="Yes, Sign Out"
        cancelText="Stay on Duty"
        variant="danger"
        icon={LogOut}
        onConfirm={async () => {
          setShowLogoutModal(false);
          await logout();
        }}
        onClose={() => setShowLogoutModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoutBtn: {
    padding: spacing.xs,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  refreshBtn: {
    padding: spacing.xs,
  },
  readinessBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  readinessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  readinessReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  readinessStandby: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  readinessDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotGreen: {
    backgroundColor: '#22c55e',
  },
  dotYellow: {
    backgroundColor: '#f59e0b',
  },
  readinessText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  hazardsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hazardsIndicatorText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  activeMissionContainer: {
    gap: 14,
  },
  priorityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  criticalBanner: {
    backgroundColor: '#dc2626',
  },
  urgentBanner: {
    backgroundColor: '#d97706',
  },
  priorityText: {
    color: colors.white,
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /* Hero Navigation CTA */
  heroNavigationCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radii.xl,
    minHeight: 56,
    ...shadows.md,
  },
  heroCtaBlue: {
    backgroundColor: '#0284c7',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
  },
  heroCtaCyan: {
    backgroundColor: '#0891b2',
    borderWidth: 1.5,
    borderColor: '#22d3ee',
  },
  heroCtaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCtaTitle: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  heroCtaSub: {
    color: '#e0f2fe',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  /* Family Distress Card */
  familyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardEyebrow: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  victimName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  headcountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  headcountText: {
    color: '#38bdf8',
    fontSize: 11.5,
    fontWeight: '800',
  },
  vulnerabilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vulnerabilityChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  vulnerabilityChipText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
  },
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 10,
    borderRadius: radii.md,
  },
  locationTitle: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  locationCoordinates: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  situationQuoteBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  situationQuoteTitle: {
    color: '#f59e0b',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  situationQuoteText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  communicationRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  commBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    minHeight: 48,
  },
  commCallBtn: {
    backgroundColor: '#16a34a',
  },
  commSmsBtn: {
    backgroundColor: '#2563eb',
  },
  commBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },

  /* Shelter Card */
  shelterCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  shelterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  shelterSectionTitle: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  shelterNameText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  shelterMetaText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  /* Stepper */
  stepperContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  stepperHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperHeaderTitle: {
    color: '#94a3b8',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  currentStatusPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  currentStatusPillText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '900',
  },
  progressMilestonesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  milestoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#334155',
  },
  milestoneDotActive: {
    backgroundColor: '#38bdf8',
  },
  milestoneLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#334155',
  },
  milestoneLineActive: {
    backgroundColor: '#38bdf8',
  },
  stepperActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: radii.lg,
    minHeight: 52,
    ...shadows.md,
  },
  btnBlue: {
    backgroundColor: '#2563eb',
  },
  btnAmber: {
    backgroundColor: '#d97706',
  },
  btnCyan: {
    backgroundColor: '#0891b2',
  },
  btnGreen: {
    backgroundColor: '#16a34a',
  },
  btnDarkOutline: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  stepperActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stepperActionBtnTextSubtle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Standby Card */
  standbyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },
  standbyGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  standbyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  standbySubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
    lineHeight: 18,
  },
  standbyInfoBox: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  /* Multi-mission switcher */
  missionSwitcherBox: {
    marginBottom: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: radii.md,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  missionSwitcherLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 2,
  },
  missionChipScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  missionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  missionChipActive: {
    backgroundColor: '#d97706',
    borderColor: '#f59e0b',
  },
  missionChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 200,
  },
  missionChipTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
