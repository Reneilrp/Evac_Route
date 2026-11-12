import React, { useState } from 'react';
import { X } from 'lucide-react';

function StagingHandoverModal({ mission, shelters, onClose, onConfirm, isSubmitting }) {
  const stagingPoints = shelters.filter(s => s.facility_type === 'assembly_point' || s.facility_type === 'safe_zone');
  const availablePoints = stagingPoints.length > 0 ? stagingPoints : shelters;
  const [selectedPointId, setSelectedPointId] = useState(availablePoints[0]?.id || '');

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-teal-700 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌊</span>
            <h3 className="font-bold text-base">Radio Shoreline Staging Handover</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/70 rounded-lg p-3 text-teal-900 dark:text-teal-200 space-y-1">
            <p className="font-bold">Water-to-Land Handover Protocol:</p>
            <p className="text-[11px] leading-relaxed text-teal-800 dark:text-teal-300">
              Unloading evacuees at a dry shoreline or assembly point immediately frees{' '}
              <strong>{mission.rescue_unit?.name} ({mission.rescue_unit?.call_sign})</strong> back to{' '}
              <span className="font-bold text-emerald-700 dark:text-emerald-400">STANDBY</span> so the boat can immediately return to deep floodwaters.
              Ground marshals will guide the <strong>{mission.headcount} evacuees</strong> to shelters.
            </p>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Shoreline Staging / Assembly Point</label>
            <select
              value={selectedPointId}
              onChange={e => setSelectedPointId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg font-bold text-gray-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            >
              {availablePoints.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.barangay || 'Safe Zone'}) — Headcount: {p.current_occupancy || 0}/{p.max_capacity}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !selectedPointId}
              onClick={() => onConfirm(parseInt(selectedPointId, 10))}
              className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow disabled:opacity-60 flex items-center justify-center gap-1 transition"
            >
              {isSubmitting ? 'Logging Handover...' : 'Confirm & Free Boat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Register Rescue Unit Modal Component ---


export default StagingHandoverModal;
