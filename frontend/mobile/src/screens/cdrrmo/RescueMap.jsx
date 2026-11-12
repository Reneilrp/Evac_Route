import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { triggerCasualHaptic } from '../../utils/haptics';
import {
  Navigation,
  Navigation2,
  Crosshair,
  AlertTriangle,
  Building,
  Phone,
  MessageSquare,
  CheckCircle2,
  Shield,
  Layers,
  ArrowLeft,
  LifeBuoy,
  Radio,
  RotateCcw,
  Play,
  Pause,
  FastForward,
  ChevronUp,
  MapPin,
} from 'lucide-react-native';
import api from '../../services/api';
import { spacing, radii } from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useRescueSimulationStore } from '../../context/useRescueSimulationStore';
import RescueSimulationStepper from '../../components/rescue/RescueSimulationStepper';
import RescueTopHud from '../../components/rescue/RescueTopHud';
import RescueMapControls from '../../components/rescue/RescueMapControls';
import ActiveHazardsDrawer from '../../components/rescue/ActiveHazardsDrawer';
import RescueSimulationPanel from '../../components/rescue/RescueSimulationPanel';
import RescueMissionActionBar from '../../components/rescue/RescueMissionActionBar';
import { getStyles } from '../../styles/RescueMap.styles';
import NavigationPuck from '../../components/rescue/NavigationPuck';
import VictimArrivalModal from '../../components/rescue/VictimArrivalModal';
import ShelterArrivalModal from '../../components/rescue/ShelterArrivalModal';
import StartSimModal from '../../components/rescue/StartSimModal';
import {
  MAPBOX_PUBLIC_TOKEN,
  clampToZamboanga,
  ZAMBOANGA_RESCUER_BASE,
  ZAMBOANGA_VICTIM_DEFAULT,
  ZAMBOANGA_SHELTER_DEFAULT,
  create20mGeofenceSquare,
  buildHazardGeoJSONFeature,
} from '../../utils/zamboangaGeo';
import {
  fetchTacticalRescueRoute,
  getRescuerCapabilityProfile,
  getHaversineDistanceMeters,
} from '../../utils/tacticalRescueRouter';

// Ensure Mapbox access token is set immediately
if (MAPBOX_PUBLIC_TOKEN) {
  try {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  } catch (_e) {
    // Ignore in Expo Go
  }
}

// Bearing angle helper
function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Safe vibration helper to prevent emulator Binder thread blocking
const safeVibrate = (pattern) => {
  try {
    Vibration.vibrate(pattern);
  } catch (_e) {
    // Graceful fallback on emulators without haptic motors
  }
};

