import React from "react";
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
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

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// --- Helper: Client-Side hydrological flood accumulation solver (Option A) ---
function runLocalSimulation(lng, lat, radiusMeters, token, onResult) {
  if (!token) {
    onResult(null);
    return;
  }

  // Dynamic zoom selection to cap computational complexity
  let zoom = 15;
  if (radiusMeters > 800) {
    zoom = 13;
  } else if (radiusMeters > 300) {
    zoom = 14;
  }

  const n = Math.pow(2, zoom);
  
  // Calculate Web Mercator meters per pixel at target latitude
  const latRad = (lat * Math.PI) / 180;
  const metersPerPixel = 156543.03392 * Math.cos(latRad) / Math.pow(2, zoom);
  const radiusPixels = Math.max(5, Math.round(radiusMeters / metersPerPixel));

  // Center coordinate projection values
  const xDouble = ((lng + 180) / 360) * n;
  const yDouble = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  // Convert bounding box to tile indexes to determine contiguous tiles to fetch (max 2x2 grid)
  const dLat = radiusMeters / 111320;
  const dLng = radiusMeters / (111320 * Math.cos(latRad));
  const lngMin = lng - dLng;
  const lngMax = lng + dLng;
  const latMin = lat - dLat;
  const latMax = lat + dLat;

  const txMin = Math.max(0, Math.min(n - 1, Math.floor(((lngMin + 180) / 360) * n)));
  const txMax = Math.max(0, Math.min(n - 1, Math.floor(((lngMax + 180) / 360) * n)));
  
  const latMaxRad = (latMax * Math.PI) / 180;
  const latMinRad = (latMin * Math.PI) / 180;
  const tyMin = Math.max(0, Math.min(n - 1, Math.floor(((1 - Math.log(Math.tan(latMaxRad) + 1 / Math.cos(latMaxRad)) / Math.PI) / 2) * n)));
  const tyMax = Math.max(0, Math.min(n - 1, Math.floor(((1 - Math.log(Math.tan(latMinRad) + 1 / Math.cos(latMinRad)) / Math.PI) / 2) * n)));

  const cols = txMax - txMin + 1;
  const rows = tyMax - tyMin + 1;

  const tilePromises = [];
  const tileKeys = [];
  
  for (let ty = tyMin; ty <= tyMax; ty++) {
    for (let tx = txMin; tx <= txMax; tx++) {
      const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${tx}/${ty}.pngraw?access_token=${token}`;
      tileKeys.push({ tx, ty });
      tilePromises.push(new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
      }));
    }
  }

  Promise.all(tilePromises).then((images) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = cols * 256;
      canvas.height = rows * 256;
      const ctx = canvas.getContext('2d');
      
      images.forEach((img, index) => {
        const key = tileKeys[index];
        const xOffset = (key.tx - txMin) * 256;
        const yOffset = (key.ty - tyMin) * 256;
        ctx.drawImage(img, xOffset, yOffset);
      });
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      
      const canvasX = (xDouble - txMin) * 256;
      const canvasY = (yDouble - tyMin) * 256;
      
      const size = radiusPixels * 2 + 1;
      const heights = Array.from({ length: size }, () => new Float32Array(size));
      let water = Array.from({ length: size }, () => new Float32Array(size).fill(1.0));
      
      // Decode RGB heights
      for (let dy = -radiusPixels; dy <= radiusPixels; dy++) {
        for (let dx = -radiusPixels; dx <= radiusPixels; dx++) {
          const targetX = Math.round(Math.max(0, Math.min(canvas.width - 1, canvasX + dx)));
          const targetY = Math.round(Math.max(0, Math.min(canvas.height - 1, canvasY + dy)));
          const idx = (targetY * canvas.width + targetX) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          
          // Mapbox elevation equation
          const elevation = -10000 + (r * 6553.6) + (g * 25.6) + (b * 0.1);
          heights[dy + radiusPixels][dx + radiusPixels] = elevation;
        }
      }
      
      // Hydrological routing iterations
      for (let step = 0; step < 15; step++) {
        const nextWater = Array.from({ length: size }, () => new Float32Array(size).fill(0.0));
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const currentH = heights[y][x];
            const currentW = water[y][x];
            if (currentW <= 0) continue;
            
            let lowestH = currentH;
            let targetX = x;
            let targetY = y;
            
            for (let ny = -1; ny <= 1; ny++) {
              for (let nx = -1; nx <= 1; nx++) {
                if (nx === 0 && ny === 0) continue;
                const checkX = x + nx;
                const checkY = y + ny;
                if (checkX >= 0 && checkX < size && checkY >= 0 && checkY < size) {
                  const checkH = heights[checkY][checkX];
                  if (checkH < lowestH) {
                    lowestH = checkH;
                    targetX = checkX;
                    targetY = checkY;
                  }
                }
              }
            }
            
            if (lowestH < currentH) {
              nextWater[targetY][targetX] += currentW;
            } else {
              nextWater[y][x] += currentW;
            }
          }
        }
        water = nextWater;
      }
      
      const features = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - radiusPixels;
          const dy = y - radiusPixels;
          const distFromCenter = Math.sqrt(dx * dx + dy * dy) * metersPerPixel;
          
          if (distFromCenter <= radiusMeters) {
            const acc = water[y][x];
            const elevation = heights[y][x];
            
            // Calculate slope using neighbors
            let dz_dx = 0;
            let dz_dy = 0;
            const cellWidth = metersPerPixel;
            
            if (x > 0 && x < size - 1) {
              dz_dx = (heights[y][x + 1] - heights[y][x - 1]) / (2 * cellWidth);
            } else if (x > 0) {
              dz_dx = (heights[y][x] - heights[y][x - 1]) / cellWidth;
            } else if (x < size - 1) {
              dz_dx = (heights[y][x + 1] - heights[y][x]) / cellWidth;
            }
            
            if (y > 0 && y < size - 1) {
              dz_dy = (heights[y + 1][x] - heights[y - 1][x]) / (2 * cellWidth);
            } else if (y > 0) {
              dz_dy = (heights[y][x] - heights[y - 1][x]) / cellWidth;
            } else if (y < size - 1) {
              dz_dy = (heights[y + 1][x] - heights[y][x]) / cellWidth;
            }
            
            const riseRun = Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy);
            const slopePercent = riseRun * 100;
            
            // Flood pooling chance prediction based on accumulation and slope:
            let chance = 0;
            if (acc > 15) chance += 50;
            else if (acc > 5) chance += 30;
            else if (acc > 1.2) chance += 15;
            
            if (slopePercent < 1.5) chance += 40;
            else if (slopePercent < 4.0) chance += 20;
            else if (slopePercent > 12.0) chance -= 20;
            
            const predictedChance = Math.max(0, Math.min(95, Math.round(chance)));
            const targetX = canvasX + dx;
            const targetY = canvasY + dy;
            
            // Re-project back to lat/lng
            const finalXDouble = txMin + (targetX / 256);
            const finalYDouble = tyMin + (targetY / 256);
            
            const finalLng = (finalXDouble / n) * 360 - 180;
            const finalLatRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (finalYDouble / n))));
            const finalLat = (finalLatRad * 180) / Math.PI;
            
            features.push({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [finalLng, finalLat]
              },
              properties: {
                accumulation: parseFloat(acc.toFixed(2)),
                elevation: parseFloat(elevation.toFixed(1)),
                slope: parseFloat(slopePercent.toFixed(1)),
                floodChance: predictedChance
              }
            });
          }
        }
      }
      
      onResult({
        type: 'FeatureCollection',
        features
      });
    } catch (err) {
      console.error('Error solving client-side simulation:', err);
      onResult(null);
    }
  }).catch((err) => {
    console.error('Failed to load terrain tiles for simulation:', err);
    onResult(null);
  });
}

import { MiniTimeline, VisualTimeline } from '../../components/map/HazardTimeline';
import ShelterFormModal from '../../components/map/modals/ShelterFormModal';
import HazardFormModal from '../../components/map/modals/HazardFormModal';
import ShelterViewModal from '../../components/map/modals/ShelterViewModal';
import ShelterEditModal from '../../components/map/modals/ShelterEditModal';
import HazardDetailModal from '../../components/map/modals/HazardDetailModal';
import UnifiedMapFilterSearch, { FloatingMapSearch } from '../../components/map/UnifiedMapFilterSearch';
export { FloatingMapSearch, UnifiedMapFilterSearch } from '../../components/map/UnifiedMapFilterSearch';
export { BARANGAY_COORDS } from '../../utils/mapHelper';

function ToolbarBtn({ active, onClick, icon, label, color = 'blue', disabled = false }) {
  const colorMap = {
    blue:   { active: 'bg-blue-600 text-white shadow-blue-500/40', hover: 'hover:bg-slate-100 dark:hover:bg-white/20 text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white' },
    red:    { active: 'bg-red-600 text-white shadow-red-500/40', hover: 'hover:bg-slate-100 dark:hover:bg-white/20 text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white' },
    amber:  { active: 'bg-amber-500 text-white shadow-amber-400/40', hover: 'hover:bg-slate-100 dark:hover:bg-white/20 text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white' },
    green:  { active: 'bg-green-600 text-white shadow-green-500/40', hover: 'hover:bg-slate-100 dark:hover:bg-white/20 text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white' },
    purple: { active: 'bg-purple-600 text-white shadow-purple-500/40', hover: 'hover:bg-slate-100 dark:hover:bg-white/20 text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 select-none whitespace-nowrap cursor-pointer ${
        active ? `${c.active} shadow-md` : c.hover
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// --- Floating Map Legend (minimal, bottom-right) ---
function MapLegend({ simulationMode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 select-none cursor-pointer ${
          open 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'
        }`}
      >
        <SlidersHorizontal size={13} />
        <span>Legend</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-3 bg-white/98 dark:bg-gray-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 w-56 z-50 text-slate-800 dark:text-white">
          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-3">Shelters</p>
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-green-500 shadow-green-500/60 shadow" /><span className="text-xs text-slate-700 dark:text-white/80">Open Shelter</span></div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-red-500 shadow-red-500/60 shadow" /><span className="text-xs text-slate-700 dark:text-white/80">Full / Closed</span></div>
          </div>
          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-3">Hazard Zones</p>
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded bg-blue-600/50 border border-blue-400" /><span className="text-xs text-slate-700 dark:text-white/80">Flood — Low</span></div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded bg-blue-800/60 border border-amber-400" /><span className="text-xs text-slate-700 dark:text-white/80">Flood — Medium</span></div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded bg-red-700/60 border border-white/30" /><span className="text-xs text-slate-700 dark:text-white/80">Flood — High</span></div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded bg-red-950/80 border-2 border-red-500" /><span className="text-xs text-slate-700 dark:text-white/80 font-bold">Earthquake — Block</span></div>
          </div>
          {simulationMode && (
            <>
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400/80 uppercase tracking-widest mb-2">Simulation Roads</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5"><div className="w-6 h-0.5 bg-green-500" /><span className="text-xs text-slate-700 dark:text-white/80">Viable Route</span></div>
                <div className="flex items-center gap-2.5"><div className="w-6 h-0.5 bg-amber-500" /><span className="text-xs text-slate-700 dark:text-white/80">Caution Zone</span></div>
                <div className="flex items-center gap-2.5"><div className="w-6 h-0.5 bg-red-500 border-dashed" /><span className="text-xs text-slate-700 dark:text-white/80">Risk — Avoid</span></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}



// --- Memoized Map Viewer ---
const BARANGAY_COORDS = {
  'Tetuan': [122.0886, 6.9192],
  'Baliwasan': [122.0571, 6.9150],
  'Tugbungan': [122.0975, 6.9231],
  'San Jose': [122.0673, 6.9118],
  'Santa Maria': [122.0789, 6.9322],
  'Pasonanca': [122.0677, 6.9458],
  'Tumaga': [122.0742, 6.9367],
  'San Roque': [122.0583, 6.9361],
  'Guiwan': [122.0972, 6.9278],
  'Putik': [122.1128, 6.9389],
  'Divisoria': [122.1283, 6.9492],
  'Boalan': [122.1211, 6.9442],
  'Sta. Catalina': [122.0850, 6.9078],
  'Zone I (Poblacion)': [122.0750, 6.9056],
  'Zone II (Poblacion)': [122.0780, 6.9070],
  'Zone III (Poblacion)': [122.0730, 6.9090],
  'Zone IV (Poblacion)': [122.0690, 6.9080],
  'Canelar': [122.0689, 6.9142],
  'Calarian': [122.0306, 6.9242],
  'Ayala': [121.9619, 6.9639],
  'Recodo': [121.9483, 6.9744],
  'Cawit': [121.9286, 6.9856],
  'Labuan': [121.9028, 7.0861],
  'Mercedes': [122.1481, 6.9639],
  'Culianan': [122.1642, 6.9750],
  'Vitali': [122.2858, 7.3736],
  'Curuan': [122.2389, 7.2389],
  'Manicahan': [122.1956, 7.0372],
  'Sangali': [122.2306, 7.0989],
  'Taluksangay': [122.1742, 6.9878],
  'Arena Blanco': [122.1333, 6.9028],
  'Rio Hondo': [122.0833, 6.9000],
  'Mampang': [122.1139, 6.9167],
  'Talon-Talon': [122.1000, 6.8972]
};

// Derive a mock road-risk GeoJSON from hazards (until backend bbox road endpoint lands)
function buildSimulationRoadGeoJSON(hazards, scenario) {
  if (!scenario || hazards.length === 0) return { type: 'FeatureCollection', features: [] };
  // Represent each hazard centroid as a tiny "blocked road" line for visual demo
  const features = hazards
    .filter(h => {
      if (scenario === 'rain') return h.hazard_type === 'flood';
      if (scenario === 'tremors') return h.hazard_type === 'earthquake';
      return true;
    })
    .map(h => {
      const lng = parseFloat(h.longitude);
      const lat = parseFloat(h.latitude);
      const offset = 0.002;
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng - offset, lat],
            [lng + offset, lat]
          ]
        },
        properties: {
          risk: h.severity_level === 'high' ? 'high' : h.severity_level === 'medium' ? 'medium' : 'low',
          name: h.name
        }
      };
    });
  return { type: 'FeatureCollection', features };
}

