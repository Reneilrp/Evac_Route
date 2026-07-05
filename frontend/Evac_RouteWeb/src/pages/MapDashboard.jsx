import React from "react";
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import {
  MapPin, AlertTriangle, X, Cloud, Flame, Zap,
  ChevronRight, ChevronLeft, Moon, Satellite, Mountain,
  TriangleAlert, Droplets, Waves, Shield, SlidersHorizontal, Layers,
  Eye, Wrench
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { showSuccess, showError } from '../utils/toast';
import { createCirclePolygon, getHaversineDistance } from '../utils/mapHelper';

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

// --- Helper: Timeline & Duration Calculations ---
function formatTimelineDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  let hr = d.getHours();
  const min = d.getMinutes().toString().padStart(2, '0');
  const ampm = hr >= 12 ? 'PM' : 'AM';
  hr = hr % 12;
  hr = hr ? hr : 12; // 0 should be 12
  return `${month} ${day}, ${hr}:${min} ${ampm}`;
}

function getTimelineData(createdAt, durationHours) {
  if (!createdAt || !durationHours) return null;
  const start = new Date(createdAt).getTime();
  const durationMs = durationHours * 60 * 60 * 1000;
  const end = start + durationMs;
  const now = new Date().getTime();
  
  const elapsedMs = now - start;
  const remainingMs = end - now;
  const isOverdue = remainingMs < 0;
  
  const percent = Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));
  
  const formatMs = (ms) => {
    const totalMins = Math.floor(Math.abs(ms) / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };
  
  return {
    formattedStart: formatTimelineDate(createdAt),
    formattedEnd: formatTimelineDate(new Date(end)),
    elapsedStr: formatMs(elapsedMs),
    remainingStr: isOverdue ? '0m' : formatMs(remainingMs),
    overdueStr: isOverdue ? formatMs(remainingMs) : null,
    isOverdue,
    percent
  };
}

function formatDurationHours(hours) {
  if (!hours) return '';
  const weeks = Math.floor(hours / 168);
  const remainingAfterWeeks = hours % 168;
  const days = Math.floor(remainingAfterWeeks / 24);
  const remainingHours = remainingAfterWeeks % 24;
  
  const parts = [];
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (remainingHours > 0 || parts.length === 0) parts.push(`${remainingHours}h`);
  return parts.join(' ');
}

function MiniTimeline({ createdAt, durationHours, hazardType }) {
  const data = getTimelineData(createdAt, durationHours);
  if (!data) return null;
  
  const { remainingStr, overdueStr, isOverdue, percent } = data;
  
  const theme = hazardType === 'flood' ? {
    color: 'bg-blue-400',
    text: 'text-blue-300',
    label: 'Draining'
  } : hazardType === 'earthquake' ? {
    color: 'bg-red-400',
    text: 'text-red-300',
    label: 'Clearance'
  } : {
    color: 'bg-amber-400',
    text: 'text-amber-300',
    label: 'Duration'
  };
  
  return (
    <div className="mt-1.5 w-full">
      <div className="flex justify-between text-[9px] font-bold">
        <span className="text-white/60">{theme.label} ({formatDurationHours(durationHours)}) progress</span>
        <span className={isOverdue ? "text-red-400" : theme.text}>
          {isOverdue ? `Overdue +${overdueStr}` : `${remainingStr} left`}
        </span>
      </div>
      <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1">
        <div 
          className={`h-full rounded-full ${isOverdue ? 'bg-red-500 animate-pulse' : theme.color}`} 
          style={{ width: `${percent}%` }} 
        />
      </div>
    </div>
  );
}

