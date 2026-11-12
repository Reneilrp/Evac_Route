import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Linking, Alert, Platform, Animated, PanResponder, Vibration, Modal, Pressable } from 'react-native';
import { AlertTriangle, Navigation, Phone, X, User, ChevronDown, ChevronUp, Info, Layers, ShieldAlert, Activity, CheckCircle2, Footprints, Bike, Car, Home } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { triggerCasualHaptic } from '../../utils/haptics';
import * as Location from 'expo-location';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import api from '../../services/api';
import { getStyles } from '../../styles/EvacMap.styles';
import { useResidentStore } from '../../context/useResidentStore';
import PrimaryButton from '../../components/common/PrimaryButton';
import EmergencySOSModal from '../../components/disaster/EmergencySOSModal';
import ShelterInPlaceModal from '../../components/map/modals/ShelterInPlaceModal';
import DestinationProximityModal from '../../components/map/modals/DestinationProximityModal';
import EarthquakeWarningModal from '../../components/map/modals/EarthquakeWarningModal';
import PinLocationDetailsModal from '../../components/map/modals/PinLocationDetailsModal';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import NavigationTurnBanner from '../../components/map/NavigationTurnBanner';
import ActiveThreatBanner from '../../components/map/ActiveThreatBanner';
import EvacMapHeaderBar from '../../components/map/EvacMapHeaderBar';
import EvacMapControlButtons from '../../components/map/EvacMapControlButtons';
import ShelterBottomSheet from '../../components/map/ShelterBottomSheet';
import FacilityDetailsModal from '../../components/map/modals/FacilityDetailsModal';
import { getEcho } from '../../services/echo';

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
  getCacheSyncStatus,
  getDistanceMeters,
} from '../../services/offlineDb';
import { calculateOfflineRoute, fetchMapboxDirectionsRoute, determineTargetFacility } from '../../utils/astarRouter';
import { MAPBOX_PUBLIC_TOKEN, clampToZamboanga, ZAMBOANGA_WMSU } from '../../utils/zamboangaGeo';
import NavigationPuck from '../../components/rescue/NavigationPuck';

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



// ─── Road Hazard Corridor Line Generator (High-Visibility Road Line instead of Circle) ───
function createHazardRoadCorridorLine(center, radiusInMeters = 50) {
  const [lng, lat] = center;
  const radius = Math.max(30, radiusInMeters);
  const distanceX = radius / (111320 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radius / 110540;

  // Street corridor line segment extending along roadway orientation
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [lng - distanceX * 0.9, lat - distanceY * 0.45],
        [lng + distanceX * 0.9, lat + distanceY * 0.45],
      ],
    },
  };
}

// ─── Dynamic Render Radius based on Height Bar / Map Scale (Zoom Level) ───
function getScaleRenderRadius(zoom) {
  if (zoom >= 16) return 1500;  // 1.5 km (~100m - 200m scale bar)
  if (zoom >= 15) return 2500;  // 2.5 km (~500m scale bar)
  if (zoom >= 14) return 4500;  // 4.5 km (~1 km scale bar)
  if (zoom >= 13) return 8000;  // 8 km (~2 km scale bar)
  if (zoom >= 12) return 16000; // 16 km (~5 km scale bar)
  return 40000;                 // 40 km (city-wide overview)
}

// Read Mapbox token from config or fallback, and initialize immediately
const MAPBOX_TOKEN = MAPBOX_PUBLIC_TOKEN || Constants.expoConfig?.extra?.mapboxToken || process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
if (MAPBOX_TOKEN) {
  try {
    Mapbox.setAccessToken(MAPBOX_TOKEN);
    Mapbox.setTelemetryEnabled(false);
  } catch (_e) {}
}

