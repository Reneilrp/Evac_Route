import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, Linking, Alert, Platform } from 'react-native';
import { AlertTriangle, Navigation, Phone } from 'lucide-react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import api from '../services/api';
import styles from '../styles/EvacMapScreen.styles';
import { useResidentStore } from '../context/useResidentStore';

import {
  initDb,
  saveShelters,
  saveHazards,
  getOfflineShelters,
  getOfflineHazards,
  getOfflineNodes,
  getOfflineEdges,
  getDistanceMeters
} from '../services/offlineDb';
import { calculateOfflineRoute } from '../utils/astarRouter';

const { width, height } = Dimensions.get('window');

// Read Mapbox token from app.json extra config
const MAPBOX_TOKEN = Constants.expoConfig?.extra?.mapboxToken || '';
Mapbox.setAccessToken(MAPBOX_TOKEN);

export default function EvacMapScreen() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Local cache fallback state
  const [offlineShelters, setOfflineShelters] = useState([]);
  const [offlineHazards, setOfflineHazards] = useState([]);
  const [isOffline, setIsOffline] = useState(false);

  // Optimized in-memory Graph Caching and Route Throttle states
  const [preloadedGraph, setPreloadedGraph] = useState(null);
  const [cachedRoute, setCachedRoute] = useState(null);
  const [lastRoutingLocation, setLastRoutingLocation] = useState(null);
  const [isRouteBlocked, setIsRouteBlocked] = useState(false);

  // Read/write routing mode globally from Zustand store
  const transportationMode = useResidentStore(state => state.transportationMode || 'pedestrian');
  const setTransportationMode = useResidentStore(state => state.setTransportationMode);

  const lastHazardsRef = useRef(null);
  const lastShelterCoordsRef = useRef(null);

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

  // Poll Consolidated Resident Map Data every 5 seconds (active shelters + active hazards)
  const { data: mapData, isLoading: isLoadingMap, isError: isMapError } = useQuery({
    queryKey: ['resident-map-data'],
    queryFn: () => api.get('/resident/map-data').then(res => res.data),
    refetchInterval: 5000,
    retry: 1
  });

  const sheltersData = mapData?.shelters;
  const hazardsData = mapData?.hazards;
  const isLoadingShelters = isLoadingMap;

  // Sync cache and handle network status changes
  useEffect(() => {
    if (sheltersData) {
      saveShelters(sheltersData);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOfflineShelters(sheltersData);
      setIsOffline(false);
    }
  }, [sheltersData]);

  useEffect(() => {
    if (hazardsData) {
      saveHazards(hazardsData);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOfflineHazards(hazardsData);
      setIsOffline(false);
    }
  }, [hazardsData]);

  // Set offline indicator if network query fails
  useEffect(() => {
    if (isMapError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOffline(true);
    }
  }, [isMapError]);

  // Request GPS Permissions
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation([loc.coords.longitude, loc.coords.latitude]);
    })();
  }, []);

  // Combine live data with offline fallback
  const shelters = sheltersData && sheltersData.length > 0 ? sheltersData : offlineShelters;
  const hazards = hazardsData && hazardsData.length > 0 ? hazardsData : offlineHazards;

  // GEOGRAPHIC NEAREST OPEN SHELTER SELECTION (using Haversine)
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

  // DYNAMIC HAZARD-AVOIDING A* PATH ROUTER
  const nearestShelterCoords = nearestShelter
    ? [parseFloat(nearestShelter.longitude), parseFloat(nearestShelter.latitude)]
    : null;

  // Recalculate route only when location moves > 10m, nearest shelter changes, or hazards update
  useEffect(() => {
    if (!location || !nearestShelterCoords || !preloadedGraph) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCachedRoute(null);
      setLastRoutingLocation(null);
      return;
    }

    let shouldRecalculate = false;

    // Check if shelter or hazards changed
    const shelterChanged = JSON.stringify(nearestShelterCoords) !== JSON.stringify(lastShelterCoordsRef.current);
    const hazardsChanged = JSON.stringify(hazards) !== JSON.stringify(lastHazardsRef.current);

    if (shelterChanged || hazardsChanged || !lastRoutingLocation || !cachedRoute) {
      shouldRecalculate = true;
    } else {
      // Location changed. Check if user moved > 10 meters.
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
      
      if (result && result.status === 'success') {
         
      setCachedRoute(result.path);
        setIsRouteBlocked(false);
      } else {
        // Intercept failure: clear route lines and set blocked state
         
      setCachedRoute(null);
        setIsRouteBlocked(true);
      }
      
      setLastRoutingLocation(location);

      // Update refs
      lastHazardsRef.current = hazards;
      lastShelterCoordsRef.current = nearestShelterCoords;
    }
  }, [location, nearestShelterCoords, hazards, preloadedGraph, transportationMode]);

  if (!location || (isLoadingShelters && offlineShelters.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Acquiring GPS Signal...</Text>
      </View>
    );
  }

  const routeGeoJSON = cachedRoute ? {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: cachedRoute
        }
      }
    ]
  } : null;

  // Transform hazards into GeoJSON (handle both SQL 'lat'/'lng' and API 'latitude'/'longitude')
  const hazardsGeoJSON = {
    type: 'FeatureCollection',
    features: hazards.map(hazard => ({
      type: 'Feature',
      properties: {
        id: hazard.id,
        radius: parseFloat(hazard.radius_meters ?? 0)
      },
      geometry: {
        type: 'Point',
        coordinates: [
          parseFloat(hazard.longitude),
          parseFloat(hazard.latitude)
        ]
      }
    }))
  };

  // Launch external map application for turn-by-turn navigation
  const startNavigation = () => {
    if (!nearestShelter) return;
    const destLat = parseFloat(nearestShelter.latitude);
    const destLng = parseFloat(nearestShelter.longitude);
    const label = encodeURIComponent(nearestShelter.name);

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${destLat},${destLng}`,
      android: `geo:0,0?q=${destLat},${destLng}(${label})`
    }) || `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;

    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`);
        }
      })
      .catch(err => {
        Alert.alert('Navigation Error', 'Could not open maps application.');
      });
  };

  const callEmergencyHotline = () => {
    const phoneUrl = 'tel:911';
    Linking.canOpenURL(phoneUrl).then(supported => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Direct calling is not supported on this device.');
      }
    });
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.Dark}
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

        {/* Render Shelters */}
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
                <View style={[styles.innerPin, { backgroundColor: shelter.status === 'open' ? '#22c55e' : '#ef4444' }]} />
              </View>
            </Mapbox.PointAnnotation>
          );
        })}

        {/* Render Hazards using CircleLayer for GPU accelerated native shapes */}
        <Mapbox.ShapeSource id="hazardsSource" shape={hazardsGeoJSON}>
          <Mapbox.CircleLayer
            id="hazardsLayer"
            style={{
              // Interpolates radius relative to map zoom level to represent real-world meters
              circleRadius: [
                'interpolate',
                ['exponential', 2],
                ['zoom'],
                1, 1,
                15, ['/', ['get', 'radius'], 1.2],
                22, ['/', ['get', 'radius'], 0.01]
              ],
              circleColor: 'rgba(239, 68, 68, 0.4)',
              circleStrokeColor: 'rgba(239, 68, 68, 0.8)',
              circleStrokeWidth: 2,
            }}
          />
        </Mapbox.ShapeSource>

        {/* Render Navigation Route */}
        {routeGeoJSON && (
          <Mapbox.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <Mapbox.LineLayer
              id="routeLayer"
              style={{
                lineColor: '#eab308',
                lineWidth: 6,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {/* Critical Action Required Overlay */}
      {isRouteBlocked && (
        <View style={styles.criticalOverlay}>
          <Text style={styles.criticalTitle}>
            CRITICAL ACTION REQUIRED: No safe overland evacuation routes available for your current transportation mode. Move to the highest accessible level immediately and broadcast an emergency rescue signal.
          </Text>
          <TouchableOpacity style={styles.emergencyButton} onPress={callEmergencyHotline}>
            <Phone color="#fff" size={20} />
            <Text style={styles.emergencyButtonText}>Call Emergency Hotline</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Live Data Overlay / Offline Status Warning */}
      <View style={styles.overlay}>
        <View style={styles.statusBox}>
          {isOffline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineText}>OFFLINE MODE (Cached Data)</Text>
            </View>
          )}
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.statusText}>{openShelters.length} Shelters Open</Text>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.statusText}>{hazards.length} Active Hazards</Text>
          </View>

          {/* Dynamic route recalculation toggles */}
          <View style={styles.modeSelectorRow}>
            <TouchableOpacity 
              style={[styles.modeButton, transportationMode === 'pedestrian' && styles.modeButtonActive]}
              onPress={() => setTransportationMode('pedestrian')}
            >
              <Text style={[styles.modeButtonText, transportationMode === 'pedestrian' && styles.modeButtonTextActive]}>Pedestrian</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeButton, transportationMode === '2_wheel' && styles.modeButtonActive]}
              onPress={() => setTransportationMode('2_wheel')}
            >
              <Text style={[styles.modeButtonText, transportationMode === '2_wheel' && styles.modeButtonTextActive]}>2-Wheel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeButton, transportationMode === '4_wheel' && styles.modeButtonActive]}
              onPress={() => setTransportationMode('4_wheel')}
            >
              <Text style={[styles.modeButtonText, transportationMode === '4_wheel' && styles.modeButtonTextActive]}>4-Wheel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        {nearestShelter ? (
          <>
            <View style={styles.routingInfo}>
              <Text style={styles.destinationLabel}>NEAREST OPEN SHELTER:</Text>
              <Text style={styles.destinationName}>{nearestShelter.name}</Text>
              <Text style={styles.etaText}>
                Distance: {(minDistance / 1000).toFixed(2)} km (Avoiding Hazards)
              </Text>
            </View>
            <TouchableOpacity style={styles.routeButton} onPress={startNavigation}>
              <Navigation color="#fff" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.routeButtonText}>Start Navigation</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.warningBox}>
            <AlertTriangle color="#ef4444" size={24} />
            <Text style={styles.warningText}>No open shelters available at this time.</Text>
          </View>
        )}
      </View>
    </View>
  );
}
