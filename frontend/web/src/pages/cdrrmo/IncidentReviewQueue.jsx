import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, ArchiveRestore, Radio, ShieldAlert } from 'lucide-react';
import api from '../../services/api';
import { getNearestBarangay } from '../../utils/mapHelper';
import IncidentReviewModal from '../../components/incident/modals/IncidentReviewModal';
import IncidentPhotoModal from '../../components/incident/modals/IncidentPhotoModal';

function getBarangayDisplay(incident) {
  if (!incident) return 'Zamboanga City';
  if (incident.description && incident.description.includes('Barangay:')) {
    const match = incident.description.match(/Barangay:\s*([^|\]\n]+)/i);
    if (match && match[1]) {
      const bgy = match[1].trim();
      const addrMatch = incident.description.match(/Address:\s*([^|\]\n]+)/i);
      const addr = addrMatch ? addrMatch[1].trim() : '';
      return addr ? `${addr}, Brgy. ${bgy}` : `Brgy. ${bgy}`;
    }
  }
  const lng = parseFloat(incident.longitude);
  const lat = parseFloat(incident.latitude);
  if (!isNaN(lng) && !isNaN(lat)) {
    return `Brgy. ${getNearestBarangay(lng, lat)}, Zamboanga City`;
  }
  return incident.reporter?.family_profile?.barangay
    ? `Brgy. ${incident.reporter.family_profile.barangay}, Zamboanga City`
    : 'Zamboanga City';
}

const STATUS_TABS = ['pending', 'approved', 'rejected', 'archived'];

const TYPE_OPTIONS = [
  { id: 'all', label: 'All Incidents' },
  { id: 'report', label: 'Citizen Reports' },
  { id: 'sos', label: '🚨 SOS Distress' },
];

const HAZARD_COLORS = {
  flood: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50',
  earthquake: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50',
  maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/70 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900/50',
  debris: 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300 border border-gray-200 dark:border-slate-700',
};

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-green-200 dark:border-emerald-900/50',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-amber-950/70 dark:text-amber-300 border border-yellow-200 dark:border-amber-900/50',
  high: 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300 border border-red-200 dark:border-red-900/50',
};

