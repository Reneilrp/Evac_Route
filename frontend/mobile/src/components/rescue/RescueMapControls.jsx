import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Crosshair,
  Navigation2,
  MapPin,
  RotateCcw,
  AlertTriangle,
  Play,
  Layers,
} from 'lucide-react-native';

export default function RescueMapControls({
  isFreeCam,
  handleCenterOnRescuer,
  toggleFreeCam,
  activeTargetLngLat,
  handleCenterOnDestination,
  handleDropRoadblock,
  activeRoadblocks = [],
  handleClearRoadblocks,
  showDisasterView,
  setShowDisasterView,
  triggerCasualHaptic,
  activeHazards = [],
  showDemoControls,
  setShowDemoControls,
  isSimulationActive,
  setShowStartSimModal,
  mapStyleMode,
  setMapStyleMode,
  safeVibrate,
  insets,
  activeMission,
  isDarkMode,
  colors,
  styles,
}) {
  return (
    <>
      {/* ─── FLOATING ACTION CONTROLS (RIGHT) ─── */}
      <View style={styles.floatingControls}>
        {/* Free Cam / Recenter Vehicle Toggle */}
        <TouchableOpacity
          style={[
            styles.floatingBtn,
            isFreeCam && { borderColor: '#f59e0b', backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : '#fffbeb' },
          ]}
          onPress={isFreeCam ? handleCenterOnRescuer : toggleFreeCam}
          accessibilityLabel={isFreeCam ? 'Recenter on Vehicle (Follow Mode)' : 'Enable Free Cam Mode'}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isFreeCam ? (
            <Crosshair size={20} color="#f59e0b" />
          ) : (
            <Navigation2 size={20} color="#10b981" />
          )}
        </TouchableOpacity>

        {/* Center to Destination Button */}
        {activeTargetLngLat && (
          <TouchableOpacity
            style={[styles.floatingBtn, { borderColor: '#38bdf8' }]}
            onPress={handleCenterOnDestination}
            accessibilityLabel="Inspect Destination Location"
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MapPin size={18} color="#38bdf8" />
          </TouchableOpacity>
        )}

        {/* 1-Tap Roadblock Injection */}
        <TouchableOpacity
          style={[styles.floatingBtn, { backgroundColor: '#dc2626', borderColor: '#f87171' }]}
          onPress={handleDropRoadblock}
          accessibilityLabel="Drop Physical Roadblock Ahead"
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 16 }}>🚧</Text>
        </TouchableOpacity>

        {/* Clear Roadblocks Button */}
        {activeRoadblocks.length > 0 && (
          <TouchableOpacity
            style={[styles.floatingBtn, { backgroundColor: '#0284c7', borderColor: '#38bdf8' }]}
            onPress={handleClearRoadblocks}
            accessibilityLabel="Clear Roadblocks"
          >
            <RotateCcw size={18} color="#ffffff" />
          </TouchableOpacity>
        )}

        {/* Disaster Situational View Toggle Button */}
        <TouchableOpacity
          style={[styles.floatingBtn, showDisasterView && styles.floatingBtnActive]}
          onPress={() => {
            setShowDisasterView(prev => !prev);
            triggerCasualHaptic && triggerCasualHaptic(20);
          }}
          accessibilityLabel="Disaster Situational View"
        >
          <AlertTriangle
            size={18}
            color={showDisasterView ? '#ef4444' : (activeHazards.length > 0 ? '#f59e0b' : colors.textPrimary)}
          />
        </TouchableOpacity>

        {/* Rescue Simulation Trigger */}
        <TouchableOpacity
          style={[styles.floatingBtn, (showDemoControls || isSimulationActive) && styles.floatingBtnActive]}
          onPress={() => {
            if (isSimulationActive) {
              setShowDemoControls(!showDemoControls);
            } else {
              setShowStartSimModal(true);
            }
          }}
          accessibilityLabel="Rescue Simulation"
        >
          <Play
            size={18}
            color={(showDemoControls || isSimulationActive) ? '#f59e0b' : colors.textPrimary}
            fill={(showDemoControls || isSimulationActive) ? '#f59e0b' : 'none'}
            style={{ marginLeft: 2 }}
          />
        </TouchableOpacity>
      </View>

      {/* ─── FLOATING MAP STYLE SWITCHER (BOTTOM-LEFT) ─── */}
      <View
        style={[
          styles.bottomLeftControls,
          {
            bottom: (showDemoControls ? 360 : (activeMission ? 170 : 110)) + Math.max(insets.bottom, 14),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.floatingBtn, mapStyleMode === 'satellite' && styles.floatingBtnActive]}
          onPress={() => {
            setMapStyleMode((prev) => (prev === 'satellite' ? 'default' : 'satellite'));
            safeVibrate && safeVibrate(25);
          }}
          accessibilityLabel="Toggle Satellite Layer"
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Layers size={20} color={mapStyleMode === 'satellite' ? '#f59e0b' : colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </>
  );
}
