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
  const [reviewModal, setReviewModal] = useState(null); // { id, action: 'approve'|'reject' }
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['incidents', activeTab],
    queryFn: () => api.get(`/incidents?status=${activeTab}`).then(r => r.data.data),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, note }) =>
      api.post(`/incidents/${id}/${action}`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setReviewModal(null);
      setNote('');
    },
  });

  const incidents = data?.data ?? data ?? [];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Incident Review Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Review and validate resident-submitted field reports</p>
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
        {incidents.map(incident => (
          <div key={incident.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Photo */}
            {incident.photo_url ? (
              <img
                src={incident.photo_url}
                alt="Incident photo"
                className="w-full h-40 object-cover"
              />
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

              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${HAZARD_COLORS[incident.hazard_type] ?? 'bg-gray-100 text-gray-800'}`}>
                {incident.hazard_type}
              </span>

              {incident.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{incident.description}</p>
              )}

              <div className="text-xs text-gray-400 mb-1">
                📍 {parseFloat(incident.latitude).toFixed(5)}, {parseFloat(incident.longitude).toFixed(5)}
              </div>
              <div className="text-xs text-gray-400 mb-3">
                Reported by: {incident.reporter?.name ?? 'Unknown'}
              </div>

              {/* Actions */}
              {activeTab === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setReviewModal({ id: incident.id, action: 'approve' }); setNote(''); }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 rounded-lg font-medium transition"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => { setReviewModal({ id: incident.id, action: 'reject' }); setNote(''); }}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1.5 rounded-lg font-medium transition"
                  >
                    ✕ Reject
                  </button>
                </div>
              )}

              {activeTab !== 'pending' && incident.review_note && (
                <p className="text-xs text-gray-400 italic">Note: {incident.review_note}</p>
              )}
            </div>
          </div>
        ))}
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
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note (optional for approve, recommended for reject)..."
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
                onClick={() => reviewMutation.mutate({ id: reviewModal.id, action: reviewModal.action, note })}
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
    </div>
  );
}