function VisualTimeline({ createdAt, durationHours, hazardType }) {
  const data = getTimelineData(createdAt, durationHours);
  if (!data) return null;
  
  const {
    formattedStart,
    formattedEnd,
    elapsedStr,
    remainingStr,
    overdueStr,
    isOverdue,
    percent
  } = data;
  
  const getTimelineTheme = () => {
    if (hazardType === 'flood') {
      return {
        title: 'Estimated Draining Progress',
        targetLabel: 'Est. Fully Drained',
        accentClass: 'bg-blue-500',
        textClass: 'text-blue-600 dark:text-blue-400',
        borderClass: 'border-blue-500/20 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-950/20',
        badgeClass: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40',
        pingClass: 'bg-blue-500'
      };
    }
    if (hazardType === 'earthquake') {
      return {
        title: 'Debris Clearance Timeline',
        targetLabel: 'Est. Debris Cleared',
        accentClass: 'bg-red-500',
        textClass: 'text-red-600 dark:text-red-400',
        borderClass: 'border-red-500/20 bg-red-50/50 dark:border-red-500/30 dark:bg-red-950/20',
        badgeClass: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40',
        pingClass: 'bg-red-500'
      };
    }
    // maintenance or default
    return {
      title: 'Road Maintenance Blockage Timeline',
      targetLabel: 'Est. Road Reopened',
      accentClass: 'bg-amber-500',
      textClass: 'text-amber-600 dark:text-amber-400',
      borderClass: 'border-amber-500/20 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/20',
      badgeClass: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40',
      pingClass: 'bg-amber-500'
    };
  };
  
  const theme = getTimelineTheme();
  
  return (
    <div className={`border rounded-xl p-4 space-y-3 shadow-inner ${theme.borderClass}`}>
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {!isOverdue && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.pingClass}`} />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isOverdue ? 'bg-red-500' : theme.accentClass}`} />
          </span>
          {theme.title} ({formatDurationHours(durationHours)})
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isOverdue ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40 animate-pulse' : theme.badgeClass
        }`}>
          {isOverdue ? "OVERDUE / DELAYED" : `${percent.toFixed(0)}% Complete`}
        </span>
      </div>
      
      {/* Visual Progress Bar Track */}
      <div className="relative py-2">
        {/* Gray Track */}
        <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gray-200 dark:bg-slate-700 -translate-y-1/2 rounded-full" />
        
        {/* Progress Fill */}
        <div 
          className={`absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full transition-all duration-500 ${
            isOverdue ? 'bg-red-500' : theme.accentClass
          }`}
          style={{ width: `${percent}%` }} 
        />
        
        {/* Nodes */}
        <div className="relative flex justify-between items-center">
          {/* Start node */}
          <div className="flex flex-col items-center bg-white dark:bg-slate-800 rounded-full p-1 border-2 border-gray-300 dark:border-slate-700 z-10 w-7 h-7 justify-center text-xs font-bold shadow-sm">
            🚨
          </div>
          {/* Current progress dot indicator */}
          {!isOverdue && percent > 0 && percent < 100 && (
            <div 
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow z-10 ${theme.accentClass}`}
              style={{ left: `${percent}%` }}
            />
          )}
          {/* End node */}
          <div className={`flex flex-col items-center bg-white dark:bg-slate-800 rounded-full p-1 border-2 z-10 w-7 h-7 justify-center text-xs font-bold shadow-sm ${
            isOverdue ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'
          }`}>
            ✅
          </div>
        </div>
      </div>
      
      {/* Dates/Times labels */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
        <div>
          <span className="block font-bold text-gray-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">Reported Time</span>
          <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-200">{formattedStart}</span>
        </div>
        <div className="text-right">
          <span className="block font-bold text-gray-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">{theme.targetLabel}</span>
          <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-200">{formattedEnd}</span>
        </div>
      </div>
      
      {/* Durations grid */}
      <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-gray-200/50 dark:border-slate-800">
        <div>
          <p className="text-gray-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">Elapsed Time</p>
          <p className="font-bold text-gray-700 dark:text-slate-200 mt-0.5">{elapsedStr}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">
            {isOverdue ? 'Delayed By' : 'Remaining Est.'}
          </p>
          <p className={`font-black mt-0.5 ${isOverdue ? 'text-red-500' : 'text-gray-700 dark:text-slate-200'}`}>
            {isOverdue ? overdueStr : remainingStr}
          </p>
        </div>
      </div>
    </div>
  );
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 select-none whitespace-nowrap ${
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
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 select-none ${
          open 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
      >
        <SlidersHorizontal size={13} />
        <span>Legend</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-3 bg-gray-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-white/10 w-56 z-50">
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
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <MapPin size={20} className="text-blue-500" /> Pin New Shelter
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Location: <span className="font-mono text-xs">{location?.latitude?.toFixed(5)}, {location?.longitude?.toFixed(5)}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Shelter Name</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              placeholder="e.g. Tetuan Covered Court"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Maximum Capacity</label>
            <input
              type="number"
              min="1"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
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
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition"
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
function HazardFormModal({ location, initialRadius = 50, onConfirm, onCancel, isLoading }) {
  const [name, setName] = useState('');
  const [radius, setRadius] = useState(initialRadius.toString());
  const [hazardType, setHazardType] = useState('flood');
  const [severityLevel, setSeverityLevel] = useState('medium');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState('hours');
  const [isFixedFloodSpot, setIsFixedFloodSpot] = useState(false);

  const handleHazardTypeChange = (e) => {
    const type = e.target.value;
    setHazardType(type);
    if (type === 'earthquake' || type === 'maintenance') {
      setSeverityLevel('high');
      setIsFixedFloodSpot(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;
    let hours = durationValue ? parseInt(durationValue, 10) : null;
    if (hours && durationUnit === 'days') hours = hours * 24;
    if (hours && durationUnit === 'weeks') hours = hours * 168;
    onConfirm({ 
      name, 
      radius_meters: parseFloat(radius) || 50,
      hazard_type: hazardType,
      severity_level: severityLevel,
      estimated_duration_hours: hours,
      is_fixed_flood_spot: hazardType === 'flood' ? isFixedFloodSpot : false
    });
  };

  const isSeverityLocked = hazardType === 'earthquake' || hazardType === 'maintenance';

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" /> Flag Hazard Zone
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Location: <span className="font-mono text-xs">{location?.latitude?.toFixed(5)}, {location?.longitude?.toFixed(5)}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Hazard Description</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              placeholder="e.g. Flooded Bridge, Landslide Zone"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Hazard Type</label>
              <select
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                value={hazardType}
                onChange={handleHazardTypeChange}
              >
                <option value="flood">Flood</option>
                <option value="earthquake">Earthquake</option>
                <option value="maintenance">Road Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Severity</label>
              <select
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 disabled:bg-gray-100 dark:disabled:bg-slate-950 disabled:text-gray-500 dark:disabled:text-slate-650"
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
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Danger Radius (meters)</label>
            <input
              type="number"
              min="10"
              max="5000"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              value={radius}
              onChange={e => setRadius(e.target.value)}
            />
          </div>
          {hazardType === 'flood' && (
            <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
              <input
                type="checkbox"
                id="is_fixed_flood_spot"
                checked={isFixedFloodSpot}
                onChange={e => setIsFixedFloodSpot(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-red-650 focus:ring-red-500 border-gray-300"
              />
              <div>
                <label htmlFor="is_fixed_flood_spot" className="block text-sm font-semibold text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                  Weather-Triggered Fixed Flood Spot
                </label>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Only active when rainfall duration exceeds 60 minutes. Geofenced alerts will use resident-chosen warning radius preferences.
                </p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">
              {hazardType === 'flood' ? 'Estimated Drain Time' : 
               hazardType === 'earthquake' ? 'Estimated Debris Clearance Time' : 
               'Estimated Duration'}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                placeholder="e.g. 4"
                value={durationValue}
                onChange={e => setDurationValue(e.target.value)}
              />
              <select
                className="px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                value={durationUnit}
                onChange={e => setDurationUnit(e.target.value)}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition"
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
  const navigate = useNavigate();
  const [name, setName] = useState(shelter.name);
  const [cap, setCap] = useState(shelter.max_capacity);
  const [status, setStatus] = useState(shelter.status);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !cap || isNaN(parseInt(cap, 10))) return;
    onUpdate({ name, max_capacity: parseInt(cap, 10), status });
  };

  const handleViewMoreDetails = () => {
    navigate('/admin/shelters', { state: { search: shelter.name } });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <MapPin size={20} className="text-blue-500" /> Manage Shelter
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Shelter Name</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Max Capacity</label>
              <input
                type="number"
                min="1"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                value={cap}
                onChange={e => setCap(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Status</label>
              <select
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="full">Full</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Current Occupancy: <strong className="text-gray-700 dark:text-slate-200">{shelter.current_occupancy}</strong>
            </span>
            <button
              type="button"
              onClick={handleViewMoreDetails}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors animate-pulse"
            >
              View More Details &rarr;
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            {user?.role === 'admin' ? (
              <button
                type="button"
                onClick={onDelete}
                className="bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-lg font-semibold text-sm transition"
              >
                Delete
              </button>
            ) : (
              <div className="text-xs text-gray-400 dark:text-slate-500 font-semibold flex items-center bg-gray-50 dark:bg-slate-950 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-800">
                Staff Cannot Delete
              </div>
            )}
            <div className="flex-1 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-4 py-2.5 rounded-lg font-semibold text-sm transition"
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
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-red-600 text-lg flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" /> Active Hazard Zone
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Description</p>
            <p className="text-gray-800 dark:text-slate-200 font-medium text-lg mt-0.5">{hazard.name}</p>
          </div>
          {hazard.estimated_duration_hours && (
            <VisualTimeline
              createdAt={hazard.created_at}
              durationHours={hazard.estimated_duration_hours}
              hazardType={hazard.hazard_type}
            />
          )}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Danger Radius</p>
            <p className="text-gray-800 dark:text-slate-200 font-medium mt-0.5">{hazard.radius_meters} meters</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition"
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

// --- Maintenance Form Modal ---
function MaintenanceFormModal({ onConfirm, onCancel, isLoading }) {
  const [desc, setDesc] = useState('');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState('hours');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!desc) return;
    let hours = durationValue ? parseInt(durationValue, 10) : null;
    if (hours && durationUnit === 'days') hours = hours * 24;
    if (hours && durationUnit === 'weeks') hours = hours * 168;
    onConfirm({ 
      description: desc,
      estimated_duration_hours: hours
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-amber-600 text-lg flex items-center gap-2">
            <Wrench size={20} className="text-amber-500" /> Flag Road Blockage
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Blockage Description</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              placeholder="e.g. Bridge Repair, Road Closed for Pipe Installation"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Estimated Duration</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                placeholder="e.g. 24"
                value={durationValue}
                onChange={e => setDurationValue(e.target.value)}
              />
              <select
                className="px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                value={durationUnit}
                onChange={e => setDurationUnit(e.target.value)}
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60"
            >
              {isLoading ? 'Saving...' : 'Block Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Maintenance Detail Modal ---
function MaintenanceDetailModal({ maintenance, onResolve, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-amber-600 text-lg flex items-center gap-2">
            <Wrench size={20} className="text-amber-500" /> Active Road Maintenance
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Description</p>
            <p className="text-gray-800 dark:text-slate-200 font-medium text-lg mt-0.5">{maintenance.description}</p>
          </div>
          {maintenance.estimated_duration_hours && (
            <VisualTimeline
              createdAt={maintenance.created_at}
              durationHours={maintenance.estimated_duration_hours}
              hazardType="maintenance"
            />
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onResolve}
              disabled={isLoading}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60"
            >
              Resolve Maintenance
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
  is3D = true,
  setIs3D,
  mapRef,
  inspectLocation,
  drawerOpen = false,
  simulationGeoJSON = null,
  isDrawingRadius = false,
  drawingRadiusMeters = 50,
  handleMapMouseMove = null,
  roadMaintenances = [],
  maintenancePoints = [],
  drawingEnd = null,
  showRoadMaintenances = true,
  setSelectedRoadMaintenance = null,
  showRoadNetwork = true,
  roadNetwork = null,
  placementCoords = null,
  selectedRadiusMeters = 2000,
  simOverlayMode = 'flow',
}) => {
  const [viewState, setViewState] = useState({
    longitude: 122.0729,
    latitude: 6.9126,
    zoom: 13,
    pitch: 52,
    bearing: -15
  });

  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const roadMaintenancesGeoJSON = useMemo(() => ({
    type: 'FeatureCollection',
    features: roadMaintenances.map(rm => ({
      type: 'Feature',
      properties: { id: rm.id, description: rm.description },
      geometry: {
        type: 'LineString',
        coordinates: [
          [parseFloat(rm.start_longitude), parseFloat(rm.start_latitude)],
          [parseFloat(rm.end_longitude), parseFloat(rm.end_latitude)]
        ]
      }
    }))
  }), [roadMaintenances]);

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
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
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
        <NavigationControl position="top-right" showCompass showZoom />

        {/* Mapbox 3D Terrain DEM */}
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
        />

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

        {/* Hazard Zone Polygons */}
        {showHazards && (
          <Source id="hazards-source" type="geojson" data={hazardsGeoJSON}>
            <Layer id="hazards-fill" type="fill" paint={{
              'fill-color': ['match', ['get', 'hazard_type'],
                'flood', ['match', ['get', 'severity_level'], 'low', '#60a5fa', 'medium', '#3b82f6', 'high', '#ef4444', '#3b82f6'],
                'earthquake', '#ef4444', 'maintenance', '#f97316', '#eab308'],
              'fill-opacity': ['match', ['get', 'hazard_type'],
                'flood', ['match', ['get', 'severity_level'], 'low', 0.35, 'medium', 0.45, 'high', 0.55, 0.45],
                'earthquake', 0.55, 'maintenance', 0.45, 0.45],
              'fill-color-transition': { duration: 300 },
              'fill-opacity-transition': { duration: 300 }
            }} />
            <Layer id="hazards-line" type="line" paint={{
              'line-color': ['match', ['get', 'hazard_type'],
                'flood', ['match', ['get', 'severity_level'], 'low', '#93c5fd', 'medium', '#e0f2fe', 'high', '#ffffff', '#ffffff'],
                'earthquake', '#fca5a5', 'maintenance', '#fdba74', '#fef08a'],
              'line-width': ['match', ['get', 'hazard_type'], 'earthquake', 3.5, 'maintenance', 2.5, 2.5],
              'line-dasharray': ['literal', [3, 2]]
            }} />
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

        {/* Shelter Markers */}
        {showShelters && shelters.map(shelter => (
          <Marker key={`s-${shelter.id}`} longitude={parseFloat(shelter.longitude)} latitude={parseFloat(shelter.latitude)} anchor="bottom">
            <div onClick={e => { e.stopPropagation(); setSelectedShelter(shelter); inspectLocation(parseFloat(shelter.longitude), parseFloat(shelter.latitude)); }} className="flex flex-col items-center group relative cursor-pointer">
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

        {/* Hazard click zones & markers */}
        {showHazards && hazards.map(hazard => {
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
                  <p className="text-[9px] text-white/30 mt-1.5">Radius: {hazard.radius_meters}m · Click to resolve</p>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Pending pin */}
        {pendingLocation && !showShelterForm && !showHazardForm && (
          <Marker longitude={pendingLocation.longitude} latitude={pendingLocation.latitude} anchor="bottom">
            <MapPin size={48} className={`${pinMode === 'shelter' ? 'text-blue-400 fill-blue-400/20' : 'text-red-400 fill-red-400/20'} animate-bounce drop-shadow-[0_0_12px_rgba(96,165,250,0.8)]`} />
          </Marker>
        )}
        {/* Drawing Circle Polygon Preview */}
        {pendingLocation && isDrawingRadius && drawingRadiusMeters && (
          <Source
            id="drawing-hazard-source"
            type="geojson"
            data={createCirclePolygon([pendingLocation.longitude, pendingLocation.latitude], drawingRadiusMeters)}
          >
            <Layer
              id="drawing-hazard-layer"
              type="fill"
              paint={{
                'fill-color': '#ef4444',
                'fill-opacity': 0.25,
              }}
            />
            <Layer
              id="drawing-hazard-outline"
              type="line"
              paint={{
                'line-color': '#ef4444',
                'line-width': 2,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        )}

        {/* Active Road Maintenance Lines */}
        {showRoadMaintenances && roadMaintenancesGeoJSON.features.length > 0 && (
          <Source id="road-maintenances-source" type="geojson" data={roadMaintenancesGeoJSON}>
            <Layer
              id="road-maintenances-layer-case"
              type="line"
              paint={{
                'line-color': '#000000',
                'line-width': 8,
              }}
            />
            <Layer
              id="road-maintenances-layer"
              type="line"
              paint={{
                'line-color': '#f59e0b', // amber-500
                'line-width': 5,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        )}

        {/* Road Maintenance Midpoint Markers */}
        {showRoadMaintenances && roadMaintenances.map(rm => {
          const midLng = (parseFloat(rm.start_longitude) + parseFloat(rm.end_longitude)) / 2;
          const midLat = (parseFloat(rm.start_latitude) + parseFloat(rm.end_latitude)) / 2;
          return (
            <Marker key={`rm-pin-${rm.id}`} longitude={midLng} latitude={midLat} anchor="center">
              <div
                onClick={e => { e.stopPropagation(); setSelectedRoadMaintenance(rm); inspectLocation(midLng, midLat); }}
                className="w-8 h-8 border border-amber-500/40 bg-amber-950/95 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform group relative"
              >
                <Wrench size={13} className="text-amber-400 animate-pulse" />
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col w-max bg-gray-950/90 border border-white/10 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <p className="font-black text-white text-xs">{rm.description}</p>
                  <p className="text-[10px] text-white/50 mt-0.5">Road Closed · Maintenance</p>
                  {rm.estimated_duration_hours && (
                    <MiniTimeline 
                      createdAt={rm.created_at} 
                      durationHours={rm.estimated_duration_hours} 
                      hazardType="maintenance" 
                    />
                  )}
                  <p className="text-[9px] text-white/30 mt-1.5 font-bold">Click to resolve</p>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Drawing Road Maintenance Line Preview */}
        {pinMode === 'maintenance' && (maintenancePoints.length + (drawingEnd ? 1 : 0)) >= 2 && (
          <Source
            id="drawing-maintenance-source"
            type="geojson"
            data={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  ...maintenancePoints.map(p => [p.longitude, p.latitude]),
                  ...(drawingEnd ? [[drawingEnd.longitude, drawingEnd.latitude]] : [])
                ]
              }
            }}
          >
            <Layer
              id="drawing-maintenance-layer-case"
              type="line"
              paint={{
                'line-color': '#000000',
                'line-width': 6,
              }}
            />
            <Layer
              id="drawing-maintenance-layer"
              type="line"
              paint={{
                'line-color': '#f59e0b',
                'line-width': 4,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
        )}

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
      <div className={`absolute bottom-6 z-30 flex items-center bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl transition-all duration-300 ${
        drawerOpen ? 'right-[320px]' : 'right-6'
      }`}>
        {Object.values(MAP_STYLES).map(s => (
          <button
            key={s.id}
            onClick={() => setMapStyle(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              mapStyle === s.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {s.icon}
            <span className="hidden md:inline">{s.label}</span>
          </button>
        ))}
        <div className="w-px h-5 bg-white/10 mx-1.5 self-center" />
        <button
          onClick={() => setIs3D(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
            is3D
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Mountain size={13} />
          <span className="hidden md:inline">3D View</span>
        </button>
        <div className="w-px h-5 bg-white/10 mx-1.5 self-center" />
        {/* Map Legend button */}
        <MapLegend simulationMode={simulationMode} />
      </div>
    </div>
  );
});

// ─── Scoped Risk Alerts Drawer ───────────────────────────────────────────────
function RiskAlertsDrawer({ hazards, roadMaintenances = [], simulationMode, drawerOpen, setDrawerOpen }) {
  const activeHazards = hazards.filter(h =>
    simulationMode === 'rain'
      ? h.hazard_type === 'flood'
      : simulationMode === 'tremors'
      ? h.hazard_type === 'earthquake'
      : true
  );

  const activeMaintenance = simulationMode ? [] : roadMaintenances;

  // Combine alerts and sort by newest created_at first
  const combinedAlerts = [
    ...activeHazards.map(h => ({ ...h, alertType: 'hazard' })),
    ...activeMaintenance.map(rm => ({ ...rm, alertType: 'maintenance' }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const severityIcon = (alert) => {
    if (alert.alertType === 'maintenance') return <Wrench size={14} className="text-amber-400" />;
    const s = alert.severity_level;
    if (s === 'high') return <TriangleAlert size={14} className="text-red-400" />;
    if (s === 'medium') return <Waves size={14} className="text-orange-400" />;
    return <Droplets size={14} className="text-yellow-400" />;
  };
  
  const severityBg = (alert) => {
    if (alert.alertType === 'maintenance') return 'border-amber-500/40 bg-amber-950/20';
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
          <p className="text-[10px] text-white/30 mt-1">Showing {combinedAlerts.length} alert{combinedAlerts.length !== 1 ? 's' : ''} in current scope</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {combinedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
              <Shield size={32} className="text-white mb-3" />
              <p className="text-xs text-white font-bold">No active alerts</p>
            </div>
          ) : (
            combinedAlerts.map(alert => {
              const isHazard = alert.alertType === 'hazard';
              const name = isHazard ? alert.name : alert.description;
              const typeLabel = isHazard ? alert.hazard_type : 'road blockage';
              
              return (
                <div key={isHazard ? `hz-${alert.id}` : `rm-${alert.id}`} className={`border rounded-xl p-3 ${severityBg(alert)}`}>
                  <div className="flex items-start gap-2">
                    {severityIcon(alert)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white truncate">{name}</p>
                      <p className="text-[10px] text-white/50 mt-0.5 capitalize">
                        {typeLabel} {isHazard ? `· ${alert.severity_level} severity · ${alert.radius_meters}m radius` : '· Maintenance'}
                      </p>
                      {alert.estimated_duration_hours && (
                        <MiniTimeline 
                          createdAt={alert.created_at} 
                          durationHours={alert.estimated_duration_hours} 
                          hazardType={isHazard ? alert.hazard_type : 'maintenance'} 
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
  const [pinMode, setPinMode] = useState(null);
  const [pendingLocation, setPendingLocation] = useState(null);
  const [showShelterForm, setShowShelterForm] = useState(false);
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [selectedHazard, setSelectedHazard] = useState(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [mapStyle, setMapStyle] = useState('dark');
  const [is3D, setIs3D] = useState(true);
  const mapRef = useRef(null);

  const [isInspecting, setIsInspecting] = useState(false);
  const isInspectingRef = useRef(false);
  const orbitAnimationRef = useRef(null);
  const [simulationGeoJSON, setSimulationGeoJSON] = useState(null);

  const [isDrawingRadius, setIsDrawingRadius] = useState(false);
  const [drawingRadiusMeters, setDrawingRadiusMeters] = useState(50);

  const [showRoadMaintenances, setShowRoadMaintenances] = useState(true);
  const [maintenancePoints, setMaintenancePoints] = useState([]);
  const [drawingEnd, setDrawingEnd] = useState(null);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedRoadMaintenance, setSelectedRoadMaintenance] = useState(null);
  const [showLocalSimulation, setShowLocalSimulation] = useState(false);
  const [simSetupState, setSimSetupState] = useState('idle'); // 'idle' | 'configuring' | 'placing' | 'processing' | 'rendered'
  const [selectedRadiusMeters, setSelectedRadiusMeters] = useState(2000); // Default 2km (2000m)
  const [simCenter, setSimCenter] = useState(null); // Coordinate { longitude, latitude }
  const [placementCoords, setPlacementCoords] = useState(null);
  const [simOverlayMode, setSimOverlayMode] = useState('flow'); // 'flow' | 'gradient'

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
    const map = mapRef.current?.getMap();
    if (map) {
      map.stop();
    }
    if (orbitAnimationRef.current) {
      cancelAnimationFrame(orbitAnimationRef.current);
      orbitAnimationRef.current = null;
    }
    isInspectingRef.current = false;
    setIsInspecting(false);
    setSimulationGeoJSON(null);
  }, []);

  const handleMapMouseMove = useCallback((e) => {
    if (pinMode === 'hazard' && pendingLocation && isDrawingRadius) {
      const distance = getHaversineDistance(
        { lat: pendingLocation.latitude, lng: pendingLocation.longitude },
        e.lngLat
      );
      setDrawingRadiusMeters(Math.max(10, Math.min(5000, Math.round(distance))));
    } else if (pinMode === 'maintenance' && maintenancePoints.length > 0) {
      setDrawingEnd({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
    } else if (pinMode === 'sim-placement') {
      setPlacementCoords({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
    }
  }, [pinMode, pendingLocation, isDrawingRadius, maintenancePoints]);

  const inspectLocation = useCallback((lng, lat) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

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
  }, [stopInspection]);



  const [simulationMode, setSimulationMode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showShelters, setShowShelters] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showRoadNetwork, setShowRoadNetwork] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);

  const { data: dashboardData } = useQuery({
    queryKey: ['map-dashboard'],
    queryFn: () => api.get('/map/dashboard').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: roadNetwork } = useQuery({
    queryKey: ['road-network'],
    queryFn: () => api.get('/road-network').then(r => r.data),
    staleTime: Infinity,
  });

  const shelters = dashboardData?.shelters || [];
  const hazards = dashboardData?.hazards || [];
  const roadMaintenances = dashboardData?.road_maintenances || [];
  const demographics = dashboardData?.demographics || [];

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const isModalOpen = !!(selectedHazard || selectedRoadMaintenance || selectedShelter || showShelterForm || showHazardForm || showMaintenanceForm || isDeleteConfirmOpen);
  const isModalOpenRef = useRef(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

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
  const addMaintenanceMutation = useMutation({
    pointer: 'add-maintenance',
    mutationFn: (data) => api.post('/road-maintenance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      // Keep pinMode === 'maintenance' active for session-based multiple blocks creation
      setMaintenancePoints([]);
      setDrawingEnd(null);
      setShowMaintenanceForm(false);
      showSuccess('Road maintenance blockage reported successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to report road maintenance.');
    }
  });
  const resolveMaintenanceMutation = useMutation({
    mutationFn: (ids) => {
      if (Array.isArray(ids)) {
        return Promise.all(ids.map(id => api.put(`/road-maintenance/${id}/resolve`)));
      }
      return api.put(`/road-maintenance/${ids}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-dashboard'] });
      setSelectedRoadMaintenance(null);
      showSuccess('Road maintenance blockage resolved.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to resolve road blockage.');
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
        if (!pendingLocation) {
          setPendingLocation({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
          setIsDrawingRadius(true);
          setDrawingRadiusMeters(50);
        } else if (isDrawingRadius) {
          setIsDrawingRadius(false);
          setShowHazardForm(true);
        }
      } else if (pinMode === 'maintenance') {
        setMaintenancePoints(prev => {
          const newPoints = [...prev, { longitude: e.lngLat.lng, latitude: e.lngLat.lat }];
          setDrawingEnd({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
          return newPoints;
        });
      }
    }
  };
  const handleCancelPin = () => { 
    setPinMode(null); 
    setPendingLocation(null); 
    setIsDrawingRadius(false);
    setDrawingRadiusMeters(50);
    setMaintenancePoints([]);
    setDrawingEnd(null);
    setShowShelterForm(false); 
    setShowHazardForm(false); 
    setShowMaintenanceForm(false);
    if (simSetupState === 'placing') {
      setSimSetupState('configuring');
      setPlacementCoords(null);
    }
  };
  const handleConfirmShelter = ({ name, max_capacity }) => addShelterMutation.mutate({ name, latitude: pendingLocation.latitude, longitude: pendingLocation.longitude, max_capacity });
  const handleConfirmHazard = ({ name, radius_meters, hazard_type, severity_level, estimated_duration_hours, is_fixed_flood_spot }) => addHazardMutation.mutate({ name, latitude: pendingLocation.latitude, longitude: pendingLocation.longitude, radius_meters, hazard_type, severity_level, estimated_duration_hours, is_fixed_flood_spot });
  const handleConfirmMaintenance = ({ description, estimated_duration_hours }) => {
    if (maintenancePoints.length < 2) return;
    const coordinates = maintenancePoints.map(p => [p.longitude, p.latitude]);
    addMaintenanceMutation.mutate({
      description,
      coordinates,
      estimated_duration_hours,
    });
  };
  const handleUpdateShelter = (data) => updateShelterMutation.mutate({ id: selectedShelter.id, data });
  const handleDeleteShelter = () => setIsDeleteConfirmOpen(true);
  const handleConfirmDeleteShelter = () => {
    if (selectedShelter) {
      deleteShelterMutation.mutate(selectedShelter.id);
      setIsDeleteConfirmOpen(false);
    }
  };
  const handleResolveHazard = () => resolveHazardMutation.mutate(selectedHazard.id);

  const toggleSimulation = (mode) => {
    setSimulationMode(prev => {
      const nextMode = prev === mode ? null : mode;
      if (nextMode === 'rain') {
        showSuccess('Heavy Rain Simulation active. Rendering low-elevation basins & flood susceptibility zones. Use Inspect tool (Eye icon) to analyze local coordinates.');
      } else if (nextMode === 'tremors') {
        showSuccess('Tremors Simulation active. Rendering fault buffer boundaries & structural debris hazards. Click any marker to orbit inspect.');
      }
      return nextMode;
    });
    if (!drawerOpen) setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-full relative bg-gray-950">
      {showShelterForm && pendingLocation && <ShelterFormModal location={pendingLocation} onConfirm={handleConfirmShelter} onCancel={handleCancelPin} isLoading={addShelterMutation.isPending} />}
      {showHazardForm && pendingLocation && (
        <HazardFormModal 
          location={pendingLocation} 
          initialRadius={drawingRadiusMeters}
          onConfirm={handleConfirmHazard} 
          onCancel={handleCancelPin} 
          isLoading={addHazardMutation.isPending} 
        />
      )}
      {showMaintenanceForm && maintenancePoints.length >= 2 && (
        <MaintenanceFormModal 
          onConfirm={handleConfirmMaintenance}
          onCancel={handleCancelPin}
          isLoading={addMaintenanceMutation.isPending}
        />
      )}
      {selectedRoadMaintenance && (
        <MaintenanceDetailModal 
          maintenance={selectedRoadMaintenance}
          onResolve={() => resolveMaintenanceMutation.mutate(selectedRoadMaintenance.id)}
          onCancel={() => setSelectedRoadMaintenance(null)}
          isLoading={resolveMaintenanceMutation.isPending}
        />
      )}
      {selectedShelter && <ShelterEditModal shelter={selectedShelter} onUpdate={handleUpdateShelter} onDelete={handleDeleteShelter} onCancel={() => setSelectedShelter(null)} isLoading={updateShelterMutation.isPending || deleteShelterMutation.isPending} />}
      {selectedHazard && <HazardDetailModal hazard={selectedHazard} onResolve={handleResolveHazard} onCancel={() => setSelectedHazard(null)} isLoading={resolveHazardMutation.isPending} />}

      {/* GIS Floating Layers Selector */}
      <div className="absolute top-3 left-3 z-30">
        <button
          onClick={() => setLayersOpen(o => !o)}
          className="bg-gray-900/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/10 hover:border-white/20 p-2.5 rounded-xl shadow-lg text-white hover:text-blue-400 transition"
          title="Map Layers"
        >
          <Layers size={18} />
        </button>

        {layersOpen && (
          <div className="absolute top-12 left-0 w-56 bg-gray-900/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl text-white space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Map Overlays</h4>
            
            <label className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition text-xs font-semibold select-none">
              <input
                type="checkbox"
                checked={showShelters}
                onChange={e => setShowShelters(e.target.checked)}
                className="rounded border-white/20 text-blue-600 bg-white/10 focus:ring-0 animate-pulse"
              />
              Active Shelters
            </label>

            <label className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition text-xs font-semibold select-none">
              <input
                type="checkbox"
                checked={showHazards}
                onChange={e => setShowHazards(e.target.checked)}
                className="rounded border-white/20 text-blue-600 bg-white/10 focus:ring-0 animate-pulse"
              />
              Active Hazard Zones
            </label>

            <label className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition text-xs font-semibold select-none">
              <input
                type="checkbox"
                checked={showRoadMaintenances}
                onChange={e => setShowRoadMaintenances(e.target.checked)}
                className="rounded border-white/20 text-blue-600 bg-white/10 focus:ring-0 animate-pulse"
              />
              Active Road Blocks
            </label>

            <label className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition text-xs font-semibold select-none">
              <input
                type="checkbox"
                checked={showRoadNetwork}
                onChange={e => setShowRoadNetwork(e.target.checked)}
                className="rounded border-white/20 text-blue-600 bg-white/10 focus:ring-0 animate-pulse"
              />
              Road Network Grid (GIS)
            </label>

            <label className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition text-xs font-semibold select-none">
              <input
                type="checkbox"
                checked={showLocalSimulation}
                onChange={e => handleSetLocalSimulation(e.target.checked)}
                className="rounded border-white/20 text-blue-600 bg-white/10 focus:ring-0 animate-pulse"
              />
              Flood Flow Simulation
            </label>

            <label className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition text-xs font-semibold select-none">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={e => setShowHeatmap(e.target.checked)}
                className="rounded border-white/20 text-blue-600 bg-white/10 focus:ring-0 animate-pulse"
              />
              Demographics Heatmap
            </label>

            <label className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition text-xs font-semibold select-none">
              <input
                type="checkbox"
                checked={showWeather}
                onChange={e => setShowWeather(e.target.checked)}
                className="rounded border-white/20 text-blue-600 bg-white/10 focus:ring-0 animate-pulse"
              />
              Live Weather Radar
            </label>
          </div>
        )}
      </div>

      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-stretch gap-4 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        {/* Overlays Group */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1 select-none">Overlays</span>
          <div className="flex items-center gap-1">
            <ToolbarBtn active={showHeatmap} onClick={() => setShowHeatmap(o => !o)} icon={<Flame size={14} />} label="Heatmap" color="amber" />
            <ToolbarBtn active={showWeather} onClick={() => setShowWeather(o => !o)} icon={<Cloud size={14} />} label="Weather" color="blue" />
          </div>
        </div>

        <div className="w-px bg-white/10 self-stretch my-1" />

        {/* Simulation Group */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1 select-none">Simulation</span>
          <div className="flex items-center gap-1">
            <ToolbarBtn active={simulationMode === 'rain'} onClick={() => toggleSimulation('rain')} icon={<Droplets size={14} />} label="Rain" color="blue" />
            <ToolbarBtn active={simulationMode === 'tremors'} onClick={() => toggleSimulation('tremors')} icon={<Zap size={14} />} label="Tremors" color="amber" />
            <ToolbarBtn active={showLocalSimulation} onClick={() => handleSetLocalSimulation(!showLocalSimulation)} icon={<Waves size={14} />} label="Flood Flow" color="blue" />
          </div>
        </div>

        <div className="w-px bg-white/10 self-stretch my-1" />

        {/* Tools Group */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1 select-none">Pinpoint &amp; Orbit</span>
          <div className="flex items-center gap-1">
            {!pinMode ? (
              <>
                <ToolbarBtn active={false} onClick={() => setPinMode('inspect')} icon={<Eye size={14} className="animate-pulse" />} label="Inspect" color="purple" />
                <ToolbarBtn active={false} onClick={() => setPinMode('shelter')} icon={<MapPin size={14} />} label="Shelter" color="blue" />
                <ToolbarBtn active={false} onClick={() => setPinMode('hazard')} icon={<AlertTriangle size={14} />} label="Hazard" color="red" />
                <ToolbarBtn active={false} onClick={() => setPinMode('maintenance')} icon={<Wrench size={14} />} label="Maintenance" color="amber" />
              </>
            ) : (
              <ToolbarBtn active={false} onClick={handleCancelPin} icon={<X size={14} />} label="Cancel Pin" color="red" />
            )}
          </div>
        </div>

        <div className="w-px bg-white/10 self-stretch my-1" />

        {/* Control Group */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1 select-none">Feed</span>
          <div className="flex items-center">
            <ToolbarBtn active={drawerOpen} onClick={() => setDrawerOpen(o => !o)} icon={<SlidersHorizontal size={14} />} label="Alerts" color="purple" />
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {pinMode && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-blue-600/95 backdrop-blur-md border border-blue-500/50 text-white rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <div className="text-xs">
              {pinMode === 'shelter' ? (
                <span>📍 <strong className="font-black tracking-wide uppercase">Pinning Shelter:</strong> Click anywhere on the map to place a new evacuation shelter.</span>
              ) : pinMode === 'hazard' ? (
                isDrawingRadius ? (
                  <span>⚠️ <strong className="font-black tracking-wide uppercase">Define Boundary:</strong> Move your mouse to change size (Current: <strong className="text-yellow-300 font-bold">{drawingRadiusMeters}m</strong>), then click again to confirm.</span>
                ) : (
                  <span>⚠️ <strong className="font-black tracking-wide uppercase">Flagging Hazard:</strong> Click on the map to mark the center of the hazard zone.</span>
                )
              ) : pinMode === 'maintenance' ? (
                maintenancePoints.length === 0 ? (
                  <span>🚧 <strong className="font-black tracking-wide uppercase">Road Maintenance:</strong> Click on the map to define the <strong className="text-yellow-300">START</strong> of the blockage.</span>
                ) : (
                  <div className="flex items-center gap-3">
                    <span>🚧 <strong className="font-black tracking-wide uppercase">Define Blockage Route:</strong> Click subsequent points on the map. Total points: <strong className="text-yellow-300 font-bold">{maintenancePoints.length}</strong>.</span>
                    {maintenancePoints.length >= 2 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowMaintenanceForm(true); }}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1 rounded-lg text-[10px] uppercase transition shadow-md"
                      >
                        Finish &amp; Save Route
                      </button>
                    )}
                  </div>
                )
              ) : (
                <span>🔍 <strong className="font-black tracking-wide uppercase">Tactical 3D Inspection Active:</strong> Click any location on the map to run a 360° situational orbit.</span>
              )}
            </div>
            <button
              onClick={handleCancelPin}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        )}
        {showLocalSimulation && (
          <div className="absolute top-20 left-6 z-40 w-80 bg-gray-950/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col gap-4 animate-in slide-in-from-left duration-250">
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
        {isInspecting && (
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
          showHeatmap={showHeatmap}
          showWeather={showWeather}
          mapStyle={mapStyle}
          setMapStyle={setMapStyle}
          simulationMode={simulationMode}
          showShelters={showShelters}
          showHazards={showHazards}
          is3D={is3D}
          setIs3D={setIs3D}
          mapRef={mapRef}
          inspectLocation={inspectLocation}
          drawerOpen={drawerOpen}
          simulationGeoJSON={simulationGeoJSON}
          isDrawingRadius={isDrawingRadius}
          drawingRadiusMeters={drawingRadiusMeters}
          handleMapMouseMove={handleMapMouseMove}
          roadMaintenances={roadMaintenances}
          maintenancePoints={maintenancePoints}
          drawingEnd={drawingEnd}
          showRoadMaintenances={showRoadMaintenances}
          setSelectedRoadMaintenance={setSelectedRoadMaintenance}
          showRoadNetwork={showRoadNetwork}
          roadNetwork={roadNetwork}
          placementCoords={placementCoords}
          selectedRadiusMeters={selectedRadiusMeters}
          simOverlayMode={simOverlayMode}
        />
        <RiskAlertsDrawer
          hazards={hazards}
          roadMaintenances={roadMaintenances}
          simulationMode={simulationMode}
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
        />
      </div>
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
