import React from "react";
import { useState, useMemo, useEffect } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import { MapPin, AlertTriangle, X, Info, Layers } from 'lucide-react';
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

// --- Map Legend Component ---
function MapLegend() {
  return (
    <div className="absolute top-44 left-6 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-gray-200 z-10 w-64">
      <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Info size={14} /> Map Legend
      </h4>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm" />
          <span className="text-xs font-bold text-gray-700">Open Shelter</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm" />
          <span className="text-xs font-bold text-gray-700">Full/Closed Shelter</span>
        </div>
        <hr className="border-gray-200" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Hazard Zones</p>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-[#00509e]/30 border border-[#00509e]" />
          <span className="text-xs text-gray-600">Flood (Low Severity)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-[#1d4ed8]/40 border border-[#f59e0b]" />
          <span className="text-xs text-gray-600">Flood (Medium + Amber)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-[#d90429]/50 border border-white" />
          <span className="text-xs text-gray-600">Flood (Critical/High)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-[#7f1d1d]/60 border-2 border-[#ef4444]" />
          <span className="text-xs text-gray-600 font-bold">Earthquake (No Pass)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded bg-[#f77f00]/50 border border-white" />
          <span className="text-xs text-gray-600">Road Maintenance</span>
        </div>
      </div>
    </div>
  );
}

// ... (previous modals remain unchanged) ...

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

// --- Memoized Map Viewer to prevent dragging/panning from re-rendering the parent dashboard ---
const BARANGAY_COORDS = {
  'Tetuan': [122.0886, 6.9192],
  'Baliwasan': [122.0571, 6.9150],
  'Tugbungan': [122.0975, 6.9231],
  'San Jose': [122.0673, 6.9118],
  'Santa Maria': [122.0789, 6.9322]
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
  MAPBOX_TOKEN
}) => {
  const [viewState, setViewState] = useState({
    longitude: 122.0729, // Default Zamboanga City coords
    latitude: 6.9126,
    zoom: 13
  });

  const [showWeather, setShowWeather] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [weatherTimestamp, setWeatherTimestamp] = useState(null);

  // Fetch latest RainViewer timestamp dynamically when weather overlay is enabled
  useEffect(() => {
    if (showWeather) {
      fetch('https://api.rainviewer.com/public/weather-maps.json')
        .then(res => res.json())
        .then(data => {
          if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
            const latest = data.radar.past[data.radar.past.length - 1];
            setWeatherTimestamp(latest.time);
          }
        })
        .catch(err => console.error("Failed to load RainViewer weather maps json:", err));
    }
  }, [showWeather]);

  // Transform hazards into GeoJSON Polygons for accurate area representation
  const hazardsGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: hazards.map(h => {
        const poly = createCirclePolygon(
          [parseFloat(h.longitude), parseFloat(h.latitude)], 
          parseFloat(h.radius_meters || 50)
        );
        return {
          ...poly,
          properties: {
            id: h.id,
            name: h.name,
            hazard_type: h.hazard_type,
            severity_level: h.severity_level,
            radius: h.radius_meters
          }
        };
      })
    };
  }, [hazards]);

  // Transform checked-in evacuee demographics into GeoJSON Points for Heatmap layer
  const demographicsGeoJSON = useMemo(() => {
    const features = demographics.map(d => {
      const coords = BARANGAY_COORDS[d.barangay];
      if (!coords) return null;
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coords
        },
        properties: {
          barangay: d.barangay,
          total_evacuees: parseInt(d.total_evacuees, 10) || 0
        }
      };
    }).filter(Boolean);

    return {
      type: 'FeatureCollection',
      features
    };
  }, [demographics]);

  // Heatmap configuration paint properties
  const heatmapLayerPaint = {
    'heatmap-weight': [
      'interpolate',
      ['linear'],
      ['get', 'total_evacuees'],
      0, 0,
      10, 0.4,
      50, 0.7,
      150, 1.0
    ],
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      11, 1,
      15, 3
    ],
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0, 230, 240, 0)',
      0.2, 'rgba(0, 128, 255, 0.3)',
      0.4, 'rgba(0, 255, 128, 0.5)',
      0.6, 'rgba(255, 255, 0, 0.6)',
      0.8, 'rgba(255, 128, 0, 0.8)',
      1.0, 'rgba(235, 50, 50, 0.9)'
    ],
    'heatmap-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      11, 20,
      15, 65
    ],
    'heatmap-opacity': 0.75
  };

  return (
    <div className="w-full h-full relative">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        cursor={pinMode ? 'crosshair' : 'grab'}
      >
        <NavigationControl position="top-right" />

        {/* Floating Layer Controls Panel */}
        <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-gray-200 z-10 w-64 space-y-3">
          <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Layers size={14} className="text-blue-500" /> Operational Overlays
          </h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={e => setShowHeatmap(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              GIS Evacuee Density Heatmap
            </label>
            <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showWeather}
                onChange={e => setShowWeather(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              Live Weather Radar Overlay
            </label>
          </div>
        </div>

        <MapLegend />

        {/* --- GIS Population Heatmap Source and Layer --- */}
        {showHeatmap && demographicsGeoJSON.features.length > 0 && (
          <Source id="heatmap-source" type="geojson" data={demographicsGeoJSON}>
            <Layer
              id="evacuee-heatmap-layer"
              type="heatmap"
              paint={heatmapLayerPaint}
            />
          </Source>
        )}

        {/* --- Live RainViewer Weather Radar Overlay --- */}
        {showWeather && weatherTimestamp && (
          <Source
            id="weather-radar-source"
            type="raster"
            tiles={[`https://tilecache.rainviewer.com/v2/radar/${weatherTimestamp}/256/{z}/{x}/{y}/2/1_1.png`]}
            tileSize={256}
          >
            <Layer
              id="weather-radar-layer"
              type="raster"
              paint={{ 'raster-opacity': 0.55 }}
            />
          </Source>
        )}

        {/* --- Advanced Hazard Layers --- */}
        <Source id="hazards-source" type="geojson" data={hazardsGeoJSON}>
          {/* Fill Layer with contextual color hierarchy */}
          <Layer
            id="hazards-fill"
            type="fill"
            paint={{
              'fill-color': [
                'match',
                ['get', 'hazard_type'],
                'flood', [
                  'match',
                  ['get', 'severity_level'],
                  'low', '#00509e',
                  'medium', '#1d4ed8',
                  'high', '#d90429',
                  '#00509e'
                ],
                'earthquake', '#7f1d1d',
                'maintenance', '#f77f00',
                '#ef4444'
              ],
              'fill-opacity': [
                'match',
                ['get', 'hazard_type'],
                'flood', [
                  'match',
                  ['get', 'severity_level'],
                  'low', 0.3,
                  'medium', 0.4,
                  'high', 0.5,
                  0.3
                ],
                'earthquake', 0.6,
                'maintenance', 0.5,
                0.4
              ]
            }}
          />
          {/* Stroke Layer for emphasis and earthquake outline */}
          <Layer
            id="hazards-line"
            type="line"
            paint={{
              'line-color': [
                'match',
                ['get', 'hazard_type'],
                'flood', [
                  'match',
                  ['get', 'severity_level'],
                  'medium', '#f59e0b', // Amber accent for medium
                  'high', '#ffffff',
                  '#00509e'
                ],
                'earthquake', '#ef4444',
                'maintenance', '#ffffff',
                '#ef4444'
              ],
              'line-width': [
                'match',
                ['get', 'hazard_type'],
                'earthquake', 4,
                'maintenance', 1,
                2
              ]
            }}
          />
        </Source>

      {/* Render Live Shelters */}
      {shelters.map(shelter => (
        <Marker key={`s-${shelter.id}`} longitude={parseFloat(shelter.longitude)} latitude={parseFloat(shelter.latitude)} anchor="bottom">
          <div 
            onClick={(e) => { e.stopPropagation(); setSelectedShelter(shelter); }}
            className="flex flex-col items-center group relative cursor-pointer"
          >
            <MapPin size={32} className={shelter.status === 'open' ? 'text-green-500 fill-green-100/20' : 'text-red-500 fill-red-100/20'} />
            <span className="bg-gray-900/90 text-white border border-gray-700 text-xs font-bold px-2 py-0.5 rounded-md shadow-lg mt-1 backdrop-blur-sm">
              {shelter.current_occupancy}/{shelter.max_capacity}
            </span>
            
            {/* Tooltip on Hover */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block w-max bg-white rounded-lg shadow-xl p-3 z-50">
              <p className="font-bold text-gray-900 text-sm">{shelter.name}</p>
              <p className="text-xs text-gray-500">Status: <span className="uppercase font-bold">{shelter.status}</span></p>
              <p className="text-[10px] text-gray-400 mt-1">Click to edit details</p>
            </div>
          </div>
        </Marker>
      ))}

        {/* Simplified Interaction Markers for Hazards (Invisible but clickable) */}
        {hazards.map(hazard => (
          <Marker key={`h-click-${hazard.id}`} longitude={parseFloat(hazard.longitude)} latitude={parseFloat(hazard.latitude)} anchor="center">
            <div 
              onClick={(e) => { e.stopPropagation(); setSelectedHazard(hazard); }}
              className="w-12 h-12 flex items-center justify-center cursor-pointer group"
            >
              <AlertTriangle size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Marker>
        ))}

      {/* Render the Pending User Pin (before form opens) */}
      {pendingLocation && !showShelterForm && !showHazardForm && (
        <Marker longitude={pendingLocation.longitude} latitude={pendingLocation.latitude} anchor="bottom">
          <div className="flex flex-col items-center">
            <MapPin size={48} className={`${pinMode === 'shelter' ? 'text-blue-500 fill-blue-500/20' : 'text-red-500 fill-red-500/20'} animate-bounce`} />
          </div>
        </Marker>
      )}
      </Map>
      </div>
      );
      });

// --- Main MapDashboard ---
export default function MapDashboard() {
  const queryClient = useQueryClient();
  
  const [pinMode, setPinMode] = useState(null); // 'shelter', 'hazard', or null
  const [pendingLocation, setPendingLocation] = useState(null);
  const [showShelterForm, setShowShelterForm] = useState(false);
  const [showHazardForm, setShowHazardForm] = useState(false);

  // Selected elements for edit/view popups
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [selectedHazard, setSelectedHazard] = useState(null);

  // Poll Consolidated Map Data every 5 seconds (shelters + hazards)
  const { data: mapDashboardData } = useQuery({
    queryKey: ['map-dashboard'],
    queryFn: () => api.get('/map/dashboard').then(res => res.data),
    refetchInterval: 5000
  });

  const shelters = mapDashboardData?.shelters || [];
  const hazards = mapDashboardData?.hazards || [];
  const demographics = mapDashboardData?.demographics || [];

  // Mutations for adding data
  const addShelterMutation = useMutation({
    mutationFn: (newShelter) => api.post('/shelters', newShelter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setPinMode(null);
      setPendingLocation(null);
      setShowShelterForm(false);
    }
  });

  const addHazardMutation = useMutation({
    mutationFn: (newHazard) => api.post('/hazards', newHazard),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setPinMode(null);
      setPendingLocation(null);
      setShowHazardForm(false);
    }
  });

  // Mutations for updates/deletes
  const updateShelterMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/shelters/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setSelectedShelter(null);
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to update shelter.')
  });

  const deleteShelterMutation = useMutation({
    mutationFn: (id) => api.delete(`/shelters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setSelectedShelter(null);
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to delete shelter.')
  });

  const resolveHazardMutation = useMutation({
    mutationFn: (id) => api.put(`/hazards/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setSelectedHazard(null);
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to resolve hazard.')
  });

  const handleMapClick = (e) => {
    if (pinMode) {
      setPendingLocation({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
      if (pinMode === 'shelter') setShowShelterForm(true);
      if (pinMode === 'hazard') setShowHazardForm(true);
    }
  };

  const handleCancelPin = () => {
    setPinMode(null);
    setPendingLocation(null);
    setShowShelterForm(false);
    setShowHazardForm(false);
  };

  const handleConfirmShelter = ({ name, max_capacity }) => {
    addShelterMutation.mutate({
      name,
      latitude: pendingLocation.latitude,
      longitude: pendingLocation.longitude,
      max_capacity
    });
  };

  const handleConfirmHazard = ({ name, radius_meters, hazard_type, severity_level }) => {
    addHazardMutation.mutate({
      name,
      latitude: pendingLocation.latitude,
      longitude: pendingLocation.longitude,
      radius_meters,
      hazard_type,
      severity_level
    });
  };

  const handleUpdateShelter = (data) => {
    updateShelterMutation.mutate({ id: selectedShelter.id, data });
  };

  const handleDeleteShelter = () => {
    deleteShelterMutation.mutate(selectedShelter.id);
  };

  const handleResolveHazard = () => {
    resolveHazardMutation.mutate(selectedHazard.id);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Modals */}
      {showShelterForm && pendingLocation && (
        <ShelterFormModal
          location={pendingLocation}
          onConfirm={handleConfirmShelter}
          onCancel={handleCancelPin}
          isLoading={addShelterMutation.isPending}
        />
      )}
      {showHazardForm && pendingLocation && (
        <HazardFormModal
          location={pendingLocation}
          onConfirm={handleConfirmHazard}
          onCancel={handleCancelPin}
          isLoading={addHazardMutation.isPending}
        />
      )}
      {selectedShelter && (
        <ShelterEditModal
          shelter={selectedShelter}
          onUpdate={handleUpdateShelter}
          onDelete={handleDeleteShelter}
          onCancel={() => setSelectedShelter(null)}
          isLoading={updateShelterMutation.isPending || deleteShelterMutation.isPending}
        />
      )}
      {selectedHazard && (
        <HazardDetailModal
          hazard={selectedHazard}
          onResolve={handleResolveHazard}
          onCancel={() => setSelectedHazard(null)}
          isLoading={resolveHazardMutation.isPending}
        />
      )}

      <header className="bg-white shadow-sm px-6 py-3 flex justify-between items-center z-10 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">Live Control Room</h2>
        {pinMode && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-red-600 animate-pulse bg-red-50 px-3 py-1 rounded-full border border-red-200">
              Click on the map to place your {pinMode === 'shelter' ? 'shelter' : 'hazard'} pin
            </span>
            <button 
              onClick={handleCancelPin}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1.5 rounded-lg font-bold text-sm transition"
            >
              Cancel Placement
            </button>
          </div>
        )}
      </header>
      
      <div className="flex-1 relative bg-gray-900">
        <MapViewer
          shelters={shelters}
          hazards={hazards}
          demographics={demographics}
          pinMode={pinMode}
          pendingLocation={pendingLocation}
          showShelterForm={showShelterForm}
          showHazardForm={showHazardForm}
          handleMapClick={handleMapClick}
          setSelectedShelter={setSelectedShelter}
          setSelectedHazard={setSelectedHazard}
          MAPBOX_TOKEN={MAPBOX_TOKEN}
        />

        {/* Floating Panel for Actions */}
        {!pinMode && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
            <button 
              onClick={() => setPinMode('shelter')}
              className="bg-blue-600/90 hover:bg-blue-700 backdrop-blur-md text-white font-bold py-3 px-6 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] transition flex items-center gap-2 border border-blue-400/50"
            >
              <MapPin size={20} /> Pin New Shelter
            </button>
            <button 
              onClick={() => setPinMode('hazard')}
              className="bg-red-600/90 hover:bg-red-700 backdrop-blur-md text-white font-bold py-3 px-6 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)] transition flex items-center gap-2 border border-red-400/50"
            >
              <AlertTriangle size={20} /> Flag Hazard Zone
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
