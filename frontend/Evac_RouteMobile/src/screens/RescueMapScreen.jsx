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
  MapPin,
  Check,
} from 'lucide-react-native';
import api from '../services/api';
import { colors, spacing, radii } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
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

  const [selectedMissionId, setSelectedMissionId] = useState(route?.params?.missionId || null);

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

  // Guided simulation step 1 to 5 derived from actual mission lifecycle
  const currentSimulationStep = useMemo(() => {
    if (!currentMission) return 5;
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
        return 5;
    }
  }, [currentMission]);

  const shelters = useMemo(() => sheltersData ?? [], [sheltersData]);
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

  const activeRescuerLocation = simulatedLocation || gpsLocation;

  // Target Destination Coords
  const victimLngLat = useMemo(() => {
    if (currentMission?.victim_latitude && currentMission?.victim_longitude) {
      return clampToZamboanga(
        [Number(currentMission.victim_longitude), Number(currentMission.victim_latitude)],
        ZAMBOANGA_VICTIM_DEFAULT
      );
    }
    return currentMission ? ZAMBOANGA_VICTIM_DEFAULT : null;
  }, [currentMission]);

  const shelterLngLat = useMemo(() => {
    if (currentMission?.target_shelter?.latitude && currentMission?.target_shelter?.longitude) {
      return clampToZamboanga(
        [
          Number(currentMission.target_shelter.longitude),
          Number(currentMission.target_shelter.latitude),
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
    return currentMission ? ZAMBOANGA_SHELTER_DEFAULT : null;
  }, [currentMission, shelters]);

  // Current Target Mode: 'victim' (during en_route / on_scene) or 'shelter' (during transporting)
  const isTransportPhase = currentMission?.status === 'transporting';
  const activeTargetLngLat = isTransportPhase ? shelterLngLat : victimLngLat;
  const activeTargetName = isTransportPhase
    ? currentMission?.target_shelter?.name || shelters[0]?.name || 'Baliwasan Gym Evacuation Center'
    : currentMission?.victim_name || 'Distress Victim';

  // Route calculation state
  const [routeData, setRouteData] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [mapStyleMode, setMapStyleMode] = useState('dark'); // 'dark' | 'satellite'

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

  // Proximity Geofencing Triggers (prevent multiple prompts for same event)
  const hasTriggeredVictimArrival = useRef(false);
  const hasTriggeredShelterArrival = useRef(false);

  // Modals
  const [showVictimArrivalModal, setShowVictimArrivalModal] = useState(false);
  const [showShelterArrivalModal, setShowShelterArrivalModal] = useState(false);
  const [showDemoControls, setShowDemoControls] = useState(false);

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
      if (!currentMission || !activeTargetLngLat) {
        setRouteData(null);
      } else {
        computeRoute(activeRescuerLocation, activeTargetLngLat);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [computeRoute, activeRescuerLocation, activeTargetLngLat, isTransportPhase, currentMission]);

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
  });

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
        routeData?.coordinates?.[1] && activeRescuerLocation
          ? getBearing(
              activeRescuerLocation[1],
              activeRescuerLocation[0],
              routeData.coordinates[1][1],
              routeData.coordinates[1][0]
            )
          : deviceHeading;

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

  // ─── GUIDED 5-STEP SIMULATION HANDLERS ───
  const handleStep1_EnRoute = () => {
    if (!currentMission) return;
    updateStatusMutation.mutate({
      id: currentMission.id,
      status: 'en_route',
    });
    if (activeRescuerLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: activeRescuerLocation,
        zoomLevel: 15.8,
        animationDuration: 800,
      });
    }
  };

  const handleStep2_SimVictim20m = () => {
    if (!victimLngLat || !currentMission) return;
    // 15 meters offset from victim
    const sim = [victimLngLat[0] + 0.0001, victimLngLat[1] + 0.0001];
    hasTriggeredVictimArrival.current = false;
    setSimulatedLocation(sim);
    cameraRef.current?.setCamera({
      centerCoordinate: sim,
      zoomLevel: 17,
      animationDuration: 800,
    });
    updateStatusMutation.mutate({
      id: currentMission.id,
      status: 'on_scene',
    });
    Vibration.vibrate([0, 200, 100, 300, 100, 400]);
    setShowVictimArrivalModal(true);
  };

  const handleStep3_ExtractAndReRoute = () => {
    if (!currentMission) return;
    updateStatusMutation.mutate({
      id: currentMission.id,
      status: 'transporting',
      target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
    });
    setShowVictimArrivalModal(false);
  };

  const handleStep4_SimShelter20m = () => {
    if (!shelterLngLat || !currentMission) return;
    // 15 meters offset from shelter gate
    const sim = [shelterLngLat[0] + 0.0001, shelterLngLat[1] + 0.0001];
    hasTriggeredShelterArrival.current = false;
    setSimulatedLocation(sim);
    cameraRef.current?.setCamera({
      centerCoordinate: sim,
      zoomLevel: 17,
      animationDuration: 800,
    });
    Vibration.vibrate([0, 250, 100, 250, 100, 500]);
    setShowShelterArrivalModal(true);
  };

  const handleStep5_HandoverAndStandby = () => {
    if (!currentMission) return;
    updateStatusMutation.mutate({
      id: currentMission.id,
      status: 'completed',
      target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
    });
    setShowShelterArrivalModal(false);
    resetSimulation();
  };

  const handleTriggerStep = (step) => {
    if (step === 1) handleStep1_EnRoute();
    else if (step === 2) handleStep2_SimVictim20m();
    else if (step === 3) handleStep3_ExtractAndReRoute();
    else if (step === 4) handleStep4_SimShelter20m();
    else if (step === 5) handleStep5_HandoverAndStandby();
  };

  const resetSimulation = () => {
    setSimulatedLocation(null);
    hasTriggeredVictimArrival.current = false;
    hasTriggeredShelterArrival.current = false;
    if (gpsLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: gpsLocation,
        zoomLevel: 16.5,
        animationDuration: 800,
      });
    }
  };

  const handleResetMissionToDispatched = () => {
    if (!currentMission) return;
    updateStatusMutation.mutate({
      id: currentMission.id,
      status: 'dispatched',
    });
    resetSimulation();
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
              : Mapbox?.StyleURL?.Dark || 'mapbox://styles/mapbox/dark-v11'
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
            {/* Outer Glow */}
            <Mapbox.LineLayer
              id="rescue-map-route-glow"
              style={{
                lineColor: isTransportPhase ? '#06b6d4' : '#f59e0b',
                lineWidth: 9,
                lineOpacity: 0.65,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Core Solid Line */}
            <Mapbox.LineLayer
              id="rescue-map-route-core"
              style={{
                lineColor: '#ffffff',
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* 1. Victim SOS Distress Pin */}
        {currentMission && victimLngLat && (
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
                  🚨 {currentMission?.victim_name || 'Victim'} ({currentMission?.headcount || 1}p)
                </Text>
              </View>
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* 2. Target Evacuation Shelter Pin */}
        {currentMission && shelterLngLat && (
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
                  🏢 {currentMission?.target_shelter?.name || shelters[0]?.name || 'Baliwasan Gym'}
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
              <View style={styles.rescuerVehicleCircle}>
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
            <ArrowLeft size={18} color={colors.white} />
            <Text style={styles.backBtnText}>Duty Hub</Text>
          </TouchableOpacity>

          <View style={[styles.phaseBadge, !currentMission && styles.phaseBadgeStandby]}>
            <Radio size={12} color={currentMission ? '#34d399' : '#60a5fa'} />
            <Text style={styles.phaseBadgeText}>
              {currentMission
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

            <TouchableOpacity
              style={styles.mapStyleBtn}
              onPress={() => setMapStyleMode(mapStyleMode === 'dark' ? 'satellite' : 'dark')}
              accessibilityLabel="Toggle Satellite Layer"
            >
              <Layers size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {currentMission ? (
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
          style={[styles.floatingBtn, showDemoControls && styles.floatingBtnActive]}
          onPress={() => setShowDemoControls(!showDemoControls)}
          accessibilityLabel="Toggle Presentation Simulation Tools"
        >
          <Sliders size={20} color={showDemoControls ? '#f59e0b' : '#94a3b8'} />
        </TouchableOpacity>
      </View>

      {/* ─── GUIDED 5-STEP SIMULATION FOCUS DOCK (COLLAPSIBLE) ─── */}
      {showDemoControls ? (
        <View style={[styles.guidedSimContainer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {/* Header Bar */}
          <View style={styles.guidedSimHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13 }}>⚡</Text>
              <Text style={styles.guidedSimTitle}>GUIDED RESCUE SIMULATION • 5-STEP FOCUS</Text>
            </View>
            <TouchableOpacity onPress={() => setShowDemoControls(false)} style={styles.guidedSimCloseBtn}>
              <Text style={styles.guidedSimCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Dual Critical Test Family Switcher */}
          {availableMissions.length > 0 && (
            <View style={styles.missionSwitcherBox}>
              <Text style={styles.missionSwitcherLabel}>SELECT CRITICAL TEST TARGET:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.missionChipScroll}>
                {availableMissions.map((m) => {
                  const isSelected = currentMission?.id === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.missionChip, isSelected && styles.missionChipActive]}
                      onPress={() => {
                        setSelectedMissionId(m.id);
                        resetSimulation();
                      }}
                      activeOpacity={0.8}
                    >
                      <AlertTriangle size={12} color={isSelected ? '#ffffff' : '#f59e0b'} />
                      <Text style={[styles.missionChipText, isSelected && styles.missionChipTextActive]} numberOfLines={1}>
                        {m.victim_name} ({m.headcount}p • {m.barangay || 'Sector'})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 5-Step Progress Tracker Strip */}
          <View style={styles.stepperProgressStrip}>
            {[
              { num: 1, label: 'En Route' },
              { num: 2, label: '20m Victim' },
              { num: 3, label: 'Re-Route' },
              { num: 4, label: '20m Shelter' },
              { num: 5, label: 'Standby' },
            ].map((step, idx) => {
              const isPast = step.num < currentSimulationStep;
              const isCurrent = step.num === currentSimulationStep;
              return (
                <React.Fragment key={step.num}>
                  <TouchableOpacity
                    style={[
                      styles.stepNode,
                      isCurrent && styles.stepNodeCurrent,
                      isPast && styles.stepNodePast,
                    ]}
                    onPress={() => handleTriggerStep(step.num)}
                    activeOpacity={0.8}
                  >
                    {isPast ? (
                      <Check size={12} color="#ffffff" />
                    ) : (
                      <Text style={[styles.stepNodeText, isCurrent && styles.stepNodeTextCurrent]}>
                        {step.num}
                      </Text>
                    )}
                  </TouchableOpacity>
                  {idx < 4 && (
                    <View
                      style={[
                        styles.stepConnector,
                        isPast && styles.stepConnectorPast,
                        isCurrent && styles.stepConnectorCurrent,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Current Step Focus Card */}
          <View style={styles.stepFocusCard}>
            <View style={styles.stepFocusHeaderRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberBadgeText}>STEP {currentSimulationStep} OF 5</Text>
              </View>
              <Text style={styles.stepFocusStageName}>
                {currentSimulationStep === 1 && 'ACCEPT & EN ROUTE'}
                {currentSimulationStep === 2 && '20M PROXIMITY GEOFENCE'}
                {currentSimulationStep === 3 && 'EXTRACT & RE-ROUTE'}
                {currentSimulationStep === 4 && '20M SHELTER GEOFENCE'}
                {currentSimulationStep === 5 && 'HANDOVER & STANDBY RESET'}
              </Text>
            </View>

            <Text style={styles.stepFocusDescription}>
              {currentSimulationStep === 1 &&
                'Accepts CDRRMO dispatch order. Calculates road/water navigation route to distress family and illuminates Amber polyline.'}
              {currentSimulationStep === 2 &&
                'Simulates vessel arriving within 15 meters of distress victim. Automatically triggers 20m Haversine geofence, camera fly-to, and updates status to on_scene.'}
              {currentSimulationStep === 3 &&
                'Victims safely secured onboard. Dynamically re-routes Mapbox navigation straight to the assigned Evacuation Center (Cyan polyline).'}
              {currentSimulationStep === 4 &&
                'Simulates vessel arriving within 15 meters of the shelter gate. Triggers shelter proximity geofence and displays Intake Handover modal.'}
              {currentSimulationStep === 5 &&
                'CSWDO shelter intake confirmed. Completes mission, clears route, and resets vehicle to Active Standby for next call.'}
            </Text>

            {/* Primary Action Button for Active Step */}
            <TouchableOpacity
              style={[
                styles.stepPrimaryActionBtn,
                currentSimulationStep === 1 && styles.btnBlue,
                currentSimulationStep === 2 && styles.btnAmber,
                currentSimulationStep === 3 && styles.btnCyan,
                currentSimulationStep === 4 && styles.btnIndigo,
                currentSimulationStep === 5 && styles.btnGreen,
              ]}
              onPress={() => handleTriggerStep(currentSimulationStep)}
              disabled={updateStatusMutation.isPending}
              activeOpacity={0.85}
            >
              {updateStatusMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  {currentSimulationStep === 1 && <Navigation size={17} color="#ffffff" />}
                  {currentSimulationStep === 2 && <MapPin size={17} color="#ffffff" />}
                  {currentSimulationStep === 3 && <Shield size={17} color="#ffffff" />}
                  {currentSimulationStep === 4 && <Building size={17} color="#ffffff" />}
                  {currentSimulationStep === 5 && <CheckCircle2 size={17} color="#ffffff" />}
                  <Text style={styles.stepPrimaryActionBtnText}>
                    {currentSimulationStep === 1 && '▶ 1. ACCEPT DISPATCH & EN ROUTE'}
                    {currentSimulationStep === 2 && '📍 2. TRIGGER 20M GEOFENCE (ARRIVED)'}
                    {currentSimulationStep === 3 && '🔄 3. EXTRACT & RE-ROUTE TO SHELTER'}
                    {currentSimulationStep === 4 && '🏢 4. TRIGGER 20M GEOFENCE (SHELTER)'}
                    {currentSimulationStep === 5 && '🏁 5. CONFIRM HANDOVER & STANDBY'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Step Telemetry Row */}
            <View style={styles.simTelemetryRow}>
              <Text style={styles.simTelemetryText}>
                🎯 Target: <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{activeTargetName}</Text> • Range:{' '}
                <Text style={{ color: distanceToTarget <= 20 ? '#34d399' : '#38bdf8', fontWeight: 'bold' }}>
                  {distanceToTarget}m {distanceToTarget <= 20 ? '(Geofence Active)' : ''}
                </Text>
              </Text>
            </View>
          </View>

          {/* Quick Utility Actions Footer */}
          <View style={styles.simFooterActionsRow}>
            <TouchableOpacity
              style={styles.simUtilityBtn}
              onPress={handleResetMissionToDispatched}
              activeOpacity={0.8}
            >
              <RotateCcw size={12} color="#94a3b8" />
              <Text style={styles.simUtilityBtnText}>Restart Step 1</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simUtilityBtn}
              onPress={resetSimulation}
              activeOpacity={0.8}
            >
              <Crosshair size={12} color="#38bdf8" />
              <Text style={styles.simUtilityBtnText}>Reset to Live GPS</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ─── BOTTOM MISSION CONTROL DOCK ─── */
        <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {currentMission ? (
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
                    {currentMission.status.toUpperCase()} • {currentMission.control_no}
                  </Text>
                </View>

                <View
                  style={[
                    styles.triageBadge,
                    currentMission.triage_level === 'critical'
                      ? styles.triageCritical
                      : styles.triageUrgent,
                  ]}
                >
                  <Text style={styles.triageBadgeText}>
                    {currentMission.triage_level?.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Target Details */}
              <View style={styles.dockTargetInfo}>
                <Text style={styles.dockTargetTitle} numberOfLines={1}>
                  {isTransportPhase
                    ? `🏢 Delivering to: ${activeTargetName}`
                    : `🚨 Extracting: ${currentMission.victim_name} (${currentMission.headcount} Persons)`}
                </Text>
                <Text style={styles.dockTargetSub} numberOfLines={1}>
                  {isTransportPhase
                    ? `Drop-off: CSWDO Intake Desk • Auto registration enabled`
                    : `Barangay: ${currentMission.barangay || 'Baliwasan'} • Needs: ${currentMission.special_needs || 'Standard evacuation'}`}
                </Text>
              </View>

              {/* Tactical Action Buttons Row */}
              <View style={styles.dockButtonsRow}>
                {!isTransportPhase && (
                  <>
                    <TouchableOpacity
                      style={[styles.dockBtn, styles.callBtn]}
                      onPress={() => handleCallVictim(currentMission.victim_phone)}
                    >
                      <Phone size={15} color={colors.white} />
                      <Text style={styles.dockBtnText}>Call Victim</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.dockBtn, styles.smsBtn]}
                      onPress={() =>
                        handleSmsVictim(
                          currentMission.victim_phone,
                          currentMission.victim_name,
                          currentMission.barangay
                        )
                      }
                    >
                      <MessageSquare size={15} color={colors.white} />
                      <Text style={styles.dockBtnText}>Quick SMS</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Status Advancement Primary CTA */}
                {currentMission.status === 'on_scene' && (
                  <TouchableOpacity
                    style={[styles.dockBtn, styles.transportBtn, { flex: 2 }]}
                    onPress={() =>
                      updateStatusMutation.mutate({
                        id: currentMission.id,
                        status: 'transporting',
                        target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                  >
                    <Shield size={16} color={colors.white} />
                    <Text style={styles.dockBtnTextBold}>START TRANSPORT TO SHELTER</Text>
                  </TouchableOpacity>
                )}

                {currentMission.status === 'transporting' && (
                  <TouchableOpacity
                    style={[styles.dockBtn, styles.completeBtn, { flex: 2 }]}
                    onPress={() => setShowShelterArrivalModal(true)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle2 size={16} color={colors.white} />
                    <Text style={styles.dockBtnTextBold}>INTAKE HANDOVER</Text>
                  </TouchableOpacity>
                )}

                {/* External Google Maps Button */}
                <TouchableOpacity
                  style={[styles.dockBtn, styles.externalBtn]}
                  onPress={handleOpenGoogleMaps}
                  accessibilityLabel="Open External Google Maps"
                >
                  <Navigation size={15} color="#94a3b8" />
                </TouchableOpacity>
              </View>
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
                {currentMission?.victim_name}
              </Text>
              . Mission status has been automatically transitioned to{' '}
              <Text style={{ fontWeight: '700', color: '#f59e0b' }}>ON SCENE</Text>.
            </Text>

            <View style={styles.arrivalDetailsBox}>
              <Text style={styles.arrivalDetailsLabel}>VULNERABILITY &amp; HEADCOUNT:</Text>
              <Text style={styles.arrivalDetailsVal}>
                👥 {currentMission?.headcount || 1} Persons • {currentMission?.special_needs || 'Standard evac'}
              </Text>
              <Text style={[styles.arrivalDetailsLabel, { marginTop: 6 }]}>SITUATION:</Text>
              <Text style={styles.arrivalDetailsVal}>
                &ldquo;{currentMission?.situation_description || 'Rising floodwaters'}&rdquo;
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalActionPrimaryBtn}
              onPress={() => {
                setShowVictimArrivalModal(false);
                // Prompt user to extract and commence transport
                updateStatusMutation.mutate({
                  id: currentMission.id,
                  status: 'transporting',
                  target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
                });
              }}
            >
              <Shield size={18} color={colors.white} />
              <Text style={styles.modalActionPrimaryText}>
                LOAD VICTIMS &amp; COMMENCE SHELTER TRANSPORT
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
                {currentMission?.target_shelter?.name || shelters[0]?.name || 'Baliwasan Gym'}
              </Text>
              . CSWDO intake staff are ready to accept {currentMission?.headcount || 1} evacuees.
            </Text>

            <View style={styles.arrivalDetailsBox}>
              <Text style={styles.arrivalDetailsLabel}>AUTOMATIC CSWDO INTAKE BRIDGE:</Text>
              <Text style={styles.arrivalDetailsVal}>
                • Automatically increments shelter occupancy (+{currentMission?.headcount || 1})
              </Text>
              <Text style={styles.arrivalDetailsVal}>
                • Registers {currentMission?.victim_name} in CSWDO intake ledger
              </Text>
              <Text style={styles.arrivalDetailsVal}>
                • Resets {assignedUnit?.name || 'Unit'} to STANDBY for next rescue
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalActionPrimaryBtn, { backgroundColor: '#10b981' }]}
              onPress={() => {
                setShowShelterArrivalModal(false);
                updateStatusMutation.mutate({
                  id: currentMission.id,
                  status: 'completed',
                  target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
                });
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
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
    backgroundColor: 'rgba(10, 15, 29, 0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  backBtnText: {
    color: colors.white,
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
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  standbyHudTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  standbyHudSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  mapStyleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 7,
    borderRadius: radii.sm,
  },

  maneuverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
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
    color: '#ffffff',
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
  },
  floatingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
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
    backgroundColor: 'rgba(10, 15, 29, 0.97)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  guidedSimCloseText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Multi-mission switcher */
  missionSwitcherBox: {
    marginBottom: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: radii.md,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  missionSwitcherLabel: {
    color: '#94a3b8',
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
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  missionChipActive: {
    backgroundColor: '#d97706',
    borderColor: '#f59e0b',
  },
  missionChipText: {
    color: '#cbd5e1',
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
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#475569',
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
    color: '#94a3b8',
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
    backgroundColor: '#334155',
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
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  stepFocusDescription: {
    color: '#94a3b8',
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
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
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
    color: colors.white,
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
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  dockTargetSub: {
    color: '#94a3b8',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#94a3b8',
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
    backgroundColor: '#1e293b',
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  arrivalSubtitle: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  arrivalDetailsBox: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  arrivalDetailsLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  arrivalDetailsVal: {
    color: '#ffffff',
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
    color: '#94a3b8',
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
});
