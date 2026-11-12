import React, { useEffect, useState, useRef } from 'react';
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
  MessageSquare,
  Activity,
  ChevronRight,
  Compass,
  Building,
  Users,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import api from '../../services/api';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { getEcho } from '../../services/echo';
import { spacing, radii, shadows } from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { clampToZamboanga, ZAMBOANGA_RESCUER_BASE } from '../../utils/zamboangaGeo';
import { useRescueSimulationStore } from '../../context/useRescueSimulationStore';
import RescueSimulationStepper from '../../components/rescue/RescueSimulationStepper';
import FamilyTargetCard from '../../components/rescue/FamilyTargetCard';
import AssignedShelterCard from '../../components/rescue/AssignedShelterCard';
import MissionStatusStepper from '../../components/rescue/MissionStatusStepper';
import { getStyles } from '../../styles/RescueDuty.styles';

export default function RescueDuty({ navigation }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(getStyles);

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

  // Sync standby location to CDRRMO Live Map while on duty hub
  const rescuerGpsRef = useRef(rescuerGps);
  rescuerGpsRef.current = rescuerGps;

  useEffect(() => {
    const syncDutyLocation = () => {
      // If simulation is actively running on map, let RescueMapScreen be the sole telemetry source
      if (useRescueSimulationStore.getState().isSimulationActive) return;
      const coords = rescuerGpsRef.current;
      if (!coords || !Array.isArray(coords) || coords.length < 2) return;
      api.post('/user/location', {
        latitude: coords[1],
        longitude: coords[0],
      }).catch((_e) => {
        // Silent failure in background
      });
    };

    syncDutyLocation();
    const interval = setInterval(syncDutyLocation, 5000);
    return () => clearInterval(interval);
  }, []);

  const assignedUnit =
    unitsData?.find((u) => u.id === user?.assigned_rescue_unit_id) ||
    (user?.role === 'admin' ? unitsData?.[0] : null);

  const roleDisplayNames = {
    boat_pilot: 'Boat Pilot / Vessel Commander',
    lead_medic: 'Lead Paramedic / Medic',
    heavy_driver: 'Heavy 4x4 Driver / Navigator',
    rescue_swimmer: 'Field Rescue Swimmer / Rescuer',
    crew: 'Logistics & Radio Operator',
  };
  const rescuerRoleTitle = roleDisplayNames[user?.rescue_role] || 'Rescue Field Operator';

  const [selectedMissionId, setSelectedMissionId] = useState(null);

  const isSimulationActive = useRescueSimulationStore((state) => state.isSimulationActive);
  const simMission = useRescueSimulationStore((state) => state.simMission);
  const startSimulation = useRescueSimulationStore((state) => state.startSimulation);
  const stopSimulation = useRescueSimulationStore((state) => state.stopSimulation);
  const acceptDispatch = useRescueSimulationStore((state) => state.acceptDispatch);
  const resetToStandby = useRescueSimulationStore((state) => state.resetToStandby);

  const allActiveMissions = missionsData ?? [];
  const activeMissions = assignedUnit
    ? allActiveMissions.filter((m) => m.rescue_unit_id === assignedUnit.id)
    : (user?.role === 'admin' ? allActiveMissions : []);
  const realMission =
    (selectedMissionId ? activeMissions.find((m) => m.id === selectedMissionId) : null) ||
    activeMissions[0] ||
    (user?.role === 'admin' ? allActiveMissions[0] : null);
  const currentMission = isSimulationActive ? simMission : realMission;
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

  const isUpdatingStatusRef = useRef(false);

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
    onSettled: () => {
      isUpdatingStatusRef.current = false;
    },
  });

  const handleUpdateMissionStatus = (params) => {
    if (updateStatusMutation.isPending || isUpdatingStatusRef.current) return;
    isUpdatingStatusRef.current = true;
    updateStatusMutation.mutate(params);
  };

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
  const incidentHazType = currentMission?.incident?.hazard_type;
  const isSuppressionMission = ['building_fire', 'active_shooter', 'siege', 'chemical_spill'].includes(incidentHazType);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
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
          <TouchableOpacity onPress={refetchMissions} style={styles.refreshBtn} accessibilityLabel="Refresh missions">
            <RefreshCw color={colors.textSecondary} size={18} />
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

      {/* ─── RESCUE SIMULATION MODE BANNER (When inactive) ─── */}
      {!isSimulationActive && (
        <View style={styles.simBanner}>
          <View style={styles.simBannerInfo}>
            <View style={styles.simIndicatorCircle}>
              <Text style={{ fontSize: 13 }}>⚡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.simBannerTitle}>
                {realMission ? 'DYNAMIC RESCUE SIMULATOR' : 'GUIDED RESCUE SIMULATOR'}
              </Text>
              <Text style={styles.simBannerSub} numberOfLines={1}>
                {realMission
                  ? `Simulate mission: ${realMission.victim_name || realMission.control_no}`
                  : 'Simulate 5-step mission with 10m/s tactical navigation'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.simToggleBtn}
            onPress={() => {
              startSimulation(realMission || null);
              Alert.alert(
                '⚡ Rescue Simulation Mode Active',
                realMission
                  ? `Simulation dynamically linked to dispatched SOS: ${realMission.victim_name || realMission.control_no} (${realMission.headcount || 1} pax at ${realMission.barangay || 'Scene'})!`
                  : 'Emergency search & rescue simulator ready. Review and accept the dispatch below to start tactical navigation.'
              );
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.simToggleBtnText}>
              {realMission ? 'SIMULATE SOS' : 'START SIM'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(120, insets.bottom + 85) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingMissions}
            onRefresh={refetchMissions}
            tintColor={colors.primary}
          />
        }
      >
        {/* Reusable Cross-Screen 5-Step Simulation Lifecycle Dock */}
        {isSimulationActive && (
          <View style={{ marginBottom: 12 }}>
            <RescueSimulationStepper
              navigation={navigation}
              currentScreen="duty"
              activeMission={realMission || currentMission}
            />
          </View>
        )}

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
            <View style={styles.missionHeaderBar}>
              <View
                style={[
                  styles.triageBadge,
                  currentMission.triage_level === 'critical'
                    ? styles.triageCritical
                    : styles.triageUrgent,
                ]}
              >
                <AlertTriangle size={13} color="#ffffff" />
                <Text style={styles.triageBadgeText}>
                  {(currentMission.triage_level || 'CRITICAL').toUpperCase()} PRIORITY
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.controlNoText}>
                  {currentMission.control_no}
                </Text>
                {currentMission.intake_source && currentMission.intake_source !== 'mobile_sos' && (
                  <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#92400e' }}>
                      📞 {currentMission.intake_source === 'vhf_radio' ? 'VHF RADIO' : 'MANUAL CALL'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 2. Hero Navigation CTA Button (Prominent, High-Visibility) */}
            <TouchableOpacity
              style={[
                styles.heroNavigationCta,
                currentMission.status === 'dispatched'
                  ? styles.heroCtaDispatch
                  : currentMission.status === 'completed'
                    ? styles.heroCtaGreen
                    : (isTransportPhase ? styles.heroCtaCyan : styles.heroCtaBlue),
                isSimulationActive && currentMission?.status === 'dispatched' && styles.heroCtaDispatchPulse,
              ]}
              onPress={() => {
                if (isSimulationActive && currentMission?.status === 'dispatched') {
                  acceptDispatch();
                  navigation.navigate('RescueMap', { missionId: currentMission.id, isSimulation: true });
                } else if (isSimulationActive && currentMission?.status === 'completed') {
                  Alert.alert(
                    '🎉 Mission Simulation Concluded',
                    'CSWDO intake logged (+4 persons). Rescuer unit is back at Base. What would you like to do?',
                    [
                      {
                        text: '🔄 Run Simulation Again',
                        onPress: () => {
                          startSimulation();
                          Alert.alert('Simulation Restarted', 'Ready at Step 1: Incoming Dispatch in Duty Hub.');
                        },
                      },
                      {
                        text: '🟢 Return to Standby',
                        onPress: () => {
                          stopSimulation();
                        },
                        style: 'default',
                      },
                      {
                        text: 'Dismiss',
                        style: 'cancel',
                      },
                    ]
                  );
                } else if (!isSimulationActive && currentMission?.status === 'dispatched') {
                  handleUpdateMissionStatus({ id: currentMission.id, status: 'en_route' });
                  navigation.navigate('RescueMap', { missionId: currentMission.id, isSimulation: false });
                } else {
                  navigation.navigate('RescueMap', { missionId: currentMission.id, isSimulation: isSimulationActive });
                }
              }}
              activeOpacity={0.85}
              accessibilityLabel="Launch Tactical Navigation Map"
            >
              <View style={styles.heroCtaIconCircle}>
                {currentMission.status === 'dispatched' || currentMission.status === 'completed' ? (
                  <CheckCircle2 size={24} color="#ffffff" />
                ) : (
                  <Compass size={24} color="#ffffff" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroCtaTitle}>
                  {currentMission.status === 'dispatched'
                    ? 'ACCEPT DISPATCH & LAUNCH MAP'
                    : currentMission.status === 'completed'
                      ? 'MISSION COMPLETED • RESET TO STANDBY'
                      : (isSuppressionMission 
                        ? 'START TACTICAL ROUTING (MAP)' 
                        : (isTransportPhase
                          ? 'START ROUTE TO SHELTER (MAP)'
                          : 'START ROUTE TO FAMILY (MAP)'))}
                </Text>
                <Text style={styles.heroCtaSub}>
                  {currentMission.status === 'dispatched'
                    ? `Acknowledge order • Launch 10m/s tactical routing to ${currentMission.victim_name || 'scene'}`
                    : currentMission.status === 'completed'
                      ? 'CSWDO intake recorded (+4) • Unit on Standby for next rescue'
                      : (isSuppressionMission
                        ? 'Navigating to Incident Epicenter'
                        : (isTransportPhase
                          ? `Navigating to ${currentMission.target_shelter?.name || 'Safe Shelter'}`
                          : `Turn-by-turn routing to ${currentMission.victim_name || 'Target'}`))}
                </Text>
              </View>
              <ChevronRight size={22} color="#ffffff" />
            </TouchableOpacity>

            {/* 3. Family / Rescue Target Card */}
            <FamilyTargetCard
              currentMission={currentMission}
              isSuppressionMission={isSuppressionMission}
              getVulnerabilities={getVulnerabilities}
              handleCall={handleCall}
              handleQuickSms={handleQuickSms}
              styles={styles}
            />

            {/* 4. Assigned Drop-Off Evacuation Shelter Card */}
            <AssignedShelterCard
              currentMission={currentMission}
              shelters={shelters}
              styles={styles}
            />

            {/* 5. Linear Single-Action Operational Stepper (Hidden in Simulation Mode) */}
            <MissionStatusStepper
              currentMission={currentMission}
              isSimulationActive={isSimulationActive}
              isSuppressionMission={isSuppressionMission}
              shelters={shelters}
              assignedUnit={assignedUnit}
              navigation={navigation}
              updateStatusMutation={updateStatusMutation}
              handleUpdateMissionStatus={handleUpdateMissionStatus}
              acceptDispatch={acceptDispatch}
              resetToStandby={resetToStandby}
              setConfirmModal={setConfirmModal}
              closeConfirmModal={closeConfirmModal}
              styles={styles}
            />
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

    </View>
  );
}