export default function RescueMap({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const styles = useThemedStyles(getStyles);
  const cameraRef = useRef(null);

  // Initialize Mapbox token
  useEffect(() => {
    if (MAPBOX_PUBLIC_TOKEN) {
      try {
        Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
      } catch (e) {
        console.warn('[RescueMapScreen] Failed to set Mapbox token:', e);
      }
    }
  }, []);

  // 1. Fetch Active Missions
  const {
    data: missionsData,
    refetch: refetchMissions,
  } = useQuery({
    queryKey: ['rescue-missions-active'],
    queryFn: () => api.get('/rescue/missions?active_only=1').then((r) => r.data.data),
    refetchInterval: 8000,
  });

  // 2. Fetch Shelters
  const { data: sheltersData } = useQuery({
    queryKey: ['shelters-list-rescue'],
    queryFn: () => api.get('/shelters').then((r) => r.data.data),
  });

  // 3. Fetch Hazards (real-time hazard sync for fast dynamic disaster response)
  const { data: hazardsData } = useQuery({
    queryKey: ['hazards-list-rescue'],
    queryFn: () => api.get('/hazards').then((r) => r.data.data),
    refetchInterval: 3000,
  });

  // 4. Fetch Rescue Units
  const { data: unitsData } = useQuery({
    queryKey: ['rescue-units-duty'],
    queryFn: () => api.get('/rescue/units').then((r) => r.data.data),
  });

  const allActiveMissions = useMemo(() => missionsData ?? [], [missionsData]);
  const assignedUnit =
    unitsData?.find((u) => u.id === user?.assigned_rescue_unit_id) ||
    (user?.role === 'admin' ? unitsData?.[0] : null);

  const rescuerProfile = useMemo(
    () => getRescuerCapabilityProfile(assignedUnit, user),
    [assignedUnit, user]
  );

  const selectedMissionId = route?.params?.missionId || null;

  // Available active missions for assigned unit or fleet
  const availableMissions = useMemo(() => {
    if (assignedUnit) {
      const unitList = allActiveMissions.filter((m) => m.rescue_unit_id === assignedUnit.id);
      if (unitList.length > 0) return unitList;
    }
    return allActiveMissions;
  }, [allActiveMissions, assignedUnit]);

  // Target mission: by selected ID or param ID or first unit mission
  const missionParamId = route?.params?.missionId;
  const currentMission = useMemo(() => {
    if (selectedMissionId) {
      const found = availableMissions.find((m) => m.id === selectedMissionId);
      if (found) return found;
    }
    if (missionParamId) {
      const paramFound = availableMissions.find((m) => m.id === missionParamId);
      if (paramFound) return paramFound;
    }
    if (assignedUnit) {
      const unitMission = availableMissions.find((m) => m.rescue_unit_id === assignedUnit.id);
      if (unitMission) return unitMission;
      if (user?.assigned_rescue_unit_id) return null;
    }
    return user?.role === 'admin' ? availableMissions[0] || null : null;
  }, [availableMissions, selectedMissionId, missionParamId, assignedUnit, user?.assigned_rescue_unit_id, user?.role]);

  const shelters = useMemo(() => sheltersData ?? [], [sheltersData]);

  // Fallback demo mission for presentation/simulation mode if no live mission is assigned
  const DEMO_MISSION_FALLBACK = useMemo(() => ({
    id: 'demo-sim-mendoza',
    victim_name: 'Mendoza Family (Distress)',
    headcount: 4,
    barangay: 'Baliwasan Coastal',
    special_needs: 'Elderly with wheelchair, Infant (6 mos)',
    situation_description: 'Rising floodwater reached 1.2m on ground floor. Trapped on rooftop with low battery.',
    victim_latitude: ZAMBOANGA_VICTIM_DEFAULT[1],
    victim_longitude: ZAMBOANGA_VICTIM_DEFAULT[0],
    status: 'dispatched',
    target_shelter_id: shelters[0]?.id || 1,
    target_shelter: shelters[0] || {
      id: 1,
      name: 'Baliwasan Gym Evacuation Center',
      latitude: ZAMBOANGA_SHELTER_DEFAULT[1],
      longitude: ZAMBOANGA_SHELTER_DEFAULT[0],
    },
    incident: {
      hazard_type: 'flood',
    },
  }), [shelters]);

  // Simulation store state & actions
  const isSimulationActive = useRescueSimulationStore((state) => state.isSimulationActive);
  const simMission = useRescueSimulationStore((state) => state.simMission);
  const simPhase = useRescueSimulationStore((state) => state.simPhase);
  const simSpeed = useRescueSimulationStore((state) => state.simSpeed);
  const simCoords = useRescueSimulationStore((state) => state.simCoords);
  const simHeading = useRescueSimulationStore((state) => state.simHeading);
  const isNavigating = useRescueSimulationStore((state) => state.isNavigating);
  const isPaused = useRescueSimulationStore((state) => state.isPaused);

  const startSimulation = useRescueSimulationStore((state) => state.startSimulation);
  const stopSimulation = useRescueSimulationStore((state) => state.stopSimulation);
  const setSimSpeed = useRescueSimulationStore((state) => state.setSimSpeed);
  const togglePause = useRescueSimulationStore((state) => state.togglePause);
  const setSimCoords = useRescueSimulationStore((state) => state.setSimCoords);
  const skipToGeofence = useRescueSimulationStore((state) => state.skipToGeofence);
  const consumeFastForward = useRescueSimulationStore((state) => state.consumeFastForward);
  const confirmVictimSecured = useRescueSimulationStore((state) => state.confirmVictimSecured);
  const confirmHandoverAndStandby = useRescueSimulationStore((state) => state.confirmHandoverAndStandby);

  // Auto-start simulation if navigated from Duty Hub with simulation flag
  useEffect(() => {
    if (route?.params?.isSimulation && !isSimulationActive) {
      startSimulation(currentMission || null);
    }
  }, [route?.params?.isSimulation, isSimulationActive, startSimulation, currentMission]);

  const effectiveMission = isSimulationActive
    ? (simMission || DEMO_MISSION_FALLBACK)
    : (currentMission || (availableMissions.length > 0 ? availableMissions[0] : DEMO_MISSION_FALLBACK));

  // Guided simulation control & step (starts at Step 1 by default, reliable reset, interactive)
  const [showDemoControls, setShowDemoControls] = useState(false);
  const [simulationStepOverride, setSimulationStepOverride] = useState(null);

  const activeMission = isSimulationActive
    ? effectiveMission
    : (currentMission || (showDemoControls ? effectiveMission : null));

  const simulationStep = useMemo(() => {
    if (isSimulationActive) {
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
    }
    if (simulationStepOverride !== null) return simulationStepOverride;
    if (!currentMission) return 1;
    switch (currentMission.status) {
      case 'dispatched':
        return 1;
      case 'en_route':
        return 2;
      case 'on_scene':
        return 3;
      case 'transporting':
        return 4;
      case 'completed':
        return 5;
      default:
        return 1;
    }
  }, [isSimulationActive, simPhase, simulationStepOverride, currentMission]);

  const setSimulationStep = setSimulationStepOverride;

  const activeHazards = useMemo(
    () =>
      (hazardsData ?? []).filter(
        (h) => h.is_active === true || h.is_active === 1 || h.is_active === '1'
      ),
    [hazardsData]
  );

  // Rescuer real GPS position & simulated override (strictly anchored in Zamboanga City)
  const [gpsLocation, setGpsLocation] = useState(ZAMBOANGA_RESCUER_BASE);
  const [simulatedLocation, setSimulatedLocation] = useState(null);
  const [deviceHeading, setDeviceHeading] = useState(0);

  const activeRescuerLocation = (isSimulationActive && simCoords)
    ? simCoords
    : (simulatedLocation || gpsLocation);

  // Periodic rescuer location reporting to CDRRMO EOC Live Map (~3s interval)
  const activeRescuerLocationRefForSync = useRef(activeRescuerLocation);
  activeRescuerLocationRefForSync.current = activeRescuerLocation;

  useEffect(() => {
    const syncLocationToBackend = () => {
      const coords = activeRescuerLocationRefForSync.current;
      if (!coords || !Array.isArray(coords) || coords.length < 2) return;
      api.post('/user/location', {
        latitude: coords[1],
        longitude: coords[0],
      }).catch((_e) => {
        // Silently tolerate background network variance
      });
    };

    syncLocationToBackend();
    const syncTimer = setInterval(syncLocationToBackend, 3000);
    return () => clearInterval(syncTimer);
  }, []);

  // Target Destination Coords
  const victimLngLat = useMemo(() => {
    if (effectiveMission?.victim_latitude && effectiveMission?.victim_longitude) {
      return clampToZamboanga(
        [Number(effectiveMission.victim_longitude), Number(effectiveMission.victim_latitude)],
        ZAMBOANGA_VICTIM_DEFAULT
      );
    }
    return ZAMBOANGA_VICTIM_DEFAULT;
  }, [effectiveMission]);

  const shelterLngLat = useMemo(() => {
    if (effectiveMission?.target_shelter?.latitude && effectiveMission?.target_shelter?.longitude) {
      return clampToZamboanga(
        [
          Number(effectiveMission.target_shelter.longitude),
          Number(effectiveMission.target_shelter.latitude),
        ],
        ZAMBOANGA_SHELTER_DEFAULT
      );
    }
    if (shelters[0]?.latitude && shelters[0]?.longitude) {
      return clampToZamboanga(
        [Number(shelters[0].longitude), Number(shelters[0].latitude)],
        ZAMBOANGA_SHELTER_DEFAULT
      );
    }
    return ZAMBOANGA_SHELTER_DEFAULT;
  }, [effectiveMission, shelters]);

  // Current Target Mode: 'victim' (during en_route / on_scene) or 'shelter' (during transporting)
  const isTransportPhase =
    (isSimulationActive && (simPhase === 'transporting' || simPhase === 'shelter_arrival')) ||
    (!isSimulationActive && (
      effectiveMission?.status === 'transporting' ||
      (showDemoControls && (simulationStep === 3 || simulationStep === 4))
    ));
  const incidentHazType = effectiveMission?.incident?.hazard_type;
  const isSuppressionMission = ['building_fire', 'active_shooter', 'siege', 'chemical_spill'].includes(incidentHazType);
  const activeTargetLngLat = isTransportPhase && !isSuppressionMission ? shelterLngLat : victimLngLat;
  const activeTargetName = isTransportPhase && !isSuppressionMission
    ? effectiveMission?.target_shelter?.name || shelters[0]?.name || 'Baliwasan Gym Evacuation Center'
    : (isSuppressionMission ? 'Hazard Epicenter' : (effectiveMission?.victim_name || 'Distress Victim'));

  // Route calculation state
  const [routeData, setRouteData] = useState(null);
  const [activePolylineCoords, setActivePolylineCoords] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [mapStyleMode, setMapStyleMode] = useState('default'); // 'default' | 'satellite'

  // Free camera exploration mode & destination centering
  const [isFreeCam, setIsFreeCam] = useState(false);
  const isFreeCamRef = useRef(false);
  isFreeCamRef.current = isFreeCam;

  // Memoize valid GeoJSON FeatureCollection for Mapbox ShapeSource (dynamically trimmed)
  const routeFeatureCollection = useMemo(() => {
    const coords = activePolylineCoords || routeData?.coordinates;
    if (!coords || coords.length < 2) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        },
      ],
    };
  }, [activePolylineCoords, routeData]);

  // 20-Meter Visual Geofence Square Feature around active target
  const activeGeofenceSquareFeature = useMemo(() => {
    if (!activeTargetLngLat) return null;
    const square = create20mGeofenceSquare(activeTargetLngLat);
    if (!square) return null;
    return {
      type: 'FeatureCollection',
      features: [square],
    };
  }, [activeTargetLngLat]);

  // Memoize GeoJSON FeatureCollection of all active disaster hazards as road corridor lines (Line instead of Circle)
  const hazardLinesFeatureCollection = useMemo(() => {
    if (!activeHazards || activeHazards.length === 0) return null;
    const features = [];
    activeHazards.forEach((h) => {
      const lat = parseFloat(h.latitude);
      const lng = parseFloat(h.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const type = (h.hazard_type || 'hazard').toLowerCase();

      let lineColor = '#ef4444';
      if (type.includes('fire')) {
        lineColor = '#ea580c';
      } else if (type.includes('flood') || type.includes('water')) {
        lineColor = '#0284c7';
      } else if (type.includes('landslide')) {
        lineColor = '#d97706';
      } else if (type.includes('earthquake')) {
        lineColor = '#9333ea';
      }

      const hazardFeature = buildHazardGeoJSONFeature(h, {
        id: h.id,
        hazardType: type,
        name: h.name || 'Disaster Hazard Zone',
        lineColor,
      });
      if (hazardFeature) {
        features.push(hazardFeature);
      }
    });

    if (features.length === 0) return null;
    return {
      type: 'FeatureCollection',
      features,
    };
  }, [activeHazards]);

  // Proximity Geofencing Triggers (prevent multiple prompts for same event)
  const hasTriggeredVictimArrival = useRef(false);
  const hasTriggeredShelterArrival = useRef(false);

  // Modals & Disaster Situational View
  const [showVictimArrivalModal, setShowVictimArrivalModal] = useState(false);
  const [showShelterArrivalModal, setShowShelterArrivalModal] = useState(false);
  const [showStartSimModal, setShowStartSimModal] = useState(false);
  const [showDisasterView, setShowDisasterView] = useState(false);
  const [proximityAnnouncement, setProximityAnnouncement] = useState(null);

  // Location watching effect - constrained to Zamboanga City bounds for testing
  useEffect(() => {
    let locSub;
    let headSub;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (current?.coords) {
            setGpsLocation(clampToZamboanga([current.coords.longitude, current.coords.latitude]));
          }

          locSub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 5,
              timeInterval: 4000,
            },
            (loc) => {
              if (loc?.coords) {
                setGpsLocation(clampToZamboanga([loc.coords.longitude, loc.coords.latitude]));
              }
            }
          );

          headSub = await Location.watchHeadingAsync((data) => {
            setDeviceHeading(data.trueHeading || data.magneticHeading || 0);
          });
        }
      } catch (e) {
        console.warn('[RescueMapScreen] Location tracking error:', e);
      }
    })();

    return () => {
      locSub?.remove();
      headSub?.remove();
    };
  }, []);

  // Multi-Roadblock Tracking State (Dynamic Obstacles like Collapsed Walls, Concrete Debris)
  const [activeRoadblocks, setActiveRoadblocks] = useState([]);

  const lastComputedRouteKeyRef = useRef('');
  const routeDataRef = useRef(routeData);
  routeDataRef.current = routeData;

  // Tactical Simulation Movement Refs (Declared before computeRoute & roadblock callbacks)
  const traveledDistanceRef = useRef(0);
  const currentNavPhaseRef = useRef(simPhase);
  const currentStepIndexRef = useRef(0);
  const lastPolylineTrimTimeRef = useRef(0);
  const lastTrimmedSegIdxRef = useRef(-1);
  const hasInitializedNavCameraRef = useRef(false);

  // Compute Route to Active Target whenever Target Coords, Mode, or Roadblocks change
  const computeRoute = useCallback(async (start, end, customRoadblocks = activeRoadblocks) => {
    if (!start || !end) return;

    const routeKey = `${start[0].toFixed(5)},${start[1].toFixed(5)}->${end[0].toFixed(5)},${end[1].toFixed(5)}_rb:${(customRoadblocks || []).map(r => r.id).join('-')}`;
    if (routeKey === lastComputedRouteKeyRef.current && routeDataRef.current) {
      return;
    }

    setIsLoadingRoute(true);
    try {
      const result = await fetchTacticalRescueRoute(
        start,
        end,
        MAPBOX_PUBLIC_TOKEN,
        rescuerProfile,
        activeHazards,
        customRoadblocks
      );
      if (result && result.coordinates?.length > 0) {
        lastComputedRouteKeyRef.current = routeKey;
        setRouteData(result);
        setActivePolylineCoords(result.coordinates);
        setCurrentStepIndex(0);
      }
    } catch (e) {
      console.warn('[RescueMapScreen] computeRoute error:', e);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [rescuerProfile, activeHazards, activeRoadblocks]);

  // Drop Physical Roadblock ahead on the current route and dynamically recalculate detour
  const handleDropRoadblock = useCallback(() => {
    const currentPos = (isSimulationActive && simCoords) ? simCoords : activeRescuerLocation;
    const target = activeTargetLngLat;
    if (!currentPos || !target) {
      Alert.alert('No Active Route', 'Start navigation or simulation before reporting a roadblock.');
      return;
    }

    let obstacleCoord = null;

    // 1. Try to find point ~45m ahead along the current route coordinates
    if (routeData?.coordinates && routeData.coordinates.length >= 2) {
      const coords = routeData.coordinates;
      let closestIdx = 0;
      let minDistance = Infinity;
      for (let i = 0; i < coords.length; i++) {
        const d = getHaversineDistanceMeters(currentPos[1], currentPos[0], coords[i][1], coords[i][0]);
        if (d < minDistance) {
          minDistance = d;
          closestIdx = i;
        }
      }

      let accumulated = 0;
      for (let i = closestIdx; i < coords.length - 1; i++) {
        const segD = getHaversineDistanceMeters(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
        if (accumulated + segD >= 45) {
          const remain = 45 - accumulated;
          const ratio = segD > 0 ? remain / segD : 0;
          obstacleCoord = [
            coords[i][0] + (coords[i + 1][0] - coords[i][0]) * ratio,
            coords[i][1] + (coords[i + 1][1] - coords[i][1]) * ratio,
          ];
          break;
        }
        accumulated += segD;
      }

      if (!obstacleCoord && coords.length > closestIdx + 1) {
        obstacleCoord = coords[Math.min(closestIdx + 2, coords.length - 1)];
      }
    }

    // 2. Fallback: project 45m ahead along current heading
    if (!obstacleCoord) {
      const heading = isSimulationActive ? (simHeading || 0) : (deviceHeading || 0);
      const headingRad = (heading * Math.PI) / 180;
      const dMeters = 45;
      const dLat = (dMeters * Math.cos(headingRad)) / 111320;
      const dLng = (dMeters * Math.sin(headingRad)) / (111320 * Math.cos((currentPos[1] * Math.PI) / 180));
      obstacleCoord = [currentPos[0] + dLng, currentPos[1] + dLat];
    }

    const newBlockade = {
      id: `roadblock-${Date.now()}-${activeRoadblocks.length + 1}`,
      number: activeRoadblocks.length + 1,
      latitude: obstacleCoord[1],
      longitude: obstacleCoord[0],
      label: `Roadblock #${activeRoadblocks.length + 1}`,
      radius_meters: 50,
      timestamp: Date.now(),
    };

    const nextRoadblocks = [...activeRoadblocks, newBlockade];
    setActiveRoadblocks(nextRoadblocks);
    safeVibrate([0, 60, 40, 60]);

    // Detour starts immediately from current vehicle position
    traveledDistanceRef.current = 0;
    lastTrimmedSegIdxRef.current = -1;
    lastComputedRouteKeyRef.current = '';
    computeRoute(currentPos, target, nextRoadblocks);
  }, [isSimulationActive, simCoords, activeRescuerLocation, activeTargetLngLat, routeData, simHeading, deviceHeading, activeRoadblocks, computeRoute]);

  // Clear all dropped roadblocks and restore optimal route
  const handleClearRoadblocks = useCallback(() => {
    if (activeRoadblocks.length === 0) return;
    const currentPos = (isSimulationActive && simCoords) ? simCoords : activeRescuerLocation;
    const target = activeTargetLngLat;
    setActiveRoadblocks([]);
    safeVibrate(40);
    traveledDistanceRef.current = 0;
    lastTrimmedSegIdxRef.current = -1;
    lastComputedRouteKeyRef.current = '';
    if (currentPos && target) {
      computeRoute(currentPos, target, []);
    }
  }, [activeRoadblocks, isSimulationActive, simCoords, activeRescuerLocation, activeTargetLngLat, computeRoute]);

  const lastTargetRef = useRef(null);
  const activeRescuerLocationRef = useRef(activeRescuerLocation);
  activeRescuerLocationRef.current = activeRescuerLocation;

  useEffect(() => {
    const timer = setTimeout(() => {
      // By default on the map, stay at rescuer location without premature routes
      // Only compute route if simulation is active OR an active live mission exists
      const hasLiveMission = currentMission && ['dispatched', 'en_route', 'on_scene', 'transporting'].includes(currentMission.status);
      const rescuerLoc = activeRescuerLocationRef.current;
      if (isSimulationActive) {
        if (simPhase === 'completed' || simPhase === 'standby') {
          setRouteData(null);
          setActivePolylineCoords(null);
        } else if (activeTargetLngLat && rescuerLoc) {
          const targetChanged = !lastTargetRef.current ||
            lastTargetRef.current[0] !== activeTargetLngLat[0] ||
            lastTargetRef.current[1] !== activeTargetLngLat[1];
          if (!routeData || targetChanged) {
            lastTargetRef.current = activeTargetLngLat;
            computeRoute(rescuerLoc, activeTargetLngLat, activeRoadblocks);
          }
        }
      } else if (!showDemoControls && !hasLiveMission) {
        setRouteData(null);
        setActivePolylineCoords(null);
      } else if (showDemoControls && simulationStep === 5) {
        setRouteData(null);
        setActivePolylineCoords(null);
      } else if (activeTargetLngLat && rescuerLoc) {
        computeRoute(rescuerLoc, activeTargetLngLat, activeRoadblocks);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [computeRoute, activeTargetLngLat, currentMission, showDemoControls, simulationStep, isSimulationActive, simPhase, routeData, activeRoadblocks]);

  // ─── TACTICAL 10M/S SIMULATION MOVEMENT ENGINE ───

  const resetSimulation = useCallback(() => {
    setSimulatedLocation(null);
    setActiveRoadblocks([]);
    setActivePolylineCoords(null);
    hasTriggeredVictimArrival.current = false;
    hasTriggeredShelterArrival.current = false;
    if (isSimulationActive) {
      stopSimulation();
    }
    if (cameraRef.current && (simCoords || gpsLocation)) {
      cameraRef.current.setCamera({
        centerCoordinate: gpsLocation || ZAMBOANGA_RESCUER_BASE,
        zoomLevel: 16.5,
        pitch: 35,
        animationDuration: 800,
      });
    }
  }, [isSimulationActive, stopSimulation, simCoords, gpsLocation]);

  // Reset traveled distance & camera initialized flag when simulation phase resets
  useEffect(() => {
    if (currentNavPhaseRef.current !== simPhase) {
      currentNavPhaseRef.current = simPhase;
      traveledDistanceRef.current = 0;
      lastPolylineTrimTimeRef.current = 0;
      lastTrimmedSegIdxRef.current = -1;
      hasInitializedNavCameraRef.current = false;
    }
  }, [simPhase]);

  // When navigation stops, allow camera to be re-initialized when started again
  useEffect(() => {
    if (!isNavigating) {
      hasInitializedNavCameraRef.current = false;
    }
  }, [isNavigating]);

  useEffect(() => {
    if (!isSimulationActive || !isNavigating || isPaused) return;
    if (!routeData?.coordinates || routeData.coordinates.length < 2) return;
    if (simPhase === 'on_scene' || simPhase === 'shelter_arrival' || simPhase === 'completed' || simPhase === 'standby') return;

    const coords = routeData.coordinates;
    const cumulativeDistances = [0];
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const segDist = getHaversineDistanceMeters(p1[1], p1[0], p2[1], p2[0]);
      cumulativeDistances.push(cumulativeDistances[i] + segDist);
    }
    const totalDist = cumulativeDistances[cumulativeDistances.length - 1];
    if (totalDist <= 0) return;

    // Set initial tactical navigation camera angle & zoom ONCE per navigation session (never snap back mid-drive)
    if (!hasInitializedNavCameraRef.current && cameraRef.current && coords[0]) {
      hasInitializedNavCameraRef.current = true;
      const initialHeading = coords.length > 1 ? getBearing(coords[0][1], coords[0][0], coords[1][1], coords[1][0]) : 0;
      const aheadHeadingRad = (initialHeading * Math.PI) / 180;
      const initAheadLat = coords[0][1] + (45 * Math.cos(aheadHeadingRad)) / 111320;
      const initAheadLng = coords[0][0] + (45 * Math.sin(aheadHeadingRad)) / (111320 * Math.cos((coords[0][1] * Math.PI) / 180));

      cameraRef.current.setCamera({
        centerCoordinate: [initAheadLng, initAheadLat],
        heading: initialHeading,
        pitch: 50,
        zoomLevel: 17.2,
        animationDuration: 800,
      });
    }

    const interval = setInterval(() => {
      const storeState = useRescueSimulationStore.getState();
      if (!storeState.isNavigating || storeState.isPaused) return;

      if (storeState.shouldFastForwardGeofence) {
        consumeFastForward();
        traveledDistanceRef.current = Math.max(0, totalDist - 18);
      } else {
        const currentSpeed = storeState.simSpeed || 1;
        // 150ms tick: advances by (10m/s * speed) * 0.15s per tick (maintains exact 10m/s, 30m/s, 50m/s real-world pace)
        const deltaMeters = (10 * currentSpeed) * 0.15;
        traveledDistanceRef.current += deltaMeters;
      }

      const currentDist = traveledDistanceRef.current;

      let segIdx = 0;
      while (segIdx < cumulativeDistances.length - 2 && cumulativeDistances[segIdx + 1] < currentDist) {
        segIdx++;
      }

      const p1 = coords[segIdx];
      const p2 = coords[segIdx + 1];
      const segStart = cumulativeDistances[segIdx];
      const segEnd = cumulativeDistances[segIdx + 1];
      const segLen = segEnd - segStart;
      const ratio = segLen > 0 ? Math.min(1, Math.max(0, (currentDist - segStart) / segLen)) : 1;

      const currLng = p1[0] + (p2[0] - p1[0]) * ratio;
      const currLat = p1[1] + (p2[1] - p1[1]) * ratio;
      const heading = getBearing(p1[1], p1[0], p2[1], p2[0]);

      const currentTarget = (storeState.simPhase === 'transporting') ? shelterLngLat : victimLngLat;
      const distToTarget = currentTarget
        ? getHaversineDistanceMeters(currLat, currLng, currentTarget[1], currentTarget[0])
        : 999;

      setSimCoords([currLng, currLat], heading);

      // Dynamically advance turn-by-turn maneuver step as vehicle progresses
      if (routeData?.steps && routeData.steps.length > 0) {
        let accumulated = 0;
        let stepIdx = 0;
        for (let i = 0; i < routeData.steps.length; i++) {
          const stepDist = routeData.steps[i].distanceMeters || 0;
          if (currentDist < accumulated + stepDist) {
            stepIdx = i;
            break;
          }
          accumulated += stepDist;
          if (i === routeData.steps.length - 1) {
            stepIdx = i;
          }
        }
        if (stepIdx !== currentStepIndexRef.current) {
          currentStepIndexRef.current = stepIdx;
          setCurrentStepIndex(stepIdx);
          safeVibrate(25);
        }
      }

      // Throttled polyline trim: only update GeoJSON ShapeSource every ~450ms or on waypoint transition
      // This eliminates 80% of native bridge re-tessellation overhead, keeping emulator buttons fully responsive!
      const now = Date.now();
      if (now - lastPolylineTrimTimeRef.current >= 450 || segIdx !== lastTrimmedSegIdxRef.current) {
        lastPolylineTrimTimeRef.current = now;
        lastTrimmedSegIdxRef.current = segIdx;
        if (coords.length > segIdx + 1) {
          setActivePolylineCoords([[currLng, currLat], ...coords.slice(segIdx + 1)]);
        }
      }

      // Smoothly follow vehicle position & heading in 3D driver perspective (offset ahead 48m so puck sits in lower screen)
      if (!isFreeCamRef.current && cameraRef.current) {
        const aheadHeadingRad = (heading * Math.PI) / 180;
        const aheadLat = currLat + (48 * Math.cos(aheadHeadingRad)) / 111320;
        const aheadLng = currLng + (48 * Math.sin(aheadHeadingRad)) / (111320 * Math.cos((currLat * Math.PI) / 180));

        cameraRef.current.setCamera({
          centerCoordinate: [aheadLng, aheadLat],
          heading,
          pitch: 50,
          zoomLevel: 17.2,
          animationDuration: 130,
        });
      }

      if (distToTarget <= 20 || currentDist >= totalDist - 10) {
        clearInterval(interval);
        setActivePolylineCoords(null);
        if (storeState.simPhase === 'en_route') {
          useRescueSimulationStore.getState().setSimPhase('on_scene');
          safeVibrate([0, 200, 100, 300, 100, 400]);
          setProximityAnnouncement({
            title: '🎯 ARRIVED ON SCENE (≤ 20M)',
            subtitle: isSuppressionMission ? 'Threat Neutralized • Mission Complete' : 'Victims Secured • Auto-Commencing Shelter Transport',
            color: '#f59e0b',
          });
          setTimeout(() => setProximityAnnouncement(null), 4000);
          // Hands-free: Automatically transition without requiring button click
          if (isSuppressionMission) {
            confirmHandoverAndStandby();
            setRouteData(null);
            resetSimulation();
          } else {
            confirmVictimSecured(shelters[0]);
          }
        } else if (storeState.simPhase === 'transporting') {
          useRescueSimulationStore.getState().setSimPhase('shelter_arrival');
          safeVibrate([0, 250, 100, 250, 100, 500]);
          setProximityAnnouncement({
            title: '🏁 ARRIVED AT SHELTER (≤ 20M)',
            subtitle: 'Safe CSWDO Intake Confirmed • Unit Reset to Standby',
            color: '#10b981',
          });
          setTimeout(() => setProximityAnnouncement(null), 4000);
          // Hands-free: Automatically complete handover & standby
          confirmHandoverAndStandby();
          setRouteData(null);
          resetSimulation();
        }
      }
    }, 150);

    return () => clearInterval(interval);
  }, [
    isSimulationActive,
    isNavigating,
    isPaused,
    routeData,
    simPhase,
    shelterLngLat?.[0],
    shelterLngLat?.[1],
    victimLngLat?.[0],
    victimLngLat?.[1],
    setSimCoords,
    consumeFastForward,
  ]);

  // Stepper Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, target_shelter_id, staging_point_id }) =>
      api.put(`/rescue/missions/${id}/status`, {
        status,
        target_shelter_id,
        staging_point_id,
        current_latitude: activeRescuerLocation[1],
        current_longitude: activeRescuerLocation[0],
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rescue-missions-active'] });
      queryClient.invalidateQueries({ queryKey: ['rescue-units-duty'] });
      queryClient.invalidateQueries({ queryKey: ['shelters-list-rescue'] });
      const newStatus = res.data.data.status;
      if (newStatus === 'transporting') {
        // Auto re-route to shelter immediately!
        computeRoute(activeRescuerLocation, shelterLngLat);
        Vibration.vibrate([0, 100, 50, 100]);
        Alert.alert(
          '🔄 RE-ROUTING TO SHELTER',
          `Victim extraction confirmed. Mapbox navigation re-routed directly to ${shelterLngLat ? 'Baliwasan Gym Shelter' : 'Assigned Shelter'}.`
        );
      } else if (newStatus === 'completed') {
        Vibration.vibrate([0, 100, 100, 200]);
        Alert.alert(
          '🎉 MISSION COMPLETED',
          'Evacuees handed over to CSWDO desk. Rescue unit is now set to Standby for next call.'
        );
      }
    },
    onError: (err) => {
      Alert.alert('Status Error', err?.response?.data?.message || 'Could not update status.');
    },
    onSettled: () => {
      isUpdatingStatusRef.current = false;
    },
  });

  const isUpdatingStatusRef = useRef(false);

  const safeUpdateMissionStatus = useCallback((params) => {
    if (updateStatusMutation.isPending || isUpdatingStatusRef.current) return;
    isUpdatingStatusRef.current = true;
    updateStatusMutation.mutate(params);
  }, [updateStatusMutation]);

  // ─── AUTOMATED 20-METER PROXIMITY ENGINE (LIVE GPS MISSIONS) ───
  useEffect(() => {
    // Simulation engine handles its own proximity triggers in the simulation loop
    if (isSimulationActive) return;
    if (!currentMission || !activeRescuerLocation) return;

    // 1. Proximity to Victim (≤ 20 meters during dispatched or en_route)
    if ((currentMission.status === 'dispatched' || currentMission.status === 'en_route') && victimLngLat) {
      const distVictim = getHaversineDistanceMeters(
        activeRescuerLocation[1],
        activeRescuerLocation[0],
        victimLngLat[1],
        victimLngLat[0]
      );

      if (distVictim <= 20 && !hasTriggeredVictimArrival.current) {
        hasTriggeredVictimArrival.current = true;
        // Vibration pattern for arrival
        safeVibrate([0, 200, 100, 300, 100, 400]);

        // Auto-update status to on_scene on the backend!
        updateStatusMutation.mutate({
          id: currentMission.id,
          status: 'on_scene',
        });

        setProximityAnnouncement({
          title: '🎯 ARRIVED ON SCENE (≤ 20M)',
          subtitle: isSuppressionMission ? 'Threat Neutralized • Mission Complete' : 'Victims Secured • Auto-Commencing Shelter Transport',
          color: '#f59e0b',
        });
        setTimeout(() => setProximityAnnouncement(null), 4000);

        // Hands-free: Automatically transition to next phase after brief scene intake without requiring button press
        setTimeout(() => {
          if (isSuppressionMission) {
            safeUpdateMissionStatus({
              id: currentMission.id,
              status: 'completed',
            });
          } else {
            safeUpdateMissionStatus({
              id: currentMission.id,
              status: 'transporting',
              target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
            });
          }
        }, 800);
      }
    }

    // 2. Proximity to Shelter Gate (≤ 20 meters during transporting)
    if (currentMission.status === 'transporting' && shelterLngLat) {
      const distShelter = getHaversineDistanceMeters(
        activeRescuerLocation[1],
        activeRescuerLocation[0],
        shelterLngLat[1],
        shelterLngLat[0]
      );

      if (distShelter <= 20 && !hasTriggeredShelterArrival.current) {
        hasTriggeredShelterArrival.current = true;
        safeVibrate([0, 250, 100, 250, 100, 500]);

        setProximityAnnouncement({
          title: '🏁 ARRIVED AT SHELTER (≤ 20M)',
          subtitle: 'Safe CSWDO Intake Confirmed • Unit Reset to Standby',
          color: '#10b981',
        });
        setTimeout(() => setProximityAnnouncement(null), 4000);

        // Hands-free: Automatically complete CSWDO intake turnover without requiring button click
        safeUpdateMissionStatus({
          id: currentMission.id,
          status: 'completed',
          target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
        });
      }
    }
  }, [
    isSimulationActive,
    activeRescuerLocation,
    currentMission,
    victimLngLat,
    shelterLngLat,
    updateStatusMutation,
    isSuppressionMission,
    shelters,
    safeUpdateMissionStatus,
  ]);

  // Recenter map camera on Rescuer Vehicle and restore auto-follow
  const handleCenterOnRescuer = useCallback(() => {
    setIsFreeCam(false);
    isFreeCamRef.current = false;
    safeVibrate(20);
    if (cameraRef.current && activeRescuerLocation) {
      const forwardBearing =
        (isSimulationActive && simHeading)
          ? simHeading
          : (routeData?.coordinates?.[1] && activeRescuerLocation
            ? getBearing(
                activeRescuerLocation[1],
                activeRescuerLocation[0],
                routeData.coordinates[1][1],
                routeData.coordinates[1][0]
              )
            : deviceHeading);

      cameraRef.current.setCamera({
        centerCoordinate: activeRescuerLocation,
        zoomLevel: 16.8,
        pitch: 35,
        heading: forwardBearing,
        animationDuration: 750,
      });
    }
  }, [activeRescuerLocation, isSimulationActive, simHeading, routeData, deviceHeading]);

  // Center camera specifically on Destination (Victim or Shelter) in Free Cam mode
  const handleCenterOnDestination = useCallback(() => {
    setIsFreeCam(true);
    isFreeCamRef.current = true;
    safeVibrate(20);
    if (cameraRef.current && activeTargetLngLat) {
      cameraRef.current.setCamera({
        centerCoordinate: activeTargetLngLat,
        pitch: 25,
        zoomLevel: 17.2,
        heading: 0,
        animationDuration: 850,
      });
    }
  }, [activeTargetLngLat]);

  // Fit entire mission route overview in view (both rescuer and destination)
  const handleFitOverview = useCallback(() => {
    setIsFreeCam(true);
    isFreeCamRef.current = true;
    safeVibrate(20);
    if (cameraRef.current && activeRescuerLocation && activeTargetLngLat) {
      const minLng = Math.min(activeRescuerLocation[0], activeTargetLngLat[0]);
      const maxLng = Math.max(activeRescuerLocation[0], activeTargetLngLat[0]);
      const minLat = Math.min(activeRescuerLocation[1], activeTargetLngLat[1]);
      const maxLat = Math.max(activeRescuerLocation[1], activeTargetLngLat[1]);
      cameraRef.current.fitBounds([maxLng, maxLat], [minLng, minLat], [100, 60, 240, 60], 850);
    }
  }, [activeRescuerLocation, activeTargetLngLat]);

  // Toggle Free Cam on / off
  const toggleFreeCam = useCallback(() => {
    if (isFreeCam) {
      handleCenterOnRescuer();
    } else {
      setIsFreeCam(true);
      isFreeCamRef.current = true;
      safeVibrate(20);
    }
  }, [isFreeCam, handleCenterOnRescuer]);

  // Distance to current target in meters
  const distanceToTarget = useMemo(() => {
    if (!activeRescuerLocation || !activeTargetLngLat) return 0;
    return Math.round(
      getHaversineDistanceMeters(
        activeRescuerLocation[1],
        activeRescuerLocation[0],
        activeTargetLngLat[1],
        activeTargetLngLat[0]
      )
    );
  }, [activeRescuerLocation, activeTargetLngLat]);

  const currentStep = routeData?.steps?.[currentStepIndex] || routeData?.steps?.[0] || null;
  const totalDistanceKm = routeData ? (routeData.distanceMeters / 1000).toFixed(1) : '0.0';
  const totalEtaMinutes = routeData ? Math.max(1, Math.round(routeData.durationSeconds / 60)) : 1;

  // Turn Maneuver Icon Symbol
  const getTurnIcon = (type, modifier) => {
    if (type === 'arrive') return '🏁';
    if (modifier?.includes('left')) return '↰';
    if (modifier?.includes('right')) return '↱';
    if (modifier?.includes('u-turn') || type?.includes('u-turn')) return '↩';
    return '↑';
  };

  // Phone dialer
  const handleCallVictim = (phone) => {
    if (!phone) {
      Alert.alert('No Number', 'Victim did not provide a contact phone number.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  // Quick SMS
  const handleSmsVictim = (phone, name, brgy) => {
    if (!phone) {
      Alert.alert('No Number', 'Victim did not provide a contact phone number.');
      return;
    }
    const sign = assignedUnit?.call_sign || 'QRT DELTA-3';
    const text = encodeURIComponent(
      `[CDRRMO RESCUE] Unit ${sign} is closing in to your location in ${brgy || 'Zamboanga'}. Move to roof/attic if floodwater rises. We are within reach.`
    );
    const sep = Platform.OS === 'ios' ? '&' : '?';
    Linking.openURL(`sms:${phone}${sep}body=${text}`);
  };

  // Google Maps External Fallback
  const handleOpenGoogleMaps = () => {
    const lat = activeTargetLngLat[1];
    const lng = activeTargetLngLat[0];
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  // ─── EXTRACTION & HANDOVER HANDLERS ───

  const handleStep3_ExtractAndReRoute = () => {
    setSimulationStep(3);
    setShowVictimArrivalModal(false);

    if (isSimulationActive) {
      confirmVictimSecured(shelters[0]);
    } else if (currentMission && !currentMission.id?.toString().startsWith('demo-')) {
      safeUpdateMissionStatus({
        id: currentMission.id,
        status: 'transporting',
        target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
      });
    }

    if (cameraRef.current && victimLngLat && shelterLngLat) {
      const minLng = Math.min(victimLngLat[0], shelterLngLat[0]);
      const maxLng = Math.max(victimLngLat[0], shelterLngLat[0]);
      const minLat = Math.min(victimLngLat[1], shelterLngLat[1]);
      const maxLat = Math.max(victimLngLat[1], shelterLngLat[1]);

      cameraRef.current.setCamera({
        bounds: {
          ne: [maxLng + 0.003, maxLat + 0.003],
          sw: [minLng - 0.003, minLat - 0.003],
          paddingBottom: 240,
          paddingTop: 140,
          paddingLeft: 60,
          paddingRight: 60,
        },
        animationDuration: 1000,
      });
    }
  };




  const handleBackToDutyHub = useCallback(() => {
    // 1. Instantly pause simulation navigation to halt interval camera animations and avoid Fabric race condition (Tag 338)
    if (isSimulationActive) {
      const store = useRescueSimulationStore.getState();
      if (store.isNavigating && !store.isPaused) {
        store.togglePause();
      }
    }
    // 2. Dismiss any open modals
    setShowVictimArrivalModal(false);
    setShowShelterArrivalModal(false);
    setShowStartSimModal(false);

    // 3. Stop active camera animations
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (_e) {
        // Safe ignore
      }
    }

    // 4. Safely navigate to Duty Hub
    if (navigation) {
      navigation.navigate('Rescue');
    }
  }, [isSimulationActive, navigation]);

  const handleStep5_HandoverAndStandby = () => {
    setSimulationStep(5);
    setShowShelterArrivalModal(false);

    if (isSimulationActive) {
      confirmHandoverAndStandby();
      setRouteData(null);
    } else if (currentMission && !currentMission.id?.toString().startsWith('demo-')) {
      safeUpdateMissionStatus({
        id: currentMission.id,
        status: 'completed',
        target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
      });
    }

    resetSimulation();
  };

  // Hands-free auto-dismiss and stage advancement timers (rescuers never blocked by popups)
  useEffect(() => {
    if (showVictimArrivalModal) {
      const timer = setTimeout(() => {
        setShowVictimArrivalModal(false);
        if (isSuppressionMission) {
          handleStep5_HandoverAndStandby();
        } else if (isSimulationActive) {
          confirmVictimSecured(shelters[0]);
        } else {
          handleStep3_ExtractAndReRoute();
          setSimulationStep(4);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVictimArrivalModal]);

  useEffect(() => {
    if (showShelterArrivalModal) {
      const timer = setTimeout(() => {
        setShowShelterArrivalModal(false);
        if (isSimulationActive) {
          confirmHandoverAndStandby();
          setRouteData(null);
        } else {
          handleStep5_HandoverAndStandby();
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showShelterArrivalModal]);

  const isExpoGo = Constants.appOwnership === 'expo' || !Mapbox?.MapView;

  return (
    <View style={styles.container}>
      {/* ─── FULLSCREEN MAPBOX OR TACTICAL RADAR VIEW ─── */}
      {isExpoGo ? (
        <View style={styles.expoGoMapFallback}>
          <View style={styles.radarBigCircle}>
            <Radio size={36} color="#38bdf8" />
          </View>
          <Text style={styles.radarFallbackTitle}>TACTICAL RESCUE RADAR • ZAMBOANGA CITY</Text>
          <Text style={styles.radarFallbackSub}>
            SECTOR: BALIWASAN / TETUAN / GOV. CAMINS
          </Text>

          <View style={styles.radarDetailsCard}>
            <Text style={styles.radarDetailsLine}>
              🚒 Unit: <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{assignedUnit?.name || 'QRT DELTA-3'}</Text>
            </Text>
            <Text style={styles.radarDetailsLine}>
              📍 Rescuer GPS: <Text style={{ color: '#38bdf8' }}>{activeRescuerLocation[1].toFixed(4)}°N, {activeRescuerLocation[0].toFixed(4)}°E (Zamboanga)</Text>
            </Text>
            <Text style={styles.radarDetailsLine}>
              🎯 Target: <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>{activeTargetName}</Text>
            </Text>
            <Text style={styles.radarDetailsLine}>
              📏 Range: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{distanceToTarget} meters</Text>
            </Text>
          </View>
        </View>
      ) : (
        <Mapbox.MapView
          style={{ width: '100%', height: '100%' }}
          styleURL={
            mapStyleMode === 'satellite'
              ? Mapbox?.StyleURL?.SatelliteStreet || 'mapbox://styles/mapbox/satellite-streets-v12'
              : isDarkMode
                ? Mapbox?.StyleURL?.Dark || 'mapbox://styles/mapbox/dark-v11'
                : Mapbox?.StyleURL?.Outdoors || Mapbox?.StyleURL?.Street || 'mapbox://styles/mapbox/streets-v12'
          }
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={true}
          scaleBarEnabled={false}
          onTouchMove={() => {
            if (!isFreeCamRef.current && (isSimulationActive || activeMission)) {
              setIsFreeCam(true);
              isFreeCamRef.current = true;
            }
          }}
          onCameraChanged={(e) => {
            if (e?.gestures?.isGestureActive && !isFreeCamRef.current && (isSimulationActive || activeMission)) {
              setIsFreeCam(true);
              isFreeCamRef.current = true;
            }
          }}
        >
          <Mapbox.Camera
            ref={cameraRef}
            centerCoordinate={activeRescuerLocation}
            zoomLevel={16.5}
            pitch={35}
            animationMode="flyTo"
            animationDuration={1000}
          />

        {/* Tactical Route Polyline */}
        {routeFeatureCollection && (
          <Mapbox.ShapeSource
            id="rescue-map-route-source"
            shape={routeFeatureCollection}
          >
            {/* Outer Glow / High-Contrast Casing */}
            <Mapbox.LineLayer
              id="rescue-map-route-glow"
              style={{
                lineColor: isDarkMode
                  ? (isTransportPhase ? '#06b6d4' : '#f59e0b')
                  : (isTransportPhase ? '#0891b2' : '#b45309'),
                lineWidth: isDarkMode ? 9 : 11,
                lineOpacity: isDarkMode ? 0.65 : 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Core Solid Line - High contrast in light theme */}
            <Mapbox.LineLayer
              id="rescue-map-route-core"
              style={{
                lineColor: isDarkMode
                  ? '#ffffff'
                  : (isTransportPhase ? '#06b6d4' : '#f59e0b'),
                lineWidth: isDarkMode ? 4 : 6,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Visual 20-Meter Proximity Geofence Square Zone */}
        {activeMission && activeGeofenceSquareFeature && (
          <Mapbox.ShapeSource
            id="geofence-20m-perimeter-source"
            shape={activeGeofenceSquareFeature}
          >
            {/* Shaded Area Fill */}
            <Mapbox.FillLayer
              id="geofence-20m-fill"
              style={{
                fillColor: isTransportPhase ? '#06b6d4' : '#f59e0b',
                fillOpacity: isDarkMode ? 0.22 : 0.32,
              }}
            />
            {/* Glowing Border Line */}
            <Mapbox.LineLayer
              id="geofence-20m-border"
              style={{
                lineColor: isTransportPhase ? '#0891b2' : '#d97706',
                lineWidth: 2.5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Active Disaster Hazards: 2-Mode Rendering (Circle Radius Zone & Road-Snapped Corridor) */}
        {hazardLinesFeatureCollection && (
          <Mapbox.ShapeSource
            id="hazard-lines-source"
            shape={hazardLinesFeatureCollection}
          >
            {/* Mode 1: Circle Radius Fill */}
            <Mapbox.FillLayer
              id="hazard-circle-fill"
              filter={['==', ['geometry-type'], 'Polygon']}
              style={{
                fillColor: ['get', 'lineColor'],
                fillOpacity: 0.22,
              }}
            />
            {/* Mode 1: Circle Radius Perimeter Outline */}
            <Mapbox.LineLayer
              id="hazard-circle-outline"
              filter={['==', ['geometry-type'], 'Polygon']}
              style={{
                lineColor: ['get', 'lineColor'],
                lineWidth: 2.5,
                lineDasharray: [2, 2],
              }}
            />
            {/* Mode 2: Road Corridor Outer Casing / High-Contrast Black Halo */}
            <Mapbox.LineLayer
              id="hazard-lines-casing"
              filter={['==', ['geometry-type'], 'LineString']}
              style={{
                lineColor: '#000000',
                lineWidth: 9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Mode 2: Road Corridor Core Hazard Line */}
            <Mapbox.LineLayer
              id="hazard-lines-core"
              filter={['==', ['geometry-type'], 'LineString']}
              style={{
                lineColor: ['get', 'lineColor'],
                lineWidth: 5.5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* 20m Geofence Perimeter Callout Tag */}
        {activeMission && activeTargetLngLat && (
          <Mapbox.PointAnnotation
            key="geofence-20m-tag"
            id="geofence-20m-tag"
            coordinate={[activeTargetLngLat[0], activeTargetLngLat[1] + 0.00022]}
          >
            <View style={styles.geofenceTagWrap}>
              <Text style={styles.geofenceTagText}>
                ⚡ 20M GEOFENCE PERIMETER
              </Text>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* 1. Victim SOS Distress Pin */}
        {activeMission && victimLngLat && (
          <Mapbox.PointAnnotation
            key="victim-marker"
            id="victim-marker"
            coordinate={victimLngLat}
          >
            <View style={styles.victimMarkerWrap}>
              <View style={styles.victimPulsingRing} />
              <View style={styles.victimPinCircle}>
                <AlertTriangle size={16} color="#ffffff" />
              </View>
              <View style={styles.victimCallout}>
                <Text style={styles.victimCalloutText} numberOfLines={1}>
                  🚨 {activeMission?.victim_name || 'Victim'} ({activeMission?.headcount || 1}p)
                </Text>
              </View>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* 2. Target Evacuation Shelter Pin */}
        {activeMission && shelterLngLat && (
          <Mapbox.PointAnnotation
            key="shelter-marker"
            id="shelter-marker"
            coordinate={shelterLngLat}
          >
            <View style={styles.shelterMarkerWrap}>
              <View style={styles.shelterPinCircle}>
                <Building size={16} color="#ffffff" />
              </View>
              <View style={styles.shelterCallout}>
                <Text style={styles.shelterCalloutText} numberOfLines={1}>
                  {activeMission?.target_shelter?.type === 'primary' ? '⭐ ' : '🏠 '} 
                  {activeMission?.target_shelter?.name || shelters[0]?.name || 'Baliwasan Gym'}
                </Text>
              </View>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* 3. Rescuer Live Vehicle Pin (Google Maps Style 3D Tactical Navigation Puck) */}
        {activeRescuerLocation && (
          <Mapbox.PointAnnotation
            key="rescuer-vehicle-marker"
            id="rescuer-vehicle-marker"
            coordinate={activeRescuerLocation}
          >
            <View style={styles.rescuerMarkerWrap}>
              <NavigationPuck
                heading={isSimulationActive ? (simHeading || 0) : (deviceHeading || 0)}
                theme="rescue"
                size={44}
                showBeam={isSimulationActive || isNavigating}
                isNavigating={isSimulationActive || isNavigating}
              >
                <View style={[styles.rescuerCallout, { marginTop: 4 }]}>
                  <View style={styles.rescuerStatusDot} />
                  <Text style={styles.rescuerCalloutText} numberOfLines={1}>
                    {assignedUnit?.call_sign || 'QRT DELTA-3'}
                  </Text>
                </View>
              </NavigationPuck>
            </View>
          </Mapbox.PointAnnotation>
        )}
        {/* 4. Active Disaster Hazards (Fires, Landslides, Floods, Collapses) */}
        {activeHazards.slice(0, 20).map((h) => {
          const lat = parseFloat(h.latitude);
          const lng = parseFloat(h.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const type = (h.hazard_type || '').toLowerCase();
          let icon = '⚠️';
          let bgColor = 'rgba(239, 68, 68, 0.9)';
          let borderColor = '#f87171';
          if (type.includes('fire')) {
            icon = '🔥';
            bgColor = 'rgba(234, 88, 12, 0.95)';
            borderColor = '#fdba74';
          } else if (type.includes('landslide')) {
            icon = '⛰️';
            bgColor = 'rgba(180, 83, 9, 0.95)';
            borderColor = '#fde047';
          } else if (type.includes('flood') || type.includes('water')) {
            icon = '🌊';
            bgColor = 'rgba(2, 132, 199, 0.95)';
            borderColor = '#7dd3fc';
          } else if (type.includes('earthquake')) {
            icon = '🏚️';
            bgColor = 'rgba(147, 51, 234, 0.95)';
            borderColor = '#d8b4fe';
          }

          return (
            <Mapbox.PointAnnotation
              key={`hazard-pin-${h.id}`}
              id={`hazard-pin-${h.id}`}
              coordinate={[lng, lat]}
            >
              <View style={styles.hazardMarkerWrap}>
                <View style={[styles.hazardPinCircle, { backgroundColor: bgColor, borderColor }]}>
                  <Text style={{ fontSize: 13 }}>{icon}</Text>
                </View>
                <View style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderRadius: 4,
                  marginTop: 2,
                  borderWidth: 0.5,
                  borderColor,
                }}>
                  <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '800' }} numberOfLines={1}>
                    {h.name || type.toUpperCase()}
                  </Text>
                </View>
              </View>
            </Mapbox.PointAnnotation>
          );
        })}

        {/* 5. Field Roadblocks (Impassable Obstacles) */}
        {activeRoadblocks.map((rb) => (
          <Mapbox.PointAnnotation
            key={`roadblock-${rb.id}`}
            id={`roadblock-${rb.id}`}
            coordinate={[rb.longitude, rb.latitude]}
          >
            <View style={styles.roadblockMarkerWrap}>
              <View style={styles.roadblockPinCircle}>
                <Text style={{ fontSize: 15 }}>🚧</Text>
              </View>
              <View style={styles.roadblockCallout}>
                <Text style={styles.roadblockCalloutText}>
                  {`BLOCKADE #${rb.number || 1}`}
                </Text>
              </View>
            </View>
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>
      )}

      {/* ─── TOP TACTICAL NAVIGATION HUD & PROXIMITY ANNOUNCEMENT ─── */}
      <RescueTopHud
        insets={insets}
        activeMission={activeMission}
        isTransportPhase={isTransportPhase}
        handleBackToDutyHub={handleBackToDutyHub}
        isDarkMode={isDarkMode}
        colors={colors}
        refetchMissions={refetchMissions}
        currentStep={currentStep}
        getTurnIcon={getTurnIcon}
        activeTargetName={activeTargetName}
        distanceToTarget={distanceToTarget}
        totalDistanceKm={totalDistanceKm}
        totalEtaMinutes={totalEtaMinutes}
        isLoadingRoute={isLoadingRoute}
        routeData={routeData}
        activeRescuerLocation={activeRescuerLocation}
        isFreeCam={isFreeCam}
        isSimulationActive={isSimulationActive}
        handleCenterOnRescuer={handleCenterOnRescuer}
        handleCenterOnDestination={handleCenterOnDestination}
        handleFitOverview={handleFitOverview}
        activeTargetLngLat={activeTargetLngLat}
        proximityAnnouncement={proximityAnnouncement}
        styles={styles}
      />

      {/* ─── FLOATING ACTION CONTROLS (RIGHT & BOTTOM-LEFT) ─── */}
      <RescueMapControls
        isFreeCam={isFreeCam}
        handleCenterOnRescuer={handleCenterOnRescuer}
        toggleFreeCam={toggleFreeCam}
        activeTargetLngLat={activeTargetLngLat}
        handleCenterOnDestination={handleCenterOnDestination}
        handleDropRoadblock={handleDropRoadblock}
        activeRoadblocks={activeRoadblocks}
        handleClearRoadblocks={handleClearRoadblocks}
        showDisasterView={showDisasterView}
        setShowDisasterView={setShowDisasterView}
        triggerCasualHaptic={triggerCasualHaptic}
        activeHazards={activeHazards}
        showDemoControls={showDemoControls}
        setShowDemoControls={setShowDemoControls}
        isSimulationActive={isSimulationActive}
        setShowStartSimModal={setShowStartSimModal}
        mapStyleMode={mapStyleMode}
        setMapStyleMode={setMapStyleMode}
        safeVibrate={safeVibrate}
        insets={insets}
        activeMission={activeMission}
        isDarkMode={isDarkMode}
        colors={colors}
        styles={styles}
      />

      {/* ─── RESCUER DISASTER SITUATIONAL AWARENESS BRIEFING DRAWER ─── */}
      <ActiveHazardsDrawer
        showDisasterView={showDisasterView}
        setShowDisasterView={setShowDisasterView}
        activeHazards={activeHazards}
        activeRescuerLocation={activeRescuerLocation}
        getHaversineDistanceMeters={getHaversineDistanceMeters}
        insets={insets}
        isDarkMode={isDarkMode}
        colors={colors}
      />

      {/* ─── GUIDED 5-STEP SIMULATION DOCK & PROGRESS PILL ─── */}
      <RescueSimulationPanel
        showDemoControls={showDemoControls}
        setShowDemoControls={setShowDemoControls}
        isSimulationActive={isSimulationActive}
        isPaused={isPaused}
        togglePause={togglePause}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        isNavigating={isNavigating}
        simPhase={simPhase}
        skipToGeofence={skipToGeofence}
        handleDropRoadblock={handleDropRoadblock}
        stopSimulation={stopSimulation}
        resetSimulation={resetSimulation}
        navigation={navigation}
        currentMission={currentMission}
        activeMission={activeMission}
        simulationStep={simulationStep}
        safeVibrate={safeVibrate}
        insets={insets}
        styles={styles}
      />

      {/* ─── BOTTOM MISSION CONTROL DOCK ─── */}
      <RescueMissionActionBar
        showDemoControls={showDemoControls}
        currentMission={currentMission}
        isSimulationActive={isSimulationActive}
        isTransportPhase={isTransportPhase}
        simPhase={simPhase}
        activeMission={activeMission}
        activeTargetName={activeTargetName}
        isNavigating={isNavigating}
        isPaused={isPaused}
        handleDropRoadblock={handleDropRoadblock}
        activeRoadblocks={activeRoadblocks}
        handleClearRoadblocks={handleClearRoadblocks}
        handleCallVictim={handleCallVictim}
        handleSmsVictim={handleSmsVictim}
        handleOpenGoogleMaps={handleOpenGoogleMaps}
        confirmVictimSecured={confirmVictimSecured}
        safeUpdateMissionStatus={safeUpdateMissionStatus}
        shelters={shelters}
        isSuppressionMission={isSuppressionMission}
        updateStatusMutation={updateStatusMutation}
        setShowShelterArrivalModal={setShowShelterArrivalModal}
        confirmHandoverAndStandby={confirmHandoverAndStandby}
        navigation={navigation}
        insets={insets}
        colors={colors}
        styles={styles}
      />

      {/* ─── MODAL: 20-METER VICTIM ARRIVAL CONFIRMATION ─── */}
      <VictimArrivalModal
        visible={showVictimArrivalModal}
        onClose={() => setShowVictimArrivalModal(false)}
        activeMission={activeMission}
        isSuppressionMission={isSuppressionMission}
        onConfirmAction={() => {
          setShowVictimArrivalModal(false);
          if (isSuppressionMission) {
            handleStep5_HandoverAndStandby();
          } else if (isSimulationActive) {
            confirmVictimSecured(shelters[0]);
          } else {
            handleStep3_ExtractAndReRoute();
            setSimulationStep(4);
          }
        }}
      />

      {/* ─── MODAL: 20-METER SHELTER GATE ARRIVAL & CSWDO HANDOVER ─── */}
      <ShelterArrivalModal
        visible={showShelterArrivalModal}
        onClose={() => setShowShelterArrivalModal(false)}
        activeMission={activeMission}
        targetShelterName={activeMission?.target_shelter?.name || shelters[0]?.name}
        assignedUnitName={assignedUnit?.name}
        isPending={updateStatusMutation.isPending}
        onConfirmHandover={() => {
          setShowShelterArrivalModal(false);
          if (isSimulationActive) {
            confirmHandoverAndStandby();
            setRouteData(null);
            if (cameraRef.current) {
              cameraRef.current.setCamera({
                centerCoordinate: gpsLocation || ZAMBOANGA_RESCUER_BASE,
                zoomLevel: 16.5,
                pitch: 35,
                animationDuration: 1000,
              });
            }
          } else {
            handleStep5_HandoverAndStandby();
          }
        }}
      />

      {/* ─── MODAL: RESCUE SIMULATION CONFIRMATION (STEPS 1-5) ─── */}
      <StartSimModal
        visible={showStartSimModal}
        activeMission={currentMission}
        onClose={() => setShowStartSimModal(false)}
        onStartSimulation={() => {
          setShowStartSimModal(false);
          startSimulation(currentMission || null);
          if (navigation) {
            navigation.navigate('Rescue');
          }
        }}
      />
    </View>
  );
}
