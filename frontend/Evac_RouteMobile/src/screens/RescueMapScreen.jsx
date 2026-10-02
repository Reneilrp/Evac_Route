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

// Ensure Mapbox access token is set immediately
if (MAPBOX_PUBLIC_TOKEN) {
  try {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  } catch (_e) {
    // Ignore in Expo Go
  }
}

// Haversine distance in meters
function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

// Mapbox Directions fetcher with turn-by-turn maneuvers
async function fetchMapboxNavigationRoute(startCoord, endCoord, token) {
  if (!startCoord || !endCoord) return null;
  if (token) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?geometries=geojson&overview=full&steps=true&access_token=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawSteps = route.legs?.[0]?.steps || [];
        const steps = rawSteps.map((s) => ({
          instruction: s.maneuver?.instruction || 'Proceed forward',
          distanceMeters: Math.round(s.distance || 0),
          type: s.maneuver?.type || 'straight',
          modifier: s.maneuver?.modifier || '',
        }));
        return {
          coordinates: route.geometry.coordinates,
          distanceMeters: Math.round(route.distance || 0),
          durationSeconds: Math.round(route.duration || 0),
          steps,
        };
      }
    } catch (e) {
      console.warn('[RescueMapScreen] Directions API failed, using fallback:', e);
    }
  }

  // Fallback direct tactical route
  const dist = getHaversineDistanceMeters(
    startCoord[1],
    startCoord[0],
    endCoord[1],
    endCoord[0]
  );
  return {
    coordinates: [startCoord, endCoord],
    distanceMeters: Math.round(dist),
    durationSeconds: Math.round(dist / 11),
    steps: [
      {
        instruction: 'Proceed direct tactical approach toward target',
        distanceMeters: Math.round(dist),
        type: 'straight',
        modifier: '',
      },
      {
        instruction: 'Arrive at destination point',
        distanceMeters: 0,
        type: 'arrive',
        modifier: '',
      },
    ],
  };
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
    unitsData?.[0] ||
    null;

  // Find target mission: by param ID or first assigned or first active
  const missionParamId = route?.params?.missionId;
  const currentMission = useMemo(() => {
    if (missionParamId) {
      const found = allActiveMissions.find((m) => m.id === missionParamId);
      if (found) return found;
    }
    if (assignedUnit) {
      const unitMission = allActiveMissions.find((m) => m.rescue_unit_id === assignedUnit.id);
      if (unitMission) return unitMission;
    }
    return allActiveMissions[0] || null;
  }, [allActiveMissions, missionParamId, assignedUnit]);

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
    return ZAMBOANGA_VICTIM_DEFAULT;
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
    return ZAMBOANGA_SHELTER_DEFAULT;
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
    const result = await fetchMapboxNavigationRoute(start, end, MAPBOX_PUBLIC_TOKEN);
    setIsLoadingRoute(false);
    if (result && result.coordinates?.length > 0) {
      setRouteData(result);
      setCurrentStepIndex(0);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      computeRoute(activeRescuerLocation, activeTargetLngLat);
    }, 0);
    return () => clearTimeout(timer);
  }, [computeRoute, activeRescuerLocation, activeTargetLngLat, isTransportPhase]);

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

    // 1. Proximity to Victim (≤ 20 meters during en_route)
    if (currentMission.status === 'en_route') {
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
    if (currentMission.status === 'transporting') {
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

  // Presentation Simulation Shortcuts
  const simulate20mToVictim = () => {
    // 15 meters offset from victim
    const sim = [victimLngLat[0] + 0.0001, victimLngLat[1] + 0.0001];
    hasTriggeredVictimArrival.current = false;
    setSimulatedLocation(sim);
  };

  const simulateTransportReRoute = () => {
    if (!currentMission) return;
    updateStatusMutation.mutate({
      id: currentMission.id,
      status: 'transporting',
      target_shelter_id: currentMission.target_shelter_id || shelters[0]?.id,
    });
  };

  const simulate20mToShelter = () => {
    // 15 meters offset from shelter
    const sim = [shelterLngLat[0] + 0.0001, shelterLngLat[1] + 0.0001];
    hasTriggeredShelterArrival.current = false;
    setSimulatedLocation(sim);
  };

  const resetSimulation = () => {
    setSimulatedLocation(null);
    hasTriggeredVictimArrival.current = false;
    hasTriggeredShelterArrival.current = false;
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
        {routeData?.coordinates && routeData.coordinates.length > 1 && (
          <Mapbox.ShapeSource
            id="rescue-map-route-source"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routeData.coordinates,
              },
            }}
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
        {victimLngLat && (
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
        {shelterLngLat && (
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

          <View style={styles.phaseBadge}>
            <Radio size={12} color="#34d399" />
            <Text style={styles.phaseBadgeText}>
              {isTransportPhase ? 'PHASE 2: SHELTER TRANSPORT' : 'PHASE 1: VICTIM EXTRACTION'}
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

      {/* ─── PRESENTATION DEMO TOOLBAR (COLLAPSIBLE) ─── */}
      {showDemoControls && (
        <View style={styles.demoToolbar}>
          <View style={styles.demoToolbarHeader}>
            <Text style={styles.demoToolbarTitle}>⚡ PRESENTATION DEMO SHORTCUTS</Text>
            <TouchableOpacity onPress={() => setShowDemoControls(false)}>
              <Text style={styles.demoCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.demoSubText}>
            Simulate proximity triggers for judges/evaluation without physical movement:
          </Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={[styles.demoBtn, styles.demoBtnAmber]}
              onPress={simulate20mToVictim}
            >
              <Text style={styles.demoBtnText}>1. Sim: 20m to Victim</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoBtn, styles.demoBtnCyan]}
              onPress={simulateTransportReRoute}
            >
              <Text style={styles.demoBtnText}>2. Extract &amp; Re-Route</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoBtn, styles.demoBtnGreen]}
              onPress={simulate20mToShelter}
            >
              <Text style={styles.demoBtnText}>3. Sim: 20m to Shelter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoBtn, styles.demoBtnDark]}
              onPress={resetSimulation}
            >
              <RotateCcw size={14} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── BOTTOM MISSION CONTROL DOCK ─── */}
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
  phaseBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
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

  /* ─── DEMO TOOLBAR ─── */
  demoToolbar: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 200,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#f59e0b',
    padding: spacing.sm,
  },
  demoToolbarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  demoToolbarTitle: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '900',
  },
  demoCloseText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  demoSubText: {
    color: '#cbd5e1',
    fontSize: 10,
    marginBottom: 8,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  demoBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBtnAmber: {
    backgroundColor: '#d97706',
  },
  demoBtnCyan: {
    backgroundColor: '#0284c7',
  },
  demoBtnGreen: {
    backgroundColor: '#059669',
  },
  demoBtnDark: {
    backgroundColor: '#334155',
    flex: 0.4,
  },
  demoBtnText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
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
