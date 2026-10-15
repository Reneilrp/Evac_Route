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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import {
  Navigation,
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
  Sliders,
  RotateCcw,
  Play,
  Pause,
  FastForward,
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
        case 'standby':
          return 1;
        case 'en_route':
          return 1;
        case 'on_scene':
          return 2;
        case 'transporting':
          return 3;
        case 'shelter_arrival':
          return 4;
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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [mapStyleMode, setMapStyleMode] = useState('default'); // 'default' | 'satellite'

  // Memoize valid GeoJSON FeatureCollection for Mapbox ShapeSource
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

  // Modals
  const [showVictimArrivalModal, setShowVictimArrivalModal] = useState(false);
  const [showShelterArrivalModal, setShowShelterArrivalModal] = useState(false);

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

  // Compute Route to Active Target whenever Target Coords or Mode change
  const computeRoute = useCallback(async (start, end) => {
    if (!start || !end) return;
    setIsLoadingRoute(true);
    try {
      const result = await fetchTacticalRescueRoute(
        start,
        end,
        MAPBOX_PUBLIC_TOKEN,
        rescuerProfile,
        activeHazards
      );
      if (result && result.coordinates?.length > 0) {
        setRouteData(result);
        setCurrentStepIndex(0);
      }
    } catch (e) {
      console.warn('[RescueMapScreen] computeRoute error:', e);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [rescuerProfile, activeHazards]);

  useEffect(() => {
    const timer = setTimeout(() => {
      // By default on the map, stay at rescuer location without premature routes
      // Only compute route if simulation is active OR an active live mission exists
      const hasLiveMission = currentMission && ['dispatched', 'en_route', 'on_scene', 'transporting'].includes(currentMission.status);
      if (isSimulationActive) {
        if (simPhase === 'completed' || simPhase === 'standby') {
          setRouteData(null);
        } else if (activeTargetLngLat && activeRescuerLocation) {
          computeRoute(activeRescuerLocation, activeTargetLngLat);
        }
      } else if (!showDemoControls && !hasLiveMission) {
        setRouteData(null);
      } else if (showDemoControls && simulationStep === 5) {
        setRouteData(null);
      } else if (activeTargetLngLat && activeRescuerLocation) {
        computeRoute(activeRescuerLocation, activeTargetLngLat);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [computeRoute, activeRescuerLocation, activeTargetLngLat, isTransportPhase, currentMission, showDemoControls, simulationStep, isSimulationActive, simPhase]);

  // ─── TACTICAL 10M/S SIMULATION MOVEMENT ENGINE ───
  const traveledDistanceRef = useRef(0);
  const currentNavPhaseRef = useRef(simPhase);

  // Reset traveled distance when simulation phase changes
  useEffect(() => {
    if (currentNavPhaseRef.current !== simPhase) {
      currentNavPhaseRef.current = simPhase;
      traveledDistanceRef.current = 0;
    }
  }, [simPhase]);

  // Reset traveled distance when new route is computed
  useEffect(() => {
    if (routeData?.coordinates) {
      traveledDistanceRef.current = 0;
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
        const deltaMeters = (10 * currentSpeed) * 0.1;
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

      // Smoothly follow vehicle position & heading without zoom-bouncing
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [currLng, currLat],
          heading,
          animationDuration: 120,
        });
      }

      if (distToTarget <= 20 || currentDist >= totalDist - 10) {
        clearInterval(interval);
        if (storeState.simPhase === 'en_route') {
          useRescueSimulationStore.getState().setSimPhase('on_scene');
          Vibration.vibrate([0, 200, 100, 300, 100, 400]);
          setShowVictimArrivalModal(true);
        } else if (storeState.simPhase === 'transporting') {
          useRescueSimulationStore.getState().setSimPhase('shelter_arrival');
          Vibration.vibrate([0, 250, 100, 250, 100, 500]);
          setShowShelterArrivalModal(true);
        }
      }
    }, 100);

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

  // ─── AUTOMATED 20-METER PROXIMITY ENGINE ───
  useEffect(() => {
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
        Vibration.vibrate([0, 200, 100, 300, 100, 400]);

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
        Vibration.vibrate([0, 250, 100, 250, 100, 500]);
        setShowShelterArrivalModal(true);
      }
    }
  }, [
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

  const resetSimulation = () => {
    setSimulatedLocation(null);
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
                <Text style={{ fontSize: 16 }}>🚤</Text>
              </View>
              <View style={styles.rescuerCallout}>
                <Text style={styles.rescuerCalloutText}>
                  {assignedUnit?.call_sign || 'QRT DELTA-3'}
                </Text>
              </View>
            </View>
          </Mapbox.PointAnnotation>
        )}
        {/* 4. Active Flood Hazard Zone Markers */}
        {activeHazards.slice(0, 10).map((h) => {
          const lat = parseFloat(h.latitude);
          const lng = parseFloat(h.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          return (
            <Mapbox.PointAnnotation
              key={`hazard-pin-${h.id}`}
              id={`hazard-pin-${h.id}`}
              coordinate={[lng, lat]}
            >
              <View style={styles.hazardMarkerWrap}>
                <View style={styles.hazardPinCircle}>
                  <Text style={{ fontSize: 11 }}>🌊</Text>
                </View>
              </View>
            </Mapbox.PointAnnotation>
          );
        })}
      </Mapbox.MapView>
      )}

      {/* ─── TOP TACTICAL NAVIGATION HUD ─── */}
      <View style={[styles.topHudContainer, { paddingTop: insets.top + spacing.xs }]}>
        {/* Header Bar */}
        <View style={styles.topHudHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Rescue')}
            activeOpacity={0.8}
            accessibilityLabel="Back to Duty Hub"
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

        <TouchableOpacity
          style={[styles.floatingBtn, (showDemoControls || isSimulationActive) && styles.floatingBtnActive]}
          onPress={() => {
            if (isSimulationActive) {
              setShowDemoControls(!showDemoControls);
            } else {
              startSimulation();
              if (navigation) {
                navigation.navigate('Rescue');
              }
            }
          }}
          accessibilityLabel="Toggle Presentation Simulation Tools"
        >
          <Sliders size={20} color={(showDemoControls || isSimulationActive) ? '#f59e0b' : '#94a3b8'} />
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
            Vibration.vibrate(25);
          }}
          accessibilityLabel="Toggle Satellite Layer"
          activeOpacity={0.8}
        >
          <Layers size={20} color={mapStyleMode === 'satellite' ? '#f59e0b' : colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ─── GUIDED 5-STEP SIMULATION DOCK (COLLAPSIBLE) ─── */}
      {showDemoControls && (
        <View style={[styles.guidedSimContainer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {/* Floating Speed & Playback Controller Dock - Placed directly above the guided rescue simulator */}
          {isSimulationActive && (
            <View style={styles.simControlFloatingBarAttached}>
              {/* Play / Pause Button */}
              <TouchableOpacity
                style={[styles.simPlayPauseBtn, isPaused && styles.simPlayPauseBtnPaused]}
                onPress={togglePause}
                accessibilityLabel={isPaused ? 'Resume Navigation' : 'Pause Navigation'}
                activeOpacity={0.8}
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
                      activeOpacity={0.8}
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
                activeOpacity={0.8}
              >
                <FastForward size={14} color="#ffffff" />
                <Text style={styles.simSkipBtnText}>20m</Text>
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
                activeOpacity={0.8}
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

                {(currentMission?.status === 'transporting' || simPhase === 'transporting') && (
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  rescuerVehicleCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  rescuerCallout: {
    marginTop: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  rescuerCalloutText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
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
});
