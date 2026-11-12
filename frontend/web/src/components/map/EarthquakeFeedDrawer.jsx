import React, { useState } from 'react';
import { Activity, X, Eye, EyeOff, RotateCcw, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';

export default function EarthquakeFeedDrawer({
  isOpen,
  onClose,
  earthquakes = [],
  isLoading = false,
  onSelectEarthquake,
  dismissedEarthquakeIds = [],
  onDismissEarthquake,
  onRestoreEarthquake,
}) {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'dismissed'

  if (!isOpen) return null;

  const activeEarthquakes = earthquakes.filter(eq => !dismissedEarthquakeIds.includes(eq.id));
  const dismissedEarthquakes = earthquakes.filter(eq => dismissedEarthquakeIds.includes(eq.id));

  const currentList = activeTab === 'active' ? activeEarthquakes : dismissedEarthquakes;

  return (
    <div className="absolute top-20 right-4 z-40 w-96 max-w-[calc(100vw-2rem)] bg-slate-950/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-amber-500/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <span className="text-base">🌋</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              Live Seismic Activity
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                USGS Feed
              </span>
            </h3>
            <p className="text-[11px] text-white/50">Radius: 350km around Zamboanga City</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          aria-label="Close Seismic Drawer"
        >
          <span className="text-lg leading-none">&times;</span>
        </button>
      </div>

      {/* Tabs: Active vs Acknowledged */}
      <div className="flex border-b border-white/10 bg-slate-900/60 p-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'active'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>Active on Map</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
            activeTab === 'active' ? 'bg-slate-950 text-amber-300' : 'bg-white/10 text-white/80'
          }`}>
            {activeEarthquakes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('dismissed')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'dismissed'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>Acknowledged</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
            activeTab === 'dismissed' ? 'bg-slate-950 text-amber-300' : 'bg-white/10 text-white/80'
          }`}>
            {dismissedEarthquakes.length}
          </span>
        </button>
      </div>

      {/* Earthquakes List */}
      <div className="max-h-[55vh] overflow-y-auto divide-y divide-white/5 p-2">
        {isLoading ? (
          <div className="py-8 text-center text-white/40 text-xs flex flex-col items-center gap-2">
            <span className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            Loading real-time seismic feed...
          </div>
        ) : currentList.length === 0 ? (
          <div className="py-8 text-center text-white/40 text-xs px-4">
            {activeTab === 'active' ? (
              <>
                <p className="font-bold text-emerald-400">All Seismic Events Acknowledged</p>
                <p className="mt-1 text-[11px]">No active unacknowledged earthquakes on the map.</p>
              </>
            ) : (
              <>
                <p className="font-bold text-white/60">No Acknowledged Events</p>
                <p className="mt-1 text-[11px]">Earthquakes you dismiss from the map will be catalogued here.</p>
              </>
            )}
          </div>
        ) : (
          currentList.map((eq) => {
            const isHigh = eq.magnitude >= 5.0;
            const isModerate = eq.magnitude >= 4.0 && eq.magnitude < 5.0;
            const magBg = isHigh
              ? 'bg-rose-500 text-white'
              : isModerate
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-800 text-amber-400 border border-amber-500/30';

            const eqTimeMs = eq.time ? Number(eq.time) : (eq.time_formatted ? new Date(eq.time_formatted).getTime() : 0);
            const ageMinutes = eqTimeMs ? Math.max(0, Math.floor((Date.now() - eqTimeMs) / (1000 * 60))) : 999;
            const isRecentShockwave = ageMinutes <= 30;

            return (
              <div
                key={eq.id}
                onClick={() => onSelectEarthquake && onSelectEarthquake(eq)}
                className="p-3 rounded-xl hover:bg-white/5 transition cursor-pointer group flex items-start gap-3"
              >
                {/* Magnitude Badge */}
                <div className={`w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center font-black ${magBg} shadow-md`}>
                  <span className="text-xs leading-none">M</span>
                  <span className="text-sm leading-none font-black">{eq.magnitude.toFixed(1)}</span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition">
                      {eq.place}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] mt-1">
                    {isRecentShockwave ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-extrabold border border-rose-500/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                        {ageMinutes}m ago (Active Shockwave)
                      </span>
                    ) : (
                      <span className="text-white/50 font-medium">
                        {ageMinutes < 60 ? `${ageMinutes}m ago` : `${Math.floor(ageMinutes / 60)}h ago`} • Monitoring
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-white/50 mt-1">
                    <span>{eq.distance_km} km away</span>
                    <span>&bull;</span>
                    <span>Depth: {eq.depth_km} km</span>
                  </div>
                  {eq.time_formatted && (
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {new Date(eq.time_formatted).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Action Button: Dismiss or Restore */}
                <div className="shrink-0 flex items-center self-center" onClick={(e) => e.stopPropagation()}>
                  {activeTab === 'active' ? (
                    <button
                      type="button"
                      onClick={() => onDismissEarthquake && onDismissEarthquake(eq.id)}
                      title="Acknowledge and hide from live map"
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/50 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <EyeOff size={12} />
                      <span className="hidden sm:inline">Acknowledge</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRestoreEarthquake && onRestoreEarthquake(eq.id)}
                      title="Restore onto live map"
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-white/50 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      <span className="hidden sm:inline">Restore</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-black/40 border-t border-white/5 text-[10px] text-white/40 flex items-center justify-between">
        <span>Click event to center & inspect pin</span>
        <span className="text-amber-400/80 font-bold">Auto-updates 1m</span>
      </div>
    </div>
  );
}
