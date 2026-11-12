import React from 'react';
import {
  MapPin, AlertTriangle, X, Moon, SlidersHorizontal, Eye, Building2, ShieldAlert, CloudRain, Sun
} from 'lucide-react';
import UnifiedMapFilterSearch from './UnifiedMapFilterSearch';
import api from '../../services/api';

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


export { ToolbarBtn };

export default function MapTopNavigation({
  isCSWDO,
  shelters = [],
  hazards = [],
  rescueUnits = [],
  activeRescueMissions = [],
  activeMapFilter,
  setActiveMapFilter,
  showRoadNetwork,
  setShowRoadNetwork,
  showHeatmap,
  setShowHeatmap,
  showWeather,
  setShowWeather,
  isolateZamboanga,
  setIsolateZamboanga,
  handleSelectMapLocation,
  handleRecenterToZamboanga,
  drawerOpen,
  setDrawerOpen,
  darkMode,
  toggleDarkMode,
  // CDRRMO-specific props
  weatherTelemetry,
  setIsWeatherModalOpen,
  pinMode,
  setPinMode,
  handleCancelPin,
  setIsProactiveModalOpen,
  activeDisasterSim,
  setActiveDisasterSim,
  queryClient,
}) {
  return (
    isCSWDO ? (
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
    )
  );
}
