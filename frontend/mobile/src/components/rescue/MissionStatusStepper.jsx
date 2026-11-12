import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import {
  Navigation,
  MapPin,
  Shield,
  CheckCircle2,
} from 'lucide-react-native';

export default function MissionStatusStepper({
  currentMission,
  isSimulationActive = false,
  isSuppressionMission = false,
  shelters = [],
  assignedUnit,
  navigation,
  updateStatusMutation,
  handleUpdateMissionStatus,
  acceptDispatch,
  resetToStandby,
  setConfirmModal,
  closeConfirmModal,
  styles,
}) {
  if (!currentMission || isSimulationActive) return null;

  return (
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
          style={[
            styles.stepperActionBtn,
            styles.btnBlue,
            isSimulationActive && styles.simAcceptBtnGlow,
          ]}
          onPress={() => {
            if (isSimulationActive) {
              acceptDispatch();
              navigation.navigate('RescueMap', { missionId: currentMission.id, isSimulation: true });
            } else {
              handleUpdateMissionStatus({ id: currentMission.id, status: 'en_route' });
            }
          }}
          disabled={updateStatusMutation?.isPending}
          activeOpacity={0.85}
        >
          <Navigation size={18} color="#ffffff" />
          <Text style={styles.stepperActionBtnText}>
            {isSimulationActive ? 'ACCEPT DISPATCH & START 10M/S NAVIGATION' : '1. ACCEPT MISSION & EN ROUTE'}
          </Text>
        </TouchableOpacity>
      )}

      {currentMission.status === 'en_route' && (
        <TouchableOpacity
          style={[styles.stepperActionBtn, styles.btnAmber]}
          onPress={() =>
            handleUpdateMissionStatus({ id: currentMission.id, status: 'on_scene' })
          }
          disabled={updateStatusMutation?.isPending}
          activeOpacity={0.85}
        >
          <MapPin size={18} color="#ffffff" />
          <Text style={styles.stepperActionBtnText}>2. CONFIRM ARRIVED ON SCENE</Text>
        </TouchableOpacity>
      )}

      {currentMission.status === 'on_scene' && (
        <View style={{ gap: 10 }}>
          <TouchableOpacity
            style={[styles.stepperActionBtn, isSuppressionMission ? styles.btnGreen : styles.btnCyan]}
            onPress={() => {
              if (isSuppressionMission) {
                handleUpdateMissionStatus({
                  id: currentMission.id,
                  status: 'completed',
                });
              } else {
                handleUpdateMissionStatus({
                  id: currentMission.id,
                  status: 'transporting',
                  target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
                });
              }
            }}
            disabled={updateStatusMutation?.isPending}
            activeOpacity={0.85}
          >
            <Shield size={18} color="#ffffff" />
            <Text style={styles.stepperActionBtnText}>
              {isSuppressionMission ? '3. MARK THREAT NEUTRALIZED (COMPLETE)' : '3. START TRANSPORT TO SHELTER'}
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
                loading: updateStatusMutation?.isPending,
                onConfirm: () => {
                  closeConfirmModal();
                  handleUpdateMissionStatus({
                    id: currentMission.id,
                    status: 'staged_at_assembly',
                    staging_point_id: stagingPoint?.id,
                  });
                },
              });
            }}
            disabled={updateStatusMutation?.isPending}
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
            handleUpdateMissionStatus({
              id: currentMission.id,
              status: 'completed',
              target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
            })
          }
          disabled={updateStatusMutation?.isPending}
          activeOpacity={0.85}
        >
          <CheckCircle2 size={18} color="#ffffff" />
          <Text style={styles.stepperActionBtnText}>
            4. CONFIRM INTAKE HANDOVER & COMPLETE
          </Text>
        </TouchableOpacity>
      )}

      {isSimulationActive && currentMission.status === 'completed' && (
        <TouchableOpacity
          style={[styles.stepperActionBtn, styles.btnGreen]}
          onPress={() => {
            resetToStandby();
            Alert.alert('Simulation Concluded', 'Rescue mission completed and handed over. Unit is back on Standby.');
          }}
          activeOpacity={0.85}
        >
          <CheckCircle2 size={18} color="#ffffff" />
          <Text style={styles.stepperActionBtnText}>
            MISSION COMPLETED • RESET TO STANDBY
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
