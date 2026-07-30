import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Linking, Alert, Platform, Animated, PanResponder, Vibration } from 'react-native';
import { AlertTriangle, Navigation, Phone, X, User, ChevronDown, Info, Layers } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  getOfflineHazardsExtended,
  getOfflineNodes,
  getOfflineEdges,
  getDistanceMeters,
  saveRoadMaintenances,
  getOfflineRoadMaintenances,
} from '../services/offlineDb';
import { calculateOfflineRoute, determineTargetFacility } from '../utils/astarRouter';

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

// Read Mapbox token from app.json extra config or environment
const MAPBOX_TOKEN = Constants.expoConfig?.extra?.mapboxToken || process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

export default function EvacMapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (MAPBOX_TOKEN) {
      try {
        Mapbox.setAccessToken(MAPBOX_TOKEN);
      } catch (e) {
        console.warn('[Mapbox] Failed to set access token:', e);
      }
    } else {
      console.warn('[Mapbox] Access token is missing or empty. Map will not render.');
    }
  }, []);

  // Local cache fallback state
  const [offlineShelters, setOfflineShelters] = useState([]);
  const [offlineHazards, setOfflineHazards] = useState([]);
  const [offlineMaintenances, setOfflineMaintenances] = useState([]); // P3
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
    dark:      Mapbox?.StyleURL?.Dark || 'mapbox://styles/mapbox/dark-v11',
    satellite: Mapbox?.StyleURL?.SatelliteStreet || 'mapbox://styles/mapbox/satellite-streets-v12',
    streets:   Mapbox?.StyleURL?.Street || 'mapbox://styles/mapbox/streets-v12',
  };

  const isExpoGo = Constants.appOwnership === 'expo' || !Mapbox?.MapView;

  // High Contrast, Sub-tab, and Heading States
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('info'); // 'info' | 'checklist'
  const [deviceHeading, setDeviceHeading] = useState(0);

  // REV-03: Layer filter and facility details modal states
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedFacilityDetails, setSelectedFacilityDetails] = useState(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [showSituationBrief, setShowSituationBrief] = useState(false);
  
  // Navigation & Selection states
  const cameraRef = useRef(null);
  const currentZoomRef = useRef(14);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);


  // Compass Bearing Calculation Helper
  const getBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
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
      const cachedH = getOfflineHazardsExtended(); // P4: use extended schema so offline hazards have type+severity
      const cachedM = getOfflineRoadMaintenances(); // P3: load cached maintenance zones
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOfflineShelters(cachedS);
      setOfflineHazards(cachedH);
      setOfflineMaintenances(cachedM);

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
  const maintenanceData = mapData?.road_maintenances; // P3
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

  // P3: Cache and apply road maintenance zones from API response
  useEffect(() => {
    if (maintenanceData) {
      saveRoadMaintenances(maintenanceData);
      setTimeout(() => {
        setOfflineMaintenances(maintenanceData);
      }, 0);
    }
  }, [maintenanceData]);

  useEffect(() => {
    if (sheltersData || mapData) {
      setIsOffline(false);
    }
  }, [sheltersData, mapData]);

  useEffect(() => {
    if (isMapError && !mapData) {
      setTimeout(() => {
        setIsOffline(true);
      }, 0);
    }
  }, [isMapError, mapData]);

  useEffect(() => {
    let subscription;
    let headingSubscription;
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

      try {
        headingSubscription = await Location.watchHeadingAsync((data) => {
          setDeviceHeading(data.trueHeading || data.magneticHeading || 0);
        });
      } catch (e) {
        console.warn('Failed to start watchHeadingAsync:', e);
      }
    })();
    return () => {
      subscription?.remove();
      headingSubscription?.remove();
    };
  }, []);

  const shelters = sheltersData && sheltersData.length > 0 ? sheltersData : offlineShelters;
  const hazards = hazardsData && hazardsData.length > 0 ? hazardsData : offlineHazards;
  // P3: Use live data when available, fall back to SQLite cache offline
  const maintenances = (maintenanceData && maintenanceData.length > 0)
    ? maintenanceData
    : offlineMaintenances;

  // Ensure user location defaults to Zamboanga City (Tetuan) if GPS is outside Zamboanga bounds
  const defaultZamboangaPos = [122.084, 6.918];
  const isValidZamboangaLocation = (pos) => {
    if (!pos || !Array.isArray(pos) || pos.length < 2) return false;
    const lng = pos[0];
    const lat = pos[1];
    return lng >= 121.5 && lng <= 122.5 && lat >= 6.5 && lat <= 7.5;
  };
  const activeUserLocation = isValidZamboangaLocation(location) ? location : defaultZamboangaPos;

  // ─── Proximity Hazard & Threat Protocol Analysis ───
  const activeThreatsNearUser = useMemo(() => {
    if (!activeUserLocation || !hazards || hazards.length === 0) return [];
    return hazards.filter(h => {
      const hLat = parseFloat(h.latitude);
      const hLng = parseFloat(h.longitude);
      const radius = parseFloat(h.radius_meters || 500);
      const dist = getDistanceMeters(activeUserLocation[1], activeUserLocation[0], hLat, hLng);
      return dist <= radius + 300; // Inside hazard zone or 300m buffer
    });
  }, [activeUserLocation, hazards]);

  const activeSiegeThreat = useMemo(() => {
    return activeThreatsNearUser.find(h =>
      ['siege', 'war', 'active_shooter', 'civil_unrest'].includes(h.hazard_type) ||
      (h.disaster_category === 'man_made' && h.severity_level === 'high')
    ) || (hazards || []).find(h => ['siege', 'war', 'active_shooter'].includes(h.hazard_type));
  }, [activeThreatsNearUser, hazards]);

  const activeDisasterNearUser = useMemo(() => {
    return activeThreatsNearUser.find(h =>
      ['flood', 'landslide', 'typhoon', 'tsunami', 'fire', 'explosion'].includes(h.hazard_type) ||
      h.severity_level === 'high' || h.severity_level === 'critical'
    );
  }, [activeThreatsNearUser]);

  const activeAlertKey = activeSiegeThreat?.id || activeDisasterNearUser?.id || null;
  const [dismissedAlertKey, setDismissedAlertKey] = useState(null);

  // Auto-dismiss threat & alert banners after 5 seconds
  useEffect(() => {
    if (activeAlertKey) {
      const timer = setTimeout(() => {
        setDismissedAlertKey(activeAlertKey);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeAlertKey]);

  const showAlertBanner = activeAlertKey ? (dismissedAlertKey !== activeAlertKey) : false;

  let nearestShelter = null;
  let smartRoutingReason = null;

  if (activeUserLocation && shelters.length > 0) {
    const targetResult = determineTargetFacility(activeUserLocation[1], activeUserLocation[0], shelters, hazards, selectedCategoryFilter);
    if (targetResult && targetResult.facility) {
      nearestShelter = targetResult.facility;
      smartRoutingReason = targetResult.reason;
    }
  }

  const activeTargetShelter = selectedShelter || nearestShelter;

  const targetShelterCoords = activeTargetShelter
    ? [parseFloat(activeTargetShelter.longitude), parseFloat(activeTargetShelter.latitude)]
    : null;

  const distanceMeters = (activeUserLocation && targetShelterCoords)
    ? getDistanceMeters(activeUserLocation[1], activeUserLocation[0], targetShelterCoords[1], targetShelterCoords[0])
    : 0;

  const distanceKm = distanceMeters > 0 ? (distanceMeters / 1000).toFixed(2) : '0.00';

  // Hysteresis Deadband Buffer (1.4 km - 1.6 km) to prevent GPS Jitter UI Flickering
  const prevSiegeStateRef = useRef(false);

  const isShelterNearbyForSiege = useMemo(() => {
    if (!nearestShelter || distanceMeters <= 0) {
      prevSiegeStateRef.current = false;
      return false;
    }

    // Dual Threshold Hysteresis:
    // Switch to NEAR at <= 1400m (1.4 km)
    // Switch to FAR at >= 1600m (1.6 km)
    // Between 1400m and 1600m: Maintain previous state to eliminate boundary GPS jitter
    if (distanceMeters <= 1400) {
      prevSiegeStateRef.current = true;
    } else if (distanceMeters >= 1600) {
      prevSiegeStateRef.current = false;
    }

    return prevSiegeStateRef.current;
  }, [distanceMeters, nearestShelter]);

  const handleOneClickEvacuate = (targetFacility) => {
    const dest = targetFacility || activeTargetShelter || nearestShelter;
    if (!dest) return;
    setSelectedShelter(dest);
    setIsNavigating(true);
    if (cameraRef.current && activeUserLocation) {
      cameraRef.current.setCamera({
        centerCoordinate: activeUserLocation,
        zoomLevel: 16,
        animationDuration: 800,
      });
    }
    Vibration.vibrate([0, 100, 50, 100]);
  };

  useEffect(() => {
    if (!isNavigating || !activeUserLocation || !targetShelterCoords || !preloadedGraph) {
      setTimeout(() => {
        setCachedRoute(null);
        setLastRoutingLocation(null);
      }, 0);
      return;
    }

    const shelterChanged =
      targetShelterCoords?.[0] !== lastShelterCoordsRef.current?.[0] ||
      targetShelterCoords?.[1] !== lastShelterCoordsRef.current?.[1];
    const hazardsChanged =
      hazards.length !== (lastHazardsRef.current?.length ?? -1) ||
      hazards.some((h, i) => h.id !== lastHazardsRef.current?.[i]?.id);

    let shouldRecalculate = false;
    if (shelterChanged || hazardsChanged || !lastRoutingLocation || !cachedRoute) {
      shouldRecalculate = true;
    } else {
      const dist = getDistanceMeters(
        activeUserLocation[1],
        activeUserLocation[0],
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

      const result = calculateOfflineRoute(activeUserLocation, targetShelterCoords, data, transportationMode);
      
      setTimeout(() => {
        if (result && result.status === 'success') {
          setCachedRoute(result.path);
          setRouteWarnings(result.warnings || []);
          setIsRouteBlocked(false);
          Vibration.vibrate([0, 80, 100, 80]);
        } else if (result && (result.status === 'isolated_target' || result.status === 'no_safe_route')) {
          setCachedRoute(null);
          setRouteWarnings([]);
          setIsRouteBlocked(true);

          // Fallback Reroute to High-Ground Safe Zone / Assembly Point if distant shelter is graph-isolated
          const fallbackFacility = (shelters || []).find(f => 
            (f.facility_type === 'safe_zone' || f.facility_type === 'assembly_point') &&
            f.id !== activeTargetShelter?.id
          );
          if (fallbackFacility) {
            setSelectedShelter(fallbackFacility);
            Alert.alert(
              '⚠️ Shelter Isolated by Hazard Closures',
              `Target shelter is completely isolated by road closures/floods. Rerouting to local ${fallbackFacility.name || 'Safe Zone'}!`,
              [{ text: 'OK' }]
            );
          }
          Vibration.vibrate([0, 500, 200, 500]);
        } else {
          setCachedRoute(null);
          setRouteWarnings([]);
          setIsRouteBlocked(true);
          Vibration.vibrate([0, 500, 200, 500]);
        }
        setLastRoutingLocation(activeUserLocation);
      }, 0);
      
      lastHazardsRef.current = hazards;
      lastShelterCoordsRef.current = targetShelterCoords;
    }
  }, [isNavigating, activeUserLocation, targetShelterCoords, hazards, preloadedGraph, transportationMode]);

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

  const openExternalNavigation = () => {
    if (!activeTargetShelter) return;
    const destLat = parseFloat(activeTargetShelter.latitude);
    const destLng = parseFloat(activeTargetShelter.longitude);
    const label = encodeURIComponent(activeTargetShelter.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${destLat},${destLng}`,
      android: `geo:0,0?q=${destLat},${destLng}(${label})`
    }) || `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`);
    }).catch(() => Alert.alert('Navigation Error', 'Could not open maps application.'));
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

      {isExpoGo ? (
        <View style={[styles.map, { backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
          <AlertTriangle color="#f59e0b" size={48} style={{ marginBottom: 12 }} />
          <Text style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginBottom: 8 }}>
            Expo Go Preview Mode
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
            Mapbox native map rendering is not supported in standard Expo Go because Expo Go lacks native C++ map binaries.
          </Text>
          <View style={{ backgroundColor: '#1e293b', borderRadius: 8, padding: 12, width: '100%' }}>
            <Text style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>
              📍 Active Shelters ({shelters.length}):
            </Text>
            {shelters.slice(0, 3).map(s => (
              <Text key={s.id} style={{ color: '#cbd5e1', fontSize: 12, marginVertical: 2 }}>
                • {s.name} ({s.status || 'open'})
              </Text>
            ))}
          </View>
        </View>
      ) : (
        <Mapbox.MapView
          style={styles.map}
          styleURL={MAP_STYLE_URLS[mapStyleMode]}
          logoEnabled={false}
          attributionEnabled={false}
          zoomEnabled={true}
          scrollEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
        >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: activeUserLocation,
            zoomLevel: 14,
          }}
        />

        {shelters
          .filter(shelter => {
            if (selectedCategoryFilter === 'all') return true;
            if (selectedCategoryFilter === 'shelter') return shelter.facility_type === 'evacuation_center' || !shelter.facility_type;
            if (selectedCategoryFilter === 'safe_zone') return shelter.facility_type === 'safe_zone';
            if (selectedCategoryFilter === 'assembly_point') return shelter.facility_type === 'assembly_point';
            if (selectedCategoryFilter === 'security') return ['police_station', 'military_base'].includes(shelter.facility_type);
            return true;
          })
          .map(shelter => {
            const sLat = parseFloat(shelter.latitude);
            const sLng = parseFloat(shelter.longitude);
            
            let pinBg = colors.successLight;
            let pinIcon = '🏠';
            if (shelter.facility_type === 'safe_zone') { pinBg = '#16a34a'; pinIcon = '🛡️'; }
            else if (shelter.facility_type === 'assembly_point') { pinBg = '#f97316'; pinIcon = '🚩'; }
            else if (shelter.facility_type === 'police_station' || shelter.facility_type === 'military_base') { pinBg = '#1d4ed8'; pinIcon = '👮'; }
            else if (shelter.facility_type === 'hospital') { pinBg = '#dc2626'; pinIcon = '🏥'; }
            else if (shelter.facility_type === 'fire_station') { pinBg = '#ea580c'; pinIcon = '🚒'; }

            if (shelter.status === 'closed') pinBg = '#64748b';

            return (
              <Mapbox.PointAnnotation
                key={`s-${shelter.id}`}
                id={`s-${shelter.id}`}
                coordinate={[sLng, sLat]}
                onSelected={() => {
                  setSelectedShelter(shelter);
                  setSelectedFacilityDetails(shelter);
                }}
              >
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedShelter(shelter);
                    setSelectedFacilityDetails(shelter);
                  }}
                  style={{
                    backgroundColor: pinBg,
                    padding: 6,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    elevation: 5,
                  }}
                >
                  <Text style={{ fontSize: 13 }}>{pinIcon}</Text>
                </TouchableOpacity>
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
                'high', isHighContrast ? 'rgba(255,0,0,0.6)' : 'rgba(220,38,38,0.45)',
                'medium', isHighContrast ? 'rgba(255,140,0,0.5)' : 'rgba(249,115,22,0.40)',
                isHighContrast ? 'rgba(255,255,0,0.4)' : 'rgba(234,179,8,0.35)'
              ],
              circleStrokeColor: [
                'match', ['get', 'severity'],
                'high', isHighContrast ? '#FF0000' : 'rgba(220,38,38,0.9)',
                'medium', isHighContrast ? '#FF8C00' : 'rgba(249,115,22,0.85)',
                isHighContrast ? '#FFFF00' : 'rgba(234,179,8,0.8)'
              ],
              circleStrokeWidth: isHighContrast ? 4 : 2,
            }}
          />
          {/* Core epicenter dot for high visibility at all zoom levels */}
          <Mapbox.CircleLayer
            id="hazardCenters"
            style={{
              circleRadius: isHighContrast ? 8 : 6,
              circleColor: [
                'match', ['get', 'severity'],
                'high', '#dc2626', // Solid Red
                'medium', '#f97316', // Solid Orange
                '#eab308' // Solid Yellow
              ],
              circleStrokeColor: isHighContrast ? '#000000' : '#ffffff',
              circleStrokeWidth: isHighContrast ? 2.5 : 1.5,
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
            {/* Route line casing / outline for high-contrast separation */}
            <Mapbox.LineLayer
              id="routeCasing"
              style={{
                lineColor: isHighContrast ? '#000000' : '#0f172a',
                lineWidth: isHighContrast ? 12 : 9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Route line core */}
            <Mapbox.LineLayer
              id="routeLayer"
              style={{
                lineColor: isHighContrast ? '#FFFF00' : colors.routeLine,
                lineWidth: isHighContrast ? 8 : 5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* P3: Road Maintenance — dashed purple line segments */}
        {maintenances.length > 0 && (
          <Mapbox.ShapeSource
            id="maintenanceSource"
            shape={{
              type: 'FeatureCollection',
              features: maintenances.map(m => ({
                type: 'Feature',
                properties: { description: m.description },
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [parseFloat(m.start_longitude), parseFloat(m.start_latitude)],
                    [parseFloat(m.end_longitude),   parseFloat(m.end_latitude)],
                  ],
                },
              }))
            }}
          >
            <Mapbox.LineLayer
              id="maintenanceLayer"
              style={{
                lineColor: '#a855f7',
                lineWidth: 5,
                lineDasharray: [2, 2],
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* ─── TOP HIERARCHY: Resident Avatar Location Pin ─── */}
        {activeUserLocation && (
          <Mapbox.PointAnnotation
            key="user-location-avatar"
            id="user-location-avatar"
            coordinate={activeUserLocation}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 72, height: 72 }}>
              {/* Outer Pulsing Beacon Aura */}
              <View style={{
                position: 'absolute',
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(56, 189, 248, 0.35)',
                borderWidth: 2,
                borderColor: 'rgba(56, 189, 248, 0.7)',
              }} />

              {/* Inner Avatar Head Circle */}
              <View style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: '#0284c7',
                borderWidth: 3,
                borderColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.5,
                shadowRadius: 6,
                elevation: 12,
              }}>
                <User size={22} color="#ffffff" />
              </View>

              {/* YOU Pill Badge */}
              <View style={{
                backgroundColor: '#0f172a',
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 10,
                marginTop: -4,
                borderWidth: 1.5,
                borderColor: '#38bdf8',
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
              }}>
                <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>YOU</Text>
              </View>
            </View>
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>
      )}

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

      {/* ─── Siege / War / Armed Threat Smart Safety Protocol Banner ─── */}
      {showAlertBanner && activeSiegeThreat && (
        <View style={{
          position: 'absolute',
          top: 100,
          left: 16,
          right: 16,
          backgroundColor: isShelterNearbyForSiege ? '#064e3b' : '#7f1d1d',
          borderRadius: 16,
          padding: 14,
          borderWidth: 2,
          borderColor: isShelterNearbyForSiege ? '#10b981' : '#ef4444',
          zIndex: 50,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                <AlertTriangle color="#ffffff" size={18} />
                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 13, flex: 1 }}>
                  {isShelterNearbyForSiege 
                    ? `🛡️ NEARBY SECURE SHELTER AVAILABLE (${distanceKm} km)` 
                    : `🔒 ARMED THREAT / SIEGE: SHELTER IN PLACE`}
                </Text>
              </View>

              {isShelterNearbyForSiege ? (
                <Text style={{ color: '#d1fae5', fontSize: 11.5, lineHeight: 16, fontWeight: '600', marginBottom: 8 }}>
                  A secured evacuation center (<Text style={{ fontWeight: '900', color: '#ffffff' }}>{nearestShelter?.name}</Text>) is nearby ({distanceKm} km). Proceed immediately using the safest path.
                </Text>
              ) : (
                <Text style={{ color: '#fef2f2', fontSize: 11.5, lineHeight: 16, fontWeight: '600', marginBottom: 8 }}>
                  ⚠️ Nearest shelter is <Text style={{ fontWeight: '900', color: '#ffffff' }}>TOO FAR ({distanceKm} km)</Text>. <Text style={{ fontWeight: '900', color: '#fbbf24' }}>Lock all doors & windows</Text>, turn off lights, stay away from exterior glass, and remain low indoors until security forces arrive.
                </Text>
              )}

              {/* One-Click Navigation Action Button */}
              <TouchableOpacity
                onPress={() => handleOneClickEvacuate(nearestShelter)}
                style={{
                  backgroundColor: isShelterNearbyForSiege ? '#10b981' : '#dc2626',
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  elevation: 2,
                }}
              >
                <Navigation color="#ffffff" size={15} />
                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 12 }}>
                  {isShelterNearbyForSiege
                    ? `⚡ ONE-CLICK NAVIGATE TO ${nearestShelter?.name?.toUpperCase() || 'NEAREST SHELTER'}`
                    : `⚡ ONE-CLICK EVACUATE PATH (${distanceKm} km)`}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setDismissedAlertKey(activeAlertKey)} style={{ padding: 4, marginLeft: 8 }}>
              <X size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Disaster Proximity Recommendation Banner ─── */}
      {showAlertBanner && !activeSiegeThreat && activeDisasterNearUser && (
        <View style={{
          position: 'absolute',
          top: 100,
          left: 16,
          right: 16,
          backgroundColor: '#c2410c',
          borderRadius: 16,
          padding: 14,
          borderWidth: 2,
          borderColor: '#fb923c',
          zIndex: 50,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                <AlertTriangle color="#ffffff" size={18} />
                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 13, flex: 1 }}>
                  🚨 DISASTER NEAR YOU: {activeDisasterNearUser.name?.toUpperCase()}
                </Text>
              </View>
              <Text style={{ color: '#fff7ed', fontSize: 11.5, lineHeight: 16, fontWeight: '600', marginBottom: 8 }}>
                Hazard inside location radius ({distanceKm} km to {activeTargetShelter?.name || 'Nearest Shelter'}).
              </Text>
              <TouchableOpacity
                onPress={() => handleOneClickEvacuate(activeTargetShelter)}
                style={{
                  backgroundColor: '#ea580c',
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Navigation color="#ffffff" size={15} />
                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 12 }}>
                  ⚡ ONE-CLICK NAVIGATE TO SHELTER ({distanceKm} km)
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setDismissedAlertKey(activeAlertKey)} style={{ padding: 4, marginLeft: 8 }}>
              <X size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Unified Floating Pill Header Bar (Option A) ─── */}
      <View style={{
        position: 'absolute',
        top: Math.max(insets.top + 8, 48),
        left: 16,
        right: 16,
        zIndex: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Left Side: Explicit Live Emergency Status Pill */}
        <TouchableOpacity
          onPress={() => {
            setShowSituationBrief(true);
            Vibration.vibrate(40);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isHighContrast ? '#000000' : 'rgba(15, 23, 42, 0.92)',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: isHighContrast ? '#FFFF00' : 'rgba(255, 255, 255, 0.15)',
            elevation: 6,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' }} />
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>{shelters.length} Shelters</Text>
          </View>
          {hazards.length > 0 && (
            <>
              <View style={{ width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444' }} />
                <Text style={{ color: '#f87171', fontSize: 11, fontWeight: 'bold' }}>{hazards.length} Hazards</Text>
              </View>
            </>
          )}
          {isOffline && (
            <View style={{ backgroundColor: '#eab308', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
              <Text style={{ color: '#0f172a', fontSize: 8, fontWeight: '900' }}>OFFLINE</Text>
            </View>
          )}
          <Info size={13} color="#94a3b8" />
        </TouchableOpacity>

        {/* Right Side: Filter Dropdown Selector Pill */}
        <TouchableOpacity
          onPress={() => {
            setIsFilterExpanded(prev => !prev);
            Vibration.vibrate(40);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isHighContrast ? '#000000' : 'rgba(15, 23, 42, 0.95)',
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: isFilterExpanded ? colors.primary : (isHighContrast ? '#FFFF00' : 'rgba(255, 255, 255, 0.2)'),
            elevation: 6,
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 12 }}>
            {selectedCategoryFilter === 'shelter' ? '🏠' :
             selectedCategoryFilter === 'safe_zone' ? '🛡️' :
             selectedCategoryFilter === 'assembly_point' ? '🚩' :
             selectedCategoryFilter === 'security' ? '👮' : '📍'}
          </Text>
          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>
            {selectedCategoryFilter === 'shelter' ? 'Evac Centers' :
             selectedCategoryFilter === 'safe_zone' ? 'Safe Zones' :
             selectedCategoryFilter === 'assembly_point' ? 'Assembly Points' :
             selectedCategoryFilter === 'security' ? 'Police/Military' : 'All Places'}
          </Text>
          <ChevronDown size={14} color="#38bdf8" style={{ transform: [{ rotate: isFilterExpanded ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
      </View>

      {/* ─── Filter Dropdown Menu Options ─── */}
      {isFilterExpanded && (
        <View style={{
          position: 'absolute',
          top: 98,
          right: 16,
          width: 170,
          backgroundColor: isHighContrast ? '#000000' : 'rgba(15, 23, 42, 0.98)',
          borderRadius: 16,
          padding: 6,
          borderWidth: 1,
          borderColor: isHighContrast ? '#FFFF00' : 'rgba(255, 255, 255, 0.15)',
          zIndex: 50,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        }}>
          {[
            { key: 'all', label: 'All Places', icon: '📍' },
            { key: 'shelter', label: 'Evac Centers', icon: '🏠' },
            { key: 'safe_zone', label: 'Safe Zones', icon: '🛡️' },
            { key: 'assembly_point', label: 'Assembly Points', icon: '🚩' },
            { key: 'security', label: 'Police/Military', icon: '👮' },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              onPress={() => {
                setSelectedCategoryFilter(item.key);
                setIsFilterExpanded(false);
                Vibration.vibrate(30);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: selectedCategoryFilter === item.key ? (isHighContrast ? '#FFFF00' : colors.primary) : 'transparent',
                marginBottom: 2,
              }}
            >
              <Text style={{ fontSize: 13, marginRight: 8 }}>{item.icon}</Text>
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: selectedCategoryFilter === item.key ? (isHighContrast ? '#000000' : '#ffffff') : '#cbd5e1'
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ─── Google Maps Style Layers FAB (floating, bottom-left) ─── */}
      <View style={{ position: 'absolute', bottom: 180, left: 16, zIndex: 35 }}>
        <TouchableOpacity
          onPress={() => {
            setIsStyleMenuOpen(prev => !prev);
            Vibration.vibrate(30);
          }}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: isHighContrast ? '#000000' : 'rgba(15, 23, 42, 0.92)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isStyleMenuOpen ? colors.primary : (isHighContrast ? '#FFFF00' : 'rgba(255, 255, 255, 0.2)'),
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
        >
          <Layers size={20} color={isStyleMenuOpen ? colors.primary : '#ffffff'} />
        </TouchableOpacity>

        {/* Expandable Layer Options Menu */}
        {isStyleMenuOpen && (
          <View style={{
            position: 'absolute',
            bottom: 48,
            left: 0,
            width: 140,
            backgroundColor: isHighContrast ? '#000000' : 'rgba(15, 23, 42, 0.96)',
            borderRadius: 16,
            padding: 6,
            borderWidth: 1,
            borderColor: isHighContrast ? '#FFFF00' : 'rgba(255, 255, 255, 0.15)',
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            gap: 4,
          }}>
            {[
              { key: 'dark',      icon: '🌑', label: 'Dark Mode' },
              { key: 'satellite', icon: '🛰️', label: 'Satellite' },
              { key: 'streets',   icon: '🗺️', label: 'Standard Map' },
            ].map(s => (
              <TouchableOpacity
                key={s.key}
                onPress={() => {
                  setMapStyleMode(s.key);
                  setIsStyleMenuOpen(false);
                  Vibration.vibrate(30);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: mapStyleMode === s.key ? (isHighContrast ? '#FFFF00' : colors.primary) : 'transparent',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 13 }}>{s.icon}</Text>
                <Text style={{
                  fontSize: 11,
                  fontWeight: 'bold',
                  color: mapStyleMode === s.key ? (isHighContrast ? '#000000' : '#ffffff') : '#cbd5e1'
                }}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ─── Floating 1-Step Zoom Controls (floating, bottom-right) ─── */}
      <View style={{ position: 'absolute', bottom: 235, right: 16, zIndex: 30, gap: 6 }}>
        <TouchableOpacity
          onPress={() => {
            if (cameraRef.current) {
              const nextZoom = Math.min(currentZoomRef.current + 1, 20);
              currentZoomRef.current = nextZoom;
              cameraRef.current.setCamera({
                zoomLevel: nextZoom,
                animationDuration: 250,
              });
              Vibration.vibrate(30);
            }
          }}
          style={styles.mapStyleBtn}
        >
          <Text style={{ color: colors.white, fontSize: 18, fontWeight: 'bold' }}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (cameraRef.current) {
              const nextZoom = Math.max(currentZoomRef.current - 1, 3);
              currentZoomRef.current = nextZoom;
              cameraRef.current.setCamera({
                zoomLevel: nextZoom,
                animationDuration: 250,
              });
              Vibration.vibrate(30);
            }
          }}
          style={styles.mapStyleBtn}
        >
          <Text style={{ color: colors.white, fontSize: 18, fontWeight: 'bold' }}>−</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Recenter & Focus Location Button (floating, bottom-right) ─── */}
      <View style={{ position: 'absolute', bottom: 180, right: 16, zIndex: 30 }}>
        <TouchableOpacity
          onPress={() => {
            if (cameraRef.current && activeUserLocation) {
              cameraRef.current.setCamera({
                centerCoordinate: activeUserLocation,
                zoomLevel: 15,
                animationDuration: 1000,
              });
              Vibration.vibrate(50);
            }
          }}
          style={styles.mapStyleBtn}
        >
          <Navigation size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* ─── High Contrast Mode Toggle (floating, bottom-right) ─── */}
      <View style={{ position: 'absolute', bottom: 180, right: 16, zIndex: 30 }}>
        <TouchableOpacity
          onPress={() => {
            setIsHighContrast(o => !o);
            Vibration.vibrate(80);
          }}
          style={[
            styles.mapStyleBtn,
            isHighContrast && { backgroundColor: '#FFFF00', borderColor: '#000000', borderWidth: 2 }
          ]}
        >
          <Text style={[
            styles.mapStyleBtnText,
            isHighContrast && { color: '#000000', fontWeight: '900' }
          ]}>
            {isHighContrast ? '👁' : '🕶'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Compass Heading Widget (floating, top-right) ─── */}
      {activeUserLocation && targetShelterCoords && (
        <View style={{ position: 'absolute', top: 110, right: 16, zIndex: 30, alignItems: 'center' }}>
          <View style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: isHighContrast ? '#000000' : 'rgba(15,23,42,0.85)',
            borderWidth: 2,
            borderColor: isHighContrast ? '#FFFF00' : 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}>
            <Animated.View style={{
              transform: [{
                rotate: `${(getBearing(activeUserLocation[1], activeUserLocation[0], targetShelterCoords[1], targetShelterCoords[0]) - deviceHeading + 360) % 360}deg`
              }]
            }}>
              <Text style={{ fontSize: 22, color: isHighContrast ? '#FFFF00' : colors.primary }}>▲</Text>
            </Animated.View>
          </View>
          <Text style={{
            fontSize: 8,
            fontWeight: '900',
            color: isHighContrast ? '#FFFF00' : '#ffffff',
            marginTop: 4,
            backgroundColor: isHighContrast ? '#000000' : 'rgba(0,0,0,0.6)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            TO SHELTER
          </Text>
        </View>
      )}

      {/* ─── Draggable Bottom Sheet ─── */}
      <Animated.View style={[
        styles.bottomSheet, 
        { height: sheetHeightRef.current }, 
        isHighContrast && { backgroundColor: '#000000', borderTopWidth: 3, borderTopColor: '#FFFF00' }
      ]}>
        <View {...panResponder.panHandlers} style={[styles.bottomSheetHandle, isHighContrast && { backgroundColor: '#000000' }]}>
          <View style={[styles.bottomSheetBar, isHighContrast && { backgroundColor: '#FFFF00' }]} />
        </View>

        <View style={styles.bottomSheetContent}>
          {nearestShelter ? (
            <>
              {/* Sub-tabs for Map Info / Checklist */}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: isHighContrast ? '#FFFF00' : 'rgba(0,0,0,0.05)', marginBottom: 12, paddingBottom: 4 }}>
                <TouchableOpacity
                  onPress={() => {
                    setActiveSubTab('info');
                    Vibration.vibrate(40);
                  }}
                  style={{ marginRight: 16, paddingVertical: 4, borderBottomWidth: activeSubTab === 'info' ? 2 : 0, borderBottomColor: isHighContrast ? '#FFFF00' : colors.primary }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeSubTab === 'info' ? (isHighContrast ? '#FFFF00' : colors.primary) : (isHighContrast ? '#FFFF00' : '#888') }}>
                    Map Details
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setActiveSubTab('checklist');
                    Vibration.vibrate(40);
                  }}
                  style={{ paddingVertical: 4, borderBottomWidth: activeSubTab === 'checklist' ? 2 : 0, borderBottomColor: isHighContrast ? '#FFFF00' : colors.primary }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeSubTab === 'checklist' ? (isHighContrast ? '#FFFF00' : colors.primary) : (isHighContrast ? '#FFFF00' : '#888') }}>
                    Checklist Guide
                  </Text>
                </TouchableOpacity>
              </View>

              {activeSubTab === 'info' ? (
                <View style={styles.routingInfo}>
                  <Text style={[styles.destinationLabel, isHighContrast && { color: '#FFFF00', fontSize: 11, fontWeight: '900' }]}>NEAREST OPEN SHELTER:</Text>
                  <Text style={[styles.destinationName, isHighContrast && { color: '#FFFF00', fontSize: 18, fontWeight: '900' }]}>{nearestShelter.name}</Text>

                  {/* ETA + Distance */}
                  <Text style={[styles.etaText, isHighContrast && { color: '#FFFF00', fontSize: 15, fontWeight: '900' }]}>
                    {getETAMinutes(distanceMeters, transportationMode)} away · {(distanceMeters / 1000).toFixed(2)} km
                  </Text>

                  {/* Transport mode selector inside bottom sheet */}
                  <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
                    {[
                      { key: 'pedestrian', icon: '🚶', label: 'Walk' },
                      { key: '2_wheel',    icon: '🏍', label: 'Bike' },
                      { key: '4_wheel',    icon: '🚗', label: 'Car'  },
                    ].map(m => (
                      <TouchableOpacity
                        key={m.key}
                        style={[
                          styles.modeButton,
                          { flex: 1, paddingVertical: 6, justifyContent: 'center' },
                          transportationMode === m.key && styles.modeButtonActive
                        ]}
                        onPress={() => {
                          setTransportationMode(m.key);
                          Vibration.vibrate(50);
                        }}
                      >
                        <Text style={styles.modeIcon}>{m.icon}</Text>
                        <Text style={[styles.modeButtonText, transportationMode === m.key && styles.modeButtonTextActive]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Occupancy progress bar */}
                  <View style={[styles.occupancyBarTrack, isHighContrast && { borderColor: '#FFFF00', borderWidth: 1, backgroundColor: '#000000' }]}>
                    <View
                      style={[
                        styles.occupancyBarFill,
                        {
                          width: `${Math.min(100, Math.round((nearestShelter.current_occupancy / nearestShelter.max_capacity) * 100))}%`,
                          backgroundColor:
                            isHighContrast ? '#FFFF00' : (
                              nearestShelter.current_occupancy / nearestShelter.max_capacity > 0.8
                                ? colors.danger
                                : colors.successLight
                            ),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.occupancyText, isHighContrast && { color: '#FFFF00', fontWeight: 'bold' }]}>
                    {nearestShelter.current_occupancy}/{nearestShelter.max_capacity} occupancy
                  </Text>

                  {/* Route warnings */}
                  {routeWarnings.length > 0 && (
                    <View style={styles.warningsContainer}>
                      {routeWarnings.map((w, idx) => (
                        <View key={idx} style={[styles.warningPill, isHighContrast && { borderColor: '#FFFF00', borderWidth: 1, backgroundColor: '#000000' }]}>
                          <AlertTriangle size={12} color={isHighContrast ? '#FFFF00' : colors.warningText} />
                          <Text style={[styles.warningPillText, isHighContrast && { color: '#FFFF00', fontWeight: 'bold' }]}>{w}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 180, marginBottom: 12 }} showsVerticalScrollIndicator={false}>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : '#22C55E', marginRight: 8, fontWeight: '900' }}>✓</Text>
                      <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : '#444', fontWeight: '700' }}>
                        Start from your current position
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : colors.primary, marginRight: 8, fontWeight: '900' }}>➔</Text>
                      <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : '#444', fontWeight: '700' }}>
                        Follow the designated safe route ({transportationMode === 'pedestrian' ? 'Walking' : transportationMode === '2_wheel' ? 'Bike' : 'Driving'})
                      </Text>
                    </View>

                    {routeWarnings.length > 0 ? (
                      routeWarnings.map((w, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : '#F59E0B', marginRight: 8, fontWeight: '900' }}>⚠</Text>
                          <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : '#444', fontWeight: '700' }}>
                            {w}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : '#22C55E', marginRight: 8, fontWeight: '900' }}>✓</Text>
                        <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : '#444', fontWeight: '700' }}>
                          No hazard warning segments crossed
                        </Text>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : colors.primary, marginRight: 8, fontWeight: '900' }}>🏠</Text>
                      <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : '#444', fontWeight: '700' }}>
                        Arrive at {nearestShelter.name}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, color: isHighContrast ? '#FFFF00' : colors.primary, marginRight: 8, fontWeight: '900' }}>📲</Text>
                      <Text style={{ fontSize: 13, color: isHighContrast ? '#FFFF00' : '#444', fontWeight: '700' }}>
                        Go to QR Profile and present it to shelter staff to check in
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    title={isNavigating ? "Stop Navigation" : "Start Navigation"}
                    onPress={() => {
                      setIsNavigating(prev => !prev);
                      Vibration.vibrate(80);
                    }}
                    variant={isNavigating ? "outline" : "primary"}
                    size="large"
                    icon={<Navigation color={isNavigating ? (isHighContrast ? '#FFFF00' : colors.primary) : (isHighContrast ? '#000000' : colors.white)} size={20} />}
                    style={isHighContrast && { backgroundColor: '#FFFF00' }}
                    textStyle={isHighContrast && { color: '#000000', fontWeight: '900' }}
                  />
                </View>
                <TouchableOpacity
                  onPress={openExternalNavigation}
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Navigation color={colors.primary} size={20} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.warningBox}>
              <AlertTriangle color={colors.danger} size={24} />
              <Text style={styles.warningText}>No open shelters available at this time.</Text>
            </View>
          )}
        </View>
      </Animated.View>
      {/* ─── REV-03: Facility Details Card Modal Overlay ─── */}
      {selectedFacilityDetails && (
        <View style={{
          position: 'absolute',
          bottom: SHEET_COLLAPSED + 15,
          left: 16,
          right: 16,
          backgroundColor: '#0f172a',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          zIndex: 50,
          elevation: 10,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>
                {selectedFacilityDetails.facility_type === 'safe_zone' ? '🛡️' :
                 selectedFacilityDetails.facility_type === 'assembly_point' ? '🚩' :
                 selectedFacilityDetails.facility_type === 'police_station' || selectedFacilityDetails.facility_type === 'military_base' ? '👮' :
                 selectedFacilityDetails.facility_type === 'hospital' ? '🏥' : '🏠'}
              </Text>
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15, flex: 1 }} numberOfLines={1}>
                {selectedFacilityDetails.name}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedFacilityDetails(null)} style={{ padding: 4 }}>
              <X color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <Text style={{ backgroundColor: '#1e293b', color: '#38bdf8', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontWeight: 'bold' }}>
              {(selectedFacilityDetails.facility_type || 'Evacuation Center').replace('_', ' ').toUpperCase()}
            </Text>
            {selectedFacilityDetails.elevation_meters && (
              <Text style={{ backgroundColor: '#14532d', color: '#4ade80', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontWeight: 'bold' }}>
                ⛰️ {selectedFacilityDetails.elevation_meters}m Elevation
              </Text>
            )}
            <Text style={{ backgroundColor: selectedFacilityDetails.current_occupancy > selectedFacilityDetails.max_capacity ? '#b91c1c' : selectedFacilityDetails.status === 'open' ? '#14532d' : '#7f1d1d', color: '#ffffff', fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontWeight: 'bold' }}>
              {selectedFacilityDetails.current_occupancy > selectedFacilityDetails.max_capacity 
                ? `⚠️ OVERFLOW (${selectedFacilityDetails.current_occupancy}/${selectedFacilityDetails.max_capacity})` 
                : selectedFacilityDetails.status?.toUpperCase() || 'OPEN'}
            </Text>
          </View>

          {selectedFacilityDetails.transport_schedule && (
            <View style={{ backgroundColor: '#1e1b4b', padding: 8, borderRadius: 8, marginBottom: 8 }}>
              <Text style={{ color: '#a78bfa', fontSize: 11, fontWeight: 'bold' }}>
                🚍 Transport Pickup: {selectedFacilityDetails.transport_schedule}
              </Text>
            </View>
          )}

          {selectedFacilityDetails.amenities && (
            <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 12 }}>
              📦 Amenities: {selectedFacilityDetails.amenities}
            </Text>
          )}

          <TouchableOpacity
            onPress={() => {
              setSelectedCategoryFilter(selectedFacilityDetails.facility_type === 'safe_zone' ? 'safe_zone' : selectedFacilityDetails.facility_type === 'assembly_point' ? 'assembly_point' : 'all');
              setSelectedFacilityDetails(null);
            }}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
              Route to this Destination
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Emergency Situation Briefing Modal ─── */}
      {showSituationBrief && (
        <View style={{
          position: 'absolute',
          top: 100,
          left: 16,
          right: 16,
          backgroundColor: '#0f172a',
          borderRadius: 20,
          padding: 16,
          borderWidth: 1.5,
          borderColor: '#38bdf8',
          zIndex: 60,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#38bdf8', fontSize: 14, fontWeight: '900' }}>📍 ZAMBOANGA EMERGENCY BRIEFING</Text>
            <TouchableOpacity onPress={() => setShowSituationBrief(false)}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            <View style={{ backgroundColor: '#1e293b', padding: 10, borderRadius: 10 }}>
              <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>
                🏠 Evacuation Centers & Safe Zones: {shelters.length} Open
              </Text>
              <Text style={{ color: '#cbd5e1', fontSize: 11 }}>
                All active shelters in Zamboanga City are equipped with medical stations and food rations.
              </Text>
            </View>

            <View style={{ backgroundColor: '#1e293b', padding: 10, borderRadius: 10 }}>
              <Text style={{ color: hazards.length > 0 ? '#f87171' : '#38bdf8', fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>
                ⚠️ Active Hazard Zones: {hazards.length} Detected
              </Text>
              {hazards.length > 0 ? (
                hazards.map((h, idx) => (
                  <Text key={idx} style={{ color: '#fca5a5', fontSize: 11, marginVertical: 1 }}>
                    • {h.name || 'Hazard Zone'} ({h.hazard_type} - {h.severity_level || 'moderate'})
                  </Text>
                ))
              ) : (
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>No critical active hazards reported nearby.</Text>
              )}
            </View>

            {maintenances.length > 0 && (
              <View style={{ backgroundColor: '#1e293b', padding: 10, borderRadius: 10 }}>
                <Text style={{ color: '#c084fc', fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>
                  🛣️ Road Closures: {maintenances.length} Active
                </Text>
                {maintenances.map((m, idx) => (
                  <Text key={idx} style={{ color: '#e9d5ff', fontSize: 11, marginVertical: 1 }}>
                    • {m.description || 'Road maintenance in progress'}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
