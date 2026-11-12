import React from 'react';
import { Waves, X, AlertTriangle } from 'lucide-react';

export default function LocalSimulationModal({
  isOpen,
  onClose,
  simSetupState,
  setSimSetupState,
  selectedRadiusMeters,
  setSelectedRadiusMeters,
  simCenter,
  setSimCenter,
  setPlacementCoords,
  simOverlayMode,
  setSimOverlayMode,
  mapRef,
  runSimulationFlow,
  setSimulationGeoJSON,
  handleSetLocalSimulation,
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-20 left-6 z-40 w-80 bg-white/98 dark:bg-gray-950/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-slate-800 dark:text-white flex flex-col gap-4 animate-in slide-in-from-left duration-250">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="text-blue-500 dark:text-blue-400 animate-pulse" size={18} />
          <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Flood Flow Simulation</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white transition cursor-pointer">
          <X size={16} />
        </button>
      </div>
      
      {simSetupState === 'configuring' && (
        <>
          <p className="text-[11px] text-slate-600 dark:text-white/60 leading-relaxed">
            Analyze localized water accumulation and low-elevation runoff patterns based on real-time Mapbox terrain elevation heights.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 dark:text-white/80">Search Radius:</span>
              <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/20">{selectedRadiusMeters}m</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={selectedRadiusMeters}
              onChange={(e) => setSelectedRadiusMeters(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-white/40 font-bold">
              <span>100m (High Res)</span>
              <span>2.0km (Macro)</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSimSetupState('placing');
                setPlacementCoords(null);
              }}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-blue-500/20 transition transform active:scale-95 duration-200 cursor-pointer"
            >
              Select Location
            </button>
            <button
              onClick={() => {
                setSimSetupState('processing');
                const map = mapRef.current?.getMap ? mapRef.current.getMap() : mapRef.current;
                if (map) {
                  const center = map.getCenter();
                  const coords = { longitude: center.lng, latitude: center.lat };
                  setSimCenter(coords);
                  runSimulationFlow(coords.longitude, coords.latitude, selectedRadiusMeters);
                }
              }}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white/90 font-extrabold text-xs rounded-xl border border-slate-200 dark:border-white/5 transition transform active:scale-95 duration-200 cursor-pointer"
            >
              Center of Map
            </button>
          </div>
        </>
      )}
      
      {simSetupState === 'placing' && (
        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-2.5 rounded-xl">
            <AlertTriangle size={14} className="shrink-0 animate-bounce" />
            <span>Click anywhere on the map to place the simulation center.</span>
          </div>
          <button
            onClick={() => setSimSetupState('configuring')}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/70 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Back
          </button>
        </div>
      )}
      
      {simSetupState === 'processing' && (
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider animate-pulse">Running Simulation...</p>
          <p className="text-[10px] text-slate-500 dark:text-white/40">Fetching elevation height grids</p>
        </div>
      )}
      
      {simSetupState === 'rendered' && (
        <>
          <div className="flex flex-col gap-1.5 p-3 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/15 rounded-2xl text-xs">
            <div className="flex justify-between font-bold text-slate-700 dark:text-white/80">
              <span>Radius Scope:</span>
              <span className="text-blue-600 dark:text-blue-400">{selectedRadiusMeters}m</span>
            </div>
            <div className="flex justify-between font-bold text-slate-700 dark:text-white/80">
              <span>Center:</span>
              <span className="text-slate-500 dark:text-white/60 text-[10px] font-mono">{simCenter?.longitude.toFixed(5)}, {simCenter?.latitude.toFixed(5)}</span>
            </div>
            <div className="flex justify-between items-center font-bold text-slate-700 dark:text-white/80 mt-1.5 pt-1.5 border-t border-slate-200 dark:border-white/5">
              <span>Overlay Mode:</span>
              <div className="flex bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg border border-slate-200 dark:border-white/10 shrink-0">
                <button
                  onClick={() => setSimOverlayMode('flow')}
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase transition cursor-pointer ${
                    simOverlayMode === 'flow' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Flow
                </button>
                <button
                  onClick={() => setSimOverlayMode('gradient')}
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase transition cursor-pointer ${
                    simOverlayMode === 'gradient' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white'
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
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-blue-500/20 transition cursor-pointer"
            >
              Reposition
            </button>
            <button
              onClick={() => {
                handleSetLocalSimulation(false);
              }}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white/90 font-extrabold text-xs rounded-xl border border-slate-200 dark:border-white/5 transition cursor-pointer"
            >
              Clear Sim
            </button>
          </div>
        </>
      )}
    </div>
  );
}
