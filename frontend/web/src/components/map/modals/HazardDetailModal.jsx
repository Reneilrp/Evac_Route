import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { VisualTimeline } from '../HazardTimeline';

export default function HazardDetailModal({ hazard, onResolve, onCancel, isLoading, readOnly = false }) {
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-red-600 text-lg flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" /> Active Hazard Zone
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Description</p>
            <p className="text-gray-800 dark:text-slate-200 font-medium text-lg mt-0.5">{hazard.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Status &amp; Verification</p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                hazard.is_active ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400' : 'bg-gray-100 text-gray-700'
              }`}>
                {hazard.is_active ? '● Active Obstruction' : '○ Inactive / Cleared'}
              </span>
              {hazard.is_validated_by_cdrrmo && (
                <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-full">
                  🛡️ Approved &amp; Validated
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Danger Radius</p>
            <p className="text-gray-800 dark:text-slate-200 font-medium mt-0.5">{hazard.radius_meters} meters</p>
          </div>
          <div className="flex gap-3 pt-2">
            {readOnly ? (
              <button
                type="button"
                onClick={onCancel}
                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-bold text-sm transition"
              >
                Close View
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onResolve}
                  disabled={isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60"
                >
                  Resolve Hazard
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
