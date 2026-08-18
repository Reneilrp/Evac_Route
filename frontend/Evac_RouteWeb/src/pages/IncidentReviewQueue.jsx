import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const STATUS_TABS = ['pending', 'approved', 'rejected'];

const HAZARD_COLORS = {
  flood: 'bg-blue-100 text-blue-800',
  earthquake: 'bg-orange-100 text-orange-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  debris: 'bg-gray-100 text-gray-800',
};

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

export default function IncidentReviewQueue() {
  const [activeTab, setActiveTab] = useState('pending');
  const [reviewModal, setReviewModal] = useState(null); // { id, action: 'approve'|'reject', evaluation }
  const [activePhotoModal, setActivePhotoModal] = useState(null); // URL of full photo
  const [note, setNote] = useState('');
  const [isFixedFloodSpot, setIsFixedFloodSpot] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(75);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['incidents', activeTab],
    queryFn: () => api.get(`/incidents?status=${activeTab}`).then(r => r.data.data),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, note, is_fixed_flood_spot, radius_meters }) =>
      api.post(`/incidents/${id}/${action}`, { note, is_fixed_flood_spot, radius_meters }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setReviewModal(null);
      setNote('');
      setIsFixedFloodSpot(false);
      setRadiusMeters(75);
    },
  });

  const incidents = data?.data ?? data ?? [];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Incident Review Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Review, evaluate recurrence, and validate resident-submitted field reports</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize rounded-t-lg transition ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Failed to load incidents. Please try again.
        </div>
      )}

      {!isLoading && !isError && incidents.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No {activeTab} incidents found.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {incidents.map(incident => {
          const photos = incident.photo_urls && incident.photo_urls.length > 0
            ? incident.photo_urls
            : incident.photo_url ? [incident.photo_url] : [];
          const evalData = incident.frequency_evaluation;

          return (
            <div key={incident.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between">
              <div>
                {/* Photo Gallery (Up to 3 photos) */}
                {photos.length > 0 ? (
                  <div className="relative bg-gray-900">
                    {photos.length === 1 ? (
                      <img
                        src={photos[0]}
                        alt="Incident photo"
                        onClick={() => setActivePhotoModal(photos[0])}
                        className="w-full h-44 object-cover cursor-pointer hover:opacity-90 transition"
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-0.5 h-44">
                        {photos.slice(0, 3).map((url, idx) => (
                          <div key={idx} className="relative h-full overflow-hidden">
                            <img
                              src={url}
                              alt={`Incident photo ${idx + 1}`}
                              onClick={() => setActivePhotoModal(url)}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-200"
                            />
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                              Photo {idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug">{incident.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${SEVERITY_COLORS[incident.severity_level] ?? 'bg-gray-100 text-gray-700'}`}>
                      {incident.severity_level}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${HAZARD_COLORS[incident.hazard_type] ?? 'bg-gray-100 text-gray-800'}`}>
                      {incident.hazard_type}
                    </span>
                    {photos.length > 1 && (
                      <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                        📸 {photos.length} Photos Attached
                      </span>
                    )}
                  </div>

                  {/* Hotspot / Frequency Evaluation Banner */}
                  {evalData?.is_frequent_hotspot ? (
                    <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs">
                      <div className="font-bold flex items-center gap-1 mb-0.5 text-amber-800">
                        <span>⚠️ FREQUENT INCIDENT HOTSPOT</span>
                      </div>
                      <p className="text-[11px] leading-tight text-amber-700">
                        {evalData.evaluation_summary}
                      </p>
                    </div>
                  ) : evalData ? (
                    <div className="mb-3 p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-[11px]">
                      📍 Area Evaluation: {evalData.nearby_count} total report(s) in 250m radius.
                    </div>
                  ) : null}

                  {incident.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{incident.description}</p>
                  )}

                  <div className="text-xs text-gray-500 mb-1">
                    📍 {parseFloat(incident.latitude).toFixed(5)}, {parseFloat(incident.longitude).toFixed(5)}
                  </div>
                  <div className="text-xs text-gray-600 bg-slate-50 p-2 rounded-lg border border-slate-200/80 mb-3">
                    <span className="font-semibold text-gray-800">👤 Reported by:</span> {incident.reporter?.name ?? 'Unknown Resident'}
                    {incident.reporter?.family_profile?.barangay && (
                      <span className="text-gray-500"> ({incident.reporter.family_profile.barangay})</span>
                    )}
                    {incident.reporter?.family_profile?.contact_number && (
                      <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
                        📞 {incident.reporter.family_profile.contact_number}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 pt-0">
                {activeTab === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const shouldRecommendFixed = evalData?.recommended_fixed_spot || incident.hazard_type === 'flood';
                        setReviewModal({
                          id: incident.id,
                          action: 'approve',
                          hazard_type: incident.hazard_type,
                          evaluation: evalData
                        });
                        setNote('');
                        setIsFixedFloodSpot(shouldRecommendFixed);
                        setRadiusMeters(75);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-lg font-medium transition flex items-center justify-center gap-1"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => {
                        setReviewModal({ id: incident.id, action: 'reject' });
                        setNote('');
                      }}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-2 rounded-lg font-medium transition flex items-center justify-center gap-1"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}

                {activeTab !== 'pending' && incident.review_note && (
                  <p className="text-xs text-gray-400 italic border-t pt-2">Note: {incident.review_note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1 capitalize">
              {reviewModal.action} Incident
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {reviewModal.action === 'approve'
                ? 'This will promote the report to an official hazard on the live map.'
                : 'Provide a reason for rejection.'}
            </p>

            {reviewModal.action === 'approve' && (
              <div className="mb-4 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                {reviewModal.evaluation?.is_frequent_hotspot && (
                  <div className="mb-3 p-2 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-medium">
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
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-sm font-semibold text-gray-700">
                        Promote as Weather-Triggered Fixed Flood Spot
                      </span>
                    </label>
                    <p className="text-xs text-gray-400 mt-1 pl-6">
                      Only active when rainfall duration exceeds 60 minutes. Alerts will target nearby residents based on their chosen radius.
                    </p>
                  </div>
                )}
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-650 uppercase tracking-wider">
                    Hazard Alert Radius (meters)
                  </label>
                  <input
                    type="number"
                    value={radiusMeters}
                    onChange={e => setRadiusMeters(parseInt(e.target.value) || 75)}
                    className="w-full border border-gray-350 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setReviewModal(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => reviewMutation.mutate({ 
                  id: reviewModal.id, 
                  action: reviewModal.action, 
                  note,
                  is_fixed_flood_spot: isFixedFloodSpot,
                  radius_meters: radiusMeters
                })}
                disabled={reviewMutation.isPending}
                className={`flex-1 py-2 rounded-lg text-sm font-medium text-white transition ${
                  reviewModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-500 hover:bg-red-600'
                } disabled:opacity-50`}
              >
                {reviewMutation.isPending ? 'Processing...' : `Confirm ${reviewModal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Photo Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setActivePhotoModal(null)}>
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-black">
            <img src={activePhotoModal} alt="Full view" className="max-w-full max-h-[85vh] object-contain" />
            <button
              onClick={() => setActivePhotoModal(null)}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2 hover:bg-black transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

