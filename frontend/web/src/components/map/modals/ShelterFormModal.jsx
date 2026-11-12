import React, { useState } from 'react';
import { MapPin, X } from 'lucide-react';

export default function ShelterFormModal({ location, onConfirm, onCancel, isLoading }) {
  const [name, setName] = useState('');
  const [cap, setCap] = useState('');
  const [facilityType, setFacilityType] = useState('evacuation_center');
  const [elevation, setElevation] = useState('15');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !cap || isNaN(parseInt(cap, 10))) return;
    onConfirm({
      name,
      max_capacity: parseInt(cap, 10),
      facility_type: facilityType,
      elevation_meters: parseInt(elevation, 10) || 10
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <MapPin size={20} className="text-blue-500" /> Pin Emergency Facility
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Location: <span className="font-mono text-xs">{location?.latitude?.toFixed(5)}, {location?.longitude?.toFixed(5)}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Facility Name</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              placeholder="e.g. Tetuan Covered Court or Pasonanca Safe Zone"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Facility Type (REV-03)</label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              value={facilityType}
              onChange={e => setFacilityType(e.target.value)}
            >
              <option value="evacuation_center">🏫 Indoor Evacuation Center</option>
              <option value="safe_zone">🛡️ Open-Air High-Ground Safe Zone</option>
              <option value="assembly_point">🚩 Bus Pick-up Assembly Point</option>
              <option value="police_station">👮 Police Station Precinct</option>
              <option value="military_base">🪖 Military Command Outpost</option>
              <option value="hospital">🏥 Hospital / Decontamination Center</option>
              <option value="fire_station">🚒 Fire & Rescue Station</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Capacity</label>
              <input
                type="number"
                min="1"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                placeholder="e.g. 200"
                value={cap}
                onChange={e => setCap(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-350 mb-1">Elevation (m)</label>
              <input
                type="number"
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                placeholder="e.g. 18"
                value={elevation}
                onChange={e => setElevation(e.target.value)}
              />
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
