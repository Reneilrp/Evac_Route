import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import {
  MapPin, Zap, Moon, Satellite, Mountain, TriangleAlert, Waves
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import MapLegend from './MapLegend';
import { buildSimulationRoadGeoJSON, getSimulationOverlayGeoJSON } from '../../utils/simulationGeoJson';
import {
  createCirclePolygon,
  createHazardRoadCorridorLine,
  ZAMBOANGA_CENTER,
  ZAMBOANGA_MAX_BOUNDS,
  ZAMBOANGA_MIN_ZOOM,
  ZAMBOANGA_MAX_ZOOM,
  getZamboangaIsolationMaskGeoJSON,
  getZamboangaBoundaryLineGeoJSON,
} from '../../utils/mapHelper';

const MAP_STYLES = {
  dark:      { id: 'dark',      label: 'Dark',      icon: <Moon size={13} />,      url: 'mapbox://styles/mapbox/dark-v11' },
  satellite: { id: 'satellite', label: 'Satellite', icon: <Satellite size={13} />, url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  terrain:   { id: 'terrain',   label: 'Terrain',   icon: <Mountain size={13} />,  url: 'mapbox://styles/mapbox/outdoors-v12' },
};

const MapViewer = React.memo(({
  shelters,
  hazards,
  demographics = [],
  pinMode,
  pendingLocation,
  showShelterForm,
  showHazardForm,
  handleMapClick,
  setSelectedShelter,
  setSelectedHazard,
  MAPBOX_TOKEN,
  showWeather,
  showHeatmap,
  mapStyle,
  setMapStyle,
  simulationMode,
  showShelters = true,
  showHazards = true,
  activeMapFilter = 'all',
  is3D = true,
  setIs3D,
  mapRef,
  inspectLocation,
  drawerOpen = false,
  simulationGeoJSON = null,
  isDrawingRadius = false,
  drawingRadiusMeters = 50,
  hazardPinGeometryMode = 'circle',
  drawingCorridorCoords = null,
  handleMapMouseMove = null,
  drawingEnd = null,
  showRoadNetwork = true,
  roadNetwork = null,
  placementCoords = null,
  selectedRadiusMeters = 2000,
  simOverlayMode = 'flow',
  viewAsResident = false,
  activeDisasterSim = 'none',
  filteredSheltersForView = [],
  isCSWDO = false,
  isolateZamboanga = true,
  showRescueUnits = true,
  activeRescueMissions = [],
  rescueUnits = [],
  missionRoutesGeoJSON = null,
  focusLat = null,
  focusLng = null,
  incidentName = null,
}) => {
  const containerRef = useRef(null);
  const { setDarkMode } = useTheme();

  const zamboangaMaskData = useMemo(() => getZamboangaIsolationMaskGeoJSON(), []);
  const zamboangaBoundaryLine = useMemo(() => getZamboangaBoundaryLineGeoJSON(), []);

  useEffect(() => {
    const handleResize = () => {
      const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
      if (map && map.resize) {
        map.resize();
      }
    };

    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      handleResize();
    });
    ro.observe(containerRef.current);

    window.addEventListener('resize', handleResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [mapRef]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
      if (map && map.resize) {
        map.resize();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [drawerOpen, mapRef]);

  const [viewState, setViewState] = useState(() => {
    const lat = parseFloat(focusLat);
    const lng = parseFloat(focusLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        longitude: lng,
        latitude: lat,
        zoom: 16.5,
        pitch: is3D ? 52 : 0,
        bearing: -15
      };
    }
    return {
      longitude: ZAMBOANGA_CENTER.longitude,
      latitude: ZAMBOANGA_CENTER.latitude,
      zoom: ZAMBOANGA_CENTER.zoom,
      pitch: is3D ? 52 : 0,
      bearing: -15
    };
  });

  // Synchronize viewState and map camera whenever focusLat/focusLng change
  useEffect(() => {
    const lat = parseFloat(focusLat);
    const lng = parseFloat(focusLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setViewState(prev => ({
        ...prev,
        longitude: lng,
        latitude: lat,
        zoom: 16.5,
        pitch: is3D ? 52 : 0
      }));

      const map = mapRef?.current?.getMap ? mapRef.current.getMap() : mapRef?.current;
      if (map && map.flyTo) {
        map.flyTo({
          center: [lng, lat],
          zoom: 16.5,
          pitch: is3D ? 52 : 0,
          duration: 1500,
          essential: true
        });
      }
    }
  }, [focusLat, focusLng, is3D, mapRef]);

  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const placementPreviewGeoJSON = useMemo(() => {
    if (pinMode !== 'sim-placement' || !placementCoords) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          ...createCirclePolygon(
            [placementCoords.longitude, placementCoords.latitude],
            selectedRadiusMeters
          ),
          properties: {}
        }
      ]
    };
  }, [pinMode, placementCoords, selectedRadiusMeters]);

  const roadNetworkGeoJSON = useMemo(() => {
    if (!roadNetwork?.edges) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: roadNetwork.edges.map(edge => {
        let coords = edge.geometry;
        if (typeof coords === 'string') {
          try { coords = JSON.parse(coords); } catch { coords = []; }
        }
        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coords
          },
          properties: {
            id: edge.id,
            status: edge.status,
            flood_susceptibility: edge.flood_susceptibility || 'none',
            landslide_susceptibility: edge.landslide_susceptibility || 'none',
            slope_degrees: parseFloat(edge.slope_degrees) || 0,
            min_elevation: parseFloat(edge.min_elevation_meters) || 0,
            block_reason: edge.block_reason
          }
        };
      })
    };
  }, [roadNetwork]);

  const roadColorExpression = useMemo(() => {
    if (simulationMode === 'rain') {
      return [
        'match',
        ['get', 'flood_susceptibility'],
        'high', '#ef4444',
        'medium', '#f97316',
        'low', '#eab308',
        '#64748b'
      ];
    } else if (simulationMode === 'tremors') {
      return [
        'match',
        ['get', 'landslide_susceptibility'],
        'high', '#ef4444',
        'medium', '#f97316',
        'low', '#eab308',
        '#64748b'
      ];
    }
    return '#475569';
  }, [simulationMode]);

  const roadWidthExpression = useMemo(() => {
    if (simulationMode === 'rain') {
      return [
        'match',
        ['get', 'flood_susceptibility'],
        'high', 4.5,
        'medium', 3.0,
        'low', 2.0,
        1.5
      ];
    } else if (simulationMode === 'tremors') {
      return [
        'match',
        ['get', 'landslide_susceptibility'],
        'high', 4.5,
        'medium', 3.0,
        'low', 2.0,
        1.5
      ];
    }
    return 1.5;
  }, [simulationMode]);

  const roadOpacityExpression = useMemo(() => {
    if (simulationMode) {
      return [
        'match',
        ['get', simulationMode === 'rain' ? 'flood_susceptibility' : 'landslide_susceptibility'],
        'high', 0.95,
        'medium', 0.85,
        'low', 0.75,
        0.25
      ];
    }
    return 0.35;
  }, [simulationMode]);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setViewState(prev => ({
        ...prev,
        pitch: is3D ? 52 : 0,
        bearing: is3D ? -15 : 0
      }));
    });
    return () => cancelAnimationFrame(handle);
  }, [is3D]);
  const [weatherTimestamp, setWeatherTimestamp] = useState(null);

  useEffect(() => {
    if (showWeather) {
      fetch('https://api.rainviewer.com/public/weather-maps.json')
        .then(res => res.json())
        .then(data => {
          if (data?.radar?.past?.length > 0) {
            setWeatherTimestamp(data.radar.past[data.radar.past.length - 1].time);
          }
        })
        .catch(err => console.error('RainViewer fetch failed:', err));
    }
  }, [showWeather]);

  const displayHazards = useMemo(() => {
    let list = activeDisasterSim === 'none' ? hazards : hazards.filter(h => {
      const type = (h.hazard_type || '').toLowerCase();
      if (activeDisasterSim === 'flood') return ['flood', 'landslide', 'tsunami', 'water'].some(t => type.includes(t));
      if (activeDisasterSim === 'fire') return ['fire', 'wildfire', 'explosion', 'smoke'].some(t => type.includes(t));
      if (activeDisasterSim === 'earthquake') return ['earthquake', 'tremor', 'structural_collapse', 'fault'].some(t => type.includes(t));
      if (activeDisasterSim === 'siege') return ['siege', 'armed', 'conflict', 'civil_unrest', 'security'].some(t => type.includes(t));
      if (activeDisasterSim === 'chemical') return ['chemical', 'biohazard', 'gas', 'toxic', 'decontamination'].some(t => type.includes(t));
      return true;
    });

    if (activeMapFilter === 'all') return list;
    if (activeMapFilter === 'flood') {
      return list.filter(h => {
        const type = (h.hazard_type || '').toLowerCase();
        return h.is_fixed_flood_spot || ['flood', 'tsunami', 'water', 'landslide'].some(t => type.includes(t));
      });
    }
    if (activeMapFilter === 'earthquake') {
      return list.filter(h => {
        const type = (h.hazard_type || '').toLowerCase();
        return ['earthquake', 'tremor', 'fault', 'structural_collapse'].some(t => type.includes(t));
      });
    }
    if (activeMapFilter === 'fixed_flood') {
      return list.filter(h => Boolean(h.is_fixed_flood_spot));
    }
    if (activeMapFilter === 'fire') {
      return list.filter(h => {
        const type = (h.hazard_type || '').toLowerCase();
        return ['fire', 'wildfire', 'smoke', 'explosion'].some(t => type.includes(t));
      });
    }
    if (['shelters', 'rescue_units', 'residents'].includes(activeMapFilter)) {
      return [];
    }
    return list;
  }, [hazards, activeDisasterSim, activeMapFilter]);

  const shouldRenderHazards = useMemo(() => {
    if (!showHazards) return false;
    if (['all', 'flood', 'earthquake', 'fixed_flood', 'fire'].includes(activeMapFilter)) return true;
    return false;
  }, [showHazards, activeMapFilter]);

  const shouldRenderShelters = useMemo(() => {
    if (!showShelters) return false;
    if (['all', 'shelters'].includes(activeMapFilter)) return true;
    return false;
  }, [showShelters, activeMapFilter]);

  const shouldRenderRescueUnits = useMemo(() => {
    if (!showRescueUnits) return false;
    if (['all', 'rescue_units'].includes(activeMapFilter)) return true;
    return false;
  }, [showRescueUnits, activeMapFilter]);

  const { activeHazardsGeoJSON, susceptibleGeoJSON } = useMemo(() => {
    const roadLineStrings = (roadNetwork?.edges || [])
      .map(e => {
        let g = e.geometry;
        if (typeof g === 'string') {
          try { g = JSON.parse(g); } catch { g = null; }
        }
        return Array.isArray(g) && g.length >= 2 ? g : null;
      })
      .filter(Boolean);

    const active = displayHazards.filter(h => h.is_active);
    const susceptible = displayHazards.filter(h => h.is_fixed_flood_spot && !h.is_active);

    const buildFeature = (h) => {
      const lng = parseFloat(h.longitude);
      const lat = parseFloat(h.latitude);
      const rad = parseFloat(h.radius_meters || 50);

      let parsedCorridor = h.corridor_coordinates;
      if (typeof parsedCorridor === 'string') {
        try { parsedCorridor = JSON.parse(parsedCorridor); } catch { parsedCorridor = null; }
      }
      const isRoadCorridor =
        h.geometry_type === 'road_corridor' ||
        (Array.isArray(parsedCorridor) && parsedCorridor.length >= 2);

      const geomFeat = isRoadCorridor
        ? createHazardRoadCorridorLine([lng, lat], rad, roadLineStrings, parsedCorridor)
        : createCirclePolygon([lng, lat], rad);

      return {
        ...geomFeat,
        properties: {
          id: h.id,
          name: h.name,
          hazard_type: h.hazard_type,
          severity_level: h.severity_level,
          radius: h.radius_meters,
          geometry_type: isRoadCorridor ? 'road_corridor' : 'circle',
        }
      };
    };

    return {
      activeHazardsGeoJSON: { type: 'FeatureCollection', features: active.map(buildFeature) },
      susceptibleGeoJSON: { type: 'FeatureCollection', features: susceptible.map(buildFeature) }
    };
  }, [displayHazards, roadNetwork]);

  const demographicsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: demographics.map(d => {
      const coords = BARANGAY_COORDS[d.barangay];
      if (!coords) return null;
      return { type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: { total_evacuees: parseInt(d.total_evacuees, 10) || 0 } };
    }).filter(Boolean)
  }), [demographics]);

  const simulationRoadsGeoJSON = useMemo(() => buildSimulationRoadGeoJSON(hazards, simulationMode), [hazards, simulationMode]);

  const heatmapLayerPaint = {
    'heatmap-weight': ['interpolate', ['linear'], ['get', 'total_evacuees'], 0, 0, 10, 0.4, 50, 0.7, 150, 1.0],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 3],
    'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(0,230,240,0)', 0.2, 'rgba(0,128,255,0.3)', 0.4, 'rgba(0,255,128,0.5)',
      0.6, 'rgba(255,255,0,0.6)', 0.8, 'rgba(255,128,0,0.8)', 1.0, 'rgba(235,50,50,0.9)'],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 20, 15, 65],
    'heatmap-opacity': 0.75
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        maxBounds={isolateZamboanga ? ZAMBOANGA_MAX_BOUNDS : undefined}
        minZoom={isolateZamboanga ? ZAMBOANGA_MIN_ZOOM : 2}
        maxZoom={ZAMBOANGA_MAX_ZOOM}
        onMouseMove={(e) => {
          if (handleMapMouseMove) {
            handleMapMouseMove(e);
          }
          if (simulationGeoJSON) {
            const map = mapRef.current?.getMap();
            if (map) {
              const features = map.queryRenderedFeatures(e.point, {
                layers: [simOverlayMode === 'flow' ? 'local-sim-layer' : 'local-slope-layer']
              });
              if (features.length > 0) {
                setHoveredFeature(features[0]);
                setTooltipPos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });
              } else {
                setHoveredFeature(null);
              }
            }
          } else {
            if (hoveredFeature) {
              setHoveredFeature(null);
            }
          }
        }}
        onMouseLeave={() => setHoveredFeature(null)}
        mapStyle={MAP_STYLES[mapStyle].url}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        cursor={pinMode ? 'crosshair' : 'grab'}
        terrain={is3D ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined}
      >
        <NavigationControl
          position="top-right"
          showCompass
          showZoom
          style={{
            marginRight: drawerOpen ? 312 : 12,
            marginTop: 12,
            transition: 'margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* Mapbox 3D Terrain DEM */}
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
        />

        {/* Zamboanga City Cartographic Isolation Mask (Dims the external world) */}
        {isolateZamboanga && (
          <>
            <Source id="zamboanga-isolation-mask" type="geojson" data={zamboangaMaskData}>
              <Layer
                id="zamboanga-mask-fill"
                type="fill"
                paint={{
                  'fill-color': '#080c14',
                  'fill-opacity': 0.76,
                }}
              />
            </Source>
            <Source id="zamboanga-boundary-line" type="geojson" data={zamboangaBoundaryLine}>
              <Layer
                id="zamboanga-boundary-glow"
                type="line"
                paint={{
                  'line-color': '#38bdf8',
                  'line-width': 4.5,
                  'line-opacity': 0.45,
                  'line-blur': 3,
                }}
              />
              <Layer
                id="zamboanga-boundary-stroke"
                type="line"
                paint={{
                  'line-color': '#0ea5e9',
                  'line-width': 1.8,
                  'line-opacity': 0.9,
                  'line-dasharray': [3, 2],
                }}
              />
            </Source>
          </>
        )}

        {is3D && (
          <Layer
            id="3d-buildings"
            source="composite"
            source-layer="building"
            filter={['==', 'extrude', 'true']}
            type="fill-extrusion"
            minzoom={14}
            paint={{
              'fill-extrusion-color': '#334155',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }}
          />
        )}

        {/* GIS Population Heatmap */}
        {showHeatmap && demographicsGeoJSON.features.length > 0 && (
          <Source id="heatmap-source" type="geojson" data={demographicsGeoJSON}>
            <Layer id="evacuee-heatmap-layer" type="heatmap" paint={heatmapLayerPaint} />
          </Source>
        )}

        {/* Live RainViewer Radar */}
        {showWeather && weatherTimestamp && (
          <Source id="weather-radar-source" type="raster" tiles={[`https://tilecache.rainviewer.com/v2/radar/${weatherTimestamp}/256/{z}/{x}/{y}/2/1_1.png`]} tileSize={256}>
            <Layer id="weather-radar-layer" type="raster" paint={{ 'raster-opacity': 0.55 }} />
          </Source>
        )}

        {/* Active Emergency Hazards: 2-Mode Rendering (Circle Radius Zone & Road-Snapped Corridor) */}
        {shouldRenderHazards && activeHazardsGeoJSON.features.length > 0 && (
          <Source id="hazards-source" type="geojson" data={activeHazardsGeoJSON}>
            {/* Mode 1: Circle Radius Fill */}
            <Layer
              id="hazards-circle-fill"
              type="fill"
              filter={['==', ['geometry-type'], 'Polygon']}
              paint={{
                'fill-color': [
                  'match',
                  ['get', 'hazard_type'],
                  'flood', ['match', ['get', 'severity_level'], 'low', '#60a5fa', 'medium', '#3b82f6', 'high', '#ef4444', '#3b82f6'],
                  'landslide', ['match', ['get', 'severity_level'], 'low', '#d97706', 'medium', '#b45309', 'high', '#78350f', '#b45309'],
                  'building_fire', ['match', ['get', 'severity_level'], 'low', '#f97316', 'medium', '#ea580c', 'high', '#dc2626', '#ea580c'],
                  'earthquake', '#ef4444',
                  '#ef4444'
                ],
                'fill-opacity': 0.22,
              }}
            />
            {/* Mode 1: Circle Radius Perimeter Ring */}
            <Layer
              id="hazards-circle-outline"
              type="line"
              filter={['==', ['geometry-type'], 'Polygon']}
              paint={{
                'line-color': [
                  'match',
                  ['get', 'hazard_type'],
                  'flood', ['match', ['get', 'severity_level'], 'low', '#60a5fa', 'medium', '#3b82f6', 'high', '#ef4444', '#3b82f6'],
                  'landslide', ['match', ['get', 'severity_level'], 'low', '#d97706', 'medium', '#b45309', 'high', '#78350f', '#b45309'],
                  'building_fire', ['match', ['get', 'severity_level'], 'low', '#f97316', 'medium', '#ea580c', 'high', '#dc2626', '#ea580c'],
                  'earthquake', '#ef4444',
                  '#ef4444'
                ],
                'line-width': 2.5,
                'line-opacity': 0.95,
                'line-dasharray': [2, 2],
              }}
            />
            {/* Mode 2: Road Corridor Outer Casing / High-Contrast Black Halo */}
            <Layer
              id="hazards-line-casing"
              type="line"
              filter={['==', ['geometry-type'], 'LineString']}
              paint={{
                'line-color': '#000000',
                'line-width': 9,
                'line-opacity': 0.95,
                'line-cap': 'round',
                'line-join': 'round',
              }}
            />
            {/* Mode 2: Core Road Hazard Line Corridor */}
            <Layer
              id="hazards-line-core"
              type="line"
              filter={['==', ['geometry-type'], 'LineString']}
              paint={{
                'line-color': [
                  'match',
                  ['get', 'hazard_type'],
                  'flood', ['match', ['get', 'severity_level'], 'low', '#60a5fa', 'medium', '#3b82f6', 'high', '#ef4444', '#3b82f6'],
                  'landslide', ['match', ['get', 'severity_level'], 'low', '#d97706', 'medium', '#b45309', 'high', '#78350f', '#b45309'],
                  'building_fire', ['match', ['get', 'severity_level'], 'low', '#f97316', 'medium', '#ea580c', 'high', '#dc2626', '#ea580c'],
                  'earthquake', '#ef4444',
                  '#ef4444'
                ],
                'line-width': 5.5,
                'line-opacity': 1.0,
                'line-cap': 'round',
                'line-join': 'round',
              }}
            />
          </Source>
        )}

        {/* Flood Susceptibility Zones (Prone Areas / Passive) */}
        {shouldRenderHazards && susceptibleGeoJSON.features.length > 0 && (
          <Source id="susceptible-source" type="geojson" data={susceptibleGeoJSON}>
            <Layer
              id="susceptible-circle-fill"
              type="fill"
              filter={['==', ['geometry-type'], 'Polygon']}
              paint={{
                'fill-color': '#38bdf8',
                'fill-opacity': 0.14,
              }}
            />
            <Layer
              id="susceptible-line-casing"
              type="line"
              filter={['==', ['geometry-type'], 'LineString']}
              paint={{
                'line-color': '#000000',
                'line-width': 6,
                'line-opacity': 0.6,
                'line-cap': 'round',
              }}
            />
            <Layer
              id="susceptible-line"
              type="line"
              paint={{
                'line-color': '#38bdf8',
                'line-width': 2.5,
                'line-dasharray': ['literal', [4, 4]],
                'line-cap': 'round',
              }}
            />
          </Source>
        )}

        {/* Simulation Road Risk Lines */}
        {simulationMode && simulationRoadsGeoJSON.features.length > 0 && (
          <Source id="sim-roads-source" type="geojson" data={simulationRoadsGeoJSON}>
            <Layer
              id="sim-roads-layer"
              type="line"
              paint={{
                'line-color': ['match', ['get', 'risk'], 'high', '#ef4444', 'medium', '#f97316', 'low', '#eab308', '#22c55e'],
                'line-width': 4,
                'line-dasharray': ['match', ['get', 'risk'], 'high', ['literal', [2, 2]], ['literal', [1]]]
              }}
            />
          </Source>
        )}

        {/* Enriched Zamboanga City Road Network Layer */}
        {showRoadNetwork && roadNetworkGeoJSON.features.length > 0 && (
          <Source id="road-network-source" type="geojson" data={roadNetworkGeoJSON}>
            <Layer
              id="road-network-layer"
              type="line"
              paint={{
                'line-color': roadColorExpression,
                'line-width': roadWidthExpression,
                'line-opacity': roadOpacityExpression,
              }}
              layout={{
                'line-join': 'round',
                'line-cap': 'round',
              }}
            />
          </Source>
        )}

        {/* Simulation Placement Preview Layer */}
        {placementPreviewGeoJSON && (
          <Source id="sim-placement-source" type="geojson" data={placementPreviewGeoJSON}>
            <Layer
              id="sim-placement-layer-fill"
              type="fill"
              paint={{
                'fill-color': '#3b82f6',
                'fill-opacity': 0.15,
              }}
            />
            <Layer
              id="sim-placement-layer-outline"
              type="line"
              paint={{
                'line-color': '#3b82f6',
                'line-width': 2,
                'line-dasharray': ['literal', [3, 2]],
              }}
            />
          </Source>
        )}

        {/* Shelter & Emergency Facility Markers */}
        {shouldRenderShelters && (viewAsResident || activeDisasterSim !== 'none' ? filteredSheltersForView : shelters).map(shelter => (
          <Marker key={`s-${shelter.id}`} longitude={parseFloat(shelter.longitude)} latitude={parseFloat(shelter.latitude)} anchor="bottom">
            <div onClick={e => { e.stopPropagation(); setSelectedShelter(shelter); inspectLocation(parseFloat(shelter.longitude), parseFloat(shelter.latitude)); }} className="flex flex-col items-center group relative cursor-pointer">
              <MapPin size={30} className={shelter.status === 'open' ? 'text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]' : 'text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]'} />
              <span className="bg-gray-950/90 text-white border border-white/10 text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-lg mt-0.5">
                {shelter.current_occupancy}/{shelter.max_capacity}
              </span>
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col w-max bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-3 z-50">
                <p className="font-black text-white text-sm">{shelter.name}</p>
                <p className="text-xs text-white/50 mt-0.5">Status: <span className={`font-bold uppercase ${shelter.status === 'open' ? 'text-green-400' : 'text-red-400'}`}>{shelter.status}</span></p>
                <p className="text-xs text-white/70 mt-1 flex items-center gap-1.5">
                  <span className="font-bold text-white">Headcount:</span>
                  <span className="font-mono text-emerald-400 font-bold">{shelter.current_occupancy}</span>
                  <span className="text-white/40">/ {shelter.max_capacity}</span>
                </p>
                <p className="text-[10px] text-white/30 mt-1">{isCSWDO ? 'Click to view headcount details' : 'Click to manage'}</p>
              </div>
            </div>
          </Marker>
        ))}

        {/* Hazard click zones & markers */}
        {shouldRenderHazards && displayHazards.map(hazard => {
          const getHazardIcon = (type) => {
            if (type === 'flood') return <Waves size={18} className="text-white animate-pulse" />;
            if (type === 'earthquake') return <TriangleAlert size={18} className="text-white animate-bounce" />;
            return <Zap size={18} className="text-white animate-pulse" />;
          };
          const getHazardStyle = (type) => {
            if (type === 'flood') return 'border-blue-300 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.75)]';
            if (type === 'earthquake') return 'border-red-300 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.75)]';
            return 'border-amber-300 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.75)]';
          };
          return (
            <Marker key={`h-click-${hazard.id}`} longitude={parseFloat(hazard.longitude)} latitude={parseFloat(hazard.latitude)} anchor="center">
              <div 
                onClick={e => { e.stopPropagation(); setSelectedHazard(hazard); inspectLocation(parseFloat(hazard.longitude), parseFloat(hazard.latitude)); }} 
                className={`w-10 h-10 border-2 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform group relative ${getHazardStyle(hazard.hazard_type)}`}
              >
                {getHazardIcon(hazard.hazard_type)}
                {/* Hazard hover details */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col w-max bg-gray-950/90 border border-white/10 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <p className="font-black text-white text-xs">{hazard.name}</p>
                  <p className="text-[10px] text-white/50 mt-0.5 capitalize">{hazard.hazard_type} · {hazard.severity_level} severity</p>
                  {hazard.estimated_duration_hours && (
                    <MiniTimeline 
                      createdAt={hazard.created_at} 
                      durationHours={hazard.estimated_duration_hours} 
                      hazardType={hazard.hazard_type} 
                    />
                  )}
                  <p className="text-[9px] text-white/30 mt-1.5">Radius: {hazard.radius_meters}m · {isCSWDO ? 'Click to view details' : 'Click to resolve'}</p>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Pending pin */}
        {pendingLocation && !showShelterForm && !showHazardForm && (
          <Marker longitude={pendingLocation.longitude} latitude={pendingLocation.latitude} anchor="bottom">
            {pinMode === 'incident' ? (
              <div className="flex flex-col items-center group cursor-pointer animate-in fade-in zoom-in-75 duration-300">
                <div className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-xs shadow-xl mb-1 whitespace-nowrap border border-white/20 flex items-center gap-1.5 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                  <span>⚠️</span>
                  <span>{incidentName || 'Reported Incident'}</span>
                </div>
                <MapPin size={46} className="text-red-500 fill-red-500/30 animate-bounce drop-shadow-[0_0_16px_rgba(239,68,68,0.9)]" />
              </div>
            ) : (
              <MapPin size={48} className={`${pinMode === 'shelter' ? 'text-blue-400 fill-blue-400/20' : 'text-red-400 fill-red-400/20'} animate-bounce drop-shadow-[0_0_12px_rgba(96,165,250,0.8)]`} />
            )}
          </Marker>
        )}
        {/* Dynamic 2-Mode Hazard Pinning Preview (Mode 1: Circle Radius | Mode 2: Road-Snapped Corridor) */}
        {pendingLocation && isDrawingRadius && drawingRadiusMeters > 0 && (
          <Source
            id="drawing-hazard-source"
            type="geojson"
            data={
              hazardPinGeometryMode === 'road_corridor'
                ? createHazardRoadCorridorLine(
                    [pendingLocation.longitude, pendingLocation.latitude],
                    drawingRadiusMeters,
                    [],
                    drawingCorridorCoords
                  )
                : createCirclePolygon(
                    [pendingLocation.longitude, pendingLocation.latitude],
                    drawingRadiusMeters
                  )
            }
          >
            {hazardPinGeometryMode === 'circle' ? (
              <>
                <Layer
                  id="drawing-hazard-circle-fill"
                  source="drawing-hazard-source"
                  type="fill"
                  paint={{
                    'fill-color': '#ef4444',
                    'fill-opacity': 0.22,
                  }}
                />
                <Layer
                  id="drawing-hazard-circle-outline"
                  source="drawing-hazard-source"
                  type="line"
                  paint={{
                    'line-color': '#ef4444',
                    'line-width': 2.5,
                    'line-dasharray': ['literal', [3, 2]],
                  }}
                />
              </>
            ) : (
              <>
                <Layer
                  id="drawing-hazard-casing"
                  source="drawing-hazard-source"
                  type="line"
                  paint={{
                    'line-color': '#000000',
                    'line-width': 9,
                    'line-opacity': 0.9,
                    'line-cap': 'round',
                    'line-join': 'round',
                  }}
                />
                <Layer
                  id="drawing-hazard-core"
                  source="drawing-hazard-source"
                  type="line"
                  paint={{
                    'line-color': '#ef4444',
                    'line-width': 5,
                    'line-dasharray': ['literal', [3, 2]],
                    'line-cap': 'round',
                    'line-join': 'round',
                  }}
                />
              </>
            )}
          </Source>
        )}

        {/* Dynamic Hazard Radius Guide Line / Road End Marker */}
        {pinMode === 'hazard' && pendingLocation && isDrawingRadius && drawingEnd && (
          <>
            {hazardPinGeometryMode === 'circle' && (
              <Source
                id="drawing-hazard-radius-line"
                type="geojson"
                data={{
                  type: 'Feature',
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [pendingLocation.longitude, pendingLocation.latitude],
                      [drawingEnd.longitude, drawingEnd.latitude],
                    ],
                  },
                }}
              >
                <Layer
                  id="drawing-hazard-radius-line-layer"
                  type="line"
                  paint={{
                    'line-color': '#f59e0b',
                    'line-width': 2,
                    'line-dasharray': [2, 2],
                  }}
                />
              </Source>
            )}
            <Marker longitude={drawingEnd.longitude} latitude={drawingEnd.latitude} anchor="left">
              <div className="ml-2 px-2 py-0.5 bg-gray-950/90 text-amber-300 font-mono text-[11px] font-black rounded-md border border-amber-500/60 shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-1.5 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                {hazardPinGeometryMode === 'road_corridor' ? (
                  <span>🛣️ {drawingRadiusMeters}m road corridor (Snapped to Highway/Road)</span>
                ) : (
                  <span>⭕ {drawingRadiusMeters}m radius circle ({drawingRadiusMeters * 2}m diameter)</span>
                )}
              </div>
            </Marker>
          </>
        )}




        {/* Active Rescue Unit Operational Mission Corridors */}
        {shouldRenderRescueUnits && missionRoutesGeoJSON && (
          <Source id="active-rescue-routes-source" type="geojson" data={missionRoutesGeoJSON}>
            <Layer
              id="active-rescue-routes-glow"
              type="line"
              paint={{
                'line-color': '#0284c7',
                'line-width': 8,
                'line-opacity': 0.5,
              }}
            />
            <Layer
              id="active-rescue-routes-line"
              type="line"
              paint={{
                'line-color': '#38bdf8',
                'line-width': 3,
                'line-dasharray': [3, 2],
              }}
            />
          </Source>
        )}

        {/* Active Distress SOS Victims on Map (Emergency Invariant: ALWAYS RENDERED REGARDLESS OF ACTIVE FILTER) */}
        {activeRescueMissions.map((m) => {
          const lat = parseFloat(m.victim_latitude);
          const lng = parseFloat(m.victim_longitude);
          if (isNaN(lat) || isNaN(lng) || m.status === 'transporting' || m.status === 'completed') return null;
          // Ignore coordinates outside Zamboanga City (e.g. Android emulator default Mountain View, California)
          if (lat < 6.75 || lat > 7.30 || lng < 121.85 || lng > 122.35) return null;

          return (
            <Marker
              key={`distress-victim-${m.id}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
            >
              <div className="flex flex-col items-center group relative cursor-pointer">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-red-500 opacity-75"></span>
                  <div className="relative w-7 h-7 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.9)]">
                    <span className="text-xs">🆘</span>
                  </div>
                </div>
                <div className="bg-slate-950/95 text-red-300 border border-red-500/50 text-[9px] font-black px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap">
                  {m.victim_name || 'Distress Call'} ({m.headcount || 1}pax)
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Active Rescue Units (Live GPS Vehicle Tracking) */}
        {shouldRenderRescueUnits && rescueUnits.map((unit) => {
          const lat = parseFloat(unit.current_latitude);
          const lng = parseFloat(unit.current_longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const activeMission = activeRescueMissions.find((m) => m.rescue_unit_id === unit.id);
          const isEnRoute = unit.status === 'en_route' || activeMission?.status === 'en_route';
          const isTransporting = unit.status === 'transporting' || activeMission?.status === 'transporting';
          const isOnScene = unit.status === 'on_scene' || activeMission?.status === 'on_scene';
          const isBusy = isEnRoute || isTransporting || isOnScene;

          return (
            <Marker
              key={`rescue-unit-marker-${unit.id}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  inspectLocation(lng, lat);
                }}
                className="flex flex-col items-center group relative cursor-pointer"
              >
                {/* Vehicle Beacon */}
                <div className="relative flex items-center justify-center">
                  {isBusy && (
                    <span className="absolute inline-flex h-9 w-9 animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                  )}
                  <div className={`relative w-8 h-8 rounded-full bg-slate-900 border-2 ${isBusy ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.85)]' : 'border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]'} flex items-center justify-center hover:scale-110 active:scale-95 transition-transform`}>
                    <span className="text-sm">🚒</span>
                  </div>
                </div>

                {/* Callsign Tag */}
                <div className="bg-slate-950/95 text-cyan-300 border border-cyan-400/50 text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg mt-1 whitespace-nowrap flex items-center gap-1">
                  <span>{unit.call_sign || unit.name}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isBusy ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                </div>

                {/* Hover Details Card */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col w-64 bg-slate-950/95 border border-cyan-500/40 rounded-xl shadow-2xl p-3 z-50 text-white animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-black text-xs text-cyan-300">{unit.name} ({unit.call_sign})</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${isBusy ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'}`}>
                      {unit.status}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-300">
                    <p>Type: <span className="font-semibold text-white capitalize">{unit.unit_type || 'QRT'}</span></p>
                    {unit.contact_number && (
                      <p>Radio: <span className="font-mono text-cyan-300">{unit.contact_number}</span></p>
                    )}
                  </div>
                  {activeMission && (
                    <div className="mt-2 pt-2 border-t border-white/10 bg-cyan-950/40 -mx-1 px-2 py-1.5 rounded">
                      <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                        Active Mission: {activeMission.control_no}
                      </p>
                      <p className="text-[11px] text-white font-medium mt-0.5">
                        Victim: {activeMission.victim_name} ({activeMission.headcount} pax)
                      </p>
                      <p className="text-[10px] text-slate-300">
                        Phase: <span className="font-bold text-cyan-300 capitalize">{activeMission.status}</span>
                      </p>
                    </div>
                  )}
                  <p className="text-[9px] text-cyan-400/70 mt-1.5 font-mono">
                    Live GPS: {lat.toFixed(5)}°N, {lng.toFixed(5)}°E
                  </p>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Local Hydrological & Terrain Simulation Layer */}
        {simulationGeoJSON && simOverlayMode === 'flow' && (
          <Source id="local-sim-source" type="geojson" data={simulationGeoJSON}>
            <Layer
              id="local-sim-layer"
              type="heatmap"
              filter={['>', ['get', 'accumulation'], 1.2]}
              paint={{
                'heatmap-weight': [
                  'interpolate',
                  ['linear'],
                  ['get', 'accumulation'],
                  1.2, 0.1,
                  10, 0.6,
                  50, 1.0
                ],
                'heatmap-intensity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  12, 0.5,
                  15, 1.5,
                  18, 3.0
                ],
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(59, 130, 246, 0)',
                  0.15, 'rgba(147, 197, 253, 0.5)',
                  0.3, 'rgba(96, 165, 250, 0.75)',
                  0.5, 'rgba(37, 99, 235, 0.85)',
                  0.8, 'rgba(29, 78, 216, 0.9)',
                  1.0, 'rgba(30, 58, 138, 0.95)'
                ],
                'heatmap-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  12, 10,
                  15, 20,
                  18, 45,
                  20, 60
                ],
                'heatmap-opacity': 0.8
              }}
            />
          </Source>
        )}

        {simulationGeoJSON && simOverlayMode === 'gradient' && (
          <Source id="local-slope-source" type="geojson" data={simulationGeoJSON}>
            <Layer
              id="local-slope-layer"
              type="heatmap"
              paint={{
                'heatmap-weight': [
                  'interpolate',
                  ['linear'],
                  ['get', 'slope'],
                  0, 0.05,
                  5, 0.2,
                  15, 0.6,
                  30, 1.0
                ],
                'heatmap-intensity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  12, 0.5,
                  15, 1.5,
                  18, 3.0
                ],
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(16, 185, 129, 0)',
                  0.15, 'rgba(16, 185, 129, 0.45)', // Green for flat slope
                  0.4, 'rgba(234, 179, 8, 0.65)',    // Yellow for moderate slope
                  0.75, 'rgba(249, 115, 22, 0.8)',   // Orange for steep slope
                  1.0, 'rgba(239, 68, 68, 0.95)'     // Red for very steep slope
                ],
                'heatmap-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  12, 10,
                  15, 20,
                  18, 45,
                  20, 60
                ],
                'heatmap-opacity': 0.8
              }}
            />
          </Source>
        )}

        {/* Global Simulation Mode overlays */}
        {simulationMode && (
          <Source id="simulation-overlay-source" type="geojson" data={getSimulationOverlayGeoJSON(simulationMode)}>
            <Layer
              id="simulation-overlay-layer"
              type="fill"
              paint={{
                'fill-color': simulationMode === 'rain' ? '#3b82f6' : '#ef4444',
                'fill-opacity': 0.25,
              }}
            />
            <Layer
              id="simulation-overlay-outline"
              type="line"
              paint={{
                'line-color': simulationMode === 'rain' ? '#2563eb' : '#dc2626',
                'line-width': 1.5,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        )}
      </Map>

      {/* Dynamic Hover Tooltip for Local Simulation (Flow/Gradient) */}
      {hoveredFeature && hoveredFeature.properties && (
        <div
          className="absolute z-50 pointer-events-none bg-slate-950/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl text-xs text-white flex flex-col gap-2 w-64 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: tooltipPos.x + 20,
            top: tooltipPos.y - 40,
          }}
        >
          <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
            <Waves className="text-blue-400 animate-pulse" size={14} />
            <span className="font-extrabold uppercase text-[10px] tracking-wider text-blue-400">Terrain Inspection</span>
          </div>
          
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-white/60">Elevation:</span>
              <span className="font-mono font-bold text-white">
                {parseFloat(hoveredFeature.properties.elevation || 0).toFixed(1)}m
                <span className="text-[10px] text-white/40 ml-1">
                  ({parseFloat(hoveredFeature.properties.elevation || 0) > 40 ? 'High Ground' : 'Low-lying'})
                </span>
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-white/60">Slope Gradient:</span>
              <span className="font-mono font-bold text-white">
                {parseFloat(hoveredFeature.properties.slope || 0).toFixed(1)}%
                <span className="text-[10px] text-white/40 ml-1">
                  ({parseFloat(hoveredFeature.properties.slope || 0) > 15 ? 'Steep' : parseFloat(hoveredFeature.properties.slope || 0) > 5 ? 'Moderate' : 'Flat'})
                </span>
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-white/60">Flow Accumulation:</span>
              <span className="font-mono font-bold text-white">
                {parseFloat(hoveredFeature.properties.accumulation || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-2 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white/80">Est. Pooling Chance:</span>
              <span className={`font-black text-sm px-2 py-0.5 rounded-md ${
                parseInt(hoveredFeature.properties.floodChance || 0, 10) > 70 
                  ? 'text-red-400 bg-red-500/10 border border-red-500/20' 
                  : parseInt(hoveredFeature.properties.floodChance || 0, 10) > 30 
                    ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20' 
                    : 'text-green-400 bg-green-500/10 border border-green-500/20'
              }`}>
                {parseInt(hoveredFeature.properties.floodChance || 0, 10)}%
              </span>
            </div>
            <p className="text-[10px] text-white/40 leading-tight mt-0.5">
              {parseInt(hoveredFeature.properties.floodChance || 0, 10) > 70
                ? 'Critical pooling risk. Flat terrain with high incoming runoff.'
                : parseInt(hoveredFeature.properties.floodChance || 0, 10) > 30
                  ? 'Moderate risk. Lower elevation basin area.'
                  : 'Safe. High runoff or elevated ground preventing accumulation.'}
            </p>
          </div>
        </div>
      )}

      {/* Floating Style Picker and Map Legend */}
      <div className={`absolute bottom-6 z-30 flex items-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-xl p-1 shadow-2xl transition-all duration-300 ${
        drawerOpen ? 'right-[320px]' : 'right-6'
      }`}>
        {Object.values(MAP_STYLES).map(s => (
          <button
            key={s.id}
            onClick={() => {
              setMapStyle(s.id);
              if (s.id === 'terrain') {
                setDarkMode(false);
              } else if (s.id === 'dark') {
                setDarkMode(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              mapStyle === s.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'
            }`}
          >
            {s.icon}
            <span className="hidden md:inline">{s.label}</span>
          </button>
        ))}
        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1.5 self-center" />
        <button
          onClick={() => setIs3D(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
            is3D
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'
          }`}
        >
          <Mountain size={13} />
          <span className="hidden md:inline">3D View</span>
        </button>
        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1.5 self-center" />
        {/* Map Legend button */}
        <MapLegend simulationMode={simulationMode} />
      </div>
    </div>
  );
});


export default MapViewer;
export { MAP_STYLES };
