import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Navigation, X } from 'lucide-react-native';

export default function NavigationTurnBanner({
  isActiveTurnByTurn,
  setIsActiveTurnByTurn,
  setIsNavigating,
  setCachedRoute,
  setSelectedShelter,
  triggerCasualHaptic,
  insets,
  routeSteps,
  currentStepIndex,
  activeTargetShelter,
  distanceKm,
  distanceMeters,
  transportationMode,
  getETAMinutes,
  cameraRef,
  activeUserLocation,
  cachedRoute,
  targetShelterCoords,
  getBearing,
  isNavigating,
  sheetHeightRef,
  handleStartActiveNavigation,
}) {
  return (
    <>
      {/* ─── GOOGLE MAPS STYLE TURN-BY-TURN TOP NAVIGATION BANNER ─── */}
      {isActiveTurnByTurn && (
        <View style={{
          position: 'absolute',
          top: Math.max(insets.top + 10, 50),
          left: 16,
          right: 16,
          backgroundColor: '#0f172a',
          borderRadius: 20,
          padding: 16,
          borderWidth: 2,
          borderColor: '#16a34a',
          zIndex: 100,
          elevation: 15,
          shadowColor: '#16a34a',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#16a34a',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#4ade80',
              }}>
                <Text style={{ fontSize: 24, color: '#ffffff' }}>
                  {routeSteps[currentStepIndex]?.type?.includes('right') || routeSteps[currentStepIndex]?.modifier?.includes('right') ? '↱' :
                   routeSteps[currentStepIndex]?.type?.includes('left') || routeSteps[currentStepIndex]?.modifier?.includes('left') ? '↰' :
                   routeSteps[currentStepIndex]?.type?.includes('arrive') ? '🏁' : '⬆️'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>
                  {routeSteps[currentStepIndex]?.distanceMeters ? `IN ${routeSteps[currentStepIndex].distanceMeters} METERS` : 'TURN INSTRUCTION'}
                </Text>
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold', marginTop: 2 }} numberOfLines={2}>
                  {(routeSteps[currentStepIndex]?.instruction || `Proceed Forward towards ${activeTargetShelter?.name || 'Destination'}`)
                    .replace(/head\s+(north|south|east|west|northwest|northeast|southwest|southeast)/gi, 'Proceed Forward')
                    .replace(/\b(north|south|east|west|northwest|northeast|southwest|southeast)\b/gi, 'Forward')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setIsActiveTurnByTurn(false);
                setIsNavigating(false);
                setCachedRoute(null);
                triggerCasualHaptic(50);
              }}
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ef4444' }}
            >
              <X size={18} color="#f87171" />
            </TouchableOpacity>
          </View>

          {/* Bottom stats pill inside turn banner */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Navigation size={14} color="#38bdf8" />
              <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '800' }}>
                {distanceKm} km ({getETAMinutes(distanceMeters, transportationMode)})
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (cameraRef.current && activeUserLocation) {
                  const nextPoint = (cachedRoute && cachedRoute.length > 1) ? cachedRoute[1] : targetShelterCoords;
                  const forwardBearing = (nextPoint && activeUserLocation)
                    ? getBearing(activeUserLocation[1], activeUserLocation[0], nextPoint[1], nextPoint[0])
                    : 0;

                  cameraRef.current.setCamera({
                    centerCoordinate: activeUserLocation,
                    zoomLevel: 17.5,
                    pitch: 0, // Eagle View: Top-down vertical perspective directly above user location
                    heading: forwardBearing,
                    animationDuration: 600,
                  });
                  triggerCasualHaptic(40);
                }
              }}
              style={{ backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
            >
              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '900' }}>🎯 RECENTER</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Active Route Overview Floating Bar with ▶ START NAVIGATION ─── */}
      {isNavigating && !isActiveTurnByTurn && (
        <Animated.View style={{
          position: 'absolute',
          bottom: Animated.add(sheetHeightRef.current, 16),
          left: 16,
          right: 16,
          backgroundColor: '#0f172a',
          borderRadius: 20,
          padding: 14,
          borderWidth: 2,
          borderColor: '#38bdf8',
          zIndex: 42,
          elevation: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
              ROUTE CALCULATED ({distanceKm} km)
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold' }} numberOfLines={1}>
              To: {activeTargetShelter?.name || 'Destination'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={handleStartActiveNavigation}
              style={{
                backgroundColor: '#16a34a',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: '#4ade80',
                elevation: 6,
              }}
            >
              <Navigation size={15} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '900' }}>
                ▶ START NAVIGATION
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsNavigating(false);
                setCachedRoute(null);
                setSelectedShelter(null);
                triggerCasualHaptic(30);
              }}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: 9,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

    </>
  );
}