export default function EvacMap({ navigation, route }) {
  const { colors, isDarkMode } = useTheme();
  const styles = useThemedStyles(getStyles);
  const insets = useSafeAreaInsets();
  const bottomDockClearance = Math.max(insets.bottom + 68, 92);
  const SHEET_COLLAPSED = Math.max(240, 145 + bottomDockClearance);
  const SHEET_EXPANDED = Math.min(Math.round(SCREEN_HEIGHT * 0.68), 540);
  const queryClient = useQueryClient();
  const [location, setLocation] = useState(null);
  const [isPinningHomeMode, setIsPinningHomeMode] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [activePinDetails, setActivePinDetails] = useState(null); // 'user' | 'home' | null

  useEffect(() => {
    if (route?.params?.pinHome) {
      setTimeout(() => setIsPinningHomeMode(true), 0);
    }
  }, [route?.params?.pinHome]);

  // Local cache fallback state
  const [offlineShelters, setOfflineShelters] = useState([]);
  const [offlineHazards, setOfflineHazards] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheSyncStatus, setCacheSyncStatus] = useState({});

  // Optimized in-memory Graph Caching and Route Throttle states
  const [preloadedGraph, setPreloadedGraph] = useState(null);
  const [cachedRoute, setCachedRoute] = useState(null);
  const [lastRoutingLocation, setLastRoutingLocation] = useState(null);
  const [isRouteBlocked, setIsRouteBlocked] = useState(false);
  const [routeWarnings, setRouteWarnings] = useState([]);

  // Map style switcher (defaults to dark in Dark Mode, standard streets in Light Mode)
  const [overrideStyleMode, setOverrideStyleMode] = useState(null);
  const mapStyleMode = overrideStyleMode || (isDarkMode ? 'dark' : 'streets');
  const setMapStyleMode = (mode) => setOverrideStyleMode(mode === (isDarkMode ? 'dark' : 'streets') ? null : mode);
  const [currentZoom, setCurrentZoom] = useState(14);
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
  const [selectedDisasterFilter, setSelectedDisasterFilter] = useState('all'); // 'all' | 'flood' | 'fire' | 'earthquake' | 'siege' | 'chemical'
  const [selectedFacilityDetails, setSelectedFacilityDetails] = useState(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isDisasterFilterExpanded, setIsDisasterFilterExpanded] = useState(false);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [showSituationBrief, setShowSituationBrief] = useState(false);
  
  // Navigation & Selection states
  const cameraRef = useRef(null);
  const currentZoomRef = useRef(14);
  const cameraChangeTimerRef = useRef(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSiegeModalVisible, setIsSiegeModalVisible] = useState(false);
  const [pendingNavShelter, setPendingNavShelter] = useState(null);

  // Turn-by-Turn Navigation States (Google Maps Style)
  const [routeSteps, setRouteSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActiveTurnByTurn, setIsActiveTurnByTurn] = useState(false);

  // Destination Proximity Warning Modal State
  const [showDestinationProximityModal, setShowDestinationProximityModal] = useState(false);
  const [proximityTargetFacility, setProximityTargetFacility] = useState(null);
  const [nearSiegeHazardInfo, setNearSiegeHazardInfo] = useState(null);

  const checkDestinationNearHazard = (targetFacility) => {
    if (!targetFacility || !hazards || hazards.length === 0) return null;
    const destLat = parseFloat(targetFacility.latitude);
    const destLng = parseFloat(targetFacility.longitude);

    for (const h of hazards) {
      if (h.is_active === true || h.is_active === 1 || h.is_active === '1' || h.is_active === undefined) {
        const hLat = parseFloat(h.latitude);
        const hLng = parseFloat(h.longitude);
        const rad = parseFloat(h.radius_meters || 150);
        const distToDest = getDistanceMeters(destLat, destLng, hLat, hLng);

        // Destination is within hazard radius + 500m warning buffer zone
        if (distToDest <= rad + 500) {
          return { hazard: h, distToDest: Math.round(distToDest), rad };
        }
      }
    }
    return null;
  };

  // Compass Bearing Calculation Helper
  const getBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  };

  const handleStartActiveNavigation = () => {
    setIsActiveTurnByTurn(true);
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
        animationDuration: 1000,
      });
    }
    Vibration.vibrate([0, 100, 50, 100]);
  };

  // Panic flash state
  const [showPanicFlash, setShowPanicFlash] = useState(false);
  const panicOpacityRef = useRef(new Animated.Value(0));
  const previousStatusRef = useRef(null);

  // Bottom sheet animation & state tracking
  const isSheetExpandedRef = useRef(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const currentSheetHeightRef = useRef(SHEET_COLLAPSED);
  const startSheetHeightRef = useRef(SHEET_COLLAPSED);
  const sheetHeightRef = useRef(new Animated.Value(SHEET_COLLAPSED));

  const toggleSheet = useCallback((forceState) => {
    const nextState = typeof forceState === 'boolean' ? forceState : !isSheetExpandedRef.current;
    const target = nextState ? SHEET_EXPANDED : SHEET_COLLAPSED;
    isSheetExpandedRef.current = nextState;
    setIsSheetExpanded(nextState);
    triggerCasualHaptic(40);
    Animated.spring(sheetHeightRef.current, {
      toValue: target,
      useNativeDriver: false,
      speed: 15,
      bounciness: 3,
    }).start(() => {
      currentSheetHeightRef.current = target;
    });
  }, [SHEET_EXPANDED, SHEET_COLLAPSED]);

  // Keep sheet heights in sync if dimensions or safe insets update
  useEffect(() => {
    const target = isSheetExpandedRef.current ? SHEET_EXPANDED : SHEET_COLLAPSED;
    currentSheetHeightRef.current = target;
    sheetHeightRef.current.setValue(target);
  }, [SHEET_COLLAPSED, SHEET_EXPANDED]);

  // Read/write routing mode globally from Zustand store
  const user = useResidentStore(state => state.user);
  const homeLocation = useResidentStore(state => state.homeLocation);
  const setHomeLocation = useResidentStore(state => state.setHomeLocation);
  const transportationMode = useResidentStore(state => state.transportationMode || 'pedestrian');
  const setTransportationMode = useResidentStore(state => state.setTransportationMode);
  const status = useResidentStore(state => state.status);
  const setSafeStatus = useResidentStore(state => state.setSafeStatus);

  // ─── Automated Geofence Arrival State ───
  const [geofencePrompt, setGeofencePrompt] = useState(null);
  const [isGeofenceCheckingIn, setIsGeofenceCheckingIn] = useState(false);
  const isGeofenceCheckingInRef = useRef(false);
  const checkedInShelterIdRef = useRef(null);
  const dismissedSheltersRef = useRef(new Set());

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
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 3,
      onPanResponderGrant: () => {
        startSheetHeightRef.current = currentSheetHeightRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = startSheetHeightRef.current - gestureState.dy;
        const clampedHeight = Math.max(SHEET_COLLAPSED, Math.min(SHEET_EXPANDED, newHeight));
        sheetHeightRef.current.setValue(clampedHeight);
        currentSheetHeightRef.current = clampedHeight;
      },
      onPanResponderRelease: (_, gestureState) => {
        // Quick tap detection on handle
        if (Math.abs(gestureState.dy) < 6 && Math.abs(gestureState.dx) < 6) {
          toggleSheet();
          return;
        }

        let shouldExpand = isSheetExpandedRef.current;
        if (gestureState.vy < -0.4) {
          shouldExpand = true;
        } else if (gestureState.vy > 0.4) {
          shouldExpand = false;
        } else {
          const midpoint = (SHEET_COLLAPSED + SHEET_EXPANDED) / 2;
          shouldExpand = currentSheetHeightRef.current > midpoint;
        }

        toggleSheet(shouldExpand);
      },
    })
  ).current;

  // Initialize DB and load cached data on mount
  useEffect(() => {
    initDb();
    try {
      const cachedS = getOfflineShelters();
      const cachedH = getOfflineHazardsExtended(); // P4: use extended schema so offline hazards have type+severity
      setTimeout(() => {
        setCacheSyncStatus(getCacheSyncStatus());
        setOfflineShelters(cachedS);
        setOfflineHazards(cachedH);
      }, 0);

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

      setTimeout(() => {
        setPreloadedGraph({ nodesMap, edgesBySource });
      }, 0);
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

  // Real-time synchronization for hazard updates from DRRM / EOC
  useEffect(() => {
    const echo = getEcho();
    if (!echo || !echo.channel) return;

    const channel = echo.channel('map-updates');
    const refreshMap = () => {
      queryClient.invalidateQueries({ queryKey: ['resident-map-data'] });
    };

    channel.listen('.hazard.created', refreshMap);
    channel.listen('.hazard.resolved', refreshMap);

    return () => {
      channel.stopListening('.hazard.created');
      channel.stopListening('.hazard.resolved');
    };
  }, [queryClient]);

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
          setCacheSyncStatus(getCacheSyncStatus());
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
        setCacheSyncStatus(getCacheSyncStatus());
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
        setCacheSyncStatus(getCacheSyncStatus());
        setOfflineHazards(hazardsData);
        setIsOffline(false);
      }, 0);
    }
  }, [hazardsData]);

  useEffect(() => {
    if (sheltersData || mapData) {
      setTimeout(() => setIsOffline(false), 0);
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
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
      if (initial?.coords) {
        setLocation(clampToZamboanga([initial.coords.longitude, initial.coords.latitude], ZAMBOANGA_WMSU));
      }
      
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 2,
          timeInterval: 1500,
        },
        (loc) => {
          if (loc?.coords) {
            setLocation(clampToZamboanga([loc.coords.longitude, loc.coords.latitude], ZAMBOANGA_WMSU));
          }
        }
      );

      try {
        let lastHeading = 0;
        let lastUpdateTime = 0;
        headingSubscription = await Location.watchHeadingAsync((data) => {
          const newHeading = Math.round(data.trueHeading || data.magneticHeading || 0);
          const now = Date.now();
          // Filter sensor noise: only update if rotated >= 3 degrees and at least 250ms elapsed
          if (Math.abs(newHeading - lastHeading) >= 3 && now - lastUpdateTime >= 250) {
            lastHeading = newHeading;
            lastUpdateTime = now;
            setDeviceHeading(newHeading);
          }
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

  const shelters = useMemo(() => {
    return (Array.isArray(sheltersData) && sheltersData.length > 0)
      ? sheltersData
      : (Array.isArray(sheltersData?.data) ? sheltersData.data : (Array.isArray(offlineShelters) ? offlineShelters : []));
  }, [sheltersData, offlineShelters]);

  const hazards = useMemo(() => {
    const rawHazardsList = (Array.isArray(hazardsData) && hazardsData.length > 0)
      ? hazardsData
      : (Array.isArray(hazardsData?.data) ? hazardsData.data : (Array.isArray(offlineHazards) ? offlineHazards : []));
    return (Array.isArray(rawHazardsList) ? rawHazardsList : []).filter(
      h => h && (h.is_active === true || h.is_active === 1 || h.is_active === '1' || h.is_active === undefined)
    );
  }, [hazardsData, offlineHazards]);

  // Filter active hazards based on Disaster Preset Filter
  const filteredHazards = useMemo(() => {
    if (selectedDisasterFilter === 'all') return hazards;
    return hazards.filter(h => {
      if (!h) return false;
      const hType = (h.hazard_type || '').toLowerCase();
      if (selectedDisasterFilter === 'flood') return ['flood', 'landslide', 'tsunami', 'water'].some(t => hType.includes(t));
      if (selectedDisasterFilter === 'fire') return ['fire', 'wildfire', 'explosion', 'smoke'].some(t => hType.includes(t));
      if (selectedDisasterFilter === 'earthquake') return ['earthquake', 'tremor', 'structural_collapse', 'fault'].some(t => hType.includes(t));
      if (selectedDisasterFilter === 'siege') return ['siege', 'armed', 'conflict', 'civil_unrest', 'security'].some(t => hType.includes(t));
      if (selectedDisasterFilter === 'chemical') return ['chemical', 'biohazard', 'gas', 'toxic', 'decontamination'].some(t => hType.includes(t));
      return true;
    });
  }, [hazards, selectedDisasterFilter]);

  // Filter shelters/places based on Category AND Disaster Preset Filter
  const safeShelters = useMemo(() => (Array.isArray(shelters) ? shelters : []), [shelters]);
  const filteredShelters = useMemo(() => {
    return safeShelters.filter(shelter => {
      if (!shelter) return false;
      // Exclude closed or completely full shelters from pathfinding suggestions
      if (shelter.status === 'closed' || shelter.status === 'full') return false;

      // 1. Facility Category Filter
      if (selectedCategoryFilter === 'shelter' && !(shelter.facility_type === 'evacuation_center' || !shelter.facility_type)) return false;
      if (selectedCategoryFilter === 'safe_zone' && shelter.facility_type !== 'safe_zone') return false;
      if (selectedCategoryFilter === 'assembly_point' && shelter.facility_type !== 'assembly_point') return false;
      if (selectedCategoryFilter === 'security' && !['police_station', 'military_base'].includes(shelter.facility_type)) return false;

      // 2. Disaster Preset Filter Context
      if (selectedDisasterFilter === 'all') return true;
      const fType = (shelter.facility_type || '').toLowerCase();
      if (selectedDisasterFilter === 'flood') return ['safe_zone', 'evacuation_center', 'hospital'].includes(fType);
      if (selectedDisasterFilter === 'fire') return ['assembly_point', 'fire_station', 'evacuation_center'].includes(fType);
      if (selectedDisasterFilter === 'earthquake') return ['assembly_point', 'hospital', 'evacuation_center'].includes(fType);
      if (selectedDisasterFilter === 'siege') return ['police_station', 'military_base', 'evacuation_center', 'safe_zone'].includes(fType);
      if (selectedDisasterFilter === 'chemical') return ['hospital', 'safe_zone', 'evacuation_center'].includes(fType);
      return true;
    });
  }, [safeShelters, selectedCategoryFilter, selectedDisasterFilter]);

  // Default fallback to Zamboanga City (WMSU) if GPS is completely unavailable
  const defaultZamboangaPos = useMemo(() => ZAMBOANGA_WMSU, []);
  const isValidCoordinate = (pos) => {
    if (!pos || !Array.isArray(pos) || pos.length < 2) return false;
    const lng = Number(pos[0]);
    const lat = Number(pos[1]);
    return !isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0;
  };

  // Dynamic User Location Determination:
  // 1. Priority 1: Physical Device GPS (real-time phone location right now)
  // 2. Priority 2: Custom Home Location in Profile (fallback when device GPS is unavailable)
  // 3. Priority 3: Registered profile coordinates / Barangay Center
  // 4. Fallback: Tetuan Barangay Center [122.084, 6.918]
  const activeUserLocation = useMemo(() => {
    // 1. Live device GPS is primary
    if (isValidCoordinate(location)) {
      return location;
    }
    // 2. Home Location fallback if GPS not locked
    if (isValidCoordinate(homeLocation)) {
      return homeLocation;
    }
    
    // 3. User saved profile coordinates
    const userLat = parseFloat(user?.last_latitude || user?.latitude);
    const userLng = parseFloat(user?.last_longitude || user?.longitude);
    if (!isNaN(userLat) && !isNaN(userLng) && isValidCoordinate([userLng, userLat])) {
      return [userLng, userLat];
    }

    // 4. Barangay center fallback
    const barangayName = user?.family_profile?.barangay || user?.barangay;
    if (barangayName) {
      const barangayCoords = {
        'Tetuan': [122.0882, 6.9185],
        'Tumaga': [122.0780, 6.9410],
        'Baliwasan': [122.0573, 6.9126],
        'San Jose': [122.0450, 6.9230],
        'Putik': [122.0950, 6.9350],
      };
      const bCoords = barangayCoords[barangayName];
      if (bCoords) return bCoords;
    }

    return defaultZamboangaPos;
  }, [location, homeLocation, user, defaultZamboangaPos]);

  const homeDistanceKm = useMemo(() => {
    if (!activeUserLocation || !homeLocation) return null;
    const dMeters = getDistanceMeters(activeUserLocation[1], activeUserLocation[0], homeLocation[1], homeLocation[0]);
    return (dMeters / 1000).toFixed(2);
  }, [activeUserLocation, homeLocation]);

  // ─── Initial Map Camera Centering (guarantees view centers on Zamboanga City immediately) ───
  const hasInitialCenteredRef = useRef(false);
  useEffect(() => {
    if (!hasInitialCenteredRef.current && cameraRef.current && activeUserLocation) {
      hasInitialCenteredRef.current = true;
      cameraRef.current.setCamera({
        centerCoordinate: activeUserLocation,
        zoomLevel: 14,
        animationDuration: 800,
      });
    }
  }, [activeUserLocation]);

  // ─── Proximity Hazard & Threat Protocol Analysis ───
  const activeThreatsNearUser = useMemo(() => {
    return (activeUserLocation && hazards && hazards.length > 0)
      ? hazards.filter(h => {
          const hLat = parseFloat(h.latitude);
          const hLng = parseFloat(h.longitude);
          const radius = parseFloat(h.radius_meters || 500);
          const dist = getDistanceMeters(activeUserLocation[1], activeUserLocation[0], hLat, hLng);
          return dist <= radius + 300; // Inside hazard zone or 300m buffer
        })
      : [];
  }, [activeUserLocation, hazards]);

  // ─── Automated Geofence Arrival Detection (<= 80 meters) ───
  useEffect(() => {
    if (!activeUserLocation || !Array.isArray(activeUserLocation) || activeUserLocation.length < 2 || geofencePrompt || isGeofenceCheckingIn) return;
    if (!safeShelters || safeShelters.length === 0) return;

    const userLng = activeUserLocation[0];
    const userLat = activeUserLocation[1];

    for (const s of safeShelters) {
      if (!s.latitude || !s.longitude || s.status === 'closed') continue;
      if (checkedInShelterIdRef.current === s.id) continue;
      if (dismissedSheltersRef.current.has(s.id)) continue;

      const dist = getDistanceMeters(userLat, userLng, Number(s.latitude), Number(s.longitude));
      if (dist <= 80) {
        setTimeout(() => {
          setGeofencePrompt({ shelter: s, distanceMeters: Math.round(dist) });
        }, 0);
        Vibration.vibrate([0, 80, 50, 80]);
        break;
      }
    }
  }, [activeUserLocation, safeShelters, geofencePrompt, isGeofenceCheckingIn]);

  const handleConfirmGeofenceCheckIn = async (targetShelter) => {
    if (!targetShelter || !activeUserLocation || isGeofenceCheckingIn || isGeofenceCheckingInRef.current) return;
    isGeofenceCheckingInRef.current = true;
    setIsGeofenceCheckingIn(true);
    try {
      await api.post(`/shelters/${targetShelter.id}/geofence-checkin`, {
        latitude: activeUserLocation[1],
        longitude: activeUserLocation[0],
      });
      checkedInShelterIdRef.current = targetShelter.id;
      setGeofencePrompt(null);
      setSafeStatus({
        shelter_name: targetShelter.name,
        checked_in_at: new Date().toISOString(),
      });
      Alert.alert(
        '🎉 Check-In Confirmed!',
        `Welcome to ${targetShelter.name}!\n\nYour family has been automatically registered in the system.\n\nPlease proceed inside to the CSWDO relief desk to claim your supplies.`
      );
    } catch (err) {
      const msg = err?.response?.data?.message || 'Geofence check-in could not be completed.';
      Alert.alert('Check-In Notice', msg);
    } finally {
      isGeofenceCheckingInRef.current = false;
      setIsGeofenceCheckingIn(false);
    }
  };

  const activeSiegeThreat = useMemo(() => {
    return activeThreatsNearUser.find(h =>
      ['siege', 'war', 'active_shooter', 'civil_unrest'].includes(h.hazard_type) ||
      (h.disaster_category === 'man_made' && h.severity_level === 'high')
    );
  }, [activeThreatsNearUser]);

  const isResidentInsideSiege = useMemo(() => {
    return (activeUserLocation && hazards && hazards.length > 0)
      ? hazards.some(h => {
          if (!['siege', 'war', 'active_shooter', 'civil_unrest'].includes(h.hazard_type) &&
              !(h.disaster_category === 'man_made' && h.severity_level === 'high')) {
            return false;
          }
          const hLat = parseFloat(h.latitude);
          const hLng = parseFloat(h.longitude);
          const radius = parseFloat(h.radius_meters || 500);
          const dist = getDistanceMeters(activeUserLocation[1], activeUserLocation[0], hLat, hLng);
          return dist <= radius + 300; // Inside siege zone or 300m crossfire danger buffer
        })
      : false;
  }, [activeUserLocation, hazards]);

  const activeDisasterNearUser = useMemo(() => {
    return activeThreatsNearUser.find(h =>
      ['flood', 'landslide', 'typhoon', 'tsunami', 'fire', 'explosion'].includes(h.hazard_type) ||
      h.severity_level === 'high' || h.severity_level === 'critical'
    );
  }, [activeThreatsNearUser]);

  // Earthquake Broadcast Warning Detector
  const activeEarthquakeHazard = (hazards && hazards.length > 0)
    ? hazards.find(h =>
        (h.is_active === true || h.is_active === 1 || h.is_active === '1' || h.is_active === undefined) &&
        (h.hazard_type === 'earthquake' || h.name?.toLowerCase().includes('earthquake') || h.name?.toLowerCase().includes('tremor'))
      )
    : null;

  const [hasDismissedEarthquakeModal, setHasDismissedEarthquakeModal] = useState(false);

  useEffect(() => {
    if (activeEarthquakeHazard && !hasDismissedEarthquakeModal) {
      Vibration.vibrate([0, 400, 200, 400, 200, 400]);
    }
  }, [activeEarthquakeHazard, hasDismissedEarthquakeModal]);

  const activeAlertKey = activeSiegeThreat?.id || activeDisasterNearUser?.id || null;
  const [dismissedAlertKey, setDismissedAlertKey] = useState(null);

  // Auto-launch custom Siege Safety Modal once on app open ONLY if resident is actually inside a siege hazard zone
  const hasAutoPromptedSiegeRef = useRef(false);
  useEffect(() => {
    if ((isResidentInsideSiege || activeSiegeThreat) && !hasAutoPromptedSiegeRef.current) {
      hasAutoPromptedSiegeRef.current = true;
      const timer = setTimeout(() => {
        setIsSiegeModalVisible(true);
        Vibration.vibrate([0, 150, 100, 150]);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isResidentInsideSiege, activeSiegeThreat]);

  // Auto-dismiss disaster alert banners after 8 seconds, but keep Siege Threat banners ALWAYS VISIBLE
  useEffect(() => {
    if (activeAlertKey && !activeSiegeThreat) {
      const timer = setTimeout(() => {
        setDismissedAlertKey(activeAlertKey);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeAlertKey, activeSiegeThreat]);

  const showAlertBanner = Boolean(activeAlertKey && dismissedAlertKey !== activeAlertKey);

  const nearestShelter = useMemo(() => {
    if (activeUserLocation && filteredShelters.length > 0) {
      const targetResult = determineTargetFacility(activeUserLocation[1], activeUserLocation[0], filteredShelters, filteredHazards, selectedCategoryFilter);
      if (targetResult && targetResult.facility) {
        return targetResult.facility;
      }
    }
    return null;
  }, [activeUserLocation, filteredShelters, filteredHazards, selectedCategoryFilter]);

  const activeTargetShelter = selectedShelter || nearestShelter;

  // ─── Scope Rendering to Height Bar / Map Scale ───
  const renderCenter = mapCenter || activeUserLocation;
  const renderRadius = useMemo(() => getScaleRenderRadius(currentZoom), [currentZoom]);

  // Render only shelters within the scale bar / height bar scope
  const visibleShelters = useMemo(() => {
    if (!renderCenter) return filteredShelters;
    return filteredShelters.filter(s => {
      // Always retain active target shelter and selected shelter so navigation is never clipped
      if (activeTargetShelter && s.id === activeTargetShelter.id) return true;
      if (selectedShelter && s.id === selectedShelter.id) return true;
      const sLat = parseFloat(s.latitude);
      const sLng = parseFloat(s.longitude);
      if (isNaN(sLat) || isNaN(sLng)) return false;
      const dist = getDistanceMeters(renderCenter[1], renderCenter[0], sLat, sLng);
      return dist <= renderRadius;
    });
  }, [filteredShelters, renderCenter, renderRadius, activeTargetShelter, selectedShelter]);

  // Render only hazards and floods within the scale bar / height bar scope
  const visibleHazards = useMemo(() => {
    if (!renderCenter || !filteredHazards) return filteredHazards || [];
    return filteredHazards.filter(h => {
      const hLat = parseFloat(h.latitude);
      const hLng = parseFloat(h.longitude);
      if (isNaN(hLat) || isNaN(hLng)) return false;
      const hRadius = parseFloat(h.radius_meters || 50);
      const dist = getDistanceMeters(renderCenter[1], renderCenter[0], hLat, hLng);
      return dist <= renderRadius + hRadius;
    });
  }, [filteredHazards, renderCenter, renderRadius]);

  const targetShelterCoords = activeTargetShelter
    ? [parseFloat(activeTargetShelter.longitude), parseFloat(activeTargetShelter.latitude)]
    : null;
  const targetLng = targetShelterCoords?.[0];
  const targetLat = targetShelterCoords?.[1];

  const distanceMeters = (activeUserLocation && targetShelterCoords)
    ? getDistanceMeters(activeUserLocation[1], activeUserLocation[0], targetShelterCoords[1], targetShelterCoords[0])
    : 0;

  const distanceKm = distanceMeters > 0 ? (distanceMeters / 1000).toFixed(2) : '0.00';

  // Hysteresis Deadband Buffer (1.4 km - 1.6 km) to prevent GPS Jitter UI Flickering
  const prevSiegeStateRef = useRef(false);

  const isShelterNearbyForSiege = (() => {
    if (!nearestShelter || distanceMeters <= 0) {
      prevSiegeStateRef.current = false;
      return false;
    }

    if (distanceMeters <= 1400) {
      prevSiegeStateRef.current = true;
    } else if (distanceMeters >= 1600) {
      prevSiegeStateRef.current = false;
    }

    return prevSiegeStateRef.current;
  })();

  const proceedWithNavigation = (dest) => {
    if (!dest) return;

    if (dest.status === 'full' || dest.status === 'closed') {
      Alert.alert(
        dest.status === 'full' ? '⛔ Shelter at Full Capacity' : '⛔ Shelter Closed',
        dest.status === 'full'
          ? `${dest.name || 'This shelter'} is currently at 100% capacity and cannot accept more evacuees. Please select another active open evacuation center.`
          : `${dest.name || 'This shelter'} is currently closed. Please select an active open shelter.`,
        [{ text: 'Understood' }]
      );
      triggerCasualHaptic(40);
      return;
    }

    setSelectedShelter(dest);
    setIsNavigating(true);

    const targetCoords = [parseFloat(dest.longitude), parseFloat(dest.latitude)];
    if (cameraRef.current && activeUserLocation && targetCoords) {
      const minLng = Math.min(activeUserLocation[0], targetCoords[0]);
      const maxLng = Math.max(activeUserLocation[0], targetCoords[0]);
      const minLat = Math.min(activeUserLocation[1], targetCoords[1]);
      const maxLat = Math.max(activeUserLocation[1], targetCoords[1]);

      cameraRef.current.setCamera({
        bounds: {
          ne: [maxLng, maxLat],
          sw: [minLng, minLat],
          paddingBottom: 180,
          paddingTop: 100,
          paddingLeft: 60,
          paddingRight: 60,
        },
        animationDuration: 1000,
      });
    }
    Vibration.vibrate([0, 100, 50, 100]);
  };

  const handleOneClickEvacuate = (targetFacility) => {
    const dest = targetFacility || activeTargetShelter || nearestShelter;
    if (!dest) return;

    // Siege Hazard Safety Protocol: Trigger custom dark glassmorphic Armed Threat Modal on any navigation attempt if inside siege zone
    if (isResidentInsideSiege || activeSiegeThreat) {
      setPendingNavShelter(dest);
      setIsSiegeModalVisible(true);
      Vibration.vibrate([0, 100, 50, 100]);
      return;
    }

    // Proximity Warning Protocol: Trigger Warning Modal if resident is far, but chosen destination is near/inside active hazard circle
    const hazardNearDestInfo = checkDestinationNearHazard(dest);
    if (hazardNearDestInfo) {
      setProximityTargetFacility(dest);
      setNearSiegeHazardInfo(hazardNearDestInfo);
      setShowDestinationProximityModal(true);
      Vibration.vibrate([0, 150, 100, 150]);
      return;
    }

    proceedWithNavigation(dest);
  };

  useEffect(() => {
    if (!isNavigating || !activeUserLocation || !targetShelterCoords) {
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
      (async () => {
        // 1. Try Mapbox Directions API with hazard exclusion
        let result = await fetchMapboxDirectionsRoute(activeUserLocation, targetShelterCoords, MAPBOX_TOKEN, transportationMode, hazards);

        // 2. If Mapbox with hazard exclusion returns no path, fetch direct Mapbox route to destination
        let isHazardIntersected = false;
        if (!result || !result.path || result.path.length === 0) {
          result = await fetchMapboxDirectionsRoute(activeUserLocation, targetShelterCoords, MAPBOX_TOKEN, transportationMode, []);
          if (result && result.path && result.path.length > 0) {
            isHazardIntersected = true;
          }
        }

        // 3. Fall back to offline A* algorithm if offline or Mapbox API unavailable
        if (!result || !result.path || result.path.length === 0) {
          const data = preloadedGraph ? {
            nodesMap: preloadedGraph.nodesMap,
            edgesBySource: preloadedGraph.edgesBySource,
            hazards: hazards
          } : { hazards };
          result = calculateOfflineRoute(activeUserLocation, targetShelterCoords, data, transportationMode);
        }

        if (result && (result.status === 'success' || (result.path && result.path.length > 0))) {
          setCachedRoute(result.path);
          setRouteSteps(result.steps || []);
          setCurrentStepIndex(0);

          if (isHazardIntersected) {
            setRouteWarnings([`⚠️ WARNING: Your route to ${activeTargetShelter?.name || 'Destination'} passes near an active hazard zone. Proceed with extreme caution.`]);
          } else {
            setRouteWarnings(result.warnings || []);
          }
          setIsRouteBlocked(false);

          if (cameraRef.current && activeUserLocation && targetShelterCoords) {
            const minLng = Math.min(activeUserLocation[0], targetShelterCoords[0]);
            const maxLng = Math.max(activeUserLocation[0], targetShelterCoords[0]);
            const minLat = Math.min(activeUserLocation[1], targetShelterCoords[1]);
            const maxLat = Math.max(activeUserLocation[1], targetShelterCoords[1]);

            cameraRef.current.setCamera({
              bounds: {
                ne: [maxLng, maxLat],
                sw: [minLng, minLat],
                paddingBottom: 180,
                paddingTop: 100,
                paddingLeft: 60,
                paddingRight: 60,
              },
              animationDuration: 1000,
            });
          }

          Vibration.vibrate([0, 80, 100, 80]);
        } else {
          setCachedRoute(null);
          setRouteWarnings(['No safe route available to target facility']);
          setIsRouteBlocked(true);
          Vibration.vibrate([0, 500, 200, 500]);
        }
        setLastRoutingLocation(activeUserLocation);
      })();
      
      lastHazardsRef.current = hazards;
      lastShelterCoordsRef.current = targetShelterCoords;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigating, activeUserLocation, targetLng, targetLat, hazards, preloadedGraph, transportationMode, activeTargetShelter?.name, cachedRoute, lastRoutingLocation]);

  const routeGeoJSON = useMemo(() => {
    return cachedRoute ? {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: cachedRoute } }]
    } : null;
  }, [cachedRoute]);

  const activeHazardsGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: (visibleHazards || []).filter(h => h.is_active && !h.is_fixed_flood_spot).map(hazard => {
        const line = createHazardRoadCorridorLine(
          [parseFloat(hazard.longitude), parseFloat(hazard.latitude)],
          parseFloat(hazard.radius_meters || 50)
        );
        return {
          ...line,
          properties: {
            id: hazard.id,
            name: hazard.name,
            radius: parseFloat(hazard.radius_meters ?? 0),
            hazard_type: hazard.hazard_type ?? 'hazard',
            severity: hazard.severity_level ?? 'medium',
          },
        };
      })
    };
  }, [visibleHazards]);

  const susceptibleGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: (visibleHazards || []).filter(h => h.is_fixed_flood_spot && !h.is_active).map(hazard => {
        const line = createHazardRoadCorridorLine(
          [parseFloat(hazard.longitude), parseFloat(hazard.latitude)],
          parseFloat(hazard.radius_meters || 50)
        );
        return {
          ...line,
          properties: {
            id: hazard.id,
            name: hazard.name,
            radius: parseFloat(hazard.radius_meters ?? 0),
            hazard_type: hazard.hazard_type ?? 'hazard',
            severity: hazard.severity_level ?? 'medium',
          },
        };
      })
    };
  }, [visibleHazards]);

  if (!location || (isLoadingShelters && offlineShelters.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Acquiring GPS Signal...</Text>
      </View>
    );
  }

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
          scaleBarEnabled={true}
          scaleBarPosition={{ bottom: SHEET_COLLAPSED + 6, left: 16 }}
          compassEnabled={false}
          zoomEnabled={true}
          onCameraChanged={(e) => {
            const zoom = e?.properties?.zoom;
            const center = e?.properties?.center;
            if (zoom != null) {
              currentZoomRef.current = zoom;
            }
            if (cameraChangeTimerRef.current) {
              clearTimeout(cameraChangeTimerRef.current);
            }
            cameraChangeTimerRef.current = setTimeout(() => {
              if (zoom != null) {
                const roundedZoom = Math.round(zoom * 2) / 2;
                setCurrentZoom(prev => (prev !== roundedZoom ? roundedZoom : prev));
              }
              if (center && Array.isArray(center) && center.length >= 2) {
                setMapCenter(prev => {
                  if (!prev || Math.abs(prev[0] - center[0]) > 0.002 || Math.abs(prev[1] - center[1]) > 0.002) {
                    return center;
                  }
                  return prev;
                });
              }
            }, 180);
          }}
          onDidFinishLoadingMap={() => {
            if (cameraRef.current && activeUserLocation) {
              cameraRef.current.setCamera({
                centerCoordinate: activeUserLocation,
                zoomLevel: 14,
                animationDuration: 600,
              });
            }
          }}
          scrollEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
          onPress={(feature) => {
            if (isPinningHomeMode) {
              const coords = feature?.geometry?.coordinates;
              if (coords && coords.length >= 2) {
                setHomeLocation([coords[0], coords[1]]);
                setIsPinningHomeMode(false);
                Vibration.vibrate([0, 100, 50, 100]);
                Alert.alert(
                  '📍 Home Address Pinpointed!',
                  `Home location set to [${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}]. System A* evacuation routes will now start from this home address!`,
                  [{ text: 'OK' }]
                );
              }
            }
          }}
        >
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={activeUserLocation}
          zoomLevel={14}
          animationMode="flyTo"
          animationDuration={800}
        />

        {visibleShelters.map(shelter => {
            const sLat = parseFloat(shelter.latitude);
            const sLng = parseFloat(shelter.longitude);
            
            // --- OPTION 1A & 1B: Smart Map Rendering Rules ---
            if (shelter.type === 'secondary' || shelter.facility_type === 'evacuation_center') {
              // Rule 1: Hide secondary shelters when zoomed out (city-level overview)
              if (currentZoom < 12) return null;
            }
            // -------------------------------------------------

            let pinBg = colors.successLight;
            let pinIcon = '🏠';

            if (shelter.type === 'primary') {
              pinBg = '#2563eb'; // Bright blue for primary clusters
              pinIcon = '⭐';
            } else if (shelter.facility_type === 'safe_zone') { pinBg = '#16a34a'; pinIcon = '🛡️'; }
            else if (shelter.facility_type === 'assembly_point') { pinBg = '#f97316'; pinIcon = '🚩'; }
            else if (shelter.facility_type === 'police_station' || shelter.facility_type === 'military_base') { pinBg = '#1d4ed8'; pinIcon = '👮'; }
            else if (shelter.facility_type === 'hospital') { pinBg = '#dc2626'; pinIcon = '🏥'; }
            else if (shelter.facility_type === 'fire_station') { pinBg = '#ea580c'; pinIcon = '🚒'; }

            if (shelter.status === 'closed') {
              pinBg = '#64748b'; // Gray out closed shelters (like secondary courts)
              pinIcon = '🔒';
            } else if (shelter.status === 'full') {
              pinBg = '#e11d48'; // Rose-600 danger for full shelter
              pinIcon = '⛔';
            }

            return (
              <Mapbox.PointAnnotation
                key={`s-${shelter.id}`}
                id={`s-${shelter.id}`}
                coordinate={[sLng, sLat]}
                onSelected={() => {
                  setSelectedShelter(shelter);
                  setSelectedFacilityDetails(shelter);
                  triggerCasualHaptic(40);
                }}
              >
                <View 
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
                </View>
              </Mapbox.PointAnnotation>
            );
          })}

        {/* Active Emergency Hazards: High-Visibility Road Hazard Line Corridor (Line instead of Circle) */}
        <Mapbox.ShapeSource id="hazardsSource" shape={activeHazardsGeoJSON}>
          {/* Outer Casing / High-Contrast Halo */}
          <Mapbox.LineLayer
            id="hazardsLineCasing"
            style={{
              lineColor: '#000000',
              lineWidth: isHighContrast ? 11 : 9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          {/* Core Road Hazard Line Corridor */}
          <Mapbox.LineLayer
            id="hazardsLineCore"
            style={{
              lineColor: [
                'match', ['get', 'severity'],
                'high', '#ef4444',
                'medium', '#f97316',
                '#eab308'
              ],
              lineWidth: isHighContrast ? 7 : 5,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          {/* Hazard type label above each road line corridor */}
          <Mapbox.SymbolLayer
            id="hazardLabels"
            style={{
              textField: ['get', 'hazard_type'],
              textSize: 10,
              textColor: '#ffffff',
              textHaloColor: '#000000',
              textHaloWidth: 1.5,
              textTranslate: [0, -14],
              textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
              textTransform: 'uppercase',
            }}
          />
        </Mapbox.ShapeSource>

        {/* Flood Susceptibility Road Corridors: Dashed Light Blue */}
        <Mapbox.ShapeSource id="susceptibleSource" shape={susceptibleGeoJSON}>
          <Mapbox.LineLayer
            id="susceptibleOutlineLayer"
            style={{
              lineColor: '#38bdf8',
              lineWidth: 4,
              lineDasharray: [4, 4],
              lineCap: 'round',
              lineJoin: 'round',
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

        {/* ─── TOP HIERARCHY: Resident Location Marker (Google Maps Style 3D Navigation Puck) ─── */}
        {activeUserLocation && (
          <Mapbox.PointAnnotation
            key="user-location-avatar"
            id="user-location-avatar"
            coordinate={activeUserLocation}
            onSelected={() => {
              triggerCasualHaptic(50);
              setActivePinDetails('user');
            }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerCasualHaptic(50);
                setActivePinDetails('user');
              }}
              style={{ alignItems: 'center', justifyContent: 'center' }}
            >
              {/* YOU Pill Badge (ABOVE Puck) */}
              <View style={{
                backgroundColor: '#0f172a',
                paddingHorizontal: 8,
                paddingVertical: 2.5,
                borderRadius: 10,
                marginBottom: 3,
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

              {/* Google Navigation 3D Chevron Puck */}
              <NavigationPuck
                heading={deviceHeading || 0}
                theme="resident"
                size={44}
                showBeam={isActiveTurnByTurn || isNavigating}
                isNavigating={isActiveTurnByTurn || isNavigating}
              />
            </TouchableOpacity>
          </Mapbox.PointAnnotation>
        )}

        {/* Pinpointed Home Address Marker */}
        {homeLocation && (
          <Mapbox.PointAnnotation
            key="home-location-pin"
            id="home-location-pin"
            coordinate={homeLocation}
            onSelected={() => {
              triggerCasualHaptic(50);
              setActivePinDetails('home');
            }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerCasualHaptic(50);
                setActivePinDetails('home');
              }}
              style={{ alignItems: 'center', justifyContent: 'center' }}
            >
              {/* HOME Pill Badge (ABOVE house icon) */}
              <View style={{
                backgroundColor: '#0f172a',
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 8,
                marginBottom: 3,
                borderWidth: 1.5,
                borderColor: '#38bdf8',
                elevation: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 3,
              }}>
                <Text style={{ color: '#38bdf8', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 }}>HOME</Text>
              </View>

              {/* House Icon Circle */}
              <View style={{
                backgroundColor: '#0284c7',
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2.5,
                borderColor: '#ffffff',
                elevation: 10,
                shadowColor: '#0284c7',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
              }}>
                <Home size={19} color="#ffffff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>
      )}

      {/* ─── Top Floating Pinpoint Home Location Banner ─── */}
      {isPinningHomeMode && (
        <View style={{
          position: 'absolute',
          top: 60,
          left: 16,
          right: 16,
          backgroundColor: '#0284c7',
          borderRadius: 20,
          padding: 16,
          borderWidth: 2,
          borderColor: '#38bdf8',
          zIndex: 100,
          alignItems: 'center',
          shadowColor: '#0284c7',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 12,
        }}>
          <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 13.5, textAlign: 'center', letterSpacing: 0.5 }}>
            📍 TAP ANYWHERE ON THE MAP TO PINPOINT YOUR HOME ADDRESS
          </Text>
          <Text style={{ color: '#e0f2fe', fontSize: 11.5, textAlign: 'center', marginTop: 4, fontWeight: '600' }}>
            Tap your house, building, or street in Zamboanga City to set your evacuation starting point.
          </Text>
          <TouchableOpacity
            onPress={() => setIsPinningHomeMode(false)}
            style={{ marginTop: 10, backgroundColor: 'rgba(15, 23, 42, 0.7)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Cancel Pinning</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── GOOGLE MAPS STYLE TURN-BY-TURN TOP NAVIGATION BANNER ─── */}
      <NavigationTurnBanner
        isActiveTurnByTurn={isActiveTurnByTurn}
        setIsActiveTurnByTurn={setIsActiveTurnByTurn}
        setIsNavigating={setIsNavigating}
        setCachedRoute={setCachedRoute}
        setSelectedShelter={setSelectedShelter}
        triggerCasualHaptic={triggerCasualHaptic}
        insets={insets}
        routeSteps={routeSteps}
        currentStepIndex={currentStepIndex}
        activeTargetShelter={activeTargetShelter}
        distanceKm={distanceKm}
        distanceMeters={distanceMeters}
        transportationMode={transportationMode}
        getETAMinutes={getETAMinutes}
        cameraRef={cameraRef}
        activeUserLocation={activeUserLocation}
        cachedRoute={cachedRoute}
        targetShelterCoords={targetShelterCoords}
        getBearing={getBearing}
        isNavigating={isNavigating}
        sheetHeightRef={sheetHeightRef}
        handleStartActiveNavigation={handleStartActiveNavigation}
      />

      {/* ─── CRITICAL THREAT & PROXIMITY ALERT BANNER ─── */}
      <ActiveThreatBanner
        isRouteBlocked={isRouteBlocked}
        styles={styles}
        colors={colors}
        callEmergencyHotline={callEmergencyHotline}
        showAlertBanner={showAlertBanner}
        activeSiegeThreat={activeSiegeThreat}
        isShelterNearbyForSiege={isShelterNearbyForSiege}
        distanceKm={distanceKm}
        distanceMeters={distanceMeters}
        nearestShelter={nearestShelter}
        handleOneClickEvacuate={handleOneClickEvacuate}
        activeTargetShelter={activeTargetShelter}
        setDismissedAlertKey={setDismissedAlertKey}
        activeAlertKey={activeAlertKey}
        activeDisasterNearUser={activeDisasterNearUser}
        geofencePrompt={geofencePrompt}
        setGeofencePrompt={setGeofencePrompt}
        dismissedSheltersRef={dismissedSheltersRef}
        isGeofenceCheckingIn={isGeofenceCheckingIn}
        handleConfirmGeofenceCheckIn={handleConfirmGeofenceCheckIn}
      />

      {/* ─── TOP BRANDING & LIVE STATUS OVERLAY ─── */}
      <EvacMapHeaderBar
        insets={insets}
        showSituationBrief={showSituationBrief}
        setShowSituationBrief={setShowSituationBrief}
        setIsDisasterFilterExpanded={setIsDisasterFilterExpanded}
        isDisasterFilterExpanded={isDisasterFilterExpanded}
        setIsFilterExpanded={setIsFilterExpanded}
        isFilterExpanded={isFilterExpanded}
        setIsStyleMenuOpen={setIsStyleMenuOpen}
        triggerCasualHaptic={triggerCasualHaptic}
        isHighContrast={isHighContrast}
        isDarkMode={isDarkMode}
        colors={colors}
        hazards={hazards}
        shelters={shelters}
        selectedDisasterFilter={selectedDisasterFilter}
        setSelectedDisasterFilter={setSelectedDisasterFilter}
        selectedCategoryFilter={selectedCategoryFilter}
        setSelectedCategoryFilter={setSelectedCategoryFilter}
        cacheSyncStatus={cacheSyncStatus}
      />

      {/* ─── FLOATING ACTION CONTROLS, COMPASS & STYLE FAB ─── */}
      <EvacMapControlButtons
        sheetHeightRef={sheetHeightRef}
        isStyleMenuOpen={isStyleMenuOpen}
        setIsStyleMenuOpen={setIsStyleMenuOpen}
        setIsDisasterFilterExpanded={setIsDisasterFilterExpanded}
        setIsFilterExpanded={setIsFilterExpanded}
        setShowSituationBrief={setShowSituationBrief}
        triggerCasualHaptic={triggerCasualHaptic}
        isHighContrast={isHighContrast}
        setIsHighContrast={setIsHighContrast}
        isDarkMode={isDarkMode}
        colors={colors}
        mapStyleMode={mapStyleMode}
        setMapStyleMode={setMapStyleMode}
        currentZoomRef={currentZoomRef}
        cameraRef={cameraRef}
        activeUserLocation={activeUserLocation}
        deviceHeading={deviceHeading}
        targetShelterCoords={targetShelterCoords}
        getBearing={getBearing}
      />

      {/* ─── BOTTOM INTERACTIVE SLIDING SHEET ─── */}
      <ShelterBottomSheet
        styles={styles}
        sheetHeightRef={sheetHeightRef}
        isHighContrast={isHighContrast}
        panResponder={panResponder}
        isSheetExpanded={isSheetExpanded}
        setIsSheetExpanded={setIsSheetExpanded}
        triggerCasualHaptic={triggerCasualHaptic}
        nearestShelter={nearestShelter}
        colors={colors}
        isDarkMode={isDarkMode}
        distanceMeters={distanceMeters}
        shelters={shelters}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        transportationMode={transportationMode}
        setTransportationMode={setTransportationMode}
        getETAMinutes={getETAMinutes}
        routeWarnings={routeWarnings}
        isNavigating={isNavigating}
        setIsNavigating={setIsNavigating}
        handleOneClickEvacuate={handleOneClickEvacuate}
        openExternalNavigation={openExternalNavigation}
        bottomDockClearance={bottomDockClearance}
      />

      {/* ─── FACILITY DETAILS & EMERGENCY BRIEFING MODALS ─── */}
      <FacilityDetailsModal
        selectedFacilityDetails={selectedFacilityDetails}
        setSelectedFacilityDetails={setSelectedFacilityDetails}
        sheetHeightRef={sheetHeightRef}
        triggerCasualHaptic={triggerCasualHaptic}
        isDarkMode={isDarkMode}
        colors={colors}
        handleOneClickEvacuate={handleOneClickEvacuate}
        shelters={shelters}
        setGeofencePrompt={setGeofencePrompt}
        showSituationBrief={showSituationBrief}
        setShowSituationBrief={setShowSituationBrief}
        hazards={hazards}
      />

      {/* ─── CUSTOM STYLED ARMED THREAT: SHELTER IN PLACE MODAL ─── */}
      <ShelterInPlaceModal
        visible={isSiegeModalVisible}
        onClose={() => setIsSiegeModalVisible(false)}
        activeSiegeThreat={activeSiegeThreat}
        onOverrideNavigate={() => {
          setIsSiegeModalVisible(false);
          if (pendingNavShelter) {
            setSelectedShelter(pendingNavShelter);
            setIsNavigating(true);
          }
        }}
      />

      {/* ─── Destination Near Siege/Disaster Warning Modal ─── */}
      <DestinationProximityModal
        visible={showDestinationProximityModal}
        onClose={() => setShowDestinationProximityModal(false)}
        targetFacility={proximityTargetFacility}
        hazardInfo={nearSiegeHazardInfo}
        onProceedAnyway={() => {
          if (proximityTargetFacility) {
            proceedWithNavigation(proximityTargetFacility);
          }
        }}
      />

      {/* ─── Earthquake Warning Broadcast & Epicenter Modal ─── */}
      <EarthquakeWarningModal
        visible={Boolean(activeEarthquakeHazard && !hasDismissedEarthquakeModal)}
        onDismiss={() => setHasDismissedEarthquakeModal(true)}
        activeEarthquakeHazard={activeEarthquakeHazard}
      />

      {/* ─── PIN LOCATION DETAILS MODAL (YOU & HOME) ─── */}
      <PinLocationDetailsModal
        activePinDetails={activePinDetails}
        onClose={() => setActivePinDetails(null)}
        activeUserLocation={activeUserLocation}
        homeLocation={homeLocation}
        homeDistanceKm={homeDistanceKm}
        user={user}
        transportationMode={transportationMode}
        onRecenterOnMe={() => {
          if (cameraRef.current && activeUserLocation) {
            cameraRef.current.setCamera({
              centerCoordinate: activeUserLocation,
              zoomLevel: 16,
              animationDuration: 700,
            });
          }
        }}
        onNavigateToQR={() => {
          navigation.navigate('Safe Check-in');
        }}
        onRepinHomeAddress={() => {
          setIsPinningHomeMode(true);
        }}
        onCenterOnHome={() => {
          if (cameraRef.current && homeLocation) {
            cameraRef.current.setCamera({
              centerCoordinate: homeLocation,
              zoomLevel: 16,
              animationDuration: 700,
            });
          }
        }}
      />

      {/* Ordering-System Style Emergency SOS Modal */}
      <EmergencySOSModal
        visible={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        initialCoords={activeUserLocation ? { latitude: activeUserLocation[1], longitude: activeUserLocation[0] } : null}
      />
    </View>
  );
}
