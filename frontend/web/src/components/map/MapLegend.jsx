import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

export default function MapLegend({ simulationMode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
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
