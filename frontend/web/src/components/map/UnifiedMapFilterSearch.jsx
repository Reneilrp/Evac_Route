import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Layers,
  MapPin,
  Building2,
  Users,
  AlertTriangle,
  Flame,
  Droplets,
  Waves,
  Truck,
  TriangleAlert,
  Crosshair
} from 'lucide-react';
import { BARANGAY_COORDS } from '../../utils/mapHelper';

export function FloatingMapSearch({ shelters = [], hazards = [], onSelectLocation, className = '', autoFocus = false }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const matches = [];

    // Search Barangays
    Object.entries(BARANGAY_COORDS).forEach(([name, coords]) => {
      if (name.toLowerCase().includes(q)) {
        matches.push({
          type: 'barangay',
          name,
          subtitle: 'Zamboanga City Barangay',
          coords
        });
      }
    });

    // Search Shelters
    shelters.forEach(s => {
      if (s.name && s.name.toLowerCase().includes(q)) {
        matches.push({
          type: 'shelter',
          name: s.name,
          subtitle: `${s.status || 'Active'} · Cap: ${s.current_occupancy ?? 0}/${s.max_capacity ?? 0}`,
          coords: [parseFloat(s.longitude), parseFloat(s.latitude)],
          shelter: s
        });
      }
    });

    // Search Hazards
    hazards.forEach(h => {
      const name = h.name || h.hazard_type || 'Hazard';
      const desc = h.description || '';
      const hType = (h.hazard_type || '').toLowerCase();
      if (name.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || hType.includes(q)) {
        matches.push({
          type: 'hazard',
          name,
          subtitle: `${(h.hazard_type || 'Hazard').toUpperCase()} · Severity: ${(h.severity_level || 'Active').toUpperCase()}`,
          coords: [parseFloat(h.longitude), parseFloat(h.latitude)],
          hazard: h,
        });
      }
    });

    return matches.slice(0, 8);
  }, [query, shelters, hazards]);

  const handleSelect = (item) => {
    onSelectLocation(item);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleSelect(results[0]);
    }
  };

  return (
    <div ref={containerRef} className={`relative font-sans ${className || 'w-48 sm:w-60 md:w-72 lg:w-80'}`}>
      <div className="relative flex items-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-xl transition focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20">
        <Search size={15} className="ml-3.5 text-slate-400 dark:text-white/50 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search barangay or shelter..."
          className="w-full bg-transparent px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="mr-3 text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white transition cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="mt-1.5 bg-white/98 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 divide-y divide-slate-100 dark:divide-white/5 animate-in fade-in duration-150">
          {results.map((res, i) => (
            <div
              key={i}
              onClick={() => handleSelect(res)}
              className="px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer flex items-center justify-between text-xs transition"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                {res.type === 'shelter' ? (
                  <Building2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : res.type === 'hazard' ? (
                  <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                ) : (
                  <MapPin size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                )}
                <div className="truncate">
                  <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{res.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-white/50 truncate">{res.subtitle}</div>
                </div>
              </div>
              <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded shrink-0 border ${
                res.type === 'shelter'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
                  : res.type === 'hazard'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30'
                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30'
              }`}>
                {res.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Unified Map Filter & Search Control Panel (Floating Dropdown) ---
export function UnifiedMapFilterSearch({
  shelters = [],
  hazards = [],
  rescueUnits = [],
  activeRescueMissions = [],
  activeFilter = 'all',
  onChangeFilter,
  showRoadNetwork = true,
  onToggleRoadNetwork,
  showHeatmap = false,
  onToggleHeatmap,
  showWeather = false,
  onToggleWeather,
  onSelectLocation,
  onRecenter,
  isolateZamboanga = true,
  onToggleIsolateZamboanga,
  isCSWDO = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const counts = useMemo(() => {
    const floodCount = hazards.filter(h => {
      const t = (h.hazard_type || '').toLowerCase();
      return h.is_fixed_flood_spot || ['flood', 'tsunami', 'water', 'landslide'].some(k => t.includes(k));
    }).length;

    const earthquakeCount = hazards.filter(h => {
      const t = (h.hazard_type || '').toLowerCase();
      return ['earthquake', 'tremor', 'fault', 'structural_collapse'].some(k => t.includes(k));
    }).length;

    const fixedFloodCount = hazards.filter(h => Boolean(h.is_fixed_flood_spot)).length;

    const fireCount = hazards.filter(h => {
      const t = (h.hazard_type || '').toLowerCase();
      return ['fire', 'wildfire', 'smoke', 'explosion'].some(k => t.includes(k));
    }).length;

    return {
      all: hazards.length + shelters.length + rescueUnits.length,
      flood: floodCount,
      earthquake: earthquakeCount,
      fixed_flood: fixedFloodCount,
      fire: fireCount,
      rescue_units: rescueUnits.length,
      shelters: shelters.length,
      sos: activeRescueMissions.length,
    };
  }, [hazards, shelters, rescueUnits, activeRescueMissions]);

  const filterOptions = [
    { id: 'all', label: 'All Visible', icon: <Layers size={14} className="text-blue-400" />, count: counts.all },
    { id: 'flood', label: 'Floods Only', icon: <Waves size={14} className="text-sky-400" />, count: counts.flood },
    { id: 'earthquake', label: 'Earthquakes Only', icon: <TriangleAlert size={14} className="text-amber-400" />, count: counts.earthquake },
    { id: 'fixed_flood', label: 'Chronic Flood Spots', icon: <Droplets size={14} className="text-cyan-400" />, count: counts.fixed_flood },
    { id: 'fire', label: 'Fire Hazards', icon: <Flame size={14} className="text-orange-400" />, count: counts.fire },
    { id: 'rescue_units', label: 'Rescue Fleet Only', icon: <Truck size={14} className="text-emerald-400" />, count: counts.rescue_units },
    { id: 'shelters', label: 'Shelters Only', icon: <Building2 size={14} className="text-green-400" />, count: counts.shelters },
    { id: 'residents', label: 'Residents / Signals', icon: <Users size={14} className="text-purple-400" />, count: counts.sos },
  ];

  const activeOption = filterOptions.find(o => o.id === activeFilter) || filterOptions[0];

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Top Bar Trigger Group (Seamless Toolbar Integration) */}
      <div className="flex flex-col items-center justify-center">
        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5 select-none whitespace-nowrap flex items-center gap-1">
          <Search size={9} />
          <span>Search &amp; Filter</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsOpen(o => !o)}
            aria-expanded={isOpen}
            aria-label="Map Filter and Search Hub"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap ${
              isOpen || activeFilter !== 'all'
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Filter size={12} className={isOpen || activeFilter !== 'all' ? 'text-white' : 'text-blue-600 dark:text-blue-400'} />
            <span className="text-[11px] font-bold">
              {activeFilter === 'all' ? 'Filter & Search' : activeOption.label}
            </span>
            {activeFilter !== 'all' && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          {/* Recenter Zamboanga City (Integrated, Compact) */}
          {onRecenter && (
            <button
              type="button"
              onClick={onRecenter}
              title="Recenter Map to Zamboanga City Center"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 transition cursor-pointer text-xs font-bold whitespace-nowrap shadow-xs"
            >
              <Crosshair size={12} />
              <span className="text-[11px]">Recenter</span>
            </button>
          )}

          {/* SOS Emergency Badge (Always Visible & Prominent) */}
          {counts.sos > 0 && (
            <div
              title={`${counts.sos} active SOS distress beacons (Always visible)`}
              className="flex items-center gap-1 bg-red-600/90 text-white border border-red-500/50 text-[10px] font-black px-1.5 py-0.5 rounded-lg shadow-sm animate-pulse select-none whitespace-nowrap"
            >
              <span>🆘</span>
              <span>{counts.sos} SOS</span>
            </div>
          )}

          {/* Quick Reset Filter Button when a filter is active */}
          {activeFilter !== 'all' && (
            <button
              type="button"
              onClick={() => onChangeFilter('all')}
              title="Reset filter to Show All"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/10 transition cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Floating Dropdown Panel with Integrated Search Bar & Granular Filters */}
      <div className={`absolute top-full left-0 mt-2.5 w-80 sm:w-96 max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-thin bg-white/98 dark:bg-gray-900/95 backdrop-blur-2xl border border-slate-200 dark:border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-4 text-slate-800 dark:text-white space-y-4 transition-all duration-150 ${
        isOpen ? 'block z-50 animate-in fade-in slide-in-from-top-2' : 'hidden'
      }`}>
          {/* 1. Embedded Search Bar at Top */}
          <div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Search Map</span>
              <span className="text-[9px] text-blue-600 dark:text-blue-400">Barangays, Shelters &amp; Hazards</span>
            </div>
            <FloatingMapSearch
              shelters={shelters}
              hazards={hazards}
              autoFocus={isOpen}
              onSelectLocation={(loc) => {
                onSelectLocation(loc);
                setIsOpen(false);
              }}
              className="w-full"
            />
          </div>

          {/* 2. Distress SOS Guarantee Alert */}
          <div className="flex items-center justify-between bg-rose-50 dark:bg-red-950/60 border border-rose-200 dark:border-red-500/40 rounded-xl px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="font-extrabold text-rose-700 dark:text-red-200">SOS Distress Signals</span>
            </div>
            <span className="text-[10px] font-bold text-rose-600 dark:text-red-300 uppercase tracking-wider">
              {counts.sos > 0 ? `${counts.sos} Active Beacons` : 'Standby (Always Visible)'}
            </span>
          </div>

          {/* 3. Granular Filter Options */}
          <div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Filter Map Entities</span>
              {activeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => onChangeFilter('all')}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                >
                  Reset (All)
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {filterOptions.map((opt) => {
                const isActive = activeFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChangeFilter(opt.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/25'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/80 dark:border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {typeof opt.count === 'number' && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isActive ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-600 dark:bg-black/30 dark:text-white/50'
                      }`}>
                        {opt.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Base Map Overlays Toggle */}
          <div className="border-t border-slate-200 dark:border-white/10 pt-3 space-y-2">
            <div className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Base GIS Overlays</div>
            <div className="space-y-1.5 text-xs">
              <label className="flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg cursor-pointer transition select-none">
                <span className="flex items-center gap-2 text-slate-700 dark:text-white/80">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Isolate Zamboanga (Spotlight)
                </span>
                <input
                  type="checkbox"
                  checked={isolateZamboanga}
                  onChange={e => onToggleIsolateZamboanga?.(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/20 text-cyan-500 bg-white dark:bg-white/10 focus:ring-0 cursor-pointer"
                />
              </label>

              {!isCSWDO && (
                <label className="flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg cursor-pointer transition select-none">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-white/80">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Road Network Graph (GIS)
                  </span>
                  <input
                    type="checkbox"
                    checked={showRoadNetwork}
                    onChange={e => onToggleRoadNetwork(e.target.checked)}
                    className="rounded border-slate-300 dark:border-white/20 text-blue-600 bg-white dark:bg-white/10 focus:ring-0 cursor-pointer"
                  />
                </label>
              )}

              <label className="flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg cursor-pointer transition select-none">
                <span className="flex items-center gap-2 text-slate-700 dark:text-white/80">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  Live Weather Radar (Doppler)
                </span>
                <input
                  type="checkbox"
                  checked={showWeather}
                  onChange={e => onToggleWeather(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/20 text-blue-600 bg-white dark:bg-white/10 focus:ring-0 cursor-pointer"
                />
              </label>

              {!isCSWDO && (
                <label className="flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg cursor-pointer transition select-none">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-white/80">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Demographics Heatmap
                  </span>
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={e => onToggleHeatmap(e.target.checked)}
                    className="rounded border-slate-300 dark:border-white/20 text-amber-500 bg-white dark:bg-white/10 focus:ring-0 cursor-pointer"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

export default UnifiedMapFilterSearch;
