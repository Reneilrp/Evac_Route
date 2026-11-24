import React from 'react';
import { X, Building2, Users, Navigation, MapPin, Phone, ShieldCheck } from 'lucide-react';

export default function ShelterViewModal({ shelter, onCancel, onNavigateShelter }) {
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            <MapPin size={20} className="text-blue-500" /> Shelter Details
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Shelter Name</span>
            <p className="font-semibold text-gray-900 dark:text-white text-base">{shelter.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <span className="block text-xs text-gray-500 dark:text-slate-400">Current IDP Occupancy</span>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{shelter.current_occupancy ?? 0}</p>
            </div>
            <div>
              <span className="block text-xs text-gray-500 dark:text-slate-400">Max Capacity</span>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{shelter.max_capacity ?? 0}</p>
            </div>
          </div>
          {/* Capacity Progress Meter */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Capacity Utilization</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {shelter.max_capacity > 0 ? Math.round(((shelter.current_occupancy || 0) / shelter.max_capacity) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  ((shelter.current_occupancy || 0) / (shelter.max_capacity || 1)) >= 1
                    ? 'bg-rose-500'
                    : ((shelter.current_occupancy || 0) / (shelter.max_capacity || 1)) >= 0.8
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.round(((shelter.current_occupancy || 0) / (shelter.max_capacity || 1)) * 100))}%`
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Status</span>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                shelter.status === 'open' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                shelter.status === 'full' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
              }`}>
                {shelter.status}
              </span>
            </div>
            {shelter.facility_type && (
              <div className="text-right">
                <span className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Facility Type</span>
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 capitalize">
                  {shelter.facility_type.replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </div>
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg font-semibold text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onNavigateShelter}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition"
            >
              Manage in Shelters &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
