import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import {
  Check,
  Navigation,
  MapPin,
  Shield,
  Building,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
} from 'lucide-react-native';
import { spacing, radii } from '../styles/theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useRescueSimulationStore } from '../context/useRescueSimulationStore';

// Safe vibration helper to prevent emulator Binder thread blocking
const safeVibrate = (pattern) => {
  try {
    Vibration.vibrate(pattern);
  } catch (_e) {
    // Graceful fallback on emulators without haptic motors
  }
};

export default function RescueSimulationStepper({
  navigation,
  currentScreen = 'duty', // 'duty' | 'map'
  onClose = null,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(getStyles);

  const isSimulationActive = useRescueSimulationStore((state) => state.isSimulationActive);
  const simPhase = useRescueSimulationStore((state) => state.simPhase);
  const isNavigating = useRescueSimulationStore((state) => state.isNavigating);
  const acceptDispatch = useRescueSimulationStore((state) => state.acceptDispatch);
  const confirmVictimSecured = useRescueSimulationStore((state) => state.confirmVictimSecured);
  const confirmHandoverAndStandby = useRescueSimulationStore((state) => state.confirmHandoverAndStandby);
  const skipToGeofence = useRescueSimulationStore((state) => state.skipToGeofence);
  const resetToStandby = useRescueSimulationStore((state) => state.resetToStandby);
  const startSimulation = useRescueSimulationStore((state) => state.startSimulation);
  const stopSimulation = useRescueSimulationStore((state) => state.stopSimulation);

  // Compute current step 1-5 from simPhase
  const currentStep = (() => {
    switch (simPhase) {
      case 'dispatched':
      case 'standby':
        return 1;
      case 'en_route':
        return 2;
      case 'on_scene':
        return 3;
      case 'transporting':
        return 4;
      case 'shelter_arrival':
      case 'completed':
        return 5;
      default:
        return 1;
    }
  })();

  const handleStepPress = (stepNum) => {
    safeVibrate(20);
    if (stepNum === 1) {
      resetToStandby();
      startSimulation();
      if (currentScreen !== 'duty' && navigation) {
        navigation.navigate('Rescue');
      }
    } else if (stepNum === 2) {
      if (simPhase === 'dispatched') {
        acceptDispatch();
      } else if (simPhase !== 'en_route') {
        startSimulation();
        acceptDispatch();
      }
      if (currentScreen !== 'map' && navigation) {
        navigation.navigate('RescueMap', { isSimulation: true });
      }
    } else if (stepNum === 3) {
      if (simPhase === 'dispatched' || simPhase === 'completed') {
        startSimulation();
        acceptDispatch();
      }
      if (currentScreen !== 'map' && navigation) {
        navigation.navigate('RescueMap', { isSimulation: true });
      }
      skipToGeofence();
    } else if (stepNum === 4) {
      if (simPhase === 'dispatched' || simPhase === 'completed') {
        startSimulation();
        acceptDispatch();
      }
      confirmVictimSecured();
      if (currentScreen !== 'map' && navigation) {
        navigation.navigate('RescueMap', { isSimulation: true });
      }
    } else if (stepNum === 5) {
      confirmHandoverAndStandby();
      if (currentScreen !== 'duty' && navigation) {
        navigation.navigate('Rescue');
      }
    }
  };

  const handlePrimaryAction = () => {
    safeVibrate(25);
    if (currentStep === 1) {
      acceptDispatch();
      if (navigation) {
        navigation.navigate('RescueMap', { isSimulation: true });
      }
    } else if (currentStep === 2) {
      skipToGeofence();
    } else if (currentStep === 3) {
      confirmVictimSecured();
    } else if (currentStep === 4) {
      skipToGeofence();
    } else if (currentStep === 5) {
      if (simPhase === 'completed') {
        handleRestartStep1();
      } else {
        confirmHandoverAndStandby();
        if (navigation) {
          navigation.navigate('Rescue');
        }
      }
    }
  };

  const handleRestartStep1 = () => {
    resetToStandby();
    startSimulation();
    safeVibrate(30);
    if (currentScreen !== 'duty' && navigation) {
      navigation.navigate('Rescue');
    }
  };

  if (!isSimulationActive) return null;

  if (currentScreen === 'duty') {
    return (
      <View style={styles.dutyContainer}>
        {/* Header Bar */}
        <View style={styles.dutyHeaderRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={{ fontSize: 12 }}>⚡</Text>
            <Text style={styles.dutyHeaderTitle}>
              RESCUE SIMULATION • STEP {currentStep} OF 5
            </Text>
          </View>

          <View style={styles.dutyHeaderActions}>
            <TouchableOpacity
              style={styles.dutyRestartBtn}
              onPress={handleRestartStep1}
              activeOpacity={0.7}
              accessibilityLabel="Restart Simulation"
            >
              <RotateCcw size={10} color={colors.textSecondary} />
              <Text style={styles.dutyRestartText}>Restart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dutyExitBtn}
              onPress={() => {
                stopSimulation();
              }}
              activeOpacity={0.7}
              accessibilityLabel="Exit Simulation"
            >
              <Text style={styles.dutyExitText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5-Step Progress Nodes Strip */}
        <View style={styles.stepperStrip}>
          {[
            { num: 1, label: 'Duty Hub' },
            { num: 2, label: '10m/s Nav' },
            { num: 3, label: '20m Victim' },
            { num: 4, label: 'Shelter Nav' },
            { num: 5, label: 'CSWDO Done' },
          ].map((step, idx) => {
            const isPast = step.num < currentStep;
            const isCurrent = step.num === currentStep;
            return (
              <React.Fragment key={`step-${step.num}`}>
                <TouchableOpacity
                  style={[
                    styles.stepNode,
                    isCurrent && styles.stepNodeCurrent,
                    isPast && styles.stepNodePast,
                  ]}
                  onPress={() => handleStepPress(step.num)}
                  activeOpacity={0.8}
                >
                  {isPast ? (
                    <Check size={11} color="#ffffff" />
                  ) : (
                    <Text style={[styles.stepNodeText, isCurrent && styles.stepNodeTextCurrent]}>
                      {step.num}
                    </Text>
                  )}
                </TouchableOpacity>
                {idx < 4 && (
                  <View
                    style={[
                      styles.stepConnector,
                      isPast && styles.stepConnectorPast,
                      isCurrent && styles.stepConnectorCurrent,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Concise Phase Label */}
        <View style={styles.dutyPhaseRow}>
          <Text style={styles.dutyPhaseLabel}>
            CURRENT PHASE:{' '}
            <Text style={styles.dutyPhaseValue}>
              {currentStep === 1 && '1. Incoming Dispatch • Accept below to begin'}
              {currentStep === 2 && '2. En Route • 10m/s navigation to distress resident'}
              {currentStep === 3 && '3. On Scene (≤20m) • Proximity geofence triggered'}
              {currentStep === 4 && '4. Transporting • 10m/s navigation to evacuation shelter'}
              {currentStep === 5 && '5. Completed • CSWDO intake recorded & returned to standby'}
            </Text>
          </Text>
        </View>

        {/* Duty Screen Direct Action CTA */}
        <TouchableOpacity
          style={[
            styles.dutyActionBtn,
            currentStep === 1 && styles.btnBlue,
            currentStep >= 2 && currentStep <= 4 && styles.btnAmber,
            currentStep === 5 && styles.btnGreen,
          ]}
          onPress={() => {
            if (currentStep === 1) {
              acceptDispatch();
              if (navigation) navigation.navigate('RescueMap', { isSimulation: true });
            } else if (currentStep >= 2 && currentStep <= 4) {
              if (navigation) navigation.navigate('RescueMap', { isSimulation: true });
            } else if (currentStep === 5) {
              handleRestartStep1();
            }
          }}
          activeOpacity={0.85}
        >
          {currentStep === 1 && <Navigation size={13} color="#ffffff" />}
          {currentStep >= 2 && currentStep <= 4 && <MapPin size={13} color="#ffffff" />}
          {currentStep === 5 && <RotateCcw size={13} color="#ffffff" />}
          <Text style={styles.dutyActionBtnText}>
            {currentStep === 1 && '▶ ACCEPT DISPATCH & LAUNCH MAP (STEP 2)'}
            {currentStep >= 2 && currentStep <= 4 && '🗺 CONTINUE TACTICAL MAP NAVIGATION'}
            {currentStep === 5 && '🔄 RESTART SIMULATION (STEP 1)'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Text style={{ fontSize: 13 }}>⚡</Text>
          <Text style={styles.headerTitle}>GUIDED RESCUE SIMULATION • 5-STEP LIFECYCLE</Text>
        </View>
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            accessibilityLabel="Close simulation controls"
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 5-Step Progress Nodes Strip */}
      <View style={styles.stepperStrip}>
        {[
          { num: 1, label: 'Duty Hub' },
          { num: 2, label: '10m/s Nav' },
          { num: 3, label: '20m Victim' },
          { num: 4, label: 'Shelter Nav' },
          { num: 5, label: 'CSWDO Done' },
        ].map((step, idx) => {
          const isPast = step.num < currentStep;
          const isCurrent = step.num === currentStep;
          return (
            <React.Fragment key={`step-${step.num}`}>
              <TouchableOpacity
                style={[
                  styles.stepNode,
                  isCurrent && styles.stepNodeCurrent,
                  isPast && styles.stepNodePast,
                ]}
                onPress={() => handleStepPress(step.num)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                {isPast ? (
                  <Check size={11} color="#ffffff" />
                ) : (
                  <Text style={[styles.stepNodeText, isCurrent && styles.stepNodeTextCurrent]}>
                    {step.num}
                  </Text>
                )}
              </TouchableOpacity>
              {idx < 4 && (
                <View
                  style={[
                    styles.stepConnector,
                    isPast && styles.stepConnectorPast,
                    isCurrent && styles.stepConnectorCurrent,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Step Info Box */}
      <View style={styles.stepInfoCard}>
        <View style={styles.stepInfoHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>STEP {currentStep} OF 5</Text>
          </View>
          <Text style={styles.stepStageName}>
            {currentStep === 1 && 'DUTY HUB • ACCEPT DISPATCH'}
            {currentStep === 2 && 'TACTICAL MAP • 10M/S NAVIGATION'}
            {currentStep === 3 && 'VICTIM 20M GEOFENCE & EXTRACTION'}
            {currentStep === 4 && 'SHELTER 10M/S NAV & GATE GEOFENCE'}
            {currentStep === 5 && 'CSWDO INTAKE HANDOVER & STANDBY'}
          </Text>
        </View>

        <Text style={styles.stepDesc}>
          {currentStep === 1 &&
            'Review incoming dispatch alert in Duty Hub and accept to start.'}
          {currentStep === 2 &&
            'Navigating along Amber polyline at 10m/s toward distress residence.'}
          {currentStep === 3 &&
            'Rescuer within 20m of victim. Secure onboard and reroute to shelter.'}
          {currentStep === 4 &&
            'Navigating at 10m/s along Cyan polyline to shelter 20m geofence square.'}
          {currentStep === 5 &&
            'CSWDO intake logged (+4 persons). Resetting unit to standby.'}
        </Text>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            currentStep === 1 && styles.btnBlue,
            currentStep === 2 && styles.btnAmber,
            currentStep === 3 && styles.btnCyan,
            currentStep === 4 && styles.btnIndigo,
            currentStep === 5 && styles.btnGreen,
          ]}
          onPress={handlePrimaryAction}
          activeOpacity={0.85}
        >
          {currentStep === 1 && <Navigation size={16} color="#ffffff" />}
          {currentStep === 2 && <MapPin size={16} color="#ffffff" />}
          {currentStep === 3 && <Shield size={16} color="#ffffff" />}
          {currentStep === 4 && <Building size={16} color="#ffffff" />}
          {currentStep === 5 && <CheckCircle2 size={16} color="#ffffff" />}
          <Text style={styles.actionBtnText}>
            {currentStep === 1 && '▶ 1. ACCEPT DISPATCH (DUTY HUB)'}
            {currentStep === 2 && (isNavigating ? '⏩ FAST-FORWARD TO 20M GEOFENCE' : '▶ START 10M/S NAVIGATION')}
            {currentStep === 3 && '🔄 3. CONFIRM VICTIMS SECURED & REROUTE'}
            {currentStep === 4 && '🏢 4. FAST-FORWARD TO SHELTER 20M GEOFENCE'}
            {currentStep === 5 && '🏁 5. CONFIRM HANDOVER & STANDBY (DUTY HUB)'}
          </Text>
          <ArrowRight size={14} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Footer Utilities */}
      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.utilBtn} onPress={handleRestartStep1} activeOpacity={0.8}>
          <RotateCcw size={11} color="#94a3b8" />
          <Text style={styles.utilBtnText}>Restart Step 1 (Duty Hub)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.utilBtn}
          onPress={() => {
            stopSimulation();
            if (currentScreen !== 'duty' && navigation) {
              navigation.navigate('Rescue');
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.utilBtnText, { color: '#ef4444' }]}>Exit Simulation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  dutyContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.4)' : '#f59e0b',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dutyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  dutyHeaderTitle: {
    color: '#f59e0b',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  dutyHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dutyRestartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: radii.sm,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
  },
  dutyRestartText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dutyExitBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
  },
  dutyExitText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
  },
  dutyPhaseRow: {
    paddingHorizontal: 4,
    marginTop: 2,
  },
  dutyPhaseLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  dutyPhaseValue: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dutyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    marginTop: 8,
  },
  dutyActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  container: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#f59e0b',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  stepperStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.9)',
    borderRadius: radii.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  stepNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: isDarkMode ? '#334155' : '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNodeCurrent: {
    backgroundColor: '#f59e0b',
    transform: [{ scale: 1.15 }],
  },
  stepNodePast: {
    backgroundColor: '#10b981',
  },
  stepNodeText: {
    color: isDarkMode ? '#94a3b8' : '#64748b',
    fontSize: 10,
    fontWeight: '900',
  },
  stepNodeTextCurrent: {
    color: '#ffffff',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: isDarkMode ? '#334155' : '#cbd5e1',
    marginHorizontal: 3,
  },
  stepConnectorPast: {
    backgroundColor: '#10b981',
  },
  stepConnectorCurrent: {
    backgroundColor: '#f59e0b',
  },
  stepInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  stepBadge: {
    backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
  },
  stepBadgeText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stepStageName: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    flex: 1,
  },
  stepDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  btnBlue: {
    backgroundColor: '#0284c7',
  },
  btnAmber: {
    backgroundColor: '#d97706',
  },
  btnCyan: {
    backgroundColor: '#0891b2',
  },
  btnIndigo: {
    backgroundColor: '#4f46e5',
  },
  btnGreen: {
    backgroundColor: '#059669',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  utilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
  },
  utilBtnText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
});
