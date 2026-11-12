import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LifeBuoy, Truck, Phone, Users, Clock, AlertTriangle,
  CheckCircle2, MapPin, Send, X, RefreshCw, Radio, Plus, Sparkles,
  Archive, ArchiveRestore
} from 'lucide-react';
import api from '../../services/api';
import echo from '../../services/echo';
import HotlineIntakeModal from '../../components/disaster/HotlineIntakeModal';
import { showSuccess, showError } from '../../utils/toast';
import { getHaversineDistance, resolveBarangayFromCoords, ZAMBOANGA_BARANGAYS } from '../../utils/mapHelper';
import DispatchUnitModal from '../../components/dispatch/modals/DispatchUnitModal';
import StagingHandoverModal from '../../components/dispatch/modals/StagingHandoverModal';
import RegisterRescueUnitModal from '../../components/dispatch/modals/RegisterRescueUnitModal';
export { DispatchUnitModal } from '../../components/dispatch/modals/DispatchUnitModal';
export { resolveBarangayFromCoords, ZAMBOANGA_BARANGAYS };

const STATUS_BADGES = {
  standby: { label: 'Standby / Available', cls: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
  dispatched: { label: 'Dispatched', cls: 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800' },
  en_route: { label: 'En Route', cls: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800' },
  on_scene: { label: 'On Scene (Active)', cls: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800' },
  transporting: { label: 'Transporting to Shelter / Staging', cls: 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800' },
  staged_at_assembly: { label: 'Staged at Shoreline / Assembly', cls: 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800' },
  completed: { label: 'Completed', cls: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
  aborted: { label: 'Aborted', cls: 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700' },
};

const TRIAGE_BADGES = {
  critical: 'bg-red-600 text-white animate-pulse',
  urgent: 'bg-amber-500 text-white',
  standard: 'bg-blue-600 text-white',
};

export default function RescueDispatch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sos'); // 'sos' | 'active' | 'fleet' | 'history'
  const [dispatchModalData, setDispatchModalData] = useState(null); // Incident / SOS being dispatched
  const [stagingHandoverMission, setStagingHandoverMission] = useState(null); // Mission undergoing radio shoreline handover
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false); // Modal to register new rescue vehicle/unit
  const [isHotlineModalOpen, setIsHotlineModalOpen] = useState(false); // Modal for 911 / VHF radio distress intake

  // Escape key handler to close active modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (dispatchModalData) setDispatchModalData(null);
        if (stagingHandoverMission) setStagingHandoverMission(null);
        if (isAddUnitOpen) setIsAddUnitOpen(false);
        if (isHotlineModalOpen) setIsHotlineModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatchModalData, stagingHandoverMission, isAddUnitOpen, isHotlineModalOpen]);

  // 1. Fetch rescue fleet units
  const { data: unitsData, refetch: refetchUnits } = useQuery({
    queryKey: ['rescue-units'],
    queryFn: () => api.get('/rescue/units').then(res => res.data.data),
    refetchInterval: 10000,
  });

  // 2. Fetch rescue missions
  const { data: missionsData, refetch: refetchMissions } = useQuery({
    queryKey: ['rescue-missions'],
    queryFn: () => api.get('/rescue/missions').then(res => res.data.data),
    refetchInterval: 10000,
  });

  // 3. Fetch pending incidents / distress SOS queue (strictly Emergency SOS)
  const { data: incidentsData, refetch: refetchIncidents } = useQuery({
    queryKey: ['incidents-pending-rescue'],
    queryFn: () => api.get('/incidents?status=pending&type=sos').then(res => res.data.data),
    refetchInterval: 10000,
  });

  // 4. Fetch shelters for drop-off selection
  const { data: sheltersData } = useQuery({
    queryKey: ['shelters-list'],
    queryFn: () => api.get('/shelters').then(res => res.data.data),
  });

  // 5. Fetch staff for unit assignment (CDRRMO rescue field units)
  const { data: staffData } = useQuery({
    queryKey: ['staff', 'cdrrmo'],
    queryFn: () => api.get('/staff?agency=cdrrmo').then(res => res.data?.data || res.data || []),
  });

  const units = unitsData ?? [];
  const missions = missionsData ?? [];
  const pendingIncidents = useMemo(() => {
    const rawPending = incidentsData?.data ?? incidentsData ?? [];
    return Array.isArray(rawPending)
      ? rawPending.filter(inc => inc?.name?.startsWith('EMERGENCY SOS:') || inc?.modifiers !== null || inc?.headcount > 1 || !inc?.photos?.length)
      : [];
  }, [incidentsData]);
  const shelters = sheltersData ?? [];
  const staff = staffData ?? [];

  const [historyArchiveView, setHistoryArchiveView] = useState('active'); // 'active' | 'archived'

  const activeMissions = missions.filter(m => !m.archived_at && ['dispatched', 'en_route', 'on_scene', 'transporting'].includes(m.status));
  const completedMissions = missions.filter(m => !m.archived_at && ['completed', 'staged_at_assembly', 'aborted'].includes(m.status));
  const archivedMissions = missions.filter(m => !!m.archived_at);

  // Archive Mutations
  const archiveMissionMutation = useMutation({
    mutationFn: (id) => api.post(`/rescue/missions/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rescue-missions'] });
      showSuccess('Mission archived successfully.');
    },
    onError: () => showError('Failed to archive mission.'),
  });

  const unarchiveMissionMutation = useMutation({
    mutationFn: (id) => api.post(`/rescue/missions/${id}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rescue-missions'] });
      showSuccess('Mission restored from archive.');
    },
    onError: () => showError('Failed to restore mission.'),
  });

  const batchArchiveCompletedMutation = useMutation({
    mutationFn: () => api.post('/rescue/missions/archive-completed'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rescue-missions'] });
      showSuccess(res.data.message || 'Completed missions archived.');
    },
    onError: () => showError('Failed to batch archive missions.'),
  });

  // Real-time WebSocket Listeners
  useEffect(() => {
    const channel = echo.channel('rescue-alerts');

    channel.listen('.rescue.mission.dispatched', () => {
      queryClient.invalidateQueries({ queryKey: ['rescue-missions'] });
      queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
      showSuccess('🚨 Rescue Unit successfully dispatched.');
    });

    channel.listen('.rescue.mission.status_updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['rescue-missions'] });
      queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
      queryClient.invalidateQueries({ queryKey: ['shelters-list'] });
      showSuccess(`Rescue Mission update: ${data.rescue_unit_name} is now ${data.status.replace('_', ' ')}.`);
    });

    channel.listen('.rescue.sos.received', () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-pending-rescue'] });
    });

    return () => {
      echo.leaveChannel('rescue-alerts');
    };
  }, [queryClient]);

  // Stepper mutation for mission status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, target_shelter_id, staging_point_id }) =>
      api.put(`/rescue/missions/${id}/status`, { status, target_shelter_id, staging_point_id }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rescue-missions'] });
      queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
      queryClient.invalidateQueries({ queryKey: ['shelters-list'] });
      showSuccess(`Mission status updated to ${res.data.data.status.replace('_', ' ')}`);
    },
    onError: (err) => {
      showError(err?.response?.data?.message || 'Failed to update mission status.');
    },
  });

  const availableUnits = units.filter(u => u.status === 'standby');

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950">
      {/* Action Toolbar */}
      <div className="flex flex-wrap justify-end items-center gap-2 mb-4">
        <button
          onClick={() => {
            refetchUnits();
            refetchMissions();
            refetchIncidents();
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer"
        >
          <RefreshCw size={14} /> Refresh
        </button>
        <button
          onClick={() => navigate('/admin/rescue-vehicles')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          title="Open Rescue Fleet and Vehicle Management Console"
        >
          <Truck size={14} /> Rescue Fleet
        </button>
        <button
          onClick={() => setIsHotlineModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Phone size={14} /> Log 911 / Call-In
        </button>
        <button
          onClick={() => setDispatchModalData({})}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Send size={14} /> Direct Dispatch Mission
        </button>
      </div>

      {/* Fleet Availability Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Available Fleet</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{availableUnits.length}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Ready for dispatch</p>
          </div>
          <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Radio size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Active Operations</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{activeMissions.length}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Units in the field</p>
          </div>
          <div className="h-10 w-10 bg-rose-50 dark:bg-rose-950/50 rounded-lg flex items-center justify-center text-rose-600 dark:text-rose-400">
            <LifeBuoy size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Distress Calls / SOS</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingIncidents.length}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Pending evaluation</p>
          </div>
          <div className="h-10 w-10 bg-amber-50 dark:bg-amber-950/50 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Rescues Completed</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{completedMissions.length}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Evacuated to safety</p>
          </div>
          <div className="h-10 w-10 bg-blue-50 dark:bg-blue-950/50 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-200 dark:bg-slate-800 p-1 rounded-xl w-fit mb-6 text-xs font-bold border border-gray-200/50 dark:border-slate-700/50">
        <button
          onClick={() => setActiveTab('sos')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${
            activeTab === 'sos'
              ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle size={14} className="text-amber-500" /> Distress Calls &amp; SOS ({pendingIncidents.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${
            activeTab === 'active'
              ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <LifeBuoy size={14} className="text-red-500" /> Active Operations ({activeMissions.length})
        </button>
        <button
          onClick={() => setActiveTab('fleet')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${
            activeTab === 'fleet'
              ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <Truck size={14} className="text-blue-500" /> Fleet Status Roster ({units.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <Clock size={14} /> Mission Logs ({completedMissions.length})
        </button>
      </div>

      {/* TAB 1: Distress Calls & SOS Queue */}
      {activeTab === 'sos' && (
        <div className="space-y-4">
          {pendingIncidents.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
              <h3 className="font-bold text-gray-800 dark:text-slate-100 text-base">No Pending Distress Calls</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">All flood SOS and rescue requests have been dispatched or addressed.</p>
            </div>
          ) : (
            pendingIncidents.map(inc => {
              const hazard = (inc.hazard_type || 'flood').toLowerCase();
              const isFire = hazard === 'fire' || hazard === 'building_fire';
              const isMedical = hazard === 'medical';
              const exactHeadcount = inc.headcount || inc.reporter?.familyProfile?.headcount || 1;

              return (
                <div key={inc.id} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-200 dark:border-slate-800 shadow-sm hover:border-red-300 dark:hover:border-red-900/60 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isFire ? (
                        <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                          🔥 FIRE SOS
                        </span>
                      ) : isMedical ? (
                        <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                          🚑 MEDICAL SOS
                        </span>
                      ) : (
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                          🌊 FLOOD SOS
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">
                        {new Date(inc.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                        Reported by: {inc.reporter?.name || inc.reported_by_name || 'Citizen'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{inc.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">{inc.description || 'Rapid rescue dispatch requested.'}</p>
                    
                    {/* Special Needs / Modifiers Chips */}
                    {Array.isArray(inc.modifiers) && inc.modifiers.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Needs:</span>
                        {inc.modifiers.map(mod => (
                          <span key={mod} className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {mod.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <MapPin size={13} className="text-red-500" />
                        {Number(inc.latitude).toFixed(4)}, {Number(inc.longitude).toFixed(4)}
                      </span>
                      {inc.reporter?.familyProfile?.contact_number && (
                        <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-slate-300">
                          <Phone size={13} className="text-blue-500" />
                          {inc.reporter.familyProfile.contact_number}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-slate-300">
                        <Users size={13} className="text-purple-500" />
                        Headcount: <strong className="text-red-600 dark:text-red-400 font-bold">{exactHeadcount} people</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-end gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setDispatchModalData({
                        pending_incident_id: inc.id,
                        victim_name: inc.reporter?.name || inc.name,
                        victim_phone: inc.reporter?.familyProfile?.contact_number || '',
                        victim_latitude: inc.latitude,
                        victim_longitude: inc.longitude,
                        barangay: inc.reporter?.familyProfile?.barangay || 'Zamboanga City',
                        headcount: exactHeadcount,
                        hazard_type: inc.hazard_type || 'flood',
                        modifiers: inc.modifiers || [],
                        situation_description: inc.description || inc.name,
                      })}
                      className="w-full md:w-44 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
                    >
                      <Send size={13} /> Dispatch Unit
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: Active Rescue Operations */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeMissions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
              <LifeBuoy size={40} className="mx-auto text-gray-400 dark:text-slate-500 mb-3" />
              <h3 className="font-bold text-gray-800 dark:text-slate-100 text-base">No Active Rescue Missions</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">All rescue units are currently standing by on base.</p>
            </div>
          ) : (
            activeMissions.map(m => {
              const statusCfg = STATUS_BADGES[m.status] || STATUS_BADGES.dispatched;
              return (
                <div key={m.id} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-sm text-blue-900 dark:text-blue-300">{m.control_no}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${statusCfg.cls}`}>
                        {statusCfg.label}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${TRIAGE_BADGES[m.triage_level] || TRIAGE_BADGES.standard}`}>
                        {m.triage_level} PRIORITY
                      </span>
                      {m.intake_source && m.intake_source !== 'mobile_sos' && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          📞 {m.intake_source === 'vhf_radio' ? 'VHF RADIO' : m.intake_source.replace('_', ' ').toUpperCase()} {m.informant_name ? `• ${m.informant_name}` : ''}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-black text-gray-900 dark:text-slate-100">
                        {m.rescue_unit?.name} ({m.rescue_unit?.call_sign})
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">
                        Assigned Victim: <strong className="text-gray-900 dark:text-slate-200">{m.victim_name}</strong> • Headcount: <strong>{m.headcount} persons</strong>
                        {m.special_needs && <span className="text-rose-600 dark:text-rose-400"> ({m.special_needs})</span>}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-gray-50 dark:bg-slate-950/60 p-3 rounded-lg border border-gray-200 dark:border-slate-800">
                      <div>
                        <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Location Coordinates</span>
                        <span className="font-mono text-gray-800 dark:text-slate-200">{Number(m.victim_latitude).toFixed(4)}, {Number(m.victim_longitude).toFixed(4)} ({m.barangay || 'Area'})</span>
                      </div>
                      <div>
                        <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Drop-off / Handover Point</span>
                        <span className="font-bold text-blue-800 dark:text-blue-300">
                          {m.staging_point ? (
                            <span className="text-teal-700 dark:text-teal-400">🌊 {m.staging_point.name} (Staging)</span>
                          ) : (
                            m.target_shelter?.name || 'To be decided'
                          )}
                        </span>
                      </div>
                    </div>

                    {m.situation_description && (
                      <p className="text-xs text-gray-600 dark:text-slate-300 italic">"{m.situation_description}"</p>
                    )}
                  </div>

                  {/* Stepper Controls */}
                  <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 w-full md:w-56 space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Mission Action Stepper</p>
                    
                    {m.status === 'dispatched' && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: m.id, status: 'en_route' })}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        Advance to: En Route
                      </button>
                    )}

                    {m.status === 'en_route' && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: m.id, status: 'on_scene' })}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        Advance to: On Scene
                      </button>
                    )}

                    {m.status === 'on_scene' && (
                      <div className="space-y-1.5">
                        <button
                          onClick={() => updateStatusMutation.mutate({
                            id: m.id,
                            status: 'transporting',
                            target_shelter_id: m.target_shelter_id || shelters[0]?.id
                          })}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                        >
                          Advance to: Transporting
                        </button>
                        <button
                          onClick={() => setStagingHandoverMission(m)}
                          className="w-full py-1.5 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                        >
                          🌊 Shoreline Staging Handover
                        </button>
                      </div>
                    )}

                    {m.status === 'transporting' && (
                      <div className="space-y-1.5">
                        <button
                          onClick={() => updateStatusMutation.mutate({
                            id: m.id,
                            status: 'completed',
                            target_shelter_id: m.target_shelter_id || shelters[0]?.id
                          })}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 size={14} /> Turnover at Shelter Gate
                        </button>
                        <button
                          onClick={() => setStagingHandoverMission(m)}
                          className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1"
                        >
                          🌊 Unload at Staging Point
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (window.confirm(`Abort rescue mission ${m.control_no}?`)) {
                          updateStatusMutation.mutate({ id: m.id, status: 'aborted' });
                        }
                      }}
                      className="w-full py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
                    >
                      Abort Mission
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: Fleet Status Roster */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-slate-100 text-xs">CDRRMO Rescue Fleet Inventory</h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                Active roster of rescue boats, ambulances, and 4x4 trucks with assigned operators.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/admin/rescue-vehicles')}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Truck size={14} /> Manage Fleet Registry →
              </button>
              <button
                onClick={() => setIsAddUnitOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Plus size={14} /> Register Vehicle
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {units.map(u => {
            const statusCfg = STATUS_BADGES[u.status] || STATUS_BADGES.standby;
            return (
              <div key={u.id} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {u.unit_type === 'water_rescue' ? '🚤' : u.unit_type === 'medical_ambulance' ? '🚑' : '🛻'}
                    </span>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm">{u.name}</h3>
                      <p className="text-[10px] font-mono text-gray-400 dark:text-slate-500 uppercase">{u.call_sign} • Cap: {u.capacity_persons}p</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${statusCfg.cls}`}>
                    {statusCfg.label}
                  </span>
                </div>

                <div className="text-xs text-gray-500 dark:text-slate-400 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <span>Direct Hotline:</span>
                    <span className="font-mono text-gray-800 dark:text-slate-200">{u.contact_number || '0917-RESCUE'}</span>
                  </div>

                  {/* Assigned Crew Members */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users size={11} className="text-blue-500" />
                        Assigned Rescuers ({u.crew_members?.length || (u.assigned_personnel ? 1 : 0)})
                      </span>
                    </div>

                    {u.crew_members && u.crew_members.length > 0 ? (
                      <div className="space-y-1">
                        {u.crew_members.map(member => {
                          const roleLabels = {
                            boat_pilot: '🚤 Boat Pilot',
                            lead_medic: '🚑 Lead Medic',
                            heavy_driver: '🛻 Heavy Driver',
                            rescue_swimmer: '🦺 Swimmer',
                            crew: '📋 Radio Crew',
                          };
                          const roleTag = roleLabels[member.rescue_role] || '🦺 Rescuer';
                          return (
                            <div key={member.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800/80 px-2 py-1 rounded text-[11px]">
                              <span className="font-semibold text-gray-900 dark:text-slate-100">{member.name}</span>
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                {roleTag}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : u.assigned_personnel ? (
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800/80 px-2 py-1 rounded text-[11px]">
                        <span className="font-semibold text-gray-900 dark:text-slate-100">{u.assigned_personnel.name}</span>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Lead Operator</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-400 dark:text-slate-500 italic">
                        No rescuers currently assigned
                      </div>
                    )}
                  </div>

                  {u.active_mission && (
                    <div className="mt-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 p-2 rounded text-[11px] text-blue-900 dark:text-blue-300">
                      <strong>Active Duty:</strong> {u.active_mission.control_no} ({u.active_mission.victim_name})
                    </div>
                  )}
                </div>

                {u.status === 'standby' ? (
                  <button
                    onClick={() => setDispatchModalData({ rescue_unit_id: u.id })}
                    className="w-full mt-2 py-2 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition flex items-center justify-center gap-1.5"
                  >
                    <Send size={13} /> Dispatch This Unit
                  </button>
                ) : (
                  <div className="w-full py-2 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 rounded-lg text-xs text-center font-bold">
                    Unit Deployed
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* TAB 4: Completed Mission Logs */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHistoryArchiveView('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  historyArchiveView === 'active'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
                }`}
              >
                Active Completed ({completedMissions.length})
              </button>
              <button
                onClick={() => setHistoryArchiveView('archived')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  historyArchiveView === 'archived'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
                }`}
              >
                <Archive size={12} /> Archived Missions ({archivedMissions.length})
              </button>
            </div>

            {historyArchiveView === 'active' && completedMissions.length > 0 && (
              <button
                onClick={() => batchArchiveCompletedMutation.mutate()}
                disabled={batchArchiveCompletedMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Archive size={13} /> Archive All Completed
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 font-bold text-gray-700 dark:text-slate-300">
                  <th className="p-3">Control No.</th>
                  <th className="p-3">Unit</th>
                  <th className="p-3">Victims / Headcount</th>
                  <th className="p-3">Destination / Handover</th>
                  <th className="p-3">Completed At</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Archive Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {(historyArchiveView === 'active' ? completedMissions : archivedMissions).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 dark:text-slate-500 font-medium">
                      {historyArchiveView === 'active'
                        ? 'No active completed mission logs found.'
                        : 'No archived rescue missions.'}
                    </td>
                  </tr>
                ) : (
                  (historyArchiveView === 'active' ? completedMissions : archivedMissions).map(m => (
                    <tr key={m.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-blue-900 dark:text-blue-300">{m.control_no}</td>
                      <td className="p-3 font-semibold text-gray-800 dark:text-slate-200">{m.rescue_unit?.name}</td>
                      <td className="p-3 text-gray-700 dark:text-slate-300">{m.victim_name} ({m.headcount} persons)</td>
                      <td className="p-3 text-gray-700 dark:text-slate-300">
                        {m.status === 'staged_at_assembly' ? (
                          <span className="text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-1">
                            🌊 {m.staging_point?.name || 'Shoreline Staging Point'}
                          </span>
                        ) : (
                          <span>{m.target_shelter?.name || 'Turned Over'}</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-500 dark:text-slate-400">
                        {m.completed_at ? new Date(m.completed_at).toLocaleString('en-PH') : '—'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.status === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                            : m.status === 'staged_at_assembly'
                            ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                        }`}>
                          {m.status === 'staged_at_assembly' ? 'STAGED (HANDOVER)' : m.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {historyArchiveView === 'active' ? (
                          <button
                            onClick={() => archiveMissionMutation.mutate(m.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                            title="Archive this mission"
                          >
                            <Archive size={12} /> Archive
                          </button>
                        ) : (
                          <button
                            onClick={() => unarchiveMissionMutation.mutate(m.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded font-semibold text-[11px] transition cursor-pointer"
                            title="Restore mission to active logs"
                          >
                            <ArchiveRestore size={12} /> Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispatch Unit Modal */}
      {dispatchModalData && (
        <DispatchUnitModal
          initialData={dispatchModalData}
          availableUnits={units}
          shelters={shelters}
          onClose={() => setDispatchModalData(null)}
          onSuccess={() => {
            setDispatchModalData(null);
            queryClient.invalidateQueries({ queryKey: ['rescue-missions'] });
            queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
            queryClient.invalidateQueries({ queryKey: ['incidents-pending-rescue'] });
          }}
        />
      )}

      {/* Staging Point Handover Modal */}
      {stagingHandoverMission && (
        <StagingHandoverModal
          mission={stagingHandoverMission}
          shelters={shelters}
          isSubmitting={updateStatusMutation.isPending}
          onClose={() => setStagingHandoverMission(null)}
          onConfirm={(stagingPointId) => {
            updateStatusMutation.mutate(
              {
                id: stagingHandoverMission.id,
                status: 'staged_at_assembly',
                staging_point_id: stagingPointId,
              },
              {
                onSettled: () => setStagingHandoverMission(null),
              }
            );
          }}
        />
      )}

      {/* Register Rescue Unit Modal */}
      {isAddUnitOpen && (
        <RegisterRescueUnitModal
          staff={staff}
          onClose={() => setIsAddUnitOpen(false)}
          onSuccess={() => {
            setIsAddUnitOpen(false);
            queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            showSuccess('Rescue unit registered into active fleet roster.');
          }}
        />
      )}

      {/* Offline 911 Hotline / VHF Radio Intake Modal */}
      <HotlineIntakeModal
        isOpen={isHotlineModalOpen}
        onClose={() => setIsHotlineModalOpen(false)}
        rescueUnits={units}
        shelters={shelters}
      />
    </div>
  );
}

// --- Standard Rescue Equipment Presets ---