function getSimulationOverlayGeoJSON(mode) {
  if (!mode) return { type: 'FeatureCollection', features: [] };
  
  if (mode === 'rain') {
    // Return simulated flood vulnerability basins in Zamboanga city (Tetuan river, coastal zones)
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Tetuan River Basin - High Susceptibility' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [122.083, 6.915],
              [122.089, 6.915],
              [122.094, 6.924],
              [122.088, 6.926],
              [122.083, 6.915]
            ]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Tugbungan Coastal Plains - Low Elevation Pool' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [122.095, 6.920],
              [122.105, 6.921],
              [122.102, 6.930],
              [122.093, 6.928],
              [122.095, 6.920]
            ]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Baliwasan Creek Estuary - High Risk Runoff' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [122.052, 6.910],
              [122.059, 6.912],
              [122.062, 6.920],
              [122.055, 6.918],
              [122.052, 6.910]
            ]]
          }
        }
      ]
    };
  }
  
  if (mode === 'tremors') {
    // Return simulated structural debris hazard and fault buffers
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Simulated Fault Line Buffer (high danger)' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [122.050, 6.900],
              [122.100, 6.935],
              [122.104, 6.931],
              [122.053, 6.897],
              [122.050, 6.900]
            ]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Masonry Bridge - Debris Hazard Zone' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [122.0880, 6.9188],
              [122.0894, 6.9188],
              [122.0894, 6.9196],
              [122.0880, 6.9196],
              [122.0880, 6.9188]
            ]]
          }
        }
      ]
    };
  }
  
  return { type: 'FeatureCollection', features: [] };
}

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

