import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';
import {
  Navigation,
  Crosshair,
  Maximize2,
  Minimize2,
  Building,
  AlertTriangle,
  Radio,
  ExternalLink,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { radii, shadows } from '../styles/theme';
import {
  MAPBOX_PUBLIC_TOKEN,
  clampToZamboanga,
  ZAMBOANGA_RESCUER_BASE,
  ZAMBOANGA_VICTIM_DEFAULT,
  ZAMBOANGA_SHELTER_DEFAULT,
} from '../utils/zamboangaGeo';
import {
  fetchTacticalRescueRoute,
  getRescuerCapabilityProfile,
  getHaversineDistanceMeters,
} from '../utils/tacticalRescueRouter';

// Ensure token is set immediately
if (MAPBOX_PUBLIC_TOKEN) {
  try {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  } catch (_e) {
    // Ignore in Expo Go
  }
}

export default function TacticalRescueMap({
  victimCoords,
  victimName = 'Distress Victim',
  headcount = 1,
  triageLevel = 'critical',
  shelterCoords,
  shelterName = 'Target Evacuation Shelter',
  rescuerLocation,
  assignedUnit = null,
  hazards = [],
  onOpenExternalNav,
  onStartTurnByTurn,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navTargetMode, setNavTargetMode] = useState('victim'); // 'victim' | 'shelter'
  const [routeData, setRouteData] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const routeFeatureCollection = useMemo(() => {
    if (!routeData?.coordinates || routeData.coordinates.length < 2) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeData.coordinates,
          },
        },
      ],
    };
  }, [routeData]);

  const cameraRef = useRef(null);

  const isExpoGo = Constants.appOwnership === 'expo' || !Mapbox?.MapView;

  // Normalize targets strictly inside Zamboanga City
  const rescuerLngLat = useMemo(
    () => clampToZamboanga(rescuerLocation, ZAMBOANGA_RESCUER_BASE),
    [rescuerLocation]
  );
  const victimLngLat = useMemo(
    () => clampToZamboanga(victimCoords, ZAMBOANGA_VICTIM_DEFAULT),
    [victimCoords]
  );
  const shelterLngLat = useMemo(
    () => clampToZamboanga(shelterCoords, ZAMBOANGA_SHELTER_DEFAULT),
    [shelterCoords]
  );

  const activeTargetLngLat = navTargetMode === 'shelter' ? shelterLngLat : victimLngLat;
  const activeTargetLabel = navTargetMode === 'shelter' ? shelterName : victimName;

  useEffect(() => {
    if (MAPBOX_PUBLIC_TOKEN) {
      try {
        Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
      } catch (e) {
        console.warn('[TacticalRescueMap] Failed to set Mapbox token:', e);
      }
    }
  }, []);

  const handleRecenter = () => {
    if (cameraRef.current) {
      const center = isNavigating ? rescuerLngLat : activeTargetLngLat;
      cameraRef.current.setCamera({
        centerCoordinate: center,
        zoomLevel: isNavigating ? 16.5 : 14.8,
        animationDuration: 800,
      });
    }
  };

  // Start In-App Mapbox Turn-by-Turn Navigation
  const handleStartInAppNavigation = async () => {
    if (onStartTurnByTurn) {
      onStartTurnByTurn();
      return;
    }
    setIsLoadingRoute(true);
    try {
      const rescuerProfile = getRescuerCapabilityProfile(assignedUnit, null);
      const result = await fetchTacticalRescueRoute(
        rescuerLngLat,
        activeTargetLngLat,
        MAPBOX_PUBLIC_TOKEN,
        rescuerProfile,
        hazards
      );

      if (result && result.coordinates && result.coordinates.length > 0) {
        setRouteData(result);
        setCurrentStepIndex(0);
        setIsNavigating(true);
        setIsExpanded(true); // Automatically expand map for driving clarity

        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: rescuerLngLat,
            zoomLevel: 16.5,
            pitch: 35, // Tilted forward tactical driving HUD
            animationDuration: 1200,
          });
        }
      } else {
        Alert.alert('Route Unavailable', 'Could not compute Mapbox navigation route.');
      }
    } catch (err) {
      console.error('[TacticalRescueMap] Navigation start error:', err);
      Alert.alert('Route Error', 'Failed to load navigation route.');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setRouteData(null);
    setCurrentStepIndex(0);
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: activeTargetLngLat,
        zoomLevel: 14.5,
        pitch: 0,
        animationDuration: 800,
      });
    }
  };

  const handleNextStep = () => {
    if (!routeData?.steps) return;
    if (currentStepIndex < routeData.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      Alert.alert('Destination Reached', `You have arrived at ${activeTargetLabel}.`);
    }
  };

  const handleLaunchGoogleMaps = () => {
    if (onOpenExternalNav) {
      onOpenExternalNav(activeTargetLngLat[1], activeTargetLngLat[0], activeTargetLabel);
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${activeTargetLngLat[1]},${activeTargetLngLat[0]}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Navigation Coordinates', `Lat: ${activeTargetLngLat[1]}, Lng: ${activeTargetLngLat[0]}`);
    });
  };

  const isCritical = (triageLevel || '').toLowerCase() === 'critical';
  const currentStep = routeData?.steps?.[currentStepIndex];
  const distanceKm = routeData ? (routeData.distanceMeters / 1000).toFixed(1) : '1.4';
  const etaMinutes = routeData ? Math.ceil(routeData.durationSeconds / 60) : 3;

  // Turn arrow symbol
  const getTurnIcon = (type, modifier) => {
    const t = (type || '').toLowerCase();
    const m = (modifier || '').toLowerCase();
    if (t.includes('arrive')) return '🏁';
    if (t.includes('roundabout')) return '🔄';
    if (m.includes('right') || t.includes('right')) return '↱';
    if (m.includes('left') || t.includes('left')) return '↰';
    return '⬆️';
  };

  return (
    <View style={[styles.card, isExpanded && styles.cardExpanded]}>
      {/* Tactical Map Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={[styles.pulsingDot, isCritical ? styles.dotCritical : styles.dotUrgent]} />
          <Text style={styles.headerTitle}>
            {isNavigating ? 'TACTICAL NAVIGATION HUD' : 'TACTICAL RESCUE MAP'}
          </Text>
          <View style={styles.liveBadge}>
            <Radio size={11} color="#34d399" />
            <Text style={styles.liveBadgeText}>MAPBOX</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={handleRecenter}
            accessibilityLabel="Recenter map"
          >
            <Crosshair size={16} color="#38bdf8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => setIsExpanded(!isExpanded)}
            accessibilityLabel="Toggle map expansion"
          >
            {isExpanded ? (
              <Minimize2 size={16} color="#94a3b8" />
            ) : (
              <Maximize2 size={16} color="#94a3b8" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Mapbox Container */}
      <View style={[styles.mapWrapper, isExpanded ? styles.mapExpanded : styles.mapCollapsed]}>
        {isExpoGo ? (
          <View style={[styles.expoGoPreview, isExpanded ? styles.mapExpanded : styles.mapCollapsed]}>
            <View style={styles.radarRing}>
              <Radio size={26} color="#38bdf8" />
            </View>
            <Text style={styles.expoGoTitle}>TACTICAL RESCUE RADAR • ZAMBOANGA CITY</Text>
            <Text style={styles.expoGoSub} numberOfLines={1}>
              🎯 Target: {activeTargetLabel}
            </Text>
            <View style={styles.expoGoStatsRow}>
              <View style={styles.expoGoStatBox}>
                <Text style={styles.expoGoStatLabel}>RESCUER BASE</Text>
                <Text style={styles.expoGoStatVal}>
                  {rescuerLngLat[1].toFixed(4)}°N, {rescuerLngLat[0].toFixed(4)}°E
                </Text>
              </View>
              <View style={styles.expoGoStatBox}>
                <Text style={styles.expoGoStatLabel}>DISTANCE TO TARGET</Text>
                <Text style={styles.expoGoStatVal}>
                  {getHaversineDistanceMeters(rescuerLngLat[1], rescuerLngLat[0], activeTargetLngLat[1], activeTargetLngLat[0]).toFixed(0)}m
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.radarCtaBtn}
              onPress={handleStartInAppNavigation}
              activeOpacity={0.85}
            >
              <Navigation size={14} color="#ffffff" />
              <Text style={styles.radarCtaText}>▶ OPEN TURN-BY-TURN HUD</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Mapbox.MapView
            style={{ width: '100%', height: isExpanded ? 420 : 240 }}
            styleURL={Mapbox?.StyleURL?.Dark || 'mapbox://styles/mapbox/dark-v11'}
            logoEnabled={false}
            attributionEnabled={false}
            compassEnabled={true}
            scaleBarEnabled={false}
          >
            <Mapbox.Camera
              ref={cameraRef}
              centerCoordinate={activeTargetLngLat}
              zoomLevel={isNavigating ? 16.5 : 14.8}
              animationMode="flyTo"
              animationDuration={800}
            />

          {/* Glowing Mapbox Turn-by-Turn Route Layer */}
          {routeFeatureCollection && (
            <Mapbox.ShapeSource
              id="rescue-route-source"
              shape={routeFeatureCollection}
            >
              {/* Outer Neon Glow */}
              <Mapbox.LineLayer
                id="rescue-route-glow"
                style={{
                  lineColor: navTargetMode === 'shelter' ? '#10b981' : '#38bdf8',
                  lineWidth: 8,
                  lineOpacity: 0.6,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Inner Solid Line */}
              <Mapbox.LineLayer
                id="rescue-route-inner"
                style={{
                  lineColor: '#ffffff',
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </Mapbox.ShapeSource>
          )}

          {/* 1. Target Citizen Distress Marker */}
          {victimLngLat && (
            <Mapbox.PointAnnotation
              key="victim-sos-pin"
              id="victim-sos-pin"
              coordinate={victimLngLat}
            >
              <View style={styles.sosMarkerContainer}>
                <View style={[styles.sosAura, isCritical && styles.sosAuraCritical]} />
                <View style={[styles.sosPin, isCritical && styles.sosPinCritical]}>
                  <AlertTriangle size={16} color="#ffffff" />
                </View>
                <View style={styles.sosCallout}>
                  <Text style={styles.sosCalloutText} numberOfLines={1}>
                    🚨 {victimName} ({headcount}p)
                  </Text>
                </View>
              </View>
            </Mapbox.PointAnnotation>
          )}

          {/* 2. Target Safe Evacuation Shelter Marker */}
          {shelterLngLat && (
            <Mapbox.PointAnnotation
              key="target-shelter-pin"
              id="target-shelter-pin"
              coordinate={shelterLngLat}
            >
              <View style={styles.shelterMarkerContainer}>
                <View style={styles.shelterPin}>
                  <Building size={14} color="#ffffff" />
                </View>
                <View style={styles.shelterCallout}>
                  <Text style={styles.shelterCalloutText} numberOfLines={1}>
                    🏢 {shelterName}
                  </Text>
                </View>
              </View>
            </Mapbox.PointAnnotation>
          )}

          {/* 3. Rescue Fleet Unit Live Marker */}
          {rescuerLngLat && (
            <Mapbox.PointAnnotation
              key="rescuer-unit-pin"
              id="rescuer-unit-pin"
              coordinate={rescuerLngLat}
            >
              <View style={styles.rescuerMarkerContainer}>
                <View style={styles.rescuerPin}>
                  <Text style={{ fontSize: 13 }}>🚤</Text>
                </View>
                <View style={styles.rescuerCallout}>
                  <Text style={styles.rescuerCalloutText}>QRT DELTA-3</Text>
                </View>
              </View>
            </Mapbox.PointAnnotation>
          )}
        </Mapbox.MapView>
      )}

        {/* ─── IN-APP TURN-BY-TURN TOP NAVIGATION BANNER (HUD) ─── */}
        {isNavigating && currentStep && (
          <View style={styles.turnHudBanner}>
            <View style={styles.turnHudTopRow}>
              <View style={styles.turnIconCircle}>
                <Text style={styles.turnIconSymbol}>
                  {getTurnIcon(currentStep.type, currentStep.modifier)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.turnDistanceText}>
                  {currentStep.distanceMeters > 0
                    ? `IN ${currentStep.distanceMeters} METERS`
                    : 'MANEUVER AHEAD'}
                </Text>
                <Text style={styles.turnInstructionText} numberOfLines={2}>
                  {currentStep.instruction}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeHudBtn}
                onPress={handleStopNavigation}
                accessibilityLabel="Exit navigation"
              >
                <X size={16} color="#f87171" />
              </TouchableOpacity>
            </View>

            {/* Turn Step Progress Footer */}
            <View style={styles.turnHudFooterRow}>
              <Text style={styles.turnEtaText}>
                {distanceKm} km • ETA ~{etaMinutes} mins
              </Text>
              <TouchableOpacity
                style={styles.nextStepBtn}
                onPress={handleNextStep}
                activeOpacity={0.8}
              >
                <Text style={styles.nextStepBtnText}>Next Step</Text>
                <ChevronRight size={14} color="#38bdf8" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── FLOATING ACTION BAR: START MAPBOX NAVIGATION ─── */}
        {!isNavigating && (
          <View style={styles.actionOverlayBar}>
            {/* Target Destination Switcher */}
            <View style={styles.targetSwitcher}>
              <TouchableOpacity
                style={[
                  styles.targetSwitchTab,
                  navTargetMode === 'victim' && styles.targetSwitchTabActive,
                ]}
                onPress={() => setNavTargetMode('victim')}
              >
                <Text
                  style={[
                    styles.targetSwitchText,
                    navTargetMode === 'victim' && styles.targetSwitchTextActive,
                  ]}
                >
                  📍 Victim Location
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.targetSwitchTab,
                  navTargetMode === 'shelter' && styles.targetSwitchTabActiveGreen,
                ]}
                onPress={() => setNavTargetMode('shelter')}
              >
                <Text
                  style={[
                    styles.targetSwitchText,
                    navTargetMode === 'shelter' && styles.targetSwitchTextActive,
                  ]}
                >
                  🏢 Safe Shelter
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtonsRow}>
              {/* In-App Mapbox Turn-by-Turn CTA */}
              <TouchableOpacity
                style={styles.inAppNavBtn}
                onPress={handleStartInAppNavigation}
                disabled={isLoadingRoute}
                activeOpacity={0.85}
              >
                {isLoadingRoute ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Navigation size={15} color="#ffffff" />
                    <Text style={styles.inAppNavText}>▶ START TURN-BY-TURN (MAPBOX)</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* External Google Maps Fallback Button */}
              <TouchableOpacity
                style={styles.googleMapsIconBtn}
                onPress={handleLaunchGoogleMaps}
                accessibilityLabel="Open in Google Maps"
              >
                <ExternalLink size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Telemetry Bar */}
        <View style={styles.telemetryBar}>
          <Text style={styles.telemetryText}>
            DEST: {activeTargetLngLat[1].toFixed(5)}° N, {activeTargetLngLat[0].toFixed(5)}° E
          </Text>
          <Text style={styles.telemetrySub}>
            IN-APP A* MAPBOX ROUTER
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 16,
    ...shadows.md,
  },
  cardExpanded: {
    borderColor: '#38bdf8',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCritical: {
    backgroundColor: '#ef4444',
  },
  dotUrgent: {
    backgroundColor: '#f59e0b',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mapWrapper: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#0a0f1d',
  },
  mapCollapsed: {
    height: 240,
  },
  mapExpanded: {
    height: 420,
  },
  expoGoPreview: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  radarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  expoGoTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 2,
  },
  expoGoSub: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  expoGoStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  expoGoStatBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  expoGoStatLabel: {
    color: '#94a3b8',
    fontSize: 8.5,
    fontWeight: '800',
  },
  expoGoStatVal: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 1,
  },
  radarCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  radarCtaText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sosMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 80,
  },
  sosAura: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.7)',
  },
  sosAuraCritical: {
    backgroundColor: 'rgba(220, 38, 38, 0.45)',
    borderColor: '#ef4444',
  },
  sosPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    ...shadows.sm,
  },
  sosPinCritical: {
    backgroundColor: '#b91c1c',
  },
  sosCallout: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    marginTop: 4,
    maxWidth: 130,
  },
  sosCalloutText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  shelterMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 65,
  },
  shelterPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  shelterCallout: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    marginTop: 3,
    maxWidth: 130,
  },
  shelterCalloutText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  rescuerMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 55,
  },
  rescuerPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  rescuerCallout: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  rescuerCalloutText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '900',
  },
  turnHudBanner: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    zIndex: 50,
    ...shadows.md,
  },
  turnHudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  turnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnIconSymbol: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '900',
  },
  turnDistanceText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  turnInstructionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  closeHudBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  turnHudFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  turnEtaText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  nextStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  nextStepBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  actionOverlayBar: {
    position: 'absolute',
    bottom: 30,
    left: 10,
    right: 10,
    gap: 6,
    zIndex: 40,
  },
  targetSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  targetSwitchTab: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  targetSwitchTabActive: {
    backgroundColor: '#dc2626',
  },
  targetSwitchTabActiveGreen: {
    backgroundColor: '#059669',
  },
  targetSwitchText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  targetSwitchTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inAppNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#4ade80',
    ...shadows.md,
  },
  inAppNavText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  googleMapsIconBtn: {
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  telemetryText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  telemetrySub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748b',
  },
});
