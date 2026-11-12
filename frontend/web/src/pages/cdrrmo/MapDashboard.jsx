import React from "react";
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin, AlertTriangle, X, Cloud, Flame, Zap,
  ChevronRight, ChevronLeft, Moon, Satellite, Mountain,
  TriangleAlert, Droplets, Waves, Shield, SlidersHorizontal, Layers,
  Eye, Users, Building2, Search, ShieldAlert, CloudRain, Sun, Filter, Truck,
  Crosshair
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import ProactiveDisasterModal from '../../components/disaster/ProactiveDisasterModal';
import ZamboangaWeatherModal from '../../components/disaster/ZamboangaWeatherModal';
import ShelterFormModal from '../../components/map/modals/ShelterFormModal';
import ShelterEditModal from '../../components/map/modals/ShelterEditModal';
import ShelterViewModal from '../../components/map/modals/ShelterViewModal';
import HazardFormModal from '../../components/map/modals/HazardFormModal';
import HazardDetailModal from '../../components/map/modals/HazardDetailModal';
import LocalSimulationModal from '../../components/map/modals/LocalSimulationModal';
import MapViewer, { MAP_STYLES } from '../../components/map/MapViewer';
import MapTopNavigation, { ToolbarBtn } from '../../components/map/MapTopNavigation';
import MapLegend from '../../components/map/MapLegend';
import RiskAlertsDrawer from '../../components/map/RiskAlertsDrawer';
import UnifiedMapFilterSearch, { FloatingMapSearch } from '../../components/map/UnifiedMapFilterSearch';
export { FloatingMapSearch, UnifiedMapFilterSearch } from '../../components/map/UnifiedMapFilterSearch';
export { BARANGAY_COORDS } from '../../utils/mapHelper';
import { showSuccess, showError } from '../../utils/toast';
import {
  createCirclePolygon,
  createHazardRoadCorridorLine,
  getHaversineDistance,
  getPolylineLengthMeters,
  snapPointToRoadLines,
  sliceLineStringByDistance,
  traceRoadSegmentBetweenPoints,
  fetchMapboxRoadCorridor,
  ZAMBOANGA_CENTER,
  ZAMBOANGA_MAX_BOUNDS,
  ZAMBOANGA_MIN_ZOOM,
  ZAMBOANGA_MAX_ZOOM,
  getZamboangaIsolationMaskGeoJSON,
  getZamboangaBoundaryLineGeoJSON,
} from '../../utils/mapHelper';
import { runLocalSimulation } from '../../utils/hydrologySimulation';
import { buildSimulationRoadGeoJSON, getSimulationOverlayGeoJSON } from '../../utils/simulationGeoJson';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
export default function MapDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { darkMode, toggleDarkMode, setDarkMode } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCSWDO = user?.email?.toLowerCase().includes('logistics') || user?.email?.toLowerCase().includes('cswdo');
  // ─── 1-Tap UX Redirection from Incident Queue ───
  const focusLat = searchParams.get('focusLat');
  const focusLng = searchParams.get('focusLng');
  const incidentName = searchParams.get('incidentName');
  const incidentId = searchParams.get('incidentId');
  const incidentHazardType = searchParams.get('hazardType') || 'flood';
  const incidentSeverity = searchParams.get('severity') || 'medium';
  const isRecurringDrainage = searchParams.get('isRecurring') === '1';

  const [approvingIncident, setApprovingIncident] = useState(false);

  const initialFocusCoords = useMemo(() => {
    const lat = parseFloat(focusLat);
    const lng = parseFloat(focusLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { latitude: lat, longitude: lng };
    }
    return null;
  }, [focusLat, focusLng]);

  const [pinMode, setPinMode] = useState(() => (initialFocusCoords ? 'incident' : null));
  const [pendingLocation, setPendingLocation] = useState(() => initialFocusCoords);
  const [showShelterForm, setShowShelterForm] = useState(false);
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [selectedHazard, setSelectedHazard] = useState(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [showResidentSignals, setShowResidentSignals] = useState(false); // On-demand resident GPS layer
  const [activeMapFilter, setActiveMapFilter] = useState('all');

  const [mapStyle, setMapStyle] = useState(() => (darkMode ? 'dark' : 'terrain'));

  // Synchronize default map style with theme (Light -> Terrain, Dark -> Dark)
  useEffect(() => {
    setMapStyle(prev => {
      if (prev === 'dark' || prev === 'terrain') {
        return darkMode ? 'dark' : 'terrain';
      }
      return prev; // Preserve manual selection if user selected 'satellite'
    });
  }, [darkMode]);

  const [is3D, setIs3D] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    if (focusLat && focusLng) {
      const lat = parseFloat(focusLat);
      const lng = parseFloat(focusLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        setPinMode('incident');
        setPendingLocation({ longitude: lng, latitude: lat });

        const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
        if (map && map.flyTo) {
          map.flyTo({
            center: [lng, lat],
            zoom: 16.5,
            pitch: is3D ? 45 : 0,
            duration: 1200,
            essential: true
          });
        }
      }
    }
  }, [focusLat, focusLng, mapRef, is3D]);

  const [simulationGeoJSON, setSimulationGeoJSON] = useState(null);

  const [isDrawingRadius, setIsDrawingRadius] = useState(false);
  const [drawingRadiusMeters, setDrawingRadiusMeters] = useState(50);
  const [hazardPinGeometryMode, setHazardPinGeometryMode] = useState('circle'); // 'circle' | 'road_corridor'
  const [drawingCorridorCoords, setDrawingCorridorCoords] = useState(null);
  const corridorDebounceRef = useRef(null);

  const [drawingEnd, setDrawingEnd] = useState(null);
  const [showLocalSimulation, setShowLocalSimulation] = useState(false);
  const [simSetupState, setSimSetupState] = useState('idle'); // 'idle' | 'configuring' | 'placing' | 'processing' | 'rendered'
  const [selectedRadiusMeters, setSelectedRadiusMeters] = useState(2000); // Default 2km (2000m)
  const [simCenter, setSimCenter] = useState(null); // Coordinate { longitude, latitude }
  const [placementCoords, setPlacementCoords] = useState(null);
  const [simOverlayMode, setSimOverlayMode] = useState('flow'); // 'flow' | 'gradient'

  // Disaster Scenario Simulation States
  const [activeDisasterSim, setActiveDisasterSim] = useState('none'); // 'none' | 'flood' | 'siege' | 'fire' | 'chemical'

  // Live Road-Snapped Mission Corridors Cache (Mapbox Directions API)
  const [cachedMissionRoutes, setCachedMissionRoutes] = useState({});
  const activeRouteKeysRef = useRef(new Set());

  // Dynamic Resident GPS Device Simulation for Siege & Disaster Proximity Protocol
  const [simulatedResidentCoords, setSimulatedResidentCoords] = useState([122.084, 6.918]); // Default Tetuan [lng, lat]

  // 60-second inactivity timeout for inspect mode
  useEffect(() => {
    if (pinMode === 'inspect') {
      const timer = setTimeout(() => {
        setPinMode(null);
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [pinMode]);

  const handleSetLocalSimulation = useCallback((value) => {
    setShowLocalSimulation(value);
    if (value) {
      setSimSetupState('configuring');
    } else {
      setSimSetupState('idle');
      setSimCenter(null);
      setSimulationGeoJSON(null);
      setPlacementCoords(null);
      if (pinMode === 'sim-placement') {
        setPinMode(null);
      }
    }
  }, [pinMode]);

  const runSimulationFlow = useCallback((lng, lat, radius) => {
    runLocalSimulation(lng, lat, radius, MAPBOX_TOKEN, (geoJSON) => {
      setSimulationGeoJSON(geoJSON);
      setSimSetupState('rendered');
      setPinMode(null);
    });
  }, []);

  const handleRecenterToZamboanga = useCallback(() => {
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (map && map.flyTo) {
      map.flyTo({
        center: [ZAMBOANGA_CENTER.longitude, ZAMBOANGA_CENTER.latitude],
        zoom: ZAMBOANGA_CENTER.zoom,
        pitch: is3D ? 45 : 0,
        bearing: -15,
        duration: 1400,
        essential: true,
      });
    }
  }, [is3D]);

  const handleSelectMapLocation = useCallback((item) => {
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (map && item.coords) {
      map.flyTo({
        center: item.coords,
        zoom: item.type === 'shelter' || item.type === 'hazard' ? 16.5 : 15,
        pitch: is3D ? 45 : 0,
        duration: 1800,
        essential: true,
      });
      if (item.shelter) {
        if (activeMapFilter !== 'all' && activeMapFilter !== 'shelters') {
          setActiveMapFilter('all');
        }
        setSelectedShelter(item.shelter);
      }
      if (item.hazard) {
        if (activeMapFilter === 'shelters' || activeMapFilter === 'rescue_units') {
          setActiveMapFilter('all');
        }
        setSelectedHazard(item.hazard);
      }
    }
  }, [is3D, activeMapFilter]);

  const { data: roadNetwork } = useQuery({
    queryKey: ['road-network'],
    queryFn: () => api.get('/road-network').then(r => r.data),
    staleTime: Infinity,
  });

  const getNearbyRoadLineStrings = useCallback((lng, lat) => {
    const lines = [];
    if (roadNetwork?.edges) {
      for (const edge of roadNetwork.edges) {
        let coords = edge.geometry;
        if (typeof coords === 'string') {
          try { coords = JSON.parse(coords); } catch { coords = null; }
        }
        if (Array.isArray(coords) && coords.length >= 2) {
          lines.push(coords);
        }
      }
    }
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (map && typeof map.project === 'function' && typeof map.queryRenderedFeatures === 'function') {
      try {
        const pt = map.project([lng, lat]);
        const bbox = [
          [pt.x - 160, pt.y - 160],
          [pt.x + 160, pt.y + 160],
        ];
        const rendered = map.queryRenderedFeatures(bbox);
        for (const feat of rendered) {
          const layerId = (feat.layer?.id || '').toLowerCase();
          const sourceLayer = (feat.sourceLayer || '').toLowerCase();
          const isRoad =
            sourceLayer.includes('road') ||
            layerId.includes('road') ||
            layerId.includes('street') ||
            layerId.includes('highway') ||
            layerId.includes('bridge') ||
            layerId.includes('tunnel');
          if (!isRoad) continue;
          if (feat.geometry?.type === 'LineString' && feat.geometry.coordinates?.length >= 2) {
            lines.push(feat.geometry.coordinates);
          } else if (feat.geometry?.type === 'MultiLineString' && Array.isArray(feat.geometry.coordinates)) {
            for (const subLine of feat.geometry.coordinates) {
              if (Array.isArray(subLine) && subLine.length >= 2) {
                lines.push(subLine);
              }
            }
          }
        }
      } catch {
        // Ignore if map style not yet ready
      }
    }
    return lines;
  }, [roadNetwork, mapRef]);

  const handleMapMouseMove = useCallback((e) => {
    if (pinMode === 'hazard' && pendingLocation && isDrawingRadius) {
      if (hazardPinGeometryMode === 'road_corridor') {
        const startPt = [pendingLocation.longitude, pendingLocation.latitude];
        const cursorPt = [e.lngLat.lng, e.lngLat.lat];
        const nearbyRoads = getNearbyRoadLineStrings(e.lngLat.lng, e.lngLat.lat);
        const snappedEnd = snapPointToRoadLines(cursorPt, nearbyRoads, 350);
        const effectiveEndPt = snappedEnd ? snappedEnd.snappedPoint : cursorPt;

        setDrawingEnd({ longitude: effectiveEndPt[0], latitude: effectiveEndPt[1] });

        const localTrace = traceRoadSegmentBetweenPoints(startPt, effectiveEndPt, nearbyRoads);
        if (localTrace && localTrace.length >= 2) {
          setDrawingCorridorCoords(localTrace);
          const len = Math.round(getPolylineLengthMeters(localTrace));
          setDrawingRadiusMeters(Math.max(10, Math.min(5000, len)));
        }

        if (corridorDebounceRef.current) clearTimeout(corridorDebounceRef.current);
        corridorDebounceRef.current = setTimeout(() => {
          fetchMapboxRoadCorridor(startPt, effectiveEndPt, MAPBOX_TOKEN, nearbyRoads).then((res) => {
            if (res && res.coordinates?.length >= 2) {
              setDrawingCorridorCoords(res.coordinates);
              setDrawingRadiusMeters(Math.max(10, Math.min(5000, res.distanceMeters)));
              const lastCoord = res.coordinates[res.coordinates.length - 1];
              setDrawingEnd({ longitude: lastCoord[0], latitude: lastCoord[1] });
            }
          });
        }, 120);
      } else {
        const distance = getHaversineDistance(
          { lat: pendingLocation.latitude, lng: pendingLocation.longitude },
          e.lngLat
        );
        setDrawingRadiusMeters(Math.max(10, Math.min(5000, Math.round(distance))));
        setDrawingEnd({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
      }
    } else if (pinMode === 'sim-placement') {
      setPlacementCoords({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
    }
  }, [pinMode, pendingLocation, isDrawingRadius, hazardPinGeometryMode, getNearbyRoadLineStrings]);

  const inspectLocation = useCallback((lng, lat) => {
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (!map || !map.flyTo) return;

    // Direct, smooth zoom in only (3D sweep completely removed)
    map.flyTo({
      center: [lng, lat],
      zoom: 17,
      pitch: is3D ? 45 : 0,
      bearing: is3D ? -15 : 0,
      duration: 1200,
      essential: true,
    });
  }, [mapRef, is3D]);



  const [simulationMode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isProactiveModalOpen, setIsProactiveModalOpen] = useState(false);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [showShelters, setShowShelters] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showRoadNetwork, setShowRoadNetwork] = useState(true);
  const [showRescueUnits, setShowRescueUnits] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [isolateZamboanga, setIsolateZamboanga] = useState(true);
  const [showBarangayBoundaries, setShowBarangayBoundaries] = useState(true);

  const { data: dashboardData } = useQuery({
    queryKey: ['map-dashboard'],
    queryFn: () => api.get('/map/dashboard').then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: activeRescueMissions = [] } = useQuery({
    queryKey: ['active-rescue-missions'],
    queryFn: () => api.get('/rescue/missions?active_only=1').then(r => r.data.data || []),
    refetchInterval: 3000,
  });

  const { data: rescueUnits = [] } = useQuery({
    queryKey: ['rescue-units-fleet'],
    queryFn: () => api.get('/rescue/units').then(r => r.data.data || []),
    refetchInterval: 3000,
  });

  // Live OpenWeather & continuous rainfall telemetry for Zamboanga City
  const { data: weatherTelemetry } = useQuery({
    queryKey: ['weather/live-status'],
    queryFn: () => api.get('/weather/live-status').then(r => r.data?.data),
    refetchInterval: 30000,
  });

  // Asynchronously query Mapbox Directions API for active rescue mission corridors
  useEffect(() => {
    if (!showRescueUnits || !activeRescueMissions || activeRescueMissions.length === 0 || !MAPBOX_TOKEN) return;

    activeRescueMissions.forEach((mission) => {
      if (!['en_route', 'transporting'].includes(mission.status)) return;
      const unit = mission.rescue_unit;
      const uLat = parseFloat(unit?.current_latitude);
      const uLng = parseFloat(unit?.current_longitude);
      if (isNaN(uLat) || isNaN(uLng)) return;

      let targetLng, targetLat;
      if (mission.status === 'transporting' && mission.target_shelter) {
        targetLat = parseFloat(mission.target_shelter.latitude);
        targetLng = parseFloat(mission.target_shelter.longitude);
      } else if (mission.victim_latitude && mission.victim_longitude) {
        targetLat = parseFloat(mission.victim_latitude);
        targetLng = parseFloat(mission.victim_longitude);
      }
      if (!targetLat || !targetLng || isNaN(targetLat) || isNaN(targetLng)) return;

      const cacheKey = `${mission.id}_${uLng.toFixed(4)},${uLat.toFixed(4)}->${targetLng.toFixed(4)},${targetLat.toFixed(4)}`;
      if (activeRouteKeysRef.current.has(cacheKey)) return;

      activeRouteKeysRef.current.add(cacheKey);

      fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${uLng},${uLat};${targetLng},${targetLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.code === 'Ok' && data.routes && data.routes[0]?.geometry?.coordinates) {
            setCachedMissionRoutes((prev) => ({
              ...prev,
              [mission.id]: data.routes[0].geometry.coordinates,
            }));
          }
        })
        .catch(() => {
          // Keep resilient street-grid fallback
        });
    });
  }, [showRescueUnits, activeRescueMissions]);

  const missionRoutesGeoJSON = useMemo(() => {
    if (!showRescueUnits || !activeRescueMissions || activeRescueMissions.length === 0) return null;
    const features = [];

    const isInZamboanga = (lng, lat) => lat >= 6.75 && lat <= 7.30 && lng >= 121.85 && lng <= 122.35;

    activeRescueMissions.forEach((mission) => {
      // 1. Only show active navigation route line when unit is ACTIVELY en route or transporting
      // (Do NOT draw premature line if unit is still on dispatched or standby)
      if (!['en_route', 'transporting'].includes(mission.status)) return;

      const unit = mission.rescue_unit;
      const uLat = parseFloat(unit?.current_latitude);
      const uLng = parseFloat(unit?.current_longitude);
      if (isNaN(uLat) || isNaN(uLng)) return;
      if (!isInZamboanga(uLng, uLat)) return;

      let targetLng, targetLat, targetName;
      if (mission.status === 'transporting' && mission.target_shelter) {
        targetLat = parseFloat(mission.target_shelter.latitude);
        targetLng = parseFloat(mission.target_shelter.longitude);
        targetName = mission.target_shelter.name || 'Shelter';
      } else if (mission.victim_latitude && mission.victim_longitude) {
        targetLat = parseFloat(mission.victim_latitude);
        targetLng = parseFloat(mission.victim_longitude);
        targetName = mission.victim_name || 'Victim in Distress';
      }

      // 2. Reject coordinates outside Zamboanga City (e.g. Android Emulator default Mountain View, California)
      if (!targetLat || !targetLng || isNaN(targetLat) || isNaN(targetLng)) return;
      if (!isInZamboanga(targetLng, targetLat)) return;

      // Road-snapped geometry: Uses cached Mapbox route or orthogonal street-grid corner instead of diagonal straight cut
      const cachedCoords = cachedMissionRoutes[mission.id];
      const coords = (cachedCoords && cachedCoords.length > 1)
        ? cachedCoords
        : [
            [uLng, uLat],
            [targetLng, uLat],
            [targetLng, targetLat],
          ];

      features.push({
        type: 'Feature',
        properties: {
          missionId: mission.id,
          controlNo: mission.control_no,
          unitCallSign: unit.call_sign || unit.name,
          status: mission.status,
          targetName,
        },
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      });
    });

    if (features.length === 0) return null;
    return {
      type: 'FeatureCollection',
      features,
    };
  }, [showRescueUnits, activeRescueMissions, cachedMissionRoutes]);

  const shelters = useMemo(() => dashboardData?.shelters ?? [], [dashboardData?.shelters]);
  const hazards = useMemo(() => dashboardData?.hazards ?? [], [dashboardData?.hazards]);
  const demographics = useMemo(() => dashboardData?.demographics ?? [], [dashboardData?.demographics]);

  const nearestShelterToResident = useMemo(() => {
    if (!shelters || shelters.length === 0 || !simulatedResidentCoords) return null;
    let minDistance = Infinity;
    let closest = null;

    const availableShelters = shelters.filter(s => s.status === 'open' || !s.status);
    const targetList = availableShelters.length > 0 ? availableShelters : shelters;

    targetList.forEach(s => {
      const sLat = parseFloat(s.latitude);
      const sLng = parseFloat(s.longitude);
      if (!isNaN(sLat) && !isNaN(sLng)) {
        const R = 6371e3;
        const φ1 = (simulatedResidentCoords[1] * Math.PI) / 180;
        const φ2 = (sLat * Math.PI) / 180;
        const Δφ = ((sLat - simulatedResidentCoords[1]) * Math.PI) / 180;
        const Δλ = ((sLng - simulatedResidentCoords[0]) * Math.PI) / 180;
        const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        if (dist < minDistance) {
          minDistance = dist;
          closest = { ...s, distanceMeters: dist };
        }
      }
    });
    return closest;
  }, [shelters, simulatedResidentCoords]);

  const residentDistanceKm = nearestShelterToResident ? (nearestShelterToResident.distanceMeters / 1000).toFixed(2) : '0.00';
  const isResidentNearShelter = nearestShelterToResident && nearestShelterToResident.distanceMeters <= 1500;

  const filteredSheltersForView = useMemo(() => {
    if (activeDisasterSim === 'none') return shelters;

    if (activeDisasterSim === 'flood') {
      return shelters.filter(s => s.facility_type === 'safe_zone' || s.facility_type === 'evacuation_center' || !s.facility_type);
    }
    if (activeDisasterSim === 'siege') {
      return shelters.filter(s => s.facility_type === 'police_station' || s.facility_type === 'military_base');
    }
    if (activeDisasterSim === 'fire') {
      return shelters.filter(s => s.facility_type === 'fire_station' || s.facility_type === 'assembly_point' || s.facility_type === 'evacuation_center');
    }
    if (activeDisasterSim === 'chemical') {
      return shelters.filter(s => s.facility_type === 'hospital' || s.facility_type === 'safe_zone');
    }
    if (activeDisasterSim === 'earthquake') {
      return shelters.filter(s => s.facility_type === 'safe_zone' || s.facility_type === 'assembly_point' || s.facility_type === 'evacuation_center');
    }

    return shelters;
  }, [shelters, activeDisasterSim]);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const isModalOpen = !!(selectedHazard || selectedShelter || showShelterForm || showHazardForm || isDeleteConfirmOpen);
  const isModalOpenRef = useRef(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  // Handle Escape key to cleanly dismiss open modals or cancel active pin/draw modes
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (pinMode) setPinMode(null);
        if (pendingLocation) setPendingLocation(null);
        if (showShelterForm) setShowShelterForm(false);
        if (showHazardForm) setShowHazardForm(false);
        if (selectedHazard) setSelectedHazard(null);
        if (selectedShelter) setSelectedShelter(null);
        if (isDeleteConfirmOpen) setIsDeleteConfirmOpen(false);
        if (layersOpen) setLayersOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    pinMode, pendingLocation, showShelterForm, showHazardForm,
    selectedHazard, selectedShelter, isDeleteConfirmOpen, layersOpen
  ]);

  const addShelterMutation = useMutation({
    mutationFn: (data) => api.post('/shelters', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      setPinMode(null);
      setPendingLocation(null);
      setShowShelterForm(false);
      showSuccess('Shelter created successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to add shelter.');
    }
  });
  const addHazardMutation = useMutation({
    mutationFn: (data) => api.post('/hazards', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      setPinMode(null);
      setPendingLocation(null);
      setShowHazardForm(false);
      showSuccess('Hazard zone created successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to add hazard zone.');
    }
  });
  const updateShelterMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/shelters/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      setSelectedShelter(null);
      showSuccess('Shelter updated successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to update shelter.');
    }
  });
  const deleteShelterMutation = useMutation({
    mutationFn: (id) => api.delete(`/shelters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      setSelectedShelter(null);
      showSuccess('Shelter deleted successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to delete shelter.');
    }
  });
  const resolveHazardMutation = useMutation({
    mutationFn: (id) => api.put(`/hazards/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      setSelectedHazard(null);
      showSuccess('Hazard resolved successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to resolve hazard.');
    }
  });

  const handleMapClick = (e) => {
    if (isCSWDO) return; // View-only mode for CSWDO: no pinning or drawing
    if (pinMode) {
      if (pinMode === 'inspect') {
        inspectLocation(e.lngLat.lng, e.lngLat.lat);
        setPinMode(null);
      } else if (pinMode === 'sim-placement') {
        setPinMode(null);
        setSimCenter({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
        setSimSetupState('processing');
        runSimulationFlow(e.lngLat.lng, e.lngLat.lat, selectedRadiusMeters);
      } else if (pinMode === 'shelter') {
        setPendingLocation({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
        setShowShelterForm(true);
      } else if (pinMode === 'hazard') {
        if (!isDrawingRadius) {
          if (hazardPinGeometryMode === 'road_corridor') {
            const nearbyRoads = getNearbyRoadLineStrings(e.lngLat.lng, e.lngLat.lat);
            const snapped = snapPointToRoadLines([e.lngLat.lng, e.lngLat.lat], nearbyRoads, 350);
            const startLng = snapped ? snapped.snappedPoint[0] : e.lngLat.lng;
            const startLat = snapped ? snapped.snappedPoint[1] : e.lngLat.lat;

            setPendingLocation({ longitude: startLng, latitude: startLat });
            setDrawingRadiusMeters(50);
            setDrawingEnd({ longitude: startLng, latitude: startLat });

            if (snapped) {
              const initialSlice = sliceLineStringByDistance(
                snapped.lineCoords,
                Math.max(0, snapped.distanceAlongLine - 25),
                Math.min(snapped.totalLineLength, snapped.distanceAlongLine + 25)
              );
              setDrawingCorridorCoords(initialSlice?.length >= 2 ? initialSlice : null);
            } else {
              setDrawingCorridorCoords(null);
            }
            setIsDrawingRadius(true);
          } else {
            // Circle mode: First click sets disaster center point and starts stretching circle radius
            setPendingLocation({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
            setDrawingRadiusMeters(50);
            setDrawingCorridorCoords(null);
            setDrawingEnd({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
            setIsDrawingRadius(true);
          }
        } else {
          // Second click: Lock in the boundary/corridor and open the hazard details modal
          if (corridorDebounceRef.current) clearTimeout(corridorDebounceRef.current);
          if (hazardPinGeometryMode === 'road_corridor' && pendingLocation) {
            const startPt = [pendingLocation.longitude, pendingLocation.latitude];
            const endPt = [e.lngLat.lng, e.lngLat.lat];
            const nearbyRoads = getNearbyRoadLineStrings(e.lngLat.lng, e.lngLat.lat);
            fetchMapboxRoadCorridor(startPt, endPt, MAPBOX_TOKEN, nearbyRoads).then((res) => {
              if (res && res.coordinates?.length >= 2) {
                setDrawingCorridorCoords(res.coordinates);
                setDrawingRadiusMeters(Math.max(10, Math.min(5000, res.distanceMeters)));
              }
            });
          }
          setIsDrawingRadius(false);
          setShowHazardForm(true);
        }
      } else if (pinMode === 'resident') {
        setSimulatedResidentCoords([e.lngLat.lng, e.lngLat.lat]);
        setPinMode(null);
      } else if (pinMode === 'incident') {
        // Inspecting an incident pin - clicking on map does not cancel unless closed
        return;
      }
    }
  };
  const handleCancelPin = () => { 
    if (corridorDebounceRef.current) clearTimeout(corridorDebounceRef.current);
    setPinMode(null); 
    setPendingLocation(null); 
    setIsDrawingRadius(false);
    setDrawingRadiusMeters(50);
    setDrawingCorridorCoords(null);
    setDrawingEnd(null);
    setShowShelterForm(false); 
    setShowHazardForm(false); 
    if (simSetupState === 'placing') {
      setSimSetupState('configuring');
      setPlacementCoords(null);
    }
    if (searchParams.has('focusLat') || searchParams.has('focusLng')) {
      setSearchParams(new URLSearchParams());
    }
  };
  const handleConfirmShelter = ({ name, max_capacity }) => addShelterMutation.mutate({ name, latitude: pendingLocation.latitude, longitude: pendingLocation.longitude, max_capacity });
  const handleConfirmHazard = ({ name, radius_meters, geometry_type, corridor_coordinates, hazard_type, severity_level, estimated_duration_hours, is_fixed_flood_spot }) => addHazardMutation.mutate({ name, latitude: pendingLocation.latitude, longitude: pendingLocation.longitude, radius_meters, geometry_type, corridor_coordinates, hazard_type, severity_level, estimated_duration_hours, is_fixed_flood_spot });
  const handleUpdateShelter = (data) => updateShelterMutation.mutate({ id: selectedShelter.id, data });
  const handleDeleteShelter = () => setIsDeleteConfirmOpen(true);
  const handleConfirmDeleteShelter = () => {
    if (selectedShelter) {
      deleteShelterMutation.mutate(selectedShelter.id);
      setIsDeleteConfirmOpen(false);
    }
  };
  const handleResolveHazard = () => resolveHazardMutation.mutate(selectedHazard.id);

  const handleApproveIncidentOnMap = async (asFixedSpot = false) => {
    if (!incidentId) return;
    setApprovingIncident(true);
    try {
      await api.post(`/incidents/${incidentId}/approve`, {
        is_fixed_flood_spot: asFixedSpot,
        radius_meters: asFixedSpot ? 350 : 100,
        hazard_type: incidentHazardType,
        severity_level: incidentSeverity,
        note: asFixedSpot
          ? 'Approved directly from Live Map as weather-triggered chronic flood spot.'
          : 'Approved directly from Live Map as active hazard zone.',
      });
      showSuccess(
        asFixedSpot
          ? '✓ Incident approved & promoted as Chronic Drainage Flood Spot!'
          : '✓ Incident approved & promoted to Active Hazard!'
      );
      queryClient.invalidateQueries(['mapDashboard']);
      queryClient.invalidateQueries(['hazards']);
      queryClient.invalidateQueries(['incidents']);
      handleCancelPin();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to approve incident');
    } finally {
      setApprovingIncident(false);
    }
  };

  const handleRejectIncidentOnMap = async () => {
    if (!incidentId) return;
    const reason = window.prompt('Enter reason for rejecting this incident report:');
    if (!reason) return;
    setApprovingIncident(true);
    try {
      await api.post(`/incidents/${incidentId}/reject`, {
        note: reason,
      });
      showSuccess('Incident report rejected.');
      queryClient.invalidateQueries(['incidents']);
      handleCancelPin();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reject incident');
    } finally {
      setApprovingIncident(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative bg-slate-100 dark:bg-gray-950 transition-colors duration-200">
      {showShelterForm && pendingLocation && <ShelterFormModal location={pendingLocation} onConfirm={handleConfirmShelter} onCancel={handleCancelPin} isLoading={addShelterMutation.isPending} />}
      {showHazardForm && pendingLocation && (
        <HazardFormModal 
          location={pendingLocation} 
          initialRadius={drawingRadiusMeters}
          initialGeometryType={hazardPinGeometryMode}
          initialCorridorCoords={drawingCorridorCoords}
          onConfirm={handleConfirmHazard} 
          onCancel={handleCancelPin} 
          isLoading={addHazardMutation.isPending} 
        />
      )}
      {selectedShelter && (
        isCSWDO ? (
          <ShelterViewModal
            shelter={selectedShelter}
            onCancel={() => setSelectedShelter(null)}
            onNavigateShelter={() => {
              setSelectedShelter(null);
              navigate('/admin/shelters', { state: { search: selectedShelter.name } });
            }}
          />
        ) : (
          <ShelterEditModal
            shelter={selectedShelter}
            onUpdate={handleUpdateShelter}
            onDelete={handleDeleteShelter}
            onCancel={() => setSelectedShelter(null)}
            isLoading={updateShelterMutation.isPending || deleteShelterMutation.isPending}
          />
        )
      )}
      {selectedHazard && (
        <HazardDetailModal
          hazard={selectedHazard}
          readOnly={isCSWDO}
          onResolve={handleResolveHazard}
          onCancel={() => setSelectedHazard(null)}
          isLoading={resolveHazardMutation.isPending}
        />
      )}

      <MapTopNavigation
        isCSWDO={isCSWDO}
        shelters={shelters}
        hazards={hazards}
        rescueUnits={rescueUnits}
        activeRescueMissions={activeRescueMissions}
        activeMapFilter={activeMapFilter}
        setActiveMapFilter={setActiveMapFilter}
        showRoadNetwork={showRoadNetwork}
        setShowRoadNetwork={setShowRoadNetwork}
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        showWeather={showWeather}
        setShowWeather={setShowWeather}
        isolateZamboanga={isolateZamboanga}
        setIsolateZamboanga={setIsolateZamboanga}
        showBarangayBoundaries={showBarangayBoundaries}
        setShowBarangayBoundaries={setShowBarangayBoundaries}
        handleSelectMapLocation={handleSelectMapLocation}
        handleRecenterToZamboanga={handleRecenterToZamboanga}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        weatherTelemetry={weatherTelemetry}
        setIsWeatherModalOpen={setIsWeatherModalOpen}
        pinMode={pinMode}
        setPinMode={setPinMode}
        handleCancelPin={handleCancelPin}
        setIsProactiveModalOpen={setIsProactiveModalOpen}
        activeDisasterSim={activeDisasterSim}
        setActiveDisasterSim={setActiveDisasterSim}
        queryClient={queryClient}
      />
      <div className="flex-1 relative overflow-hidden">
        {/* Top-Center Floating Banners Stack (Collision-Free Vertical Flow) */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2.5 max-w-[96vw] pointer-events-none [&>*]:pointer-events-auto">
          {/* 1. Pin Mode Action Banner */}
          {pinMode && !isCSWDO && (
            <div className="bg-blue-600/95 backdrop-blur-md border border-blue-500/50 text-white rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <div className="text-xs">
                {pinMode === 'incident' ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-300 uppercase tracking-wide">📍 Incident Report:</span>{' '}
                      <span className="font-bold text-white max-w-[200px] truncate">{incidentName || 'Reported Incident'}</span>
                      {focusLat && focusLng && (
                        <span className="font-mono text-[11px] text-blue-100 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-400/30">
                          [{parseFloat(focusLat).toFixed(4)}, {parseFloat(focusLng).toFixed(4)}]
                        </span>
                      )}
                      {isRecurringDrainage && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse">
                          🌧️ Chronic Drainage
                        </span>
                      )}
                    </div>

                    {incidentId && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          disabled={approvingIncident}
                          onClick={() => handleApproveIncidentOnMap(true)}
                          className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                          title="Promote directly as Weather-Triggered Fixed Flood Spot"
                        >
                          ⚡ Pin Chronic Flood Spot
                        </button>
                        <button
                          type="button"
                          disabled={approvingIncident}
                          onClick={() => handleApproveIncidentOnMap(false)}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                          title="Promote directly as Active Hazard Zone"
                        >
                          🚨 Pin Active Hazard
                        </button>
                        <button
                          type="button"
                          disabled={approvingIncident}
                          onClick={handleRejectIncidentOnMap}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-red-200 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate('/admin/incidents')}
                      className="px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      ← Back to Review Queue
                    </button>
                  </div>
                ) : pinMode === 'shelter' ? (
                  <span>📍 <strong className="font-black tracking-wide uppercase">Pinning Shelter:</strong> Click anywhere on the map to place a new evacuation shelter.</span>
                ) : pinMode === 'hazard' ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {/* 2-Mode Hazard Pinning Switcher */}
                    <div className="flex items-center bg-black/30 p-0.5 rounded-xl border border-white/20 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setHazardPinGeometryMode('circle');
                          setIsDrawingRadius(false);
                          setPendingLocation(null);
                          setDrawingCorridorCoords(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer ${
                          hazardPinGeometryMode === 'circle'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'text-white/75 hover:text-white'
                        }`}
                      >
                        <span>⭕</span>
                        <span>Circle Radius</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHazardPinGeometryMode('road_corridor');
                          setIsDrawingRadius(false);
                          setPendingLocation(null);
                          setDrawingCorridorCoords(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer ${
                          hazardPinGeometryMode === 'road_corridor'
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'text-white/75 hover:text-white'
                        }`}
                      >
                        <span>🛣️</span>
                        <span>Road Path</span>
                      </button>
                    </div>

                    {isDrawingRadius ? (
                      hazardPinGeometryMode === 'road_corridor' ? (
                        <span>
                          🛣️ <strong className="font-black tracking-wide uppercase">Trace Highway / Road Corridor:</strong> Move cursor along the road (Current: <strong className="text-yellow-300 font-bold">{drawingRadiusMeters}m on road</strong>), then click again to lock road segment.
                        </span>
                      ) : (
                        <span>
                          ⭕ <strong className="font-black tracking-wide uppercase">Define Circle Radius:</strong> Move mouse outward to stretch the circle (Current: <strong className="text-yellow-300 font-bold">{drawingRadiusMeters}m radius</strong>), then click again to lock boundary.
                        </span>
                      )
                    ) : hazardPinGeometryMode === 'road_corridor' ? (
                      <span>
                        🛣️ <strong className="font-black tracking-wide uppercase">Road Corridor Mode:</strong> Click on any road or highway to snap the start of the blocked road path.
                      </span>
                    ) : (
                      <span>
                        ⭕ <strong className="font-black tracking-wide uppercase">Circle Radius Mode:</strong> Click on the map to mark the center of the circular hazard zone.
                      </span>
                    )}
                  </div>
                ) : (
                  <span>🔍 <strong className="font-black tracking-wide uppercase">Tactical Inspection Active:</strong> Click any location on the map to zoom in and inspect.</span>
                )}
              </div>
              <button
                onClick={handleCancelPin}
                title="Cancel Pin Mode (Esc)"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white/80 hover:text-white transition flex items-center justify-center cursor-pointer shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* 2. Resident Perspective Simulation Banner Overlay */}
          {activeDisasterSim !== 'none' && !isCSWDO && (
            <div className="bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500 text-white rounded-2xl px-5 py-2.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="flex h-3 w-3 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div className="text-xs font-bold">
                {activeDisasterSim === 'flood' ? (
                  <span>🌊 <strong className="text-blue-400">FLOOD SIMULATION MODE ACTIVE:</strong> Showing Flood Evacuation Centers &amp; High-Ground Safe Zones (🛡️ 45m Elevation).</span>
                ) : activeDisasterSim === 'siege' ? (
                  <span>👮 <strong className="text-indigo-400 font-black">HOSTILE SIEGE SIMULATION MODE ACTIVE:</strong> Re-routing to Police Stations 👮 &amp; Military Security Points 🪖.</span>
                ) : activeDisasterSim === 'fire' ? (
                  <span>🚒 <strong className="text-orange-400 font-black">FIRE DISASTER SIMULATION MODE ACTIVE:</strong> Showing Fire Stations 🚒 &amp; Safe Assembly Points 🚩.</span>
                ) : activeDisasterSim === 'earthquake' ? (
                  <span>🌋 <strong className="text-amber-400 font-black">EARTHQUAKE TREMORS SIMULATION ACTIVE:</strong> Broadcast Alert Dispatched (Epicenter Lat: 6.9380° N, Lng: 122.0740° E).</span>
                ) : (
                  <span>🧪 <strong className="text-rose-400 font-black">CHEMICAL SPILL SIMULATION MODE ACTIVE:</strong> Showing Medical Hospitals 🏥 &amp; Decontamination Zones.</span>
                )}
              </div>
              <button
                onClick={() => {
                  setActiveDisasterSim('none');
                  api.post('/simulation/toggle', { simulation_type: 'none' })
                    .then(() => queryClient.invalidateQueries(['mapDashboard']))
                    .catch(err => console.warn('Sim reset warning:', err));
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2.5 py-1 rounded-lg font-black uppercase transition ml-2 cursor-pointer shrink-0"
              >
                Reset View
              </button>
            </div>
          )}

          {/* 3. Prolonged Rain (Dynamic Threshold) Visual Early Warning Alert */}
          {weatherTelemetry?.is_raining && weatherTelemetry.continuous_rain_duration_minutes >= (weatherTelemetry?.flood_trigger_threshold_minutes || 45) && (
            <div className="bg-rose-950/95 backdrop-blur-md border-2 border-rose-500 text-white rounded-2xl px-5 py-2.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="flex h-3 w-3 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <div className="text-xs">
                <span className="font-black text-rose-300 uppercase tracking-wide">🚨 PROLONGED RAINFALL &amp; DRAINAGE FLOOD ALERT:</span>{' '}
                <span>
                  Zamboanga City recorded <strong>{weatherTelemetry.continuous_rain_duration_minutes} continuous minutes</strong> of rain (surpassed configured <strong>{weatherTelemetry?.flood_trigger_threshold_minutes || 45}m</strong> threshold).
                  {weatherTelemetry?.fixed_flood_spots_triggered && weatherTelemetry?.active_fixed_flood_spots_count > 0 ? (
                    <span className="ml-1 text-amber-300 font-bold">
                      ⚡ {weatherTelemetry.active_fixed_flood_spots_count} chronic bad-drainage flood spots automatically activated on map.
                    </span>
                  ) : (
                    <span> High flood risk for river basins &amp; low-lying barangays.</span>
                  )}
                </span>
              </div>
              <button
                onClick={() => setIsProactiveModalOpen(true)}
                className="ml-2 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md whitespace-nowrap shrink-0"
              >
                Open EOC
              </button>
            </div>
          )}
        </div>
        <LocalSimulationModal
          isOpen={showLocalSimulation && !isCSWDO}
          onClose={() => handleSetLocalSimulation(false)}
          simSetupState={simSetupState}
          setSimSetupState={setSimSetupState}
          selectedRadiusMeters={selectedRadiusMeters}
          setSelectedRadiusMeters={setSelectedRadiusMeters}
          simCenter={simCenter}
          setSimCenter={setSimCenter}
          setPlacementCoords={setPlacementCoords}
          simOverlayMode={simOverlayMode}
          setSimOverlayMode={setSimOverlayMode}
          mapRef={mapRef}
          runSimulationFlow={runSimulationFlow}
          setSimulationGeoJSON={setSimulationGeoJSON}
          handleSetLocalSimulation={handleSetLocalSimulation}
        />
        <MapViewer
          shelters={shelters} hazards={hazards} demographics={demographics}
          pinMode={pinMode} pendingLocation={pendingLocation}
          showShelterForm={showShelterForm} showHazardForm={showHazardForm}
          handleMapClick={handleMapClick} setSelectedShelter={setSelectedShelter}
          setSelectedHazard={setSelectedHazard} MAPBOX_TOKEN={MAPBOX_TOKEN}
          isCSWDO={isCSWDO}
          showHeatmap={showHeatmap}
          showWeather={showWeather}
          mapStyle={mapStyle}
          setMapStyle={setMapStyle}
          simulationMode={simulationMode}
          showShelters={showShelters}
          showHazards={showHazards}
          activeMapFilter={activeMapFilter}
          isolateZamboanga={isolateZamboanga}
          showBarangayBoundaries={showBarangayBoundaries}
          is3D={is3D}
          setIs3D={setIs3D}
          mapRef={mapRef}
          inspectLocation={inspectLocation}
          drawerOpen={drawerOpen}
          simulationGeoJSON={simulationGeoJSON}
          isDrawingRadius={isDrawingRadius}
          drawingRadiusMeters={drawingRadiusMeters}
          hazardPinGeometryMode={hazardPinGeometryMode}
          drawingCorridorCoords={drawingCorridorCoords}
          handleMapMouseMove={handleMapMouseMove}
          drawingEnd={drawingEnd}
          showRoadNetwork={showRoadNetwork}
          roadNetwork={roadNetwork}
          placementCoords={placementCoords}
          selectedRadiusMeters={selectedRadiusMeters}
          simOverlayMode={simOverlayMode}
          activeDisasterSim={activeDisasterSim}
          filteredSheltersForView={filteredSheltersForView}
          simulatedResidentCoords={simulatedResidentCoords}
          nearestShelterToResident={nearestShelterToResident}
          residentDistanceKm={residentDistanceKm}
          isResidentNearShelter={isResidentNearShelter}
          setPinMode={setPinMode}
          showRescueUnits={showRescueUnits}
          activeRescueMissions={activeRescueMissions}
          rescueUnits={rescueUnits}
          missionRoutesGeoJSON={missionRoutesGeoJSON}
          focusLat={focusLat}
          focusLng={focusLng}
          incidentName={incidentName}
        />
        <RiskAlertsDrawer
          hazards={hazards}
          simulationMode={simulationMode}
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
        />
      </div>
      <ZamboangaWeatherModal
        isOpen={isWeatherModalOpen}
        onClose={() => setIsWeatherModalOpen(false)}
        liveTelemetry={weatherTelemetry}
        showRadarOverlay={showWeather}
        onToggleRadarOverlay={() => setShowWeather(prev => !prev)}
        onOpenProactiveEoc={() => setIsProactiveModalOpen(true)}
      />
      <ProactiveDisasterModal
        isOpen={isProactiveModalOpen}
        onClose={() => setIsProactiveModalOpen(false)}
      />
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteShelter}
        title="Delete Shelter"
        message={`Are you sure you want to delete ${selectedShelter?.name}? This action cannot be undone and will remove the shelter from the map.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}