// ─── Scoped Risk Alerts Drawer ───────────────────────────────────────────────
function RiskAlertsDrawer({ hazards, simulationMode, drawerOpen, setDrawerOpen }) {
  const activeHazards = hazards.filter(h =>
    simulationMode === 'rain'
      ? h.hazard_type === 'flood'
      : simulationMode === 'tremors'
      ? h.hazard_type === 'earthquake'
      : true
  );

  const combinedAlerts = activeHazards
    .map(h => ({ ...h, alertType: 'hazard' }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const severityIcon = (alert) => {
    const s = alert.severity_level;
    if (s === 'high') return <TriangleAlert size={14} className="text-red-400" />;
    if (s === 'medium') return <Waves size={14} className="text-orange-400" />;
    return <Droplets size={14} className="text-yellow-400" />;
  };
  
  const severityBg = (alert) => {
    const s = alert.severity_level;
    if (s === 'high') return 'border-red-500/40 bg-red-950/30';
    if (s === 'medium') return 'border-orange-500/40 bg-orange-950/20';
    return 'border-yellow-500/30 bg-yellow-950/20';
  };

  return (
    <div
      className={`absolute top-0 right-0 h-full z-20 flex transition-all duration-300 ${
        drawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: 300 }}
    >
      <button
        onClick={() => setDrawerOpen(o => !o)}
        className="absolute -left-8 top-1/2 -translate-y-1/2 bg-white/95 dark:bg-gray-900/90 border border-slate-200 dark:border-white/10 text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white rounded-l-xl px-1.5 py-4 flex items-center transition cursor-pointer shadow-md"
      >
        {drawerOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="w-full h-full bg-white/98 dark:bg-gray-950/95 backdrop-blur-xl border-l border-slate-200 dark:border-white/10 flex flex-col text-slate-800 dark:text-white">
        <div className="p-4 border-b border-slate-200 dark:border-white/10">
          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">Command Feed</p>
          <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
            <Shield size={15} className="text-blue-600 dark:text-blue-400" />
            {simulationMode ? `Simulation: ${simulationMode === 'rain' ? '🌧 Heavy Rain' : '🌋 Tremors'}` : 'Active Risk Alerts'}
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-white/30 mt-1">Showing {combinedAlerts.length} alert{combinedAlerts.length !== 1 ? 's' : ''} in current scope</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {combinedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
              <Shield size={32} className="text-white mb-3" />
              <p className="text-xs text-white font-bold">No active alerts</p>
            </div>
          ) : (
            combinedAlerts.map(alert => {
              const name = alert.name;
              const typeLabel = alert.hazard_type;
              
              return (
                <div key={`hz-${alert.id}`} className={`border rounded-xl p-3 ${severityBg(alert)}`}>
                  <div className="flex items-start gap-2">
                    {severityIcon(alert)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white truncate">{name}</p>
                      <p className="text-[10px] text-white/50 mt-0.5 capitalize">
                        {typeLabel} · {alert.severity_level} severity · {alert.radius_meters}m radius
                      </p>
                      {alert.estimated_duration_hours && (
                        <MiniTimeline 
                          createdAt={alert.created_at} 
                          durationHours={alert.estimated_duration_hours} 
                          hazardType={alert.hazard_type} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────
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
            pitch: 52,
            duration: 1800,
            essential: true
          });
        }
      }
    }
  }, [focusLat, focusLng, mapRef]);

  const [isInspecting, setIsInspecting] = useState(false);
  const isInspectingRef = useRef(false);
  const orbitAnimationRef = useRef(null);
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

  const stopInspection = useCallback(() => {
    const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
    if (map) {
      map.stop();
      map.flyTo({
        center: [122.0790, 6.9214],
        zoom: 12.8,
        pitch: is3D ? 45 : 0,
        bearing: 0,
        duration: 1500,
        essential: true
      });
    }
    if (orbitAnimationRef.current) {
      cancelAnimationFrame(orbitAnimationRef.current);
      orbitAnimationRef.current = null;
    }
    isInspectingRef.current = false;
    setIsInspecting(false);
    setSimulationGeoJSON(null);
  }, [is3D]);

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
    if (!map) return;

    // CSWDO View-Only: smooth pan/zoom to location without 3D orbit tilt/rotation
    if (isCSWDO) {
      map.flyTo({
        center: [lng, lat],
        zoom: 16.5,
        duration: 1200,
        essential: true,
      });
      return;
    }

    // Halt any ongoing sweep first
    stopInspection();

    isInspectingRef.current = true;
    setIsInspecting(true);

    // 1. Fly to location
    map.flyTo({
      center: [lng, lat],
      zoom: 17.8, // scope of ~50-100m
      pitch: 62,
      duration: 2500,
      essential: true
    });

    // 2. Start 360 orbit rotation
    map.once('moveend', () => {
      // Abort if canceled during flight
      if (!isInspectingRef.current) return;

      let lastTimestamp = null;
      let elapsed = 0; // accumulated elapsed time
      const duration = 20000; // 20 seconds (slower by half)
      const startBearing = map.getBearing();

      const animateOrbit = (timestamp) => {
        if (!isInspectingRef.current) return; // Abort if canceled mid-orbit

        if (lastTimestamp === null) {
          lastTimestamp = timestamp;
          orbitAnimationRef.current = requestAnimationFrame(animateOrbit);
          return;
        }

        const delta = Math.min(timestamp - lastTimestamp, 100);
        lastTimestamp = timestamp;

        if (!isModalOpenRef.current) {
          elapsed += delta;
        }

        const progress = Math.min(elapsed / duration, 1);
        const currentBearing = startBearing + (progress * 360);
        map.setBearing(currentBearing % 360);

        if (progress < 1) {
          orbitAnimationRef.current = requestAnimationFrame(animateOrbit);
        } else {
          isInspectingRef.current = false;
          setIsInspecting(false);
          orbitAnimationRef.current = null;
        }
      };

      orbitAnimationRef.current = requestAnimationFrame(animateOrbit);
    });
  }, [stopInspection, isCSWDO]);



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
    <div className="flex flex-col h-full relative bg-gray-950">
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

      {isCSWDO ? (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 xl:gap-3.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl px-3 xl:px-4 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] max-w-[calc(100vw-360px)] overflow-visible whitespace-nowrap text-slate-800 dark:text-white">
          {/* Title & Subtitle Section */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
              <Building2 size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900 dark:text-white tracking-wide uppercase">CSWDO Situational Map</span>
              <span className="text-[10px] text-slate-500 dark:text-white/50 font-medium">Shelter Locations, Live Headcount &amp; Hazards</span>
            </div>
          </div>

          <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />

          {/* Search & Filter for CSWDO (Option 1: Integrated in Top Navigation) */}
          <UnifiedMapFilterSearch
            shelters={shelters}
            hazards={hazards}
            rescueUnits={rescueUnits}
            activeRescueMissions={activeRescueMissions}
            activeFilter={activeMapFilter}
            onChangeFilter={setActiveMapFilter}
            showRoadNetwork={showRoadNetwork}
            onToggleRoadNetwork={setShowRoadNetwork}
            showHeatmap={showHeatmap}
            onToggleHeatmap={setShowHeatmap}
            showWeather={showWeather}
            onToggleWeather={setShowWeather}
            isolateZamboanga={isolateZamboanga}
            onToggleIsolateZamboanga={setIsolateZamboanga}
            onRecenter={handleRecenterToZamboanga}
            onSelectLocation={handleSelectMapLocation}
            isCSWDO={true}
          />

          <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />

          {/* Dedicated View Only Status Column */}
          <div className="flex flex-col items-center justify-center px-1">
            <span className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-wider mb-0.5 select-none">Access</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-3 py-1 rounded-lg uppercase tracking-wider shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              View Only
            </span>
          </div>

          <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />

          {/* Headcount & Hazards Summary - Single Row */}
          <div className="flex items-center gap-3">
            {/* Shelters & Total Headcount */}
            <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3.5 py-1.5 rounded-xl">
              <MapPin size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-white/60 font-medium text-[11px]">Shelters:</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-[12px]">{shelters?.length || 0}</span>
                <span className="text-slate-300 dark:text-white/20">|</span>
                <span className="text-slate-500 dark:text-white/60 font-medium text-[11px]">Total Headcount:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[12px]">
                  {shelters?.reduce((acc, s) => acc + (parseInt(s.current_occupancy) || 0), 0) || 0}
                </span>
                <span className="text-slate-400 dark:text-white/40 text-[10px] font-mono">
                  / {shelters?.reduce((acc, s) => acc + (parseInt(s.max_capacity) || 0), 0) || 0} Cap
                </span>
              </div>
            </div>

            {/* Active Hazards */}
            <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3.5 py-1.5 rounded-xl">
              <AlertTriangle size={15} className="text-amber-500 dark:text-amber-400 shrink-0" />
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 dark:text-white/60 font-medium text-[11px]">Active Hazards:</span>
                <span className="font-extrabold text-amber-600 dark:text-amber-400 text-[12px]">{hazards?.length || 0} Active</span>
              </div>
            </div>
          </div>

          <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />

          {/* Feed Group */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-0.5 select-none">Feed</span>
            <div className="flex items-center">
              <ToolbarBtn active={drawerOpen} onClick={() => setDrawerOpen(o => !o)} icon={<SlidersHorizontal size={14} />} label="Alerts" color="purple" />
            </div>
          </div>

          <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />

          {/* Theme Mode Toggle (Light / Dark) */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-0.5 select-none">Theme</span>
            <button
              type="button"
              onClick={toggleDarkMode}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme mode"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition cursor-pointer shadow-xs"
            >
              {darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-600" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-stretch gap-1.5 xl:gap-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-1 xl:p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] w-max max-w-[calc(100vw-360px)] overflow-visible whitespace-nowrap text-slate-800 dark:text-white">
          {/* Option 1: Search & Filter + Recenter Hub (Far Left of Top Bar) */}
          <UnifiedMapFilterSearch
            shelters={shelters}
            hazards={hazards}
            rescueUnits={rescueUnits}
            activeRescueMissions={activeRescueMissions}
            activeFilter={activeMapFilter}
            onChangeFilter={setActiveMapFilter}
            showRoadNetwork={showRoadNetwork}
            onToggleRoadNetwork={setShowRoadNetwork}
            showHeatmap={showHeatmap}
            onToggleHeatmap={setShowHeatmap}
            showWeather={showWeather}
            onToggleWeather={setShowWeather}
            isolateZamboanga={isolateZamboanga}
            onToggleIsolateZamboanga={setIsolateZamboanga}
            onRecenter={handleRecenterToZamboanga}
            onSelectLocation={handleSelectMapLocation}
            isCSWDO={false}
          />

          <div className="w-px bg-slate-200 dark:bg-white/10 self-stretch my-0.5" />

          {/* Disaster Scenario Simulation Group */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-0.5 select-none">Disaster Sim</span>
            <select
              value={activeDisasterSim}
              aria-label="Disaster scenario simulation"
              onChange={(e) => {
                const val = e.target.value;
                setActiveDisasterSim(val);
                api.post('/simulation/toggle', { simulation_type: val })
                  .then(() => queryClient.invalidateQueries(['mapDashboard']))
                  .catch(err => console.warn('Sim toggle warning:', err));
              }}
              className="bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[11px] font-extrabold rounded-lg px-2 py-1 focus:ring-1 focus:ring-amber-400 outline-none cursor-pointer shadow-xs"
            >
              <option value="none">⚪ Off</option>
              <option value="siege">⚔️ Siege</option>
              <option value="flood">🌊 Flood</option>
              <option value="earthquake">🌋 Earthquake</option>
              <option value="fire">🚒 Fire</option>
              <option value="chemical">🧪 HazMat</option>
            </select>
          </div>

          <div className="w-px bg-slate-200 dark:bg-white/10 self-stretch my-0.5" />

          {/* Live OpenWeather Forecast & 24h History Trigger */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest mb-0.5 select-none whitespace-nowrap flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
              <CloudRain size={9} />
              <span>Weather &amp; Forecast</span>
            </span>
            <button
              type="button"
              onClick={() => setIsWeatherModalOpen(true)}
              className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1 rounded-lg border text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap ${
                weatherTelemetry?.is_raining
                  ? (weatherTelemetry.continuous_rain_duration_minutes >= (weatherTelemetry?.flood_trigger_threshold_minutes || 45)
                      ? 'bg-rose-100 dark:bg-rose-950/90 hover:bg-rose-200 dark:hover:bg-rose-900/90 border-rose-300 dark:border-rose-500 text-rose-800 dark:text-rose-200 animate-pulse'
                      : weatherTelemetry.continuous_rain_duration_minutes >= Math.max(15, (weatherTelemetry?.flood_trigger_threshold_minutes || 45) - 15)
                        ? 'bg-amber-100 dark:bg-amber-950/90 hover:bg-amber-200 dark:hover:bg-amber-900/90 border-amber-300 dark:border-amber-500 text-amber-800 dark:text-amber-200'
                        : 'bg-blue-100 dark:bg-blue-950/90 hover:bg-blue-200 dark:hover:bg-blue-900/90 border-blue-300 dark:border-blue-500 text-blue-800 dark:text-blue-200')
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title="Click to open Zamboanga Weather Forecast, 24-Hour History & Rainfall Timeline"
            >
              {weatherTelemetry?.is_raining ? (
                <>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-[11px]">
                    {weatherTelemetry.continuous_rain_duration_minutes >= (weatherTelemetry?.flood_trigger_threshold_minutes || 45)
                      ? `🚨 ${weatherTelemetry.continuous_rain_duration_minutes}m Rain (EOC)`
                      : `🌧️ ${weatherTelemetry.continuous_rain_duration_minutes > 0 ? `${weatherTelemetry.continuous_rain_duration_minutes}m Rain` : 'Rain Starting'}`}
                  </span>
                  {weatherTelemetry.rain_mm > 0 && (
                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-black/40 text-cyan-700 dark:text-cyan-300 font-bold">
                      {weatherTelemetry.rain_mm}mm/h
                    </span>
                  )}
                  {weatherTelemetry.temp_c && (
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                      {weatherTelemetry.temp_c}°C
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Sun size={12} className="text-amber-500 dark:text-amber-400" />
                  <span className="text-slate-700 dark:text-slate-200 font-semibold text-[11px]">
                    ☀️ Clear {weatherTelemetry?.temp_c ? `(${weatherTelemetry.temp_c}°C)` : ''}
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="w-px bg-slate-200 dark:bg-white/10 self-stretch my-0.5" />

          {/* Proactive Early Warning & Presets Command */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest mb-0.5 select-none whitespace-nowrap">Early Warning</span>
            <button
              type="button"
              onClick={() => setIsProactiveModalOpen(true)}
              className="flex items-center gap-1 px-2 xl:px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white border border-red-500/40 text-xs font-bold rounded-lg shadow-xs hover:shadow-red-500/30 transition cursor-pointer whitespace-nowrap"
              title="Open CDRRMO Proactive Hazard Command & River Basin Controls"
            >
              <ShieldAlert size={13} className="text-white" />
              <span className="text-[11px]">Proactive EOC</span>
            </button>
          </div>

          <div className="w-px bg-slate-200 dark:bg-white/10 self-stretch my-0.5" />

          {/* Pinpoint & Orbit Tools Group */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-0.5 select-none">Pinpoint</span>
            <div className="flex items-center gap-1">
              {!pinMode ? (
                <>
                  <ToolbarBtn active={false} onClick={() => setPinMode('inspect')} icon={<Eye size={13} />} label="Inspect" color="purple" />
                  <ToolbarBtn active={false} onClick={() => setPinMode('shelter')} icon={<MapPin size={13} />} label="Shelter" color="blue" />
                  <ToolbarBtn active={false} onClick={() => setPinMode('hazard')} icon={<AlertTriangle size={13} />} label="Hazard" color="red" />
                </>
              ) : (
                <ToolbarBtn active={false} onClick={handleCancelPin} icon={<X size={13} />} label="Cancel" color="red" />
              )}
            </div>
          </div>

          <div className="w-px bg-slate-200 dark:bg-white/10 self-stretch my-0.5" />

          {/* Alerts Feed */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-0.5 select-none">Feed</span>
            <div className="flex items-center">
              <ToolbarBtn active={drawerOpen} onClick={() => setDrawerOpen(o => !o)} icon={<SlidersHorizontal size={13} />} label="Alerts" color="purple" />
            </div>
          </div>

          <div className="w-px bg-slate-200 dark:bg-white/10 self-stretch my-0.5" />

          {/* Theme Mode Toggle (Light / Dark) */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-0.5 select-none">Theme</span>
            <button
              type="button"
              onClick={toggleDarkMode}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme mode"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition cursor-pointer shadow-xs"
            >
              {darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-600" />}
            </button>
          </div>
        </div>
      )}

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
                  <span>🔍 <strong className="font-black tracking-wide uppercase">Tactical 3D Inspection Active:</strong> Click any location on the map to run a 360° situational orbit.</span>
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
        {showLocalSimulation && !isCSWDO && (
          <div className="absolute top-20 left-6 z-40 w-80 bg-white/98 dark:bg-gray-950/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-slate-800 dark:text-white flex flex-col gap-4 animate-in slide-in-from-left duration-250">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="text-blue-400 animate-pulse" size={18} />
                <span className="text-sm font-black text-white uppercase tracking-wider">Flood Flow Simulation</span>
              </div>
              <button onClick={() => handleSetLocalSimulation(false)} className="text-white/40 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            
            {simSetupState === 'configuring' && (
              <>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Analyze localized water accumulation and low-elevation runoff patterns based on real-time Mapbox terrain elevation heights.
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white/80">Search Radius:</span>
                    <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">{selectedRadiusMeters}m</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={selectedRadiusMeters}
                    onChange={(e) => setSelectedRadiusMeters(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] text-white/40 font-bold">
                    <span>100m (High Res)</span>
                    <span>2.0km (Macro)</span>
                  </div>
                </div>
                
                <div className="flex gap-2.5 mt-2">
                  <button
                    onClick={() => {
                      setSimSetupState('placing');
                      setPinMode('sim-placement');
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-blue-500/20 transition transform active:scale-95 duration-200"
                  >
                    Select Location
                  </button>
                  <button
                    onClick={() => {
                      setSimSetupState('processing');
                      const map = mapRef.current?.getMap();
                      if (map) {
                        const center = map.getCenter();
                        const coords = { longitude: center.lng, latitude: center.lat };
                        setSimCenter(coords);
                        runSimulationFlow(coords.longitude, coords.latitude, selectedRadiusMeters);
                      }
                    }}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white/90 font-extrabold text-xs rounded-xl border border-white/5 transition transform active:scale-95 duration-200"
                  >
                    Center of Map
                  </button>
                </div>
              </>
            )}
            
            {simSetupState === 'placing' && (
              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                  <AlertTriangle size={14} className="shrink-0 animate-bounce" />
                  <span>Click anywhere on the map to place the simulation center.</span>
                </div>
                <button
                  onClick={() => {
                    setSimSetupState('configuring');
                    setPinMode(null);
                  }}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-extrabold text-xs rounded-xl border border-white/5 transition"
                >
                  Back
                </button>
              </div>
            )}
            
            {simSetupState === 'processing' && (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-extrabold text-white uppercase tracking-wider animate-pulse">Running Simulation...</p>
                <p className="text-[10px] text-white/40">Fetching elevation height grids</p>
              </div>
            )}
            
            {simSetupState === 'rendered' && (
              <>
                <div className="flex flex-col gap-1.5 p-3 bg-blue-500/5 border border-blue-500/15 rounded-2xl text-xs">
                  <div className="flex justify-between font-bold text-white/80">
                    <span>Radius Scope:</span>
                    <span className="text-blue-400">{selectedRadiusMeters}m</span>
                  </div>
                  <div className="flex justify-between font-bold text-white/80">
                    <span>Center:</span>
                    <span className="text-white/60 text-[10px] font-mono">{simCenter?.longitude.toFixed(5)}, {simCenter?.latitude.toFixed(5)}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-white/80 mt-1.5 pt-1.5 border-t border-white/5">
                    <span>Overlay Mode:</span>
                    <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 shrink-0">
                      <button
                        onClick={() => setSimOverlayMode('flow')}
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase transition ${
                          simOverlayMode === 'flow' ? 'bg-blue-600 text-white shadow' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        Flow
                      </button>
                      <button
                        onClick={() => setSimOverlayMode('gradient')}
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase transition ${
                          simOverlayMode === 'gradient' ? 'bg-blue-600 text-white shadow' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        Gradient
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSimSetupState('configuring');
                      setSimCenter(null);
                      setSimulationGeoJSON(null);
                      setPlacementCoords(null);
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-blue-500/20 transition"
                  >
                    Reposition
                  </button>
                  <button
                    onClick={() => {
                      handleSetLocalSimulation(false);
                    }}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white/90 font-extrabold text-xs rounded-xl border border-white/5 transition"
                  >
                    Clear Sim
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {isInspecting && !isCSWDO && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in zoom-in duration-200">
            <button
              onClick={stopInspection}
              className="bg-red-600/95 backdrop-blur-md border border-red-500/50 hover:bg-red-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-[0_8px_32px_rgba(239,68,68,0.4)] flex items-center gap-2 transition transform hover:scale-105 active:scale-95 duration-200"
            >
              <span className="w-2.5 h-2.5 bg-white rounded-sm"></span> Stop 3D Sweep
            </button>
          </div>
        )}
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
