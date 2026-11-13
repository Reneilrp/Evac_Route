import React, { useState, useEffect } from 'react';

export default function IncidentReviewModal({
  reviewModal,
  onClose,
  onConfirm,
  isPending,
  getBarangayDisplay,
}) {
  const [note, setNote] = useState('');
  const [isFixedFloodSpot, setIsFixedFloodSpot] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(75);

  useEffect(() => {
    if (reviewModal) {
      setNote('');
      setIsFixedFloodSpot(reviewModal.evaluation?.is_frequent_hotspot || false);
      setRadiusMeters(75);
    }
  }, [reviewModal]);

  if (!reviewModal) return null;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1 capitalize">
          {reviewModal.action} Incident
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          {reviewModal.action === 'approve'
            ? 'This will promote the report to an official hazard on the live map.'
            : 'Provide a reason for rejection.'}
        </p>

        {/* Incident Summary Card with Address/Barangay & Coordinates Permanently Visible */}
        {reviewModal.name && (
          <div className="mb-4 bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              <span className="truncate max-w-[240px]">{reviewModal.name}</span>
              {reviewModal.hazard_type && (
                <span className="capitalize px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 text-[10px]">
                  {reviewModal.hazard_type}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <span className="text-red-500">📍</span>
              <span>{getBarangayDisplay ? getBarangayDisplay(reviewModal) : reviewModal.barangay}</span>
            </div>
            {reviewModal.latitude && reviewModal.longitude && (
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>🌐</span>
                <span>
                  GPS: {parseFloat(reviewModal.latitude).toFixed(5)}°N, {parseFloat(reviewModal.longitude).toFixed(5)}°E
                </span>
              </div>
            )}
          </div>
        )}

        {reviewModal.action === 'approve' && (
          <div className="mb-4 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
            {reviewModal.evaluation?.is_frequent_hotspot && (
              <div className="mb-3 p-2 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/70 text-amber-900 dark:text-amber-300 rounded-lg text-xs font-medium">
                💡 Area Evaluation: This location has {reviewModal.evaluation.nearby_count} frequent reports. Promoting to a Fixed Hazard Spot is strongly recommended.
              </div>
            )}

            {reviewModal.hazard_type === 'flood' && (
              <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFixedFloodSpot}
                    onChange={e => setIsFixedFloodSpot(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                    Promote as Weather-Triggered Fixed Flood Spot
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 pl-6">
                  Only active when rainfall duration exceeds 60 minutes. Alerts will target nearby residents based on their chosen radius.
                </p>
              </div>
            )}
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                Hazard Alert Radius (meters)
              </label>
              <input
                type="number"
                value={radiusMeters}
                onChange={e => setRadiusMeters(parseInt(e.target.value, 10) || 75)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="5000"
              />
            </div>
          </div>
        )}

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a review note (optional for approval, required for rejection)..."
          rows={3}
          className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ 
              id: reviewModal.id, 
              action: reviewModal.action, 
              note,
              is_fixed_flood_spot: isFixedFloodSpot,
              is_active: true,
              radius_meters: radiusMeters
            })}
            disabled={isPending}
            className={`flex-1 py-2 rounded-lg text-sm font-bold text-white transition cursor-pointer ${
              reviewModal.action === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-500 hover:bg-red-600'
            } disabled:opacity-50`}
          >
            {isPending ? 'Processing...' : `Confirm ${reviewModal.action}`}
          </button>
        </div>
      </div>
    </div>
  );
}
