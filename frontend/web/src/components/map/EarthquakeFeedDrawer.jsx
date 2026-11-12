import React from 'react';
import { Activity, X, ChevronRight, AlertTriangle, ExternalLink } from 'lucide-react';

export default function EarthquakeFeedDrawer({
  isOpen,
  onClose,
  earthquakes = [],
  isLoading = false,
  onSelectEarthquake,
}) {
  if (!isOpen) return null;

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

      {/* Earthquakes List */}
      <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5 p-2">
        {isLoading ? (
          <div className="py-8 text-center text-white/40 text-xs flex flex-col items-center gap-2">
            <span className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            Loading real-time seismic feed...
          </div>
        ) : earthquakes.length === 0 ? (
          <div className="py-8 text-center text-white/40 text-xs px-4">
            <p className="font-bold text-emerald-400">No Notable Earthquakes</p>
            <p className="mt-1 text-[11px]">No seismic events ≥ M2.5 recorded within 350km in the last 30 days.</p>
          </div>
        ) : (
          earthquakes.map((eq) => {
            const isHigh = eq.magnitude >= 5.0;
            const isModerate = eq.magnitude >= 4.0 && eq.magnitude < 5.0;
            const magBg = isHigh ? 'bg-rose-500 text-white' : isModerate ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-amber-400 border border-amber-500/30';

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
                  <p className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition">
                    {eq.place}
                  </p>
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

                <div className="text-white/30 group-hover:text-amber-400 transition self-center">
                  &rarr;
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-black/40 border-t border-white/5 text-[10px] text-white/40 flex items-center justify-between">
        <span>Click event to view epicenter pin</span>
        <span className="text-amber-400/80 font-bold">Auto-updates 5m</span>
      </div>
    </div>
  );
}
