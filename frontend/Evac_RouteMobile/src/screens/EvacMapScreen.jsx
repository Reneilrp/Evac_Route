import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, Linking, Alert, Platform, Animated, PanResponder, Vibration } from 'react-native';
import { AlertTriangle, Navigation, Phone } from 'lucide-react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import api from '../services/api';
import styles from '../styles/EvacMapScreen.styles';
import { useResidentStore } from '../context/useResidentStore';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../styles/theme';

import {
  initDb,
  saveShelters,
  saveHazards,
  saveHazardsExtended,
  syncRoadNetworkFromApi,
  getOfflineShelters,
  getOfflineHazards,
  getOfflineNodes,
  getOfflineEdges,
  getDistanceMeters
} from '../services/offlineDb';
import { calculateOfflineRoute } from '../utils/astarRouter';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── ETA Calculator ───
function getETAMinutes(distanceMeters, mode) {
  const speeds = { pedestrian: 80, '2_wheel': 250, '4_wheel': 400 }; // metres per minute
  const mPerMin = speeds[mode] || 80;
  const minutes = Math.ceil(distanceMeters / mPerMin);
  if (minutes < 1) return '< 1 min';
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes} min`;
}


// Bottom sheet snap points
const SHEET_COLLAPSED = 160;
const SHEET_EXPANDED = SCREEN_HEIGHT * 0.45;

// Read Mapbox token from app.json extra config
const MAPBOX_TOKEN = Constants.expoConfig?.extra?.mapboxToken || '';
Mapbox.setAccessToken(MAPBOX_TOKEN);

export default function EvacMapScreen() {
  const [location, setLocation] = useState(null);

  // Local cache fallback state
  const [offlineShelters, setOfflineShelters] = useState([]);
  const [offlineHazards, setOfflineHazards] = useState([]);
  const [isOffline, setIsOffline] = useState(false);

  // Optimized in-memory Graph Caching and Route Throttle states
  const [preloadedGraph, setPreloadedGraph] = useState(null);
  const [cachedRoute, setCachedRoute] = useState(null);
  const [lastRoutingLocation, setLastRoutingLocation] = useState(null);
  const [isRouteBlocked, setIsRouteBlocked] = useState(false);
  const [routeWarnings, setRouteWarnings] = useState([]);

  // Map style switcher
  const [mapStyleMode, setMapStyleMode] = useState('dark');
  const MAP_STYLE_URLS = {
    dark:      Mapbox.StyleURL.Dark,
    satellite: Mapbox.StyleURL.SatelliteStreet,
    streets:   Mapbox.StyleURL.Street,
  };



  // Panic flash state
  const [showPanicFlash, setShowPanicFlash] = useState(false);
  const panicOpacityRef = useRef(new Animated.Value(0));
  const previousStatusRef = useRef(null);

  // Bottom sheet animation
  const sheetHeightRef = useRef(new Animated.Value(SHEET_COLLAPSED));
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  // Read/write routing mode globally from Zustand store
  const transportationMode = useResidentStore(state => state.transportationMode || 'pedestrian');
  const setTransportationMode = useResidentStore(state => state.setTransportationMode);
  const status = useResidentStore(state => state.status);

  const lastHazardsRef = useRef(null);
  const lastShelterCoordsRef = useRef(null);

  // ─── Panic Flash on first danger detection ───
  useEffect(() => {
    if (status === 'danger' && previousStatusRef.current !== 'danger') {
      setShowPanicFlash(true);
      Vibration.vibrate([0, 300, 100, 300, 100, 300]);
      
      Animated.sequence([
        Animated.timing(panicOpacityRef.current, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(panicOpacityRef.current, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start(() => setShowPanicFlash(false));
    }
    previousStatusRef.current = status;
  }, [status]);

  // ─── Bottom Sheet Pan Responder ───
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        const currentHeight = isSheetExpanded ? SHEET_EXPANDED : SHEET_COLLAPSED;
        const newHeight = currentHeight - gestureState.dy;
        const clampedHeight = Math.max(SHEET_COLLAPSED, Math.min(SHEET_EXPANDED, newHeight));
        sheetHeightRef.current.setValue(clampedHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldExpand = gestureState.dy < -50 || (isSheetExpanded && gestureState.dy < 50);
        const target = shouldExpand ? SHEET_EXPANDED : SHEET_COLLAPSED;
        
        Animated.spring(sheetHeightRef.current, {
          toValue: target,
          useNativeDriver: false,
          speed: 14,
          bounciness: 4,
        }).start();
        setIsSheetExpanded(shouldExpand);
      },
    })
  ).current;

  // Initialize DB and load cached data on mount
  useEffect(() => {
    initDb();
    try {
      const cachedS = getOfflineShelters();
      const cachedH = getOfflineHazards();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOfflineShelters(cachedS);
       
      setOfflineHazards(cachedH);

      // Load road graph data from database
      const dbNodes = getOfflineNodes();
      const dbEdges = getOfflineEdges();

      // Convert nodes list to maps
      const nodesMap = {};
      for (const n of dbNodes) {
        nodesMap[n.id] = { id: n.id, lat: parseFloat(n.lat), lng: parseFloat(n.lng) };
      }

      // Convert edges list to adjacency list by source_node
      const edgesBySource = {};
      for (const e of dbEdges) {
        if (!edgesBySource[e.source_node]) {
          edgesBySource[e.source_node] = [];
        }
        edgesBySource[e.source_node].push({
          target_node: e.target_node,
          distance: parseFloat(e.distance),
          geometry: JSON.parse(e.geometry) // Pre-parse geometry to avoid parsing it inside A* loop
        });
      }

      setPreloadedGraph({ nodesMap, edgesBySource });
    } catch (e) {
      console.warn('Could not read SQLite database cache on startup:', e);
    }
  }, []);

  // Poll Consolidated Resident Map Data every 30 seconds (active shelters + active hazards)
  const { data: mapData, isLoading: isLoadingMap, isError: isMapError } = useQuery({
    queryKey: ['resident-map-data'],
    queryFn: () => api.get('/resident/map-data').then(res => res.data),
    refetchInterval: 30000,
    staleTime: 20000,
    retry: 1
  });

  const { data: roadNetworkData } = useQuery({
    queryKey: ['road-network'],
    queryFn: () => api.get('/road-network').then(res => res.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (roadNetworkData && roadNetworkData.nodes?.length > 0) {
      syncRoadNetworkFromApi(roadNetworkData);
      try {
        const dbNodes = getOfflineNodes();
        const dbEdges = getOfflineEdges();
        const nodesMap = {};
        for (const n of dbNodes) {
          nodesMap[n.id] = { id: n.id, lat: parseFloat(n.lat), lng: parseFloat(n.lng) };
        }
        const edgesBySource = {};
        for (const e of dbEdges) {
          if (!edgesBySource[e.source_node]) edgesBySource[e.source_node] = [];
          edgesBySource[e.source_node].push({
            target_node: e.target_node,
            distance: parseFloat(e.distance),
            geometry: JSON.parse(e.geometry),
          });
        }
        setTimeout(() => {
          setPreloadedGraph({ nodesMap, edgesBySource });
        }, 0);
      } catch (e) {
        console.warn('Graph reload after network sync failed:', e);
      }
    }
  }, [roadNetworkData]);

  const sheltersData = mapData?.shelters;
  const hazardsData = mapData?.hazards;
  const isLoadingShelters = isLoadingMap;

  useEffect(() => {
    if (sheltersData) {
      saveShelters(sheltersData);
      setTimeout(() => {
        setOfflineShelters(sheltersData);
        setIsOffline(false);
      }, 0);
    }
  }, [sheltersData]);

  useEffect(() => {
    if (hazardsData) {
      saveHazardsExtended(hazardsData);
      saveHazards(hazardsData);
      setTimeout(() => {
        setOfflineHazards(hazardsData);
        setIsOffline(false);
      }, 0);
    }
  }, [hazardsData]);

  useEffect(() => {
    if (isMapError) {
      setTimeout(() => {
        setIsOffline(true);
      }, 0);
    }
  }, [isMapError]);

  useEffect(() => {
    let subscription;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation([initial.coords.longitude, initial.coords.latitude]);
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 8000,
        },
        (loc) => {
          setLocation([loc.coords.longitude, loc.coords.latitude]);
        }
      );
    })();
    return () => { subscription?.remove(); };
  }, []);

  const shelters = sheltersData && sheltersData.length > 0 ? sheltersData : offlineShelters;
  const hazards = hazardsData && hazardsData.length > 0 ? hazardsData : offlineHazards;

  const openShelters = shelters.filter(s => s.status === 'open');
  let nearestShelter = null;
  let minDistance = Infinity;

  if (location && openShelters.length > 0) {
    for (const shelter of openShelters) {
      const shLat = parseFloat(shelter.latitude);
      const shLng = parseFloat(shelter.longitude);
      const dist = getDistanceMeters(location[1], location[0], shLat, shLng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestShelter = shelter;
      }
    }
  }

  const nearestShelterCoords = nearestShelter
    ? [parseFloat(nearestShelter.longitude), parseFloat(nearestShelter.latitude)]
    : null;

  useEffect(() => {
    if (!location || !nearestShelterCoords || !preloadedGraph) {
      setTimeout(() => {
        setCachedRoute(null);
        setLastRoutingLocation(null);
      }, 0);
      return;
    }

    let shouldRecalculate = false;

    const shelterChanged =
      nearestShelterCoords?.[0] !== lastShelterCoordsRef.current?.[0] ||
      nearestShelterCoords?.[1] !== lastShelterCoordsRef.current?.[1];
    const hazardsChanged =
      hazards.length !== (lastHazardsRef.current?.length ?? -1) ||
      hazards.some((h, i) => h.id !== lastHazardsRef.current?.[i]?.id);

    if (shelterChanged || hazardsChanged || !lastRoutingLocation || !cachedRoute) {
      shouldRecalculate = true;
    } else {
      const dist = getDistanceMeters(
        location[1],
        location[0],
        lastRoutingLocation[1],
        lastRoutingLocation[0]
      );
      if (dist > 10) {
        shouldRecalculate = true;
      }
    }

    if (shouldRecalculate) {
      const data = {
        nodesMap: preloadedGraph.nodesMap,
        edgesBySource: preloadedGraph.edgesBySource,
        hazards: hazards
      };

      const result = calculateOfflineRoute(location, nearestShelterCoords, data, transportationMode);
      
      setTimeout(() => {
        if (result && result.status === 'success') {
          setCachedRoute(result.path);
          setRouteWarnings(result.warnings || []);
          setIsRouteBlocked(false);
        } else {
          setCachedRoute(null);
          setRouteWarnings([]);
          setIsRouteBlocked(true);
        }
        setLastRoutingLocation(location);
      }, 0);
      
      lastHazardsRef.current = hazards;
      lastShelterCoordsRef.current = nearestShelterCoords;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, nearestShelterCoords, hazards, preloadedGraph, transportationMode]);

  if (!location || (isLoadingShelters && offlineShelters.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Acquiring GPS Signal...</Text>
      </View>
    );
  }

  const routeGeoJSON = cachedRoute ? {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: cachedRoute } }]
  } : null;

  const hazardsGeoJSON = {
    type: 'FeatureCollection',
    features: hazards.map(hazard => ({
      type: 'Feature',
      properties: {
        id: hazard.id,
        radius: parseFloat(hazard.radius_meters ?? 0),
        hazard_type: hazard.hazard_type ?? 'hazard',
        severity: hazard.severity_level ?? 'medium',
      },
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(hazard.longitude), parseFloat(hazard.latitude)]
      }
    }))
  };

  const startNavigation = () => {
    if (!nearestShelter) return;
    const destLat = parseFloat(nearestShelter.latitude);
    const destLng = parseFloat(nearestShelter.longitude);
    const label = encodeURIComponent(nearestShelter.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${destLat},${destLng}`,
      android: `geo:0,0?q=${destLat},${destLng}(${label})`
    }) || `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`);
    }).catch(err => Alert.alert('Navigation Error', 'Could not open maps application.'));
  };

  const callEmergencyHotline = () => {
    const phoneUrl = 'tel:911';
    Linking.canOpenURL(phoneUrl).then(supported => {
      if (supported) Linking.openURL(phoneUrl);
      else Alert.alert('Error', 'Direct calling is not supported on this device.');
    });
  };

  return (
    <View style={styles.container}>
      {showPanicFlash && (
        <Animated.View style={[styles.panicFlash, { opacity: panicOpacityRef.current }]}>
          <Text style={styles.panicText}>⚠️ EVACUATION ORDER</Text>
          <Text style={styles.panicSubText}>Move to safety immediately</Text>
        </Animated.View>
      )}

      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_STYLE_URLS[mapStyleMode]}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Mapbox.Camera
          zoomLevel={14}
          centerCoordinate={location}
          animationMode="flyTo"
          animationDuration={2000}
        />
        <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} />
        {shelters.map(shelter => {
          const sLat = parseFloat(shelter.latitude);
          const sLng = parseFloat(shelter.longitude);
          return (
            <Mapbox.PointAnnotation
              key={`s-${shelter.id}`}
              id={`s-${shelter.id}`}
              coordinate={[sLng, sLat]}
            >
              <View style={styles.shelterPin}>
                <View style={[styles.innerPin, { backgroundColor: shelter.status === 'open' ? colors.successLight : colors.danger }]} />
              </View>
            </Mapbox.PointAnnotation>
          );
        })}

        {/* Hazards: Circle + Label Layers */}
        <Mapbox.ShapeSource id="hazardsSource" shape={hazardsGeoJSON}>
          <Mapbox.CircleLayer
            id="hazardsLayer"
            style={{
              circleRadius: [
                'interpolate',
                ['exponential', 2],
                ['zoom'],
                1, 1,
                15, ['/', ['get', 'radius'], 1.2],
                22, ['/', ['get', 'radius'], 0.01]
              ],
              circleColor: [
                'match', ['get', 'severity'],
                'high', 'rgba(220,38,38,0.45)',
                'medium', 'rgba(249,115,22,0.40)',
                'rgba(234,179,8,0.35)'
              ],
              circleStrokeColor: [
                'match', ['get', 'severity'],
                'high', 'rgba(220,38,38,0.9)',
                'medium', 'rgba(249,115,22,0.85)',
                'rgba(234,179,8,0.8)'
              ],
              circleStrokeWidth: 2,
            }}
          />
          {/* Hazard type label above each circle */}
          <Mapbox.SymbolLayer
            id="hazardLabels"
            style={{
              textField: ['get', 'hazard_type'],
              textSize: 10,
              textColor: '#ffffff',
              textHaloColor: '#000000',
              textHaloWidth: 1.5,
              textTranslate: [0, -20],
              textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
              textTransform: 'uppercase',
            }}
          />
        </Mapbox.ShapeSource>

        {/* Route line */}
        {routeGeoJSON && (
          <Mapbox.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <Mapbox.LineLayer
              id="routeLayer"
              style={{
                lineColor: colors.routeLine,
                lineWidth: 6,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {/* ─── Critical Overlay ─── */}
      {isRouteBlocked && (
        <View style={styles.criticalOverlay}>
          <Text style={styles.criticalTitle}>
            CRITICAL ACTION REQUIRED: No safe overland evacuation routes available for your current transportation mode. Move to the highest accessible level immediately and broadcast an emergency rescue signal.
          </Text>
          <TouchableOpacity style={styles.emergencyButton} onPress={callEmergencyHotline}>
            <Phone color={colors.white} size={20} />
            <Text style={styles.emergencyButtonText}>Call Emergency Hotline</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Top Status Overlay ─── */}
      <View style={styles.overlay}>
        <View style={styles.statusBox}>
          {isOffline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineText}>OFFLINE MODE (Cached Data)</Text>
            </View>
          )}
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: colors.successLight }]} />
            <Text style={styles.statusText}>{openShelters.length} Shelters Open</Text>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <Text style={styles.statusText}>{hazards.length} Active Hazards</Text>
          </View>

          {/* Transport mode selector with icons */}
          <View style={styles.modeSelectorRow}>
            {[
              { key: 'pedestrian', icon: '🚶', label: 'Walk' },
              { key: '2_wheel',    icon: '🏍', label: 'Bike' },
              { key: '4_wheel',    icon: '🚗', label: 'Car'  },
            ].map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeButton, transportationMode === m.key && styles.modeButtonActive]}
                onPress={() => setTransportationMode(m.key)}
              >
                <Text style={styles.modeIcon}>{m.icon}</Text>
                <Text style={[styles.modeButtonText, transportationMode === m.key && styles.modeButtonTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ─── Map Style Switcher (floating, bottom-left) ─── */}
      <View style={styles.mapStyleSwitcher}>
        {[
          { key: 'dark',      icon: '🌑' },
          { key: 'satellite', icon: '🛰' },
          { key: 'streets',   icon: '🗺' },
        ].map(s => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setMapStyleMode(s.key)}
            style={[styles.mapStyleBtn, mapStyleMode === s.key && styles.mapStyleBtnActive]}
          >
            <Text style={styles.mapStyleBtnText}>{s.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── Draggable Bottom Sheet ─── */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeightRef.current }]}>
        <View {...panResponder.panHandlers} style={styles.bottomSheetHandle}>
          <View style={styles.bottomSheetBar} />
        </View>

        <View style={styles.bottomSheetContent}>
          {nearestShelter ? (
            <>
              <View style={styles.routingInfo}>
                <Text style={styles.destinationLabel}>NEAREST OPEN SHELTER:</Text>
                <Text style={styles.destinationName}>{nearestShelter.name}</Text>

                {/* ETA + Distance */}
                <Text style={styles.etaText}>
                  {getETAMinutes(minDistance, transportationMode)} away · {(minDistance / 1000).toFixed(2)} km
                </Text>

                {/* Occupancy progress bar */}
                <View style={styles.occupancyBarTrack}>
                  <View
                    style={[
                      styles.occupancyBarFill,
                      {
                        width: `${Math.min(100, Math.round((nearestShelter.current_occupancy / nearestShelter.max_capacity) * 100))}%`,
                        backgroundColor:
                          nearestShelter.current_occupancy / nearestShelter.max_capacity > 0.8
                            ? colors.danger
                            : colors.successLight,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.occupancyText}>
                  {nearestShelter.current_occupancy}/{nearestShelter.max_capacity} occupancy
                </Text>

                {/* Route warnings */}
                {routeWarnings.length > 0 && (
                  <View style={styles.warningsContainer}>
                    {routeWarnings.map((w, idx) => (
                      <View key={idx} style={styles.warningPill}>
                        <AlertTriangle size={12} color={colors.warningText} />
                        <Text style={styles.warningPillText}>{w}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <PrimaryButton
                title="Start Navigation"
                onPress={startNavigation}
                variant="primary"
                size="large"
                icon={<Navigation color={colors.white} size={20} />}
              />
            </>
          ) : (
            <View style={styles.warningBox}>
              <AlertTriangle color={colors.danger} size={24} />
              <Text style={styles.warningText}>No open shelters available at this time.</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