export default function IncidentReviewQueue() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'pending';
  const typeFilter = searchParams.get('type') || 'all';

  const setActiveTab = (tab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const setTypeFilter = (type) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('type', type);
      return next;
    });
  };

  const [reviewModal, setReviewModal] = useState(null); // { id, action: 'approve'|'reject', evaluation }
  const [activePhotoModal, setActivePhotoModal] = useState(null); // URL of full photo
  const [note, setNote] = useState('');
  const [isFixedFloodSpot, setIsFixedFloodSpot] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(75);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (reviewModal) setReviewModal(null);
        if (activePhotoModal) setActivePhotoModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reviewModal, activePhotoModal]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['incidents', activeTab, typeFilter],
    queryFn: () => {
      let url = `/incidents?status=${activeTab}`;
      if (typeFilter && typeFilter !== 'all') {
        url += `&type=${typeFilter}`;
      }
      return api.get(url).then(r => r.data.data);
    },
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

  const archiveMutation = useMutation({
    mutationFn: (id) => api.post(`/incidents/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id) => api.post(`/incidents/${id}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  const rawIncidents = data?.data ?? data ?? [];
  const incidents = Array.isArray(rawIncidents) ? rawIncidents : [];

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950">
      {/* Header Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-200 dark:border-slate-800 pb-2">
        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-bold capitalize rounded-t-lg transition cursor-pointer ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Incident Type Filter */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-900 p-1 rounded-xl self-start sm:self-auto border border-gray-200 dark:border-slate-800">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setTypeFilter(opt.id)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                typeFilter === opt.id
                  ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-xs'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}

      {isError && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
          Failed to load incidents. Please try again.
        </div>
      )}

      {!isLoading && !isError && incidents.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-slate-500">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No {activeTab} incidents found.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {incidents.map(incident => {
          const isSos = incident.name?.startsWith('EMERGENCY SOS:') || Boolean(incident.modifiers);
          const photos = incident.photo_urls && incident.photo_urls.length > 0
            ? incident.photo_urls
            : incident.photo_url ? [incident.photo_url] : [];
          const evalData = incident.frequency_evaluation;

          return (
            <div key={incident.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between hover:shadow-md transition">
              <div>
                {/* Photo Gallery or SOS Distress Banner */}
                {isSos ? (
                  <div className="w-full h-44 bg-gradient-to-br from-rose-600 via-red-600 to-amber-700 p-4 flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider bg-black/35 backdrop-blur-xs uppercase border border-white/20">
                        <span className="w-2 h-2 rounded-full bg-red-200 animate-ping" />
                        🚨 EMERGENCY SOS
                      </span>
                      {incident.headcount && (
                        <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-full">
                          👥 {incident.headcount} {incident.headcount > 1 ? 'Persons' : 'Person'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-extrabold tracking-tight leading-snug drop-shadow-xs">
                        Life-Safety Distress Alert
                      </p>
                      <p className="text-xs text-rose-100 font-medium">
                        Immediate tactical rescue assistance requested via Resident Mobile App
                      </p>
                    </div>
                  </div>
                ) : photos.length > 0 ? (
                  <div className="relative bg-gray-900">
                    {photos.length === 1 ? (
                      <img
                        src={photos[0]}
                        alt="Incident photo"
                        onClick={() => setActivePhotoModal(photos[0])}
                        className="w-full h-44 object-cover cursor-pointer hover:opacity-90 transition"
                      />
                    ) : (
                      <div className={`grid ${photos.length === 2 ? 'grid-cols-2' : photos.length === 3 ? 'grid-cols-3' : 'grid-cols-2 grid-rows-2'} gap-0.5 h-44`}>
                        {photos.slice(0, 4).map((url, idx) => (
                          <div key={idx} className="relative h-full overflow-hidden">
                            <img
                              src={url}
                              alt={`Incident photo ${idx + 1}`}
                              onClick={() => setActivePhotoModal(url)}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-200"
                            />
                            <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                              Photo {idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-40 bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm leading-snug">{incident.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${SEVERITY_COLORS[incident.severity_level] ?? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300'}`}>
                      {incident.severity_level}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${HAZARD_COLORS[incident.hazard_type] ?? 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300'}`}>
                      {incident.hazard_type}
                    </span>
                    {photos.length > 1 && (
                      <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        📸 {photos.length} Photos Attached
                      </span>
                    )}
                  </div>

                  {/* Special Needs Modifiers for SOS */}
                  {Array.isArray(incident.modifiers) && incident.modifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {incident.modifiers.map(m => (
                        <span key={m} className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                          ⚠️ {m.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Hotspot / Frequency Evaluation Banner */}
                  {evalData?.is_frequent_hotspot ? (
                    <div className="mb-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 text-xs">
                      <div className="font-bold flex items-center gap-1 mb-0.5 text-amber-800 dark:text-amber-200">
                        <span>⚠️ FREQUENT INCIDENT HOTSPOT</span>
                      </div>
                      <p className="text-[11px] leading-tight text-amber-700 dark:text-amber-400">
                        {evalData.evaluation_summary}
                      </p>
                    </div>
                  ) : evalData ? (
                    <div className="mb-3 p-2 rounded-lg bg-gray-50 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 text-[11px]">
                      📍 Area Evaluation: {evalData.nearby_count} total report(s) in 250m radius.
                    </div>
                  ) : null}

                  {incident.description?.includes('RECURRING DRAINAGE HOTSPOT') && (
                    <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5">
                      <span>🌧️</span>
                      <span>Resident Flagged: Chronic Bad Drainage Hotspot</span>
                    </div>
                  )}

                  {incident.description && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 line-clamp-2">{incident.description}</p>
                  )}

                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                    📍 {parseFloat(incident.latitude).toFixed(5)}, {parseFloat(incident.longitude).toFixed(5)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 mb-3">
                    <span className="font-semibold text-gray-800 dark:text-slate-200">👤 Reported by:</span> {incident.reporter?.name ?? 'Unknown Resident'}
                    {incident.reporter?.family_profile?.barangay && (
                      <span className="text-gray-500 dark:text-slate-400"> ({incident.reporter.family_profile.barangay})</span>
                    )}
                    {incident.reporter?.family_profile?.contact_number && (
                      <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 font-mono">
                        📞 {incident.reporter.family_profile.contact_number}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 pt-0">
                <div className="mb-3">
                  <button
                    onClick={() => {
                      const isRecurring = incident.description?.includes('RECURRING DRAINAGE HOTSPOT');
                      const params = new URLSearchParams({
                        focusLat: incident.latitude,
                        focusLng: incident.longitude,
                        incidentName: incident.name || 'Reported Incident',
                        hazardType: incident.hazard_type || 'hazard',
                        severity: incident.severity_level || 'medium',
                        incidentId: String(incident.id),
                        isRecurring: isRecurring ? '1' : '0',
                      });
                      navigate(`/admin/map?${params.toString()}`);
                    }}
                    className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs py-2 rounded-lg font-bold transition flex items-center justify-center gap-1 shadow-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    📍 Locate on Live Map
                  </button>
                </div>
                {activeTab === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const isRecurring = incident.description?.includes('RECURRING DRAINAGE HOTSPOT');
                        const shouldRecommendFixed = Boolean(evalData?.recommended_fixed_spot || isRecurring);
                        setReviewModal({
                          id: incident.id,
                          action: 'approve',
                          hazard_type: incident.hazard_type,
                          evaluation: evalData,
                          name: incident.name,
                          latitude: incident.latitude,
                          longitude: incident.longitude,
                          description: incident.description,
                          reporter: incident.reporter,
                        });
                        setNote('');
                        setIsFixedFloodSpot(shouldRecommendFixed);
                        setRadiusMeters(75);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-lg font-bold transition flex items-center justify-center gap-1 shadow-xs"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => {
                        setReviewModal({
                          id: incident.id,
                          action: 'reject',
                          hazard_type: incident.hazard_type,
                          evaluation: evalData,
                          name: incident.name,
                          latitude: incident.latitude,
                          longitude: incident.longitude,
                          description: incident.description,
                          reporter: incident.reporter,
                        });
                        setNote('');
                      }}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-2 rounded-lg font-bold transition flex items-center justify-center gap-1 shadow-xs"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}

                {activeTab !== 'pending' && incident.review_note && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic border-t border-slate-200 dark:border-slate-800 pt-2">Note: {incident.review_note}</p>
                )}

                {(activeTab === 'approved' || activeTab === 'rejected') && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    {isSos && (
                      <button
                        onClick={() => navigate('/admin/dispatch')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition border border-red-200 dark:border-red-800/50 cursor-pointer"
                        title="View mission in Rescue Dispatch Console"
                      >
                        <span>Rescue Dispatch ↗</span>
                      </button>
                    )}
                    <button
                      onClick={() => archiveMutation.mutate(incident.id)}
                      disabled={archiveMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition border border-amber-200 dark:border-amber-800/50 cursor-pointer disabled:opacity-50 ml-auto"
                      title="Archive this reviewed report"
                    >
                      <Archive size={13} />
                      <span>Archive</span>
                    </button>
                  </div>
                )}

                {activeTab === 'archived' && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    {isSos && (
                      <button
                        onClick={() => navigate('/admin/dispatch')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition border border-red-200 dark:border-red-800/50 cursor-pointer"
                        title="View mission in Rescue Dispatch Console"
                      >
                        <span>Rescue Dispatch ↗</span>
                      </button>
                    )}
                    <button
                      onClick={() => unarchiveMutation.mutate(incident.id)}
                      disabled={unarchiveMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition border border-blue-200 dark:border-blue-800/50 cursor-pointer disabled:opacity-50 ml-auto"
                      title="Restore report to active queue"
                    >
                      <ArchiveRestore size={13} />
                      <span>Restore</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Review Modal */}
      <IncidentReviewModal
        reviewModal={reviewModal}
        onClose={() => setReviewModal(null)}
        onConfirm={(payload) => reviewMutation.mutate(payload)}
        isPending={reviewMutation.isPending}
        getBarangayDisplay={getBarangayDisplay}
      />

      {/* Full Photo Modal */}
      <IncidentPhotoModal
        photoUrl={activePhotoModal}
        onClose={() => setActivePhotoModal(null)}
      />
    </div>
  );
}
