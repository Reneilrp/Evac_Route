import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  LifeBuoy,
  Phone,
  MessageSquare,
  Navigation,
  Shield,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react-native';

export default function RescueMissionActionBar({
  showDemoControls,
  currentMission,
  isSimulationActive,
  isTransportPhase,
  simPhase,
  activeMission,
  activeTargetName,
  isNavigating,
  isPaused,
  handleDropRoadblock,
  activeRoadblocks = [],
  handleClearRoadblocks,
  handleCallVictim,
  handleSmsVictim,
  handleOpenGoogleMaps,
  handleStep3_ExtractAndReRoute,
  handleStep5_HandoverAndStandby,
  confirmVictimSecured,
  safeUpdateMissionStatus,
  shelters = [],
  isSuppressionMission,
  updateStatusMutation,
  setShowShelterArrivalModal,
  confirmHandoverAndStandby,
  navigation,
  insets,
  colors,
  styles,
}) {
  if (showDemoControls) return null;

  return (
    <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {(currentMission || isSimulationActive) ? (
        <View>
          {/* Target Status Banner */}
          <View style={styles.dockHeaderRow}>
            <View style={styles.dockStatusBadge}>
              <View
                style={[
                  styles.statusDot,
                  isTransportPhase ? styles.dotCyan : styles.dotAmber,
                ]}
              />
              <Text style={styles.dockStatusText}>
                {isSimulationActive
                  ? `SIM: ${simPhase.toUpperCase()}`
                  : (currentMission?.status || 'ACTIVE').toUpperCase()} • {currentMission?.control_no || 'OP-QRT'}
              </Text>
            </View>

            <View
              style={[
                styles.triageBadge,
                activeMission?.triage_level === 'critical'
                  ? styles.triageCritical
                  : styles.triageUrgent,
              ]}
            >
              <Text style={styles.triageBadgeText}>
                {(activeMission?.triage_level || 'URGENT').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Target Details */}
          <View style={styles.dockTargetInfo}>
            <Text style={styles.dockTargetTitle} numberOfLines={1}>
              {isTransportPhase
                ? `🏢 Delivering to: ${activeTargetName}`
                : `🚨 Extracting: ${activeMission?.victim_name} (${activeMission?.headcount} Persons)`}
            </Text>
            <Text style={styles.dockTargetSub} numberOfLines={1}>
              {isTransportPhase
                ? 'Drop-off: CSWDO Intake Desk • Auto registration enabled'
                : `Barangay: ${activeMission?.barangay || 'Baliwasan'} • Needs: ${activeMission?.special_needs || 'Standard evacuation'}`}
            </Text>
          </View>

          {/* 1-Click Fallback: Immediate Path Blocked & Tactical Reroute CTA */}
          {(simPhase === 'en_route' || simPhase === 'transporting' || currentMission?.status === 'en_route' || currentMission?.status === 'transporting' || (isNavigating && !isPaused)) && (
            <View style={{ marginTop: 8, marginBottom: 8, flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[styles.dockBtn, {
                  flex: 1,
                  backgroundColor: '#dc2626',
                  borderColor: '#f87171',
                  borderWidth: 1.5,
                  paddingVertical: 10,
                  shadowColor: '#dc2626',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.4,
                  shadowRadius: 4,
                  elevation: 4,
                }]}
                onPress={handleDropRoadblock}
                activeOpacity={0.75}
                accessibilityLabel="Path Blocked Reroute Detour"
              >
                <Text style={{ fontSize: 16 }}>🚧</Text>
                <Text style={[styles.dockBtnTextBold, { color: '#ffffff', fontSize: 12 }]}>
                  PATH BLOCKED • REROUTE DETOUR
                </Text>
              </TouchableOpacity>

              {activeRoadblocks.length > 0 && (
                <TouchableOpacity
                  style={[styles.dockBtn, {
                    backgroundColor: '#1e293b',
                    borderColor: '#475569',
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }]}
                  onPress={handleClearRoadblocks}
                  activeOpacity={0.75}
                  accessibilityLabel="Reset Roadblock Detours"
                >
                  <RotateCcw size={14} color="#94a3b8" />
                  <Text style={[styles.dockBtnText, { color: '#94a3b8', fontSize: 11 }]}>
                    Clear ({activeRoadblocks.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Tactical Action Buttons Row */}
          {!isTransportPhase && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: (currentMission?.status === 'on_scene' || currentMission?.status === 'transporting' || simPhase === 'on_scene' || simPhase === 'transporting') ? 6 : 0 }}>
              <TouchableOpacity
                style={[styles.dockBtn, styles.callBtn]}
                onPress={() => handleCallVictim && handleCallVictim(activeMission?.victim_phone)}
              >
                <Phone size={14} color={colors.white} />
                <Text style={styles.dockBtnText}>Call Victim</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dockBtn, styles.smsBtn]}
                onPress={() =>
                  handleSmsVictim && handleSmsVictim(
                    activeMission?.victim_phone,
                    activeMission?.victim_name,
                    activeMission?.barangay
                  )
                }
              >
                <MessageSquare size={14} color={colors.white} />
                <Text style={styles.dockBtnText}>Quick SMS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dockBtn, styles.externalBtn]}
                onPress={handleOpenGoogleMaps}
                accessibilityLabel="Open External Google Maps"
              >
                <Navigation size={14} color="#94a3b8" />
                <Text style={[styles.dockBtnText, { color: '#94a3b8' }]}>Maps</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Row 2: Status Advancement Primary CTA */}
          {(currentMission?.status === 'on_scene' || simPhase === 'on_scene') && (
            <TouchableOpacity
              style={[styles.dockBtn, styles.transportBtn, { width: '100%', paddingVertical: 12 }]}
              onPress={() => {
                if (handleStep3_ExtractAndReRoute) {
                  handleStep3_ExtractAndReRoute();
                } else if (isSimulationActive) {
                  confirmVictimSecured && confirmVictimSecured(shelters[0]);
                } else if (isSuppressionMission) {
                  safeUpdateMissionStatus && safeUpdateMissionStatus({
                    id: currentMission.id,
                    status: 'completed',
                  });
                } else {
                  safeUpdateMissionStatus && safeUpdateMissionStatus({
                    id: currentMission.id,
                    status: 'transporting',
                    target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
                  });
                }
              }}
              disabled={updateStatusMutation?.isPending}
            >
              <Shield size={16} color={colors.white} />
              <Text style={styles.dockBtnTextBold}>
                {isSuppressionMission ? 'MARK THREAT NEUTRALIZED (COMPLETE)' : 'START TRANSPORT TO SHELTER'}
              </Text>
            </TouchableOpacity>
          )}

          {(currentMission?.status === 'transporting' || simPhase === 'transporting' || simPhase === 'shelter_arrival') && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.dockBtn, styles.completeBtn, { flex: 1, paddingVertical: 12 }]}
                onPress={() => {
                  if (setShowShelterArrivalModal) {
                    setShowShelterArrivalModal(true);
                  } else if (handleStep5_HandoverAndStandby) {
                    handleStep5_HandoverAndStandby();
                  }
                }}
                disabled={updateStatusMutation?.isPending}
              >
                <CheckCircle2 size={16} color={colors.white} />
                <Text style={styles.dockBtnTextBold}>CONFIRM CSWDO INTAKE HANDOVER</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dockBtn, styles.externalBtn, { paddingHorizontal: 12 }]}
                onPress={handleOpenGoogleMaps}
                accessibilityLabel="Open External Google Maps"
              >
                <Navigation size={14} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}

          {(currentMission?.status === 'completed' || simPhase === 'completed') && (
            <TouchableOpacity
              style={[styles.dockBtn, styles.completeBtn, { width: '100%', paddingVertical: 12, backgroundColor: '#059669' }]}
              onPress={() => {
                if (isSimulationActive) {
                  confirmHandoverAndStandby && confirmHandoverAndStandby();
                }
                if (navigation) {
                  navigation.navigate('Rescue');
                }
              }}
            >
              <CheckCircle2 size={16} color={colors.white} />
              <Text style={styles.dockBtnTextBold}>MISSION COMPLETED • RETURN TO DUTY HUB</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.noMissionDock}>
          <LifeBuoy size={24} color="#34d399" />
          <Text style={styles.noMissionText}>
            Unit on Active Standby • Listening for incoming CDRRMO dispatch orders
          </Text>
        </View>
      )}
    </View>
  );
}
