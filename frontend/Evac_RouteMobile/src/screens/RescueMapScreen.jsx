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
} from 'lucide-react-native';
import api from '../services/api';
import { spacing, radii } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useRescueSimulationStore } from '../context/useRescueSimulationStore';
import RescueSimulationStepper from '../components/RescueSimulationStepper';
import {
  MAPBOX_PUBLIC_TOKEN,
  clampToZamboanga,
  ZAMBOANGA_RESCUER_BASE,
  ZAMBOANGA_VICTIM_DEFAULT,
  ZAMBOANGA_SHELTER_DEFAULT,
  create20mGeofenceSquare,
} from '../utils/zamboangaGeo';
import {
  fetchTacticalRescueRoute,
  getRescuerCapabilityProfile,
  getHaversineDistanceMeters,
} from '../utils/tacticalRescueRouter';

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

export default function RescueMapScreen({ navigation, route }) {
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

  // 3. Fetch Hazards
  const { data: hazardsData } = useQuery({
    queryKey: ['hazards-list-rescue'],
    queryFn: () => api.get('/hazards').then((r) => r.data.data),
    refetchInterval: 30000,
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
      startSimulation();
    }
  }, [route?.params?.isSimulation, isSimulationActive, startSimulation]);

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

  // Proximity Geofencing Triggers (prevent multiple prompts for same event)
  const hasTriggeredVictimArrival = useRef(false);
  const hasTriggeredShelterArrival = useRef(false);

  // Modals & Disaster Situational View
  const [showVictimArrivalModal, setShowVictimArrivalModal] = useState(false);
  const [showShelterArrivalModal, setShowShelterArrivalModal] = useState(false);
  const [showStartSimModal, setShowStartSimModal] = useState(false);
  const [showDisasterView, setShowDisasterView] = useState(false);

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

  // Compute Route to Active Target whenever Target Coords, Mode, or Roadblocks change
  const computeRoute = useCallback(async (start, end, customRoadblocks = activeRoadblocks) => {
    if (!start || !end) return;
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

    // Recalculate route starting immediately from the vehicle's current position to target with updated roadblocks
    computeRoute(currentPos, target, nextRoadblocks);
  }, [isSimulationActive, simCoords, activeRescuerLocation, activeTargetLngLat, routeData, simHeading, deviceHeading, activeRoadblocks, computeRoute]);

  // Clear all dropped roadblocks and restore optimal route
  const handleClearRoadblocks = useCallback(() => {
    if (activeRoadblocks.length === 0) return;
    const currentPos = (isSimulationActive && simCoords) ? simCoords : activeRescuerLocation;
    const target = activeTargetLngLat;
    setActiveRoadblocks([]);
    safeVibrate(40);
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
  const traveledDistanceRef = useRef(0);
  const currentNavPhaseRef = useRef(simPhase);
  const lastPolylineTrimTimeRef = useRef(0);
  const lastTrimmedSegIdxRef = useRef(-1);

  // Reset traveled distance when simulation phase changes
  useEffect(() => {
    if (currentNavPhaseRef.current !== simPhase) {
      currentNavPhaseRef.current = simPhase;
      traveledDistanceRef.current = 0;
      lastPolylineTrimTimeRef.current = 0;
      lastTrimmedSegIdxRef.current = -1;
    }
  }, [simPhase]);

  // Reset traveled distance when new route is computed
  useEffect(() => {
    if (routeData?.coordinates) {
      traveledDistanceRef.current = 0;
      lastPolylineTrimTimeRef.current = 0;
      lastTrimmedSegIdxRef.current = -1;
    }
  }, [routeData]);

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

    // Set initial tactical navigation camera angle & zoom once when navigation starts
    if (cameraRef.current && coords[0]) {
      cameraRef.current.setCamera({
        centerCoordinate: coords[0],
        heading: coords.length > 1 ? getBearing(coords[0][1], coords[0][0], coords[1][1], coords[1][0]) : 0,
        pitch: 40,
        zoomLevel: 16.8,
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

      // Smoothly follow vehicle position & heading (110ms animation < 150ms interval leaves 40ms frame budget for touches)
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [currLng, currLat],
          heading,
          animationDuration: 110,
        });
      }

      if (distToTarget <= 20 || currentDist >= totalDist - 10) {
        clearInterval(interval);
        setActivePolylineCoords(null);
        if (storeState.simPhase === 'en_route') {
          useRescueSimulationStore.getState().setSimPhase('on_scene');
          safeVibrate([0, 200, 100, 300, 100, 400]);
          setShowVictimArrivalModal(true);
        } else if (storeState.simPhase === 'transporting') {
          useRescueSimulationStore.getState().setSimPhase('shelter_arrival');
          safeVibrate([0, 250, 100, 250, 100, 500]);
          setShowShelterArrivalModal(true);
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
    shelterLngLat,
    victimLngLat,
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

  const safeUpdateMissionStatus = (params) => {
    if (updateStatusMutation.isPending || isUpdatingStatusRef.current) return;
    isUpdatingStatusRef.current = true;
    updateStatusMutation.mutate(params);
  };

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

        // Show Arrival Confirmation Modal
        setShowVictimArrivalModal(true);
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
        setShowShelterArrivalModal(true);
      }
    }
  }, [
    isSimulationActive,
    activeRescuerLocation,
    currentMission,
    victimLngLat,
    shelterLngLat,
    updateStatusMutation,
  ]);

  // Recenter map camera on Rescuer
  const handleRecenter = () => {
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
        animationDuration: 1000,
      });
    }
  };

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


  const resetSimulation = () => {
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

        {/* 3. Rescuer Live Vehicle Pin */}
        {activeRescuerLocation && (
          <Mapbox.PointAnnotation
            key="rescuer-vehicle-marker"
            id="rescuer-vehicle-marker"
            coordinate={activeRescuerLocation}
          >
            <View style={styles.rescuerMarkerWrap}>
              <View style={styles.rescuerAura} />
              <View
                style={[
                  styles.rescuerVehicleCircle,
                  {
                    transform: [
                      { rotate: `${isSimulationActive ? (simHeading || 0) : (deviceHeading || 0)}deg` },
                    ],
                  },
                ]}
              >
                <Navigation2 size={18} color="#ffffff" fill="#ffffff" />
              </View>
              <View style={styles.rescuerCallout}>
                <View style={styles.rescuerStatusDot} />
                <Text style={styles.rescuerCalloutText} numberOfLines={1}>
                  {assignedUnit?.call_sign || 'QRT DELTA-3'}
                </Text>
              </View>
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
              onPress={() => refetchMissions()}
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
                  {getTurnIcon(currentStep?.type, currentStep?.modifier)}
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

            {/* Tactical Engine Status Chip (Option 1) */}
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
                GPS: {activeRescuerLocation[1].toFixed(4)}°N, {activeRescuerLocation[0].toFixed(4)}°E • Sector: Zamboanga City
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ─── FLOATING ACTION CONTROLS (RIGHT) ─── */}
      <View style={styles.floatingControls}>
        <TouchableOpacity
          style={styles.floatingBtn}
          onPress={handleRecenter}
          accessibilityLabel="Recenter Map"
        >
          <Crosshair size={20} color="#38bdf8" />
        </TouchableOpacity>

        {/* 1-Tap Roadblock Injection (Collapsed Wall / Concrete Barrier) */}
        <TouchableOpacity
          style={[styles.floatingBtn, { backgroundColor: '#dc2626', borderColor: '#f87171' }]}
          onPress={handleDropRoadblock}
          accessibilityLabel="Drop Physical Roadblock Ahead"
        >
          <Text style={{ fontSize: 16 }}>🚧</Text>
        </TouchableOpacity>

        {/* Clear Roadblocks Button (Shown when roadblocks exist) */}
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
            Vibration.vibrate(20);
          }}
          accessibilityLabel="Disaster Situational View"
        >
          <AlertTriangle
            size={18}
            color={showDisasterView ? '#ef4444' : (activeHazards.length > 0 ? '#f59e0b' : colors.textPrimary)}
          />
        </TouchableOpacity>

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

      {/* ─── RESCUER DISASTER SITUATIONAL AWARENESS BRIEFING CARD ─── */}
      {showDisasterView && (
        <View style={{
          position: 'absolute',
          top: insets.top + 130,
          left: 14,
          right: 14,
          maxHeight: 280,
          backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
          borderRadius: 16,
          padding: 14,
          borderWidth: 1.5,
          borderColor: '#ef4444',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 10,
          zIndex: 90,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0', paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} color="#ef4444" />
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '900', letterSpacing: 0.3 }}>
                DISASTER SITUATIONAL VIEW ({activeHazards.length} ACTIVE)
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowDisasterView(false)} style={{ padding: 4 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' }}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true}>
            {activeHazards.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>
                ✓ No active disaster hazards reported in sector.
              </Text>
            ) : (
              activeHazards.map((hz) => {
                const hzLat = parseFloat(hz.latitude);
                const hzLng = parseFloat(hz.longitude);
                const distM = (activeRescuerLocation && !isNaN(hzLat) && !isNaN(hzLng))
                  ? Math.round(getHaversineDistanceMeters(activeRescuerLocation[1], activeRescuerLocation[0], hzLat, hzLng))
                  : null;
                const hzType = (hz.hazard_type || '').toLowerCase();
                const icon = hzType.includes('fire') ? '🔥' : hzType.includes('landslide') ? '⛰️' : hzType.includes('flood') ? '🌊' : '⚠️';

                return (
                  <View key={hz.id} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    borderBottomWidth: 0.5,
                    borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 16 }}>{icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '800' }} numberOfLines={1}>
                          {hz.name}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                          {hz.hazard_type?.toUpperCase()} • {hz.severity_level?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {distM !== null && (
                      <View style={{ backgroundColor: distM < 500 ? '#ef4444' : (isDarkMode ? '#334155' : '#e2e8f0'), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: distM < 500 ? '#ffffff' : colors.textPrimary, fontSize: 10, fontWeight: '900', fontFamily: 'monospace' }}>
                          {distM < 1000 ? `${distM}m` : `${(distM / 1000).toFixed(1)}km`} away
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

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
            safeVibrate(25);
          }}
          accessibilityLabel="Toggle Satellite Layer"
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Layers size={20} color={mapStyleMode === 'satellite' ? '#f59e0b' : colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ─── GUIDED 5-STEP SIMULATION DOCK (COLLAPSIBLE) ─── */}
      {showDemoControls && (
        <View
          style={[styles.guidedSimContainer, { paddingBottom: Math.max(insets.bottom, 14) }]}
          pointerEvents="box-none"
        >
          {/* Floating Speed & Playback Controller Dock - Placed directly above the guided rescue simulator */}
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

              {/* Drop Roadblock Ahead (Wall / Barrier Encounter) */}
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
              safeVibrate(20);
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

      {/* ─── BOTTOM MISSION CONTROL DOCK ─── */}
      {!showDemoControls && (
        <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {(currentMission || isSimulationActive) ? (
            <View>
              {/* Target Status Banner */}
              <View style={styles.dockHeaderRow}>
                <View style={styles.dockStatusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      isTransportPhase ? styles.dotCyan : styles.dotAmber,
                    ]}
                  />
                  <Text style={styles.dockStatusText}>
                    {isSimulationActive
                      ? `SIM: ${simPhase.toUpperCase()}`
                      : (currentMission?.status || 'ACTIVE').toUpperCase()} • {currentMission?.control_no || 'OP-QRT'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.triageBadge,
                    activeMission?.triage_level === 'critical'
                      ? styles.triageCritical
                      : styles.triageUrgent,
                  ]}
                >
                  <Text style={styles.triageBadgeText}>
                    {(activeMission?.triage_level || 'URGENT').toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Target Details */}
              <View style={styles.dockTargetInfo}>
                <Text style={styles.dockTargetTitle} numberOfLines={1}>
                  {isTransportPhase
                    ? `🏢 Delivering to: ${activeTargetName}`
                    : `🚨 Extracting: ${activeMission?.victim_name} (${activeMission?.headcount} Persons)`}
                </Text>
                <Text style={styles.dockTargetSub} numberOfLines={1}>
                  {isTransportPhase
                    ? 'Drop-off: CSWDO Intake Desk • Auto registration enabled'
                    : `Barangay: ${activeMission?.barangay || 'Baliwasan'} • Needs: ${activeMission?.special_needs || 'Standard evacuation'}`}
                </Text>
              </View>

              {/* Tactical Action Buttons Row */}
                {/* Row 1: Communications & Utility Buttons */}
                {!isTransportPhase && (
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: (currentMission?.status === 'on_scene' || currentMission?.status === 'transporting' || simPhase === 'on_scene' || simPhase === 'transporting') ? 6 : 0 }}>
                    <TouchableOpacity
                      style={[styles.dockBtn, styles.callBtn]}
                      onPress={() => handleCallVictim(activeMission?.victim_phone)}
                    >
                      <Phone size={14} color={colors.white} />
                      <Text style={styles.dockBtnText}>Call Victim</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.dockBtn, styles.smsBtn]}
                      onPress={() =>
                        handleSmsVictim(
                          activeMission?.victim_phone,
                          activeMission?.victim_name,
                          activeMission?.barangay
                        )
                      }
                    >
                      <MessageSquare size={14} color={colors.white} />
                      <Text style={styles.dockBtnText}>Quick SMS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.dockBtn, styles.externalBtn]}
                      onPress={handleOpenGoogleMaps}
                      accessibilityLabel="Open External Google Maps"
                    >
                      <Navigation size={14} color="#94a3b8" />
                      <Text style={[styles.dockBtnText, { color: '#94a3b8' }]}>Maps</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Row 2: Status Advancement Primary CTA (Full Width, Large, High-Contrast) */}
                {(currentMission?.status === 'on_scene' || simPhase === 'on_scene') && (
                  <TouchableOpacity
                    style={[styles.dockBtn, styles.transportBtn, { width: '100%', paddingVertical: 12 }]}
                    onPress={() => {
                      if (isSimulationActive) {
                        confirmVictimSecured(shelters[0]);
                      } else if (isSuppressionMission) {
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
                    }}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Shield size={16} color={colors.white} />
                    <Text style={styles.dockBtnTextBold}>
                      {isSuppressionMission ? 'MARK THREAT NEUTRALIZED (COMPLETE)' : 'START TRANSPORT TO SHELTER'}
                    </Text>
                  </TouchableOpacity>
                )}

                {(currentMission?.status === 'transporting' || simPhase === 'transporting' || simPhase === 'shelter_arrival') && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.dockBtn, styles.completeBtn, { flex: 1, paddingVertical: 12 }]}
                      onPress={() => setShowShelterArrivalModal(true)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle2 size={16} color={colors.white} />
                      <Text style={styles.dockBtnTextBold}>CONFIRM CSWDO INTAKE HANDOVER</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.dockBtn, styles.externalBtn, { paddingHorizontal: 12 }]}
                      onPress={handleOpenGoogleMaps}
                      accessibilityLabel="Open External Google Maps"
                    >
                      <Navigation size={14} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                )}

                {(currentMission?.status === 'completed' || simPhase === 'completed') && (
                  <TouchableOpacity
                    style={[styles.dockBtn, styles.completeBtn, { width: '100%', paddingVertical: 12, backgroundColor: '#059669' }]}
                    onPress={() => {
                      if (isSimulationActive) {
                        confirmHandoverAndStandby();
                      }
                      if (navigation) {
                        navigation.navigate('Rescue');
                      }
                    }}
                  >
                    <CheckCircle2 size={16} color={colors.white} />
                    <Text style={styles.dockBtnTextBold}>MISSION COMPLETED • RETURN TO DUTY HUB</Text>
                  </TouchableOpacity>
                )}
            </View>
          ) : (
            <View style={styles.noMissionDock}>
              <LifeBuoy size={24} color="#34d399" />
              <Text style={styles.noMissionText}>
                Unit on Active Standby • Listening for incoming CDRRMO dispatch orders
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ─── MODAL: 20-METER VICTIM ARRIVAL CONFIRMATION ─── */}
      <Modal
        visible={showVictimArrivalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVictimArrivalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowVictimArrivalModal(false)}
          />
          <View style={styles.arrivalModalContent}>
            <View style={[styles.arrivalIconCircle, styles.arrivalIconVictim]}>
              <AlertTriangle size={32} color="#ffffff" />
            </View>

            <Text style={styles.arrivalTitle}>🎯 ARRIVED ON SCENE (≤ 20M)</Text>
            <Text style={styles.arrivalSubtitle}>
              Automated proximity geofence detected you are within 20 meters of{' '}
              <Text style={{ fontWeight: '700', color: colors.white }}>
                {activeMission?.victim_name || 'Distress Victim'}
              </Text>
              . Mission status has been automatically transitioned to{' '}
              <Text style={{ fontWeight: '700', color: '#f59e0b' }}>ON SCENE</Text>.
            </Text>

            <View style={styles.arrivalDetailsBox}>
              <Text style={styles.arrivalDetailsLabel}>VULNERABILITY &amp; HEADCOUNT:</Text>
              <Text style={styles.arrivalDetailsVal}>
                👥 {activeMission?.headcount || 1} Persons • {activeMission?.special_needs || 'Standard evac'}
              </Text>
              <Text style={[styles.arrivalDetailsLabel, { marginTop: 6 }]}>SITUATION:</Text>
              <Text style={styles.arrivalDetailsVal}>
                &ldquo;{activeMission?.situation_description || 'Rising floodwaters'}&rdquo;
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalActionPrimaryBtn}
              onPress={() => {
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
            >
              <Shield size={18} color={colors.white} />
              <Text style={styles.modalActionPrimaryText}>
                {isSuppressionMission 
                  ? 'MARK THREAT NEUTRALIZED (COMPLETE)' 
                  : 'LOAD VICTIMS & COMMENCE SHELTER TRANSPORT'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalActionSecondaryBtn}
              onPress={() => setShowVictimArrivalModal(false)}
            >
              <Text style={styles.modalActionSecondaryText}>Stay on Scene (Standby)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: 20-METER SHELTER GATE ARRIVAL & CSWDO HANDOVER ─── */}
      <Modal
        visible={showShelterArrivalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShelterArrivalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowShelterArrivalModal(false)}
          />
          <View style={styles.arrivalModalContent}>
            <View style={[styles.arrivalIconCircle, styles.arrivalIconShelter]}>
              <Building size={32} color="#ffffff" />
            </View>

            <Text style={styles.arrivalTitle}>🏢 ARRIVED AT EVACUATION SHELTER (≤ 20M)</Text>
            <Text style={styles.arrivalSubtitle}>
              You have arrived at{' '}
              <Text style={{ fontWeight: '700', color: colors.white }}>
                {activeMission?.target_shelter?.name || shelters[0]?.name || 'Baliwasan Gym'}
              </Text>
              . CSWDO intake staff are ready to accept {activeMission?.headcount || 1} evacuees.
            </Text>

            <View style={styles.arrivalDetailsBox}>
              <Text style={styles.arrivalDetailsLabel}>AUTOMATIC CSWDO INTAKE BRIDGE:</Text>
              <Text style={styles.arrivalDetailsVal}>
                • Automatically increments shelter occupancy (+{activeMission?.headcount || 1})
              </Text>
              <Text style={styles.arrivalDetailsVal}>
                • Registers {activeMission?.victim_name || 'Distress Evacuees'} in CSWDO intake ledger
              </Text>
              <Text style={styles.arrivalDetailsVal}>
                • Resets {assignedUnit?.name || 'Unit'} to STANDBY for next rescue
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalActionPrimaryBtn, { backgroundColor: '#10b981' }]}
              onPress={() => {
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
              disabled={updateStatusMutation.isPending}
            >
              <CheckCircle2 size={18} color={colors.white} />
              <Text style={styles.modalActionPrimaryText}>
                CONFIRM CSWDO INTAKE &amp; COMPLETE MISSION
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalActionSecondaryBtn}
              onPress={() => setShowShelterArrivalModal(false)}
            >
              <Text style={styles.modalActionSecondaryText}>Dismiss for Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: RESCUE SIMULATION CONFIRMATION (STEPS 1-5) ─── */}
      <Modal
        visible={showStartSimModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStartSimModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.startSimModalContent}>
            <View style={styles.startSimIconCircle}>
              <Play size={28} color="#f59e0b" />
            </View>

            <Text style={styles.startSimTitle}>⚡ START RESCUE SIMULATION</Text>
            <Text style={styles.startSimSubtitle}>
              This will initiate an interactive 5-step emergency rescue sequence with automated 10m/s tactical routing and 20-meter geofencing triggers.
            </Text>

            <View style={styles.startSimStepsList}>
              <View style={styles.startSimStepItem}>
                <View style={styles.startSimStepNum}>
                  <Text style={styles.startSimStepNumText}>1</Text>
                </View>
                <Text style={styles.startSimStepText}>
                  <Text style={styles.startSimStepTitle}>Duty Hub Dispatch: </Text>
                  <Text style={styles.startSimStepDesc}>Accept distress order in Duty Hub</Text>
                </Text>
              </View>

              <View style={styles.startSimStepItem}>
                <View style={styles.startSimStepNum}>
                  <Text style={styles.startSimStepNumText}>2</Text>
                </View>
                <Text style={styles.startSimStepText}>
                  <Text style={styles.startSimStepTitle}>En Route (10 m/s): </Text>
                  <Text style={styles.startSimStepDesc}>Navigate along tactical route to victim</Text>
                </Text>
              </View>

              <View style={styles.startSimStepItem}>
                <View style={styles.startSimStepNum}>
                  <Text style={styles.startSimStepNumText}>3</Text>
                </View>
                <Text style={styles.startSimStepText}>
                  <Text style={styles.startSimStepTitle}>On Scene (≤ 20m): </Text>
                  <Text style={styles.startSimStepDesc}>Geofence alerts arrival & secures victim onboard</Text>
                </Text>
              </View>

              <View style={styles.startSimStepItem}>
                <View style={styles.startSimStepNum}>
                  <Text style={styles.startSimStepNumText}>4</Text>
                </View>
                <Text style={styles.startSimStepText}>
                  <Text style={styles.startSimStepTitle}>Transporting (10 m/s): </Text>
                  <Text style={styles.startSimStepDesc}>Reroute and navigate to nearest shelter</Text>
                </Text>
              </View>

              <View style={styles.startSimStepItem}>
                <View style={styles.startSimStepNum}>
                  <Text style={styles.startSimStepNumText}>5</Text>
                </View>
                <Text style={styles.startSimStepText}>
                  <Text style={styles.startSimStepTitle}>CSWDO Handover: </Text>
                  <Text style={styles.startSimStepDesc}>Shelter gate geofence & return to standby</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalActionPrimaryBtn}
              onPress={() => {
                setShowStartSimModal(false);
                startSimulation();
                if (navigation) {
                  navigation.navigate('Rescue');
                }
              }}
            >
              <Play size={18} color="#ffffff" />
              <Text style={styles.modalActionPrimaryText}>
                START SIMULATION &amp; GO TO DUTY HUB
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalActionSecondaryBtn}
              onPress={() => setShowStartSimModal(false)}
            >
              <Text style={styles.modalActionSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ─── MAP MARKERS ─── */
  victimMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  victimPulsingRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  victimPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#ef4444',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 5,
  },
  victimCallout: {
    marginTop: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  victimCalloutText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  shelterMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shelterPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#0284c7',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 4,
  },
  shelterCallout: {
    marginTop: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  shelterCalloutText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },

  rescuerMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescuerAura: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.65)',
  },
  rescuerVehicleCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  rescuerCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  rescuerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  rescuerCalloutText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  hazardMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hazardPinCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadblockMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadblockPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  roadblockCallout: {
    marginTop: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f87171',
  },
  roadblockCalloutText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  /* ─── TOP TACTICAL HUD ─── */
  topHudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    backgroundColor: isDarkMode ? 'rgba(10, 15, 29, 0.88)' : 'rgba(255, 255, 255, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 100,
    elevation: 10,
  },
  topHudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  backBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  phaseBadgeStandby: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  phaseBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  standbyHudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.94)' : colors.card,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(52, 211, 153, 0.25)' : colors.cardBorder,
  },
  standbyHudTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  standbyHudSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  mapStyleBtn: {
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    padding: 7,
    borderRadius: radii.sm,
  },

  maneuverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : colors.card,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.25)' : colors.cardBorder,
  },
  maneuverIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maneuverIconText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  maneuverDistance: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  maneuverInstruction: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  proximityPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  proximityDistance: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '900',
  },
  proximityLabel: {
    color: '#f59e0b',
    fontSize: 8,
    fontWeight: '800',
  },

  tripStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tripStatsText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  tacticalStrategyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 6,
    alignItems: 'center',
  },
  tacticalBadgeWater: {
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    borderColor: '#06b6d4',
  },
  tacticalBadgeWading: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: '#f59e0b',
  },
  tacticalBadgeDetour: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderColor: '#ef4444',
  },
  tacticalStrategyText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* ─── FLOATING CONTROLS ─── */
  floatingControls: {
    position: 'absolute',
    right: 14,
    top: 170,
    gap: 10,
    zIndex: 25,
  },
  bottomLeftControls: {
    position: 'absolute',
    left: 14,
    zIndex: 25,
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    shadowColor: '#000',
    shadowOpacity: isDarkMode ? 0.4 : 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },
  floatingBtnActive: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },

  /* ─── GUIDED 5-STEP SIMULATION FOCUS DOCK ─── */
  guidedSimContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: isDarkMode ? 'rgba(10, 15, 29, 0.97)' : colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: 1.5,
    borderTopColor: '#f59e0b',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  guidedSimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidedSimTitle: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  guidedSimCloseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
  },
  guidedSimCloseText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },

  /* Multi-mission switcher */
  missionSwitcherBox: {
    marginBottom: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  missionSwitcherLabel: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginLeft: 2,
  },
  missionChipScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  missionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  missionChipActive: {
    backgroundColor: '#d97706',
    borderColor: '#f59e0b',
  },
  missionChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 160,
  },
  missionChipTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },

  /* Stepper strip */
  stepperProgressStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  stepNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0',
    borderWidth: 1.5,
    borderColor: isDarkMode ? '#475569' : '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNodeCurrent: {
    borderColor: '#38bdf8',
    backgroundColor: '#0284c7',
    transform: [{ scale: 1.15 }],
  },
  stepNodePast: {
    backgroundColor: '#059669',
    borderColor: '#10b981',
  },
  stepNodeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  stepNodeTextCurrent: {
    color: '#ffffff',
    fontWeight: '900',
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
    backgroundColor: '#38bdf8',
  },

  /* Step focus card */
  stepFocusCard: {
    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.75)' : colors.surfaceElevated,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  stepFocusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepNumberBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  stepNumberBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stepFocusStageName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  stepFocusDescription: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
  },

  /* Primary Action Button */
  stepPrimaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: radii.md,
    marginBottom: 6,
  },
  stepPrimaryActionBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.3,
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

  /* Telemetry & footer */
  simTelemetryRow: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  simTelemetryText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  simFooterActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  simUtilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  simUtilityBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },

  /* ─── BOTTOM MISSION CONTROL DOCK ─── */
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  dockHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotAmber: {
    backgroundColor: '#f59e0b',
  },
  dotCyan: {
    backgroundColor: '#06b6d4',
  },
  dockStatusText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  triageBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  triageCritical: {
    backgroundColor: '#dc2626',
  },
  triageUrgent: {
    backgroundColor: '#d97706',
  },
  triageBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },

  dockTargetInfo: {
    marginBottom: 10,
  },
  dockTargetTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  dockTargetSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  dockButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  callBtn: {
    backgroundColor: '#0284c7',
  },
  smsBtn: {
    backgroundColor: '#059669',
  },
  transportBtn: {
    backgroundColor: '#d97706',
  },
  completeBtn: {
    backgroundColor: '#10b981',
  },
  externalBtn: {
    flex: 0.35,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
  },
  dockBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  dockBtnTextBold: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  noMissionDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  noMissionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  /* ─── MODALS ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  arrivalModalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  arrivalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  arrivalIconVictim: {
    backgroundColor: '#dc2626',
  },
  arrivalIconShelter: {
    backgroundColor: '#0284c7',
  },
  arrivalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  arrivalSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  arrivalDetailsBox: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  arrivalDetailsLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  arrivalDetailsVal: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  modalActionPrimaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#d97706',
    paddingVertical: 12,
    borderRadius: radii.md,
    marginBottom: 8,
  },
  modalActionPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalActionSecondaryBtn: {
    paddingVertical: 8,
  },
  modalActionSecondaryText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  expoGoMapFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0f1d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  radarBigCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  radarFallbackTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 4,
  },
  radarFallbackSub: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 20,
  },
  radarDetailsCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  radarDetailsLine: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },

  /* ─── FLOATING SIMULATION SPEED & PLAYBACK CONTROLLER ─── */
  simControlFloatingBarAttached: {
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    gap: 6,
  },
  geofenceTagWrap: {
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  geofenceTagText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  simControlFloatingBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)',
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    gap: 6,
    zIndex: 90,
  },
  simPlayPauseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simPlayPauseBtnPaused: {
    backgroundColor: '#10b981',
  },
  simSpeedPillGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(241, 245, 249, 0.9)',
    borderRadius: radii.full,
    padding: 3,
    gap: 4,
  },
  simSpeedPill: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: radii.full,
  },
  simSpeedPillActive: {
    backgroundColor: '#f59e0b',
  },
  simSpeedPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: isDarkMode ? '#94a3b8' : '#64748b',
  },
  simSpeedPillTextActive: {
    color: '#ffffff',
  },
  simSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#6366f1',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radii.full,
  },
  simSkipBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  simBtnDisabled: {
    opacity: 0.4,
  },
  simStopBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simStopBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },

  /* ─── ACTIVE SIMULATION PROGRESS PILL ─── */
  simProgressPillAnchor: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    zIndex: 40,
  },
  simProgressPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: radii.full,
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  simPillDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  simProgressPillText: {
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* ─── START SIMULATION CONFIRMATION MODAL ─── */
  startSimModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  startSimIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 2,
    borderColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  startSimTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  startSimSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  startSimStepsList: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: 8,
  },
  startSimStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  startSimStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  startSimStepNumText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '900',
  },
  startSimStepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  startSimStepTitle: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  startSimStepDesc: {
    color: colors.textSecondary,
  },
});
