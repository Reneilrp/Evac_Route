import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Play, Pause, FastForward, ChevronUp } from 'lucide-react-native';
import RescueSimulationStepper from './RescueSimulationStepper';

export default function RescueSimulationPanel({
  showDemoControls,
  setShowDemoControls,
  isSimulationActive,
  isPaused,
  togglePause,
  simSpeed,
  setSimSpeed,
  isNavigating,
  simPhase,
  skipToGeofence,
  handleDropRoadblock,
  stopSimulation,
  resetSimulation,
  navigation,
  currentMission,
  activeMission,
  simulationStep,
  safeVibrate,
  insets,
  styles,
}) {
  return (
    <>
      {/* ─── GUIDED 5-STEP SIMULATION DOCK (COLLAPSIBLE) ─── */}
      {showDemoControls && (
        <View
          style={[styles.guidedSimContainer, { paddingBottom: Math.max(insets.bottom, 14) }]}
          pointerEvents="box-none"
        >
          {/* Floating Speed & Playback Controller Dock */}
          {isSimulationActive && (
            <View style={styles.simControlFloatingBarAttached} pointerEvents="auto">
              {/* Play / Pause Button */}
              <TouchableOpacity
                style={[styles.simPlayPauseBtn, isPaused && styles.simPlayPauseBtnPaused]}
                onPress={togglePause}
                accessibilityLabel={isPaused ? 'Resume Navigation' : 'Pause Navigation'}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isPaused ? (
                  <Play size={16} color="#ffffff" fill="#ffffff" />
                ) : (
                  <Pause size={16} color="#ffffff" fill="#ffffff" />
                )}
              </TouchableOpacity>

              {/* Speed Multiplier Pills */}
              <View style={styles.simSpeedPillGroup}>
                {[1, 3, 5].map((spd) => {
                  const isSelected = simSpeed === spd;
                  return (
                    <TouchableOpacity
                      key={`sim-speed-${spd}`}
                      style={[styles.simSpeedPill, isSelected && styles.simSpeedPillActive]}
                      onPress={() => setSimSpeed(spd)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <Text style={[styles.simSpeedPillText, isSelected && styles.simSpeedPillTextActive]}>
                        {spd}x {spd === 1 ? '(10m/s)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Fast-Forward Skip to 20m Geofence */}
              <TouchableOpacity
                style={[
                  styles.simSkipBtn,
                  (!isNavigating || isPaused || simPhase === 'on_scene' || simPhase === 'shelter_arrival' || simPhase === 'completed') && styles.simBtnDisabled,
                ]}
                onPress={skipToGeofence}
                disabled={!isNavigating || isPaused || simPhase === 'on_scene' || simPhase === 'shelter_arrival' || simPhase === 'completed'}
                accessibilityLabel="Fast Forward to 20m Geofence"
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <FastForward size={14} color="#ffffff" />
                <Text style={styles.simSkipBtnText}>20m</Text>
              </TouchableOpacity>

              {/* Drop Roadblock Ahead */}
              <TouchableOpacity
                style={[
                  styles.simSkipBtn,
                  { backgroundColor: '#dc2626' },
                  (!isNavigating || isPaused || simPhase === 'on_scene' || simPhase === 'shelter_arrival' || simPhase === 'completed') && styles.simBtnDisabled,
                ]}
                onPress={handleDropRoadblock}
                disabled={!isNavigating || isPaused || simPhase === 'on_scene' || simPhase === 'shelter_arrival' || simPhase === 'completed'}
                accessibilityLabel="Report Impassable Roadblock Ahead"
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Text style={{ fontSize: 13 }}>🚧</Text>
              </TouchableOpacity>

              {/* Stop / Reset Simulation */}
              <TouchableOpacity
                style={styles.simStopBtn}
                onPress={() => {
                  stopSimulation();
                  resetSimulation();
                  setShowDemoControls(false);
                }}
                accessibilityLabel="Stop Simulation"
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.simStopBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Reusable 5-Step Simulation Lifecycle Stepper */}
          <RescueSimulationStepper
            navigation={navigation}
            currentScreen="map"
            activeMission={currentMission || activeMission}
            onClose={() => setShowDemoControls(false)}
          />
        </View>
      )}

      {/* ─── ACTIVE SIMULATION PROGRESS PILL (ABOVE BOTTOM DOCK) ─── */}
      {isSimulationActive && !showDemoControls && (
        <View
          style={[
            styles.simProgressPillAnchor,
            {
              bottom: (activeMission ? 174 : 114) + Math.max(insets.bottom, 14),
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.simProgressPillBtn}
            onPress={() => {
              setShowDemoControls(true);
              safeVibrate && safeVibrate(20);
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Expand simulation controls"
          >
            <View style={styles.simPillDotPulse} />
            <Text style={styles.simProgressPillText} numberOfLines={1}>
              ⚡ STEP {simulationStep} OF 5 •{' '}
              {simPhase === 'dispatched' && 'ACCEPT DISPATCH'}
              {simPhase === 'en_route' && '10M/S NAV (VICTIM)'}
              {simPhase === 'on_scene' && 'ON SCENE (≤20M)'}
              {simPhase === 'transporting' && '10M/S NAV (SHELTER)'}
              {simPhase === 'shelter_arrival' && 'SHELTER ARRIVAL (≤20M)'}
              {simPhase === 'completed' && 'CSWDO COMPLETED'}
              {' • VIEW PROGRESS'}
            </Text>
            <ChevronUp size={14} color="#f59e0b" />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
