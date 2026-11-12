import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  ArrowLeft,
  Radio,
  RotateCcw,
  LifeBuoy,
  Crosshair,
  MapPin,
  Navigation,
} from 'lucide-react-native';
import { spacing } from '../../styles/theme';

export default function RescueTopHud({
  insets,
  activeMission,
  isTransportPhase,
  handleBackToDutyHub,
  isDarkMode,
  colors,
  refetchMissions,
  currentStep,
  getTurnIcon,
  activeTargetName,
  distanceToTarget,
  totalDistanceKm,
  totalEtaMinutes,
  isLoadingRoute,
  routeData,
  activeRescuerLocation = [0, 0],
  isFreeCam,
  isSimulationActive,
  handleCenterOnRescuer,
  handleCenterOnDestination,
  handleFitOverview,
  activeTargetLngLat,
  proximityAnnouncement,
  styles,
}) {
  return (
    <>
      {/* ─── TOP TACTICAL NAVIGATION HUD ─── */}
      <View style={[styles.topHudContainer, { paddingTop: insets.top + spacing.xs }]} pointerEvents="box-none">
        {/* Header Bar */}
        <View style={styles.topHudHeader} pointerEvents="auto">
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBackToDutyHub}
            activeOpacity={0.7}
            accessibilityLabel="Back to Duty Hub"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={18} color={isDarkMode ? colors.white : colors.textPrimary} />
            <Text style={styles.backBtnText}>Duty Hub</Text>
          </TouchableOpacity>

          <View style={[styles.phaseBadge, !activeMission && styles.phaseBadgeStandby]}>
            <Radio size={12} color={activeMission ? '#34d399' : '#60a5fa'} />
            <Text style={styles.phaseBadgeText}>
              {activeMission
                ? (isTransportPhase ? 'PHASE 2: SHELTER TRANSPORT' : 'PHASE 1: VICTIM EXTRACTION')
                : 'FLEET STANDBY • READY'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              style={styles.mapStyleBtn}
              onPress={() => refetchMissions && refetchMissions()}
              accessibilityLabel="Refresh Missions"
            >
              <RotateCcw size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {activeMission ? (
          <>
            {/* Turn-by-Turn Card */}
            <View style={styles.maneuverCard}>
              <View style={styles.maneuverIconCircle}>
                <Text style={styles.maneuverIconText}>
                  {getTurnIcon && getTurnIcon(currentStep?.type, currentStep?.modifier)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.maneuverDistance}>
                  {currentStep?.distanceMeters > 0
                    ? `IN ${currentStep.distanceMeters} METERS`
                    : 'UPCOMING MANEUVER'}
                </Text>
                <Text style={styles.maneuverInstruction} numberOfLines={2}>
                  {currentStep?.instruction || `Proceed toward ${activeTargetName}`}
                </Text>
              </View>

              <View style={styles.proximityPill}>
                <Text style={styles.proximityDistance}>{distanceToTarget}m</Text>
                <Text style={styles.proximityLabel}>TO TARGET</Text>
              </View>
            </View>

            {/* Trip Stats Footer Bar */}
            <View style={styles.tripStatsRow}>
              <Text style={styles.tripStatsText}>
                🏁 {totalDistanceKm} km • ⏱ ~{totalEtaMinutes} min • Target: {activeTargetName}
              </Text>
              {isLoadingRoute && <ActivityIndicator size="small" color="#38bdf8" />}
            </View>

            {/* Tactical Engine Status Chip */}
            {routeData?.tacticalTelemetry && (
              <View
                style={[
                  styles.tacticalStrategyBadge,
                  routeData.tacticalTelemetry.badgeType === 'water' && styles.tacticalBadgeWater,
                  routeData.tacticalTelemetry.badgeType === 'wading' && styles.tacticalBadgeWading,
                  routeData.tacticalTelemetry.badgeType === 'detour' && styles.tacticalBadgeDetour,
                ]}
              >
                <Text style={styles.tacticalStrategyText} numberOfLines={1}>
                  {routeData.tacticalTelemetry.statusText}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.standbyHudCard}>
            <LifeBuoy size={20} color="#34d399" />
            <View style={{ flex: 1 }}>
              <Text style={styles.standbyHudTitle}>Active Standby Monitoring</Text>
              <Text style={styles.standbyHudSub}>
                GPS: {activeRescuerLocation[1]?.toFixed(4)}°N, {activeRescuerLocation[0]?.toFixed(4)}°E • Sector: Zamboanga City
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ─── FREE CAM TACTICAL STATUS PILL & QUICK NAVIGATION BAR ─── */}
      {isFreeCam && (isSimulationActive || activeMission) && (
        <View
          style={[
            styles.freeCamPillContainer,
            { top: insets.top + (activeMission ? 144 : 72) },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.freeCamBar}>
            <View style={styles.freeCamBadge}>
              <Text style={styles.freeCamBadgeText}>🎥 FREE CAM</Text>
            </View>

            {/* 1. Recenter to Vehicle */}
            <TouchableOpacity
              style={styles.freeCamActionBtn}
              onPress={handleCenterOnRescuer}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              accessibilityLabel="Recenter on Rescuer Vehicle"
            >
              <Crosshair size={13} color="#10b981" />
              <Text style={[styles.freeCamActionBtnText, { color: '#10b981' }]}>
                RECENTER VEHICLE
              </Text>
            </TouchableOpacity>

            {/* 2. Center specifically on Destination */}
            {activeTargetLngLat && (
              <TouchableOpacity
                style={styles.freeCamActionBtn}
                onPress={handleCenterOnDestination}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                accessibilityLabel="Center on Destination"
              >
                <MapPin size={13} color="#38bdf8" />
                <Text style={[styles.freeCamActionBtnText, { color: '#38bdf8' }]}>
                  {isTransportPhase ? 'SHELTER' : 'DESTINATION'}
                </Text>
              </TouchableOpacity>
            )}

            {/* 3. Fit Route Overview */}
            <TouchableOpacity
              style={styles.freeCamActionBtn}
              onPress={handleFitOverview}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              accessibilityLabel="Fit Entire Route"
            >
              <Navigation size={13} color="#f59e0b" />
              <Text style={[styles.freeCamActionBtnText, { color: '#f59e0b' }]}>
                FIT ROUTE
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── HANDS-FREE AUTOMATED PROXIMITY HUD ANNOUNCEMENT (≤ 20M) ─── */}
      {proximityAnnouncement && (
        <View style={{
          position: 'absolute',
          top: insets.top + 72,
          left: 16,
          right: 16,
          backgroundColor: '#0f172a',
          borderRadius: 14,
          padding: 12,
          borderWidth: 2,
          borderColor: proximityAnnouncement.color,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 10,
          zIndex: 9999,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
          <View style={{ width: 6, height: 36, borderRadius: 3, backgroundColor: proximityAnnouncement.color }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 }}>
              {proximityAnnouncement.title}
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
              {proximityAnnouncement.subtitle}
            </Text>
          </View>
        </View>
      )}
    </>
  );
}
