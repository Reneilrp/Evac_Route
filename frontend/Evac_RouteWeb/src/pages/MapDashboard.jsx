import React from "react";
import { useState, useMemo, useEffect } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import {
  MapPin, AlertTriangle, X, Cloud, Flame, Zap,
  ChevronRight, ChevronLeft, Moon, Satellite, Mountain,
  TriangleAlert, Droplets, Waves, Shield, SlidersHorizontal
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// --- Helper: Generate Circle Polygons for real-world meters ---
function createCirclePolygon(center, radiusInMeters, points = 64) {
  const [lng, lat] = center;
  const coords = [];
  const distanceX = radiusInMeters / (111320 * Math.cos(lat * Math.PI / 180));
  const distanceY = radiusInMeters / 110540;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  };
}

// --- Toolbar Toggle Button ---
function ToolbarBtn({ active, onClick, icon, label, color = 'blue', disabled = false }) {
  const colorMap = {
    blue:   { active: 'bg-blue-600 text-white shadow-blue-500/40', hover: 'hover:bg-white/20 text-white/70 hover:text-white' },
    red:    { active: 'bg-red-600 text-white shadow-red-500/40', hover: 'hover:bg-white/20 text-white/70 hover:text-white' },
    amber:  { active: 'bg-amber-500 text-white shadow-amber-400/40', hover: 'hover:bg-white/20 text-white/70 hover:text-white' },
    green:  { active: 'bg-green-600 text-white shadow-green-500/40', hover: 'hover:bg-white/20 text-white/70 hover:text-white' },
    purple: { active: 'bg-purple-600 text-white shadow-purple-500/40', hover: 'hover:bg-white/20 text-white/70 hover:text-white' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 select-none ${
        active ? `${c.active} shadow-lg` : c.hover
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
    <div className="absolute bottom-20 right-4 z-10">
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-gray-900/90 backdrop-blur-md border border-white/10 text-white/60 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transition"
      >
        {open ? 'Hide Legend' : 'Map Legend'}
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-white/10 w-56">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Shelters</p>
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-green-400 shadow-green-400/60 shadow" /><span className="text-xs text-white/80">Open Shelter</span></div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-red-400 shadow-red-400/60 shadow" /><span className="text-xs text-white/80">Full / Closed</span></div>
          </div>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Hazard Zones</p>
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded bg-blue-600/50 border border-blue-400" /><span className="text-xs text-white/80">Flood — Low</span></div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded bg-blue-800/60 border border-amber-400" /><span className="text-xs text-white/80">Flood — Medium</span></div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded bg-red-700/60 border border-white/30" /><span className="text-xs text-white/80">Flood — High</span></div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded bg-red-950/80 border-2 border-red-500" /><span className="text-xs text-white/80 font-bold">Earthquake — Block</span></div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded bg-orange-600/50 border border-white/20" /><span className="text-xs text-white/80">Road Maintenance</span></div>
          </div>
          {simulationMode && (
            <>
              <p className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest mb-2">Simulation Roads</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5"><div className="w-6 h-0.5 bg-green-400" /><span className="text-xs text-white/80">Viable Route</span></div>
                <div className="flex items-center gap-2.5"><div className="w-6 h-0.5 bg-amber-400" /><span className="text-xs text-white/80">Caution Zone</span></div>
                <div className="flex items-center gap-2.5"><div className="w-6 h-0.5 bg-red-500 border-dashed" /><span className="text-xs text-white/80">Risk — Avoid</span></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}



// --- Shelter Form Modal ---
function ShelterFormModal({ location, onConfirm, onCancel, isLoading }) {
  const [name, setName] = useState('');
  const [cap, setCap] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !cap || isNaN(parseInt(cap, 10))) return;
    onConfirm({ name, max_capacity: parseInt(cap, 10) });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <MapPin size={20} className="text-blue-500" /> Pin New Shelter
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition"><X size={22} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Location: <span className="font-mono text-xs">{location?.latitude?.toFixed(5)}, {location?.longitude?.toFixed(5)}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Shelter Name</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Tetuan Covered Court"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Maximum Capacity</label>
            <input
              type="number"
              min="1"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 150"
              value={cap}
              onChange={e => setCap(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60"
            >
              {isLoading ? 'Saving...' : 'Confirm Shelter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Hazard Form Modal ---
function HazardFormModal({ location, onConfirm, onCancel, isLoading }) {
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('50');
  const [hazardType, setHazardType] = useState('flood');
  const [severityLevel, setSeverityLevel] = useState('medium');

  const handleHazardTypeChange = (e) => {
    const type = e.target.value;
    setHazardType(type);
    if (type === 'earthquake' || type === 'maintenance') {
      setSeverityLevel('high');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;
    onConfirm({ 
      name, 
      radius_meters: parseFloat(radius) || 50,
      hazard_type: hazardType,
      severity_level: severityLevel
    });
  };

  const isSeverityLocked = hazardType === 'earthquake' || hazardType === 'maintenance';

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" /> Flag Hazard Zone
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition"><X size={22} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Location: <span className="font-mono text-xs">{location?.latitude?.toFixed(5)}, {location?.longitude?.toFixed(5)}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Hazard Description</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g. Flooded Bridge, Landslide Zone"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Hazard Type</label>
              <select
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={hazardType}
                onChange={handleHazardTypeChange}
              >
                <option value="flood">Flood</option>
                <option value="earthquake">Earthquake</option>
                <option value="maintenance">Road Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Severity</label>
              <select
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-500"
                value={severityLevel}
                onChange={e => setSeverityLevel(e.target.value)}
                disabled={isSeverityLocked}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Danger Radius (meters)</label>
            <input
              type="number"
              min="10"
              max="5000"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              value={radius}
              onChange={e => setRadius(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60"
            >
              {isLoading ? 'Saving...' : 'Flag Hazard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Shelter Edit Modal ---
function ShelterEditModal({ shelter, onUpdate, onDelete, onCancel, isLoading }) {
  const { user } = useAuth();
  const [name, setName] = useState(shelter.name);
  const [cap, setCap] = useState(shelter.max_capacity);
  const [status, setStatus] = useState(shelter.status);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !cap || isNaN(parseInt(cap, 10))) return;
    onUpdate({ name, max_capacity: parseInt(cap, 10), status });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <MapPin size={20} className="text-blue-500" /> Manage Shelter
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Shelter Name</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Max Capacity</label>
              <input
                type="number"
                min="1"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={cap}
                onChange={e => setCap(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="full">Full</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            {user?.role === 'admin' ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${shelter.name}?`)) {
                    onDelete();
                  }
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-lg font-semibold text-sm transition"
              >
                Delete
              </button>
            ) : (
              <div className="text-xs text-gray-400 font-semibold flex items-center bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200">
                Staff Cannot Delete
              </div>
            )}
            <div className="flex-1 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-semibold text-sm transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Hazard Detail Modal ---
function HazardDetailModal({ hazard, onResolve, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-red-600 text-lg flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" /> Active Hazard Zone
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition"><X size={22} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</p>
            <p className="text-gray-800 font-medium text-lg mt-0.5">{hazard.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Danger Radius</p>
            <p className="text-gray-800 font-medium mt-0.5">{hazard.radius_meters} meters</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onResolve}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60"
            >
              Resolve Hazard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Memoized Map Viewer ---
const BARANGAY_COORDS = {
  'Tetuan': [122.0886, 6.9192],
  'Baliwasan': [122.0571, 6.9150],
  'Tugbungan': [122.0975, 6.9231],
  'San Jose': [122.0673, 6.9118],
  'Santa Maria': [122.0789, 6.9322]
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
  simulationMode,
}) => {
  const [viewState, setViewState] = useState({
    longitude: 122.0729,
    latitude: 6.9126,
    zoom: 13
  });
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

  const hazardsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: hazards.map(h => ({
      ...createCirclePolygon([parseFloat(h.longitude), parseFloat(h.latitude)], parseFloat(h.radius_meters || 50)),
      properties: { id: h.id, name: h.name, hazard_type: h.hazard_type, severity_level: h.severity_level, radius: h.radius_meters }
    }))
  }), [hazards]);

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
    <div className="w-full h-full relative">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle={MAP_STYLES[mapStyle].url}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        cursor={pinMode ? 'crosshair' : 'grab'}
      >
        <NavigationControl position="top-right" showCompass showZoom />

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

        {/* Hazard Zone Polygons */}
        <Source id="hazards-source" type="geojson" data={hazardsGeoJSON}>
          <Layer id="hazards-fill" type="fill" paint={{
            'fill-color': ['match', ['get', 'hazard_type'],
              'flood', ['match', ['get', 'severity_level'], 'low', '#00509e', 'medium', '#1d4ed8', 'high', '#d90429', '#00509e'],
              'earthquake', '#7f1d1d', 'maintenance', '#f77f00', '#ef4444'],
            'fill-opacity': ['match', ['get', 'hazard_type'],
              'flood', ['match', ['get', 'severity_level'], 'low', 0.3, 'medium', 0.4, 'high', 0.5, 0.3],
              'earthquake', 0.6, 'maintenance', 0.5, 0.4]
          }} />
          <Layer id="hazards-line" type="line" paint={{
            'line-color': ['match', ['get', 'hazard_type'],
              'flood', ['match', ['get', 'severity_level'], 'medium', '#f59e0b', 'high', '#ffffff', '#00509e'],
              'earthquake', '#ef4444', 'maintenance', '#ffffff', '#ef4444'],
            'line-width': ['match', ['get', 'hazard_type'], 'earthquake', 4, 'maintenance', 1, 2]
          }} />
        </Source>

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

        {/* Shelter Markers */}
        {shelters.map(shelter => (
          <Marker key={`s-${shelter.id}`} longitude={parseFloat(shelter.longitude)} latitude={parseFloat(shelter.latitude)} anchor="bottom">
            <div onClick={e => { e.stopPropagation(); setSelectedShelter(shelter); }} className="flex flex-col items-center group relative cursor-pointer">
              <MapPin size={30} className={shelter.status === 'open' ? 'text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]' : 'text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]'} />
              <span className="bg-gray-950/90 text-white border border-white/10 text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-lg mt-0.5">
                {shelter.current_occupancy}/{shelter.max_capacity}
              </span>
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col w-max bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-3 z-50">
                <p className="font-black text-white text-sm">{shelter.name}</p>
                <p className="text-xs text-white/50 mt-0.5">Status: <span className={`font-bold uppercase ${shelter.status === 'open' ? 'text-green-400' : 'text-red-400'}`}>{shelter.status}</span></p>
                <p className="text-[10px] text-white/30 mt-1">Click to manage</p>
              </div>
            </div>
          </Marker>
        ))}

        {/* Hazard click zones */}
        {hazards.map(hazard => (
          <Marker key={`h-click-${hazard.id}`} longitude={parseFloat(hazard.longitude)} latitude={parseFloat(hazard.latitude)} anchor="center">
            <div onClick={e => { e.stopPropagation(); setSelectedHazard(hazard); }} className="w-12 h-12 flex items-center justify-center cursor-pointer group">
              <AlertTriangle size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Marker>
        ))}

        {/* Pending pin */}
        {pendingLocation && !showShelterForm && !showHazardForm && (
          <Marker longitude={pendingLocation.longitude} latitude={pendingLocation.latitude} anchor="bottom">
            <MapPin size={48} className={`${pinMode === 'shelter' ? 'text-blue-400 fill-blue-400/20' : 'text-red-400 fill-red-400/20'} animate-bounce drop-shadow-[0_0_12px_rgba(96,165,250,0.8)]`} />
          </Marker>
        )}
      </Map>

      <MapLegend simulationMode={simulationMode} />
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

  const severityIcon = (s) => {
    if (s === 'high') return <TriangleAlert size={14} className="text-red-400" />;
    if (s === 'medium') return <Waves size={14} className="text-orange-400" />;
    return <Droplets size={14} className="text-yellow-400" />;
  };
  const severityBg = (s) => {
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
        className="absolute -left-8 top-1/2 -translate-y-1/2 bg-gray-900/90 border border-white/10 text-white/60 hover:text-white rounded-l-xl px-1.5 py-4 flex items-center transition"
      >
        {drawerOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="w-full h-full bg-gray-950/95 backdrop-blur-xl border-l border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Command Feed</p>
          <h3 className="text-sm font-black text-white mt-0.5 flex items-center gap-2">
            <Shield size={15} className="text-blue-400" />
            {simulationMode ? `Simulation: ${simulationMode === 'rain' ? '🌧 Heavy Rain' : '🌋 Tremors'}` : 'Active Risk Alerts'}
          </h3>
          <p className="text-[10px] text-white/30 mt-1">Showing {activeHazards.length} zone{activeHazards.length !== 1 ? 's' : ''} in current scope</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeHazards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
              <Shield size={32} className="text-white mb-3" />
              <p className="text-xs text-white font-bold">No active alerts</p>
            </div>
          ) : (
            activeHazards.map(h => (
              <div key={h.id} className={`border rounded-xl p-3 ${severityBg(h.severity_level)}`}>
                <div className="flex items-start gap-2">
                  {severityIcon(h.severity_level)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate">{h.name}</p>
                    <p className="text-[10px] text-white/50 mt-0.5 capitalize">
                      {h.hazard_type} · {h.severity_level} severity · {h.radius_meters}m radius
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export default function MapDashboard() {
  const queryClient = useQueryClient();
  const [pinMode, setPinMode] = useState(null);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [showShelterForm, setShowShelterForm] = useState(false);
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [selectedHazard, setSelectedHazard] = useState(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [mapStyle, setMapStyle] = useState('dark');
  const [simulationMode, setSimulationMode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: dashboardData } = useQuery({
    queryKey: ['map-dashboard'],
    queryFn: () => api.get('/map/dashboard').then(r => r.data),
    refetchInterval: 30000,
  });

  const shelters = dashboardData?.shelters || [];
  const hazards = dashboardData?.hazards || [];
  const demographics = dashboardData?.demographics || [];

  const addShelterMutation = useMutation({
    mutationFn: (data) => api.post('/shelters', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['map-dashboard'] }); setPinMode(null); setPendingLocation(null); setShowShelterForm(false); }
  });
  const addHazardMutation = useMutation({
    mutationFn: (data) => api.post('/hazards', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['map-dashboard'] }); setPinMode(null); setPendingLocation(null); setShowHazardForm(false); }
  });
  const updateShelterMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/shelters/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['map-dashboard'] }); setSelectedShelter(null); }
  });
  const deleteShelterMutation = useMutation({
    mutationFn: (id) => api.delete(`/shelters/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['map-dashboard'] }); setSelectedShelter(null); }
  });
  const resolveHazardMutation = useMutation({
    mutationFn: (id) => api.put(`/hazards/${id}/resolve`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['map-dashboard'] }); setSelectedHazard(null); }
  });

  const handleMapClick = (e) => {
    if (pinMode) {
      setPendingLocation({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
      if (pinMode === 'shelter') setShowShelterForm(true);
      if (pinMode === 'hazard') setShowHazardForm(true);
    }
  };
  const handleCancelPin = () => { setPinMode(null); setPendingLocation(null); setShowShelterForm(false); setShowHazardForm(false); };
  const handleConfirmShelter = ({ name, max_capacity }) => addShelterMutation.mutate({ name, latitude: pendingLocation.latitude, longitude: pendingLocation.longitude, max_capacity });
  const handleConfirmHazard = ({ name, radius_meters, hazard_type, severity_level }) => addHazardMutation.mutate({ name, latitude: pendingLocation.latitude, longitude: pendingLocation.longitude, radius_meters, hazard_type, severity_level });
  const handleUpdateShelter = (data) => updateShelterMutation.mutate({ id: selectedShelter.id, data });
  const handleDeleteShelter = () => deleteShelterMutation.mutate(selectedShelter.id);
  const handleResolveHazard = () => resolveHazardMutation.mutate(selectedHazard.id);

  const toggleSimulation = (mode) => {
    setSimulationMode(prev => prev === mode ? null : mode);
    if (!drawerOpen) setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-full relative bg-gray-950">
      {showShelterForm && pendingLocation && <ShelterFormModal location={pendingLocation} onConfirm={handleConfirmShelter} onCancel={handleCancelPin} isLoading={addShelterMutation.isPending} />}
      {showHazardForm && pendingLocation && <HazardFormModal location={pendingLocation} onConfirm={handleConfirmHazard} onCancel={handleCancelPin} isLoading={addHazardMutation.isPending} />}
      {selectedShelter && <ShelterEditModal shelter={selectedShelter} onUpdate={handleUpdateShelter} onDelete={handleDeleteShelter} onCancel={() => setSelectedShelter(null)} isLoading={updateShelterMutation.isPending || deleteShelterMutation.isPending} />}
      {selectedHazard && <HazardDetailModal hazard={selectedHazard} onResolve={handleResolveHazard} onCancel={() => setSelectedHazard(null)} isLoading={resolveHazardMutation.isPending} />}

      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        <ToolbarBtn active={showHeatmap} onClick={() => setShowHeatmap(o => !o)} icon={<Flame size={14} />} label="Heatmap" color="amber" />
        <ToolbarBtn active={showWeather} onClick={() => setShowWeather(o => !o)} icon={<Cloud size={14} />} label="Weather" color="blue" />
        <div className="w-px h-5 bg-white/10 mx-1" />
        {Object.values(MAP_STYLES).map(s => (
          <ToolbarBtn key={s.id} active={mapStyle === s.id} onClick={() => setMapStyle(s.id)} icon={s.icon} label={s.label} color="blue" />
        ))}
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolbarBtn active={simulationMode === 'rain'} onClick={() => toggleSimulation('rain')} icon={<Droplets size={14} />} label="Rain" color="blue" />
        <ToolbarBtn active={simulationMode === 'tremors'} onClick={() => toggleSimulation('tremors')} icon={<Zap size={14} />} label="Tremors" color="amber" />
        <div className="w-px h-5 bg-white/10 mx-1" />
        {!pinMode ? (
          <>
            <ToolbarBtn active={false} onClick={() => setPinMode('shelter')} icon={<MapPin size={14} />} label="Shelter" color="blue" />
            <ToolbarBtn active={false} onClick={() => setPinMode('hazard')} icon={<AlertTriangle size={14} />} label="Hazard" color="red" />
          </>
        ) : (
          <ToolbarBtn active={false} onClick={handleCancelPin} icon={<X size={14} />} label="Cancel" color="red" />
        )}
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolbarBtn active={drawerOpen} onClick={() => setDrawerOpen(o => !o)} icon={<SlidersHorizontal size={14} />} label="Alerts" color="purple" />
      </div>

      <div className="flex-1 relative overflow-hidden">
        <MapViewer
          shelters={shelters} hazards={hazards} demographics={demographics}
          pinMode={pinMode} pendingLocation={pendingLocation}
          showShelterForm={showShelterForm} showHazardForm={showHazardForm}
          handleMapClick={handleMapClick} setSelectedShelter={setSelectedShelter}
          setSelectedHazard={setSelectedHazard} MAPBOX_TOKEN={MAPBOX_TOKEN}
          showHeatmap={showHeatmap}
          showWeather={showWeather}
          mapStyle={mapStyle}
          simulationMode={simulationMode}
        />
        <RiskAlertsDrawer
          hazards={hazards} simulationMode={simulationMode}
          drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen}
        />
      </div>
    </div>
  );
}
