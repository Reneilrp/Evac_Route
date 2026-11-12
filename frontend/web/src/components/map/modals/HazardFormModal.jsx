import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, X, Flame, Droplets, Activity, ShieldAlert, Clock, Plus, Trash2, MapPin } from 'lucide-react';

export default function HazardFormModal({
  location,
  initialRadius = 50,
  initialGeometryType = 'circle',
  initialCorridorCoords = null,
  onConfirm,
  onCancel,
  isLoading,
}) {
  const [name, setName] = useState('');
  const radius = (initialRadius || 50).toString();
  const geometryType = initialGeometryType || 'circle';
  const [hazardType, setHazardType] = useState('flood');
  const [severityLevel, setSeverityLevel] = useState('medium');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState('hours');
  const [isFixedFloodSpot, setIsFixedFloodSpot] = useState(false);

  const handleHazardTypeChange = (e) => {
    const type = e.target.value;
    setHazardType(type);
    if (type !== 'flood') {
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
      geometry_type: geometryType,
      corridor_coordinates: geometryType === 'road_corridor' ? initialCorridorCoords : null,
      hazard_type: hazardType,
      severity_level: severityLevel,
      estimated_duration_hours: hours,
      is_fixed_flood_spot: hazardType === 'flood' ? isFixedFloodSpot : false
    });
  };

  const isSeverityLocked = false;

  const severityOptions = useMemo(() => {
    if (hazardType === 'building_fire' || hazardType === 'fire') {
      return [
        { value: 'low', label: '1st Alarm (Initial Engine / Single Room)', desc: 'Fire confined to room or point of origin.' },
        { value: 'medium', label: '2nd Alarm (Multiple Engines / Spreading)', desc: 'Fire spreading across structure, heavy smoke.' },
        { value: 'high', label: '3rd Alarm / General (Major Conflagration)', desc: 'Multiple structures engulfed, citywide backup requested.' },
      ];
    }
    if (hazardType === 'landslide') {
      return [
        { value: 'low', label: 'Low (Minor Shoulder Rockfall / Erosion)', desc: 'Soil slumping on roadside ditch; roadway remains passable.' },
        { value: 'medium', label: 'Medium (Partial Lane Mudflow)', desc: 'Mud and boulders blocking single lane; clearance crew needed.' },
        { value: 'high', label: 'High (Complete Slope Collapse / Buried)', desc: 'Entire road buried, evacuation corridor severed.' },
      ];
    }
    if (hazardType === 'flood') {
      return [
        { value: 'low', label: 'Low (Ankle-deep 10-25cm)', desc: 'Passable to all vehicles; gutters overflowing.' },
        { value: 'medium', label: 'Medium (Knee-deep 25-60cm)', desc: 'Passable only to 4x4 trucks; ground floors threatened.' },
        { value: 'high', label: 'High (Chest-deep >1m / Impassable)', desc: 'Completely impassable; rescue boats and air extraction needed.' },
      ];
    }
    if (hazardType === 'road_block') {
      return [
        { value: 'low', label: 'Low (Minor Debris / Single Lane Passable)', desc: 'Fallen branches or scattered debris; vehicles can bypass with caution.' },
        { value: 'medium', label: 'Medium (Heavy Obstruction / 4x4 Only)', desc: 'Downed pole or heavy rubble; light vehicles blocked.' },
        { value: 'high', label: 'High (Total Road Block / Impassable)', desc: 'Entire roadway impassable to all traffic; emergency crews needed.' },
      ];
    }
    return [
      { value: 'low', label: 'Low Severity', desc: 'Minor hazard, manageable locally.' },
      { value: 'medium', label: 'Medium Severity', desc: 'Significant hazard affecting travel.' },
      { value: 'high', label: 'High Severity', desc: 'Severe emergency threatening life safety.' },
    ];
  }, [hazardType]);

  const activeSeverityDesc = severityOptions.find(o => o.value === severityLevel)?.desc;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
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
                <option value="landslide">Landslide</option>
                <option value="building_fire">Building Fire</option>
                <option value="road_block">Road Block / Obstruction</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">
                Basis of Severity ({hazardType === 'building_fire' ? 'BFP Fire Alarm' : hazardType === 'road_block' ? 'Obstruction Degree' : hazardType})
              </label>
              <select
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 disabled:bg-gray-100 dark:disabled:bg-slate-950 disabled:text-gray-500 dark:disabled:text-slate-650"
                value={severityLevel}
                onChange={e => setSeverityLevel(e.target.value)}
                disabled={isSeverityLocked}
              >
                {severityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {activeSeverityDesc && (
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                  ℹ️ {activeSeverityDesc}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200/80 dark:border-slate-700/60 text-xs">
            <span className="font-medium text-gray-500 dark:text-slate-400">Geometry Mode:</span>
            <span className="font-bold flex items-center gap-1.5 text-gray-800 dark:text-slate-200">
              {geometryType === 'road_corridor' ? (
                <>
                  <span>🛣️</span>
                  <span>Road Path (Highway Corridor)</span>
                </>
              ) : (
                <>
                  <span>⭕</span>
                  <span>Circle Radius (Radial Zone)</span>
                </>
              )}
            </span>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350">
                {geometryType === 'road_corridor' ? 'Road Corridor Reach' : 'Danger Radius'}
              </label>
              <span className="text-[11px] font-mono text-gray-400 dark:text-slate-500">
                Interactive Map Trace
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700/80 rounded-lg text-sm bg-gray-100 dark:bg-slate-800/80 text-gray-700 dark:text-slate-300 font-semibold cursor-not-allowed select-all"
                value={`${radius} meters`}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-gray-400 dark:text-slate-500 font-medium">
                Locked to map
              </div>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
              {geometryType === 'road_corridor'
                ? `Measured and snapped strictly along the road network based on your map trace${initialCorridorCoords?.length ? ` (${initialCorridorCoords.length} waypoints)` : ''}.`
                : 'Measured dynamically from the center pin to your selected perimeter.'}
            </p>
          </div>
          {hazardType === 'flood' && (
            <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
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
               hazardType === 'road_block' ? 'Estimated Clearance Time' : 
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
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 py-2.5 rounded-lg font-semibold text-sm transition cursor-pointer"
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
