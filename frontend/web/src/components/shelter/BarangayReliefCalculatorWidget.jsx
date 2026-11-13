import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

function BarangayReliefCalculatorWidget({ isCSWDO, onDispatchManifest }) {
  const [selectedBarangay, setSelectedBarangay] = useState('Tumaga');
  const [customInput, setCustomInput] = useState('');

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['barangay-relief-summary', selectedBarangay],
    queryFn: () => api.get(`/lgu/barangay-relief-summary/${selectedBarangay}`).then(res => res.data),
    enabled: !!selectedBarangay,
  });

  const handleSearchBarangay = (e) => {
    e.preventDefault();
    if (customInput.trim()) {
      setSelectedBarangay(customInput.trim());
    }
  };

  const summary = summaryData;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-xl shadow-lg border border-blue-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              ⚡ Proactive Barangay Relief Estimator
            </h3>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl">
              <strong>Privacy-Preserving &amp; Energy-Efficient:</strong> Pre-stages relief supply manifests for affected Barangays based on demographic profiles—without invasive or battery-draining continuous background GPS tracking.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-lg border border-white/20">
            <span className="text-xs font-semibold px-2">Quick Barangays:</span>
            {['Tumaga', 'Tetuan', 'Pasonanca', 'San Roque'].map(b => (
              <button
                key={b}
                onClick={() => { setSelectedBarangay(b); setCustomInput(b); }}
                className={`text-xs px-3 py-1 rounded-md font-bold transition ${
                  selectedBarangay.toLowerCase() === b.toLowerCase() 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-white/10 hover:bg-white/20 text-blue-100'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearchBarangay} className="mt-4 flex gap-2 max-w-md">
          <input
            type="text"
            placeholder="Type any barangay name (e.g. Tumaga)..."
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-white/10 text-white placeholder-blue-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
          >
            Calculate Relief
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <span className="animate-pulse font-bold text-gray-500">Calculating proactive relief manifest for Brgy. {selectedBarangay}...</span>
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Target Barangay</span>
            <div className="text-xl font-black text-gray-900 dark:text-slate-100 mt-1">
              📍 Brgy. {summary.barangay}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Registered Families: <strong>{summary.total_registered_families}</strong>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Registered Headcount</span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {summary.total_affected_headcount} <span className="text-xs font-medium text-gray-500">Base Pax</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Active Template: <strong>{summary.active_ration_template}</strong>
            </p>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              🛡️ +{summary.contingency_buffer_percentage}% Safety Contingency Buffer
            </span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              +{summary.safety_buffer_headcount} <span className="text-xs font-medium text-emerald-600">Reserve Pax</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Recommended Target: <strong>{summary.recommended_total_headcount} Pax Total</strong>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Pre-Staging Dispatch</span>
            {isCSWDO ? (
              <button
                onClick={() => onDispatchManifest && onDispatchManifest(summary)}
                className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                🚚 Dispatch {summary.recommended_total_headcount} Pax Manifest
              </button>
            ) : (
              <span className="mt-2 block text-[10px] text-gray-400 dark:text-slate-500 font-semibold italic text-center">
                Dispatches managed by CSWDO
              </span>
            )}
          </div>

          {/* Supply Breakdown Table */}
          <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-gray-800 dark:text-slate-200 text-sm">
                Proactive Relief Supply Breakdown Manifest (Brgy. {summary.barangay})
              </h4>
              <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-full">
                Includes +{summary.contingency_buffer_percentage}% Safety Contingency Buffer (+{summary.safety_buffer_headcount} Extra Pax)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {summary.estimated_supplies_needed?.map((item, idx) => {
                const isFam = item.allocation_type === 'per_family';
                return (
                  <div key={idx} className="bg-gray-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-start gap-1">
                      <span className="block text-xs font-bold text-gray-700 dark:text-slate-300">{item.item_name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isFam ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      }`}>
                        {isFam ? 'Per Family' : 'Per Person'}
                      </span>
                    </div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {item.recommended_total_amount} <span className="text-xs font-semibold text-gray-500">{item.unit_type}</span>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-500 space-y-0.5 border-t border-gray-200 dark:border-slate-800 pt-1.5">
                      <p>• Base Need ({isFam ? `${summary.total_registered_families} fam` : `${summary.total_affected_headcount} pax`}): <strong>{item.base_required} {item.unit_type}</strong></p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-semibold">• Safety Buffer (+{summary.contingency_buffer_percentage}%): <strong>+{item.safety_buffer_amount} {item.unit_type}</strong></p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



export default BarangayReliefCalculatorWidget;
