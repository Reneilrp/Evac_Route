import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LifeBuoy, Truck, Phone, Users, Clock, AlertTriangle,
  CheckCircle2, MapPin, Send, X, RefreshCw, Radio, Plus, Sparkles
} from 'lucide-react';
import api from '../services/api';
import echo from '../services/echo';
import HotlineIntakeModal from '../components/disaster/HotlineIntakeModal';
import { showSuccess, showError } from '../utils/toast';
import { getHaversineDistance } from '../utils/mapHelper';

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

export const ZAMBOANGA_BARANGAYS = [
  "Arena Blanco", "Ayala", "Baliwasan", "Boalan", "Cabaluay", "Calarian",
  "Canelar", "Cawit", "Culianan", "Curuan", "Divisoria", "Guiwan",
  "Labuan", "Manicahan", "Mampang", "Mercedes", "Pasonanca", "Putik",
  "Recodo", "Rio Hondo", "San Jose", "San Roque", "Santa Catalina",
  "Santa Maria", "Talon-Talon", "Taluksangay", "Tetuan", "Tugbungan",
  "Tumaga", "Vitali", "Zone I (Poblacion)", "Zone II (Poblacion)",
  "Zone III (Poblacion)", "Zone IV (Poblacion)"
];

const ZAMBOANGA_BARANGAY_CENTROIDS = {
  "Tetuan": { lat: 6.9194, lng: 122.0840 },
  "Baliwasan": { lat: 6.9159, lng: 122.0599 },
  "Canelar": { lat: 6.9165, lng: 122.0696 },
  "San Jose Cawa-Cawa": { lat: 6.9140, lng: 122.0650 },
  "San Jose Gusu": { lat: 6.9197, lng: 122.0532 },
  "Pasonanca": { lat: 6.9471, lng: 122.0728 },
  "Tumaga": { lat: 6.9380, lng: 122.0720 },
  "Guiwan": { lat: 6.9289, lng: 122.0922 },
  "Putik": { lat: 6.9350, lng: 122.1050 },
  "Tugbungan": { lat: 6.9150, lng: 122.0800 },
  "Santa Maria": { lat: 6.9300, lng: 122.0700 },
  "Calarian": { lat: 6.9245, lng: 122.0246 },
  "Mampang": { lat: 6.9157, lng: 122.1339 },
  "Talon-Talon": { lat: 6.8950, lng: 122.1000 },
  "Ayala": { lat: 6.9592, lng: 121.9498 },
  "Recodo": { lat: 6.9700, lng: 121.9700 },
  "Cawit": { lat: 6.9556, lng: 121.9739 },
  "Labuan": { lat: 7.0918, lng: 121.9027 },
  "Vitali": { lat: 7.3777, lng: 122.2893 },
  "Curuan": { lat: 7.2100, lng: 122.2313 },
  "Manicahan": { lat: 7.0200, lng: 122.1500 },
  "Cabaluay": { lat: 6.9800, lng: 122.1700 },
  "Mercedes": { lat: 6.9500, lng: 122.1400 },
  "Boalan": { lat: 6.9450, lng: 122.1150 },
  "Culianan": { lat: 6.9700, lng: 122.1400 },
  "Zone I (Poblacion)": { lat: 6.9052, lng: 122.0738 },
  "Zone II (Poblacion)": { lat: 6.9060, lng: 122.0750 },
  "Zone III (Poblacion)": { lat: 6.9070, lng: 122.0760 },
  "Zone IV (Poblacion)": { lat: 6.9080, lng: 122.0770 },
  "Rio Hondo": { lat: 6.9000, lng: 122.0650 },
  "Campo Islam": { lat: 6.9145, lng: 122.0462 },
  "Arena Blanco": { lat: 6.8850, lng: 122.0900 },
  "Santa Catalina": { lat: 6.9100, lng: 122.0850 },
  "Santa Barbara": { lat: 6.9080, lng: 122.0800 },
  "Camino Nuevo": { lat: 6.9123, lng: 122.0762 },
  "San Roque": { lat: 6.9400, lng: 122.0600 },
  "Cabatangan": { lat: 6.9440, lng: 122.0544 },
};

export function resolveBarangayFromCoords(lat, lng, shelters = []) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) return null;

  let closestBarangay = null;
  let minDistance = Infinity;

  // 1. Check official shelters (dense ground-truth in Zamboanga)
  if (Array.isArray(shelters)) {
    for (const shelter of shelters) {
      const sLat = parseFloat(shelter.latitude);
      const sLng = parseFloat(shelter.longitude);
      const bgy = shelter.barangay || shelter.location;
      if (!isNaN(sLat) && !isNaN(sLng) && bgy) {
        const dist = getHaversineDistance({ lat: latNum, lng: lngNum }, { lat: sLat, lng: sLng });
        if (dist < minDistance) {
          minDistance = dist;
          closestBarangay = bgy;
        }
      }
    }
  }

  // 2. Also compare against known Barangay centroids
  for (const [bgy, c] of Object.entries(ZAMBOANGA_BARANGAY_CENTROIDS)) {
    const dist = getHaversineDistance({ lat: latNum, lng: lngNum }, { lat: c.lat, lng: c.lng });
    if (dist < minDistance) {
      minDistance = dist;
      closestBarangay = bgy;
    }
  }

  return closestBarangay || 'Tetuan';
}

export default function RescueDispatch() {
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

  // 5. Fetch staff for unit assignment
  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(res => res.data.data),
  });

  const units = unitsData ?? [];
  const missions = missionsData ?? [];
  const rawPending = incidentsData?.data ?? incidentsData ?? [];
  const pendingIncidents = useMemo(() => {
    return Array.isArray(rawPending)
      ? rawPending.filter(inc => inc?.name?.startsWith('EMERGENCY SOS:') || inc?.modifiers !== null || inc?.headcount > 1 || !inc?.photos?.length)
      : [];
  }, [rawPending]);
  const shelters = sheltersData ?? [];
  const staff = staffData ?? [];

  const activeMissions = missions.filter(m => ['dispatched', 'en_route', 'on_scene', 'transporting'].includes(m.status));
  const completedMissions = missions.filter(m => ['completed', 'staged_at_assembly', 'aborted'].includes(m.status));

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

    channel.listen('.rescue.sos.received', (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents-pending-rescue'] });
      showError(`⚠️ NEW EMERGENCY RESCUE SOS: ${data.name}`);
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="bg-red-600 text-white p-2 rounded-xl shadow-sm">
              <LifeBuoy size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-slate-100 tracking-tight">CDRRMO Rescue Dispatch Center</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">Search, Rescue &amp; Retrieval (SRR) Fleet Coordination</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchUnits();
              refetchMissions();
              refetchIncidents();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-gray-200 dark:border-slate-700 shadow-sm transition"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setIsAddUnitOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition"
          >
            <Plus size={14} /> Register Rescue Vehicle
          </button>
          <button
            onClick={() => setIsHotlineModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
          >
            <Phone size={14} /> Log 911 / Call-In
          </button>
          <button
            onClick={() => setDispatchModalData({})}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow transition"
          >
            <Send size={14} /> Direct Dispatch Mission
          </button>
        </div>
      </div>

      {/* Fleet Availability Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Available Fleet</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{availableUnits.length}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Ready for dispatch</p>
          </div>
          <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Radio size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Active Operations</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{activeMissions.length}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Units in the field</p>
          </div>
          <div className="h-10 w-10 bg-rose-50 dark:bg-rose-950/50 rounded-lg flex items-center justify-center text-rose-600 dark:text-rose-400">
            <LifeBuoy size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Distress Calls / SOS</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingIncidents.length}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Pending evaluation</p>
          </div>
          <div className="h-10 w-10 bg-amber-50 dark:bg-amber-950/50 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between">
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-slate-800 shadow-sm">
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-slate-800 shadow-sm">
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
                  <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 w-full md:w-56 space-y-2">
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-xs">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-slate-100 text-xs">CDRRMO Rescue Fleet Inventory</h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                Active roster of rescue boats, ambulances, and 4x4 trucks with assigned operators.
              </p>
            </div>
            <button
              onClick={() => setIsAddUnitOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus size={14} /> Add Vehicle to Fleet
            </button>
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

                <div className="text-xs text-gray-500 dark:text-slate-400 space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
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
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
            <h3 className="font-bold text-sm text-gray-800 dark:text-slate-100">Historical Search &amp; Rescue Records</h3>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {completedMissions.map(m => (
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
                  </tr>
                ))}
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
const RESCUE_EQUIPMENT_PRESETS = [
  { id: 'rubber_boat', label: 'Rubber Boat / Inflatable Raft', icon: '🚤' },
  { id: 'life_vests', label: 'Life Vests & Ring Buoys', icon: '🦺' },
  { id: 'first_aid', label: 'First Aid Trauma Kit & Splints', icon: '🩹' },
  { id: 'spine_board', label: 'Spine Board & Cervical Collar', icon: '🩺' },
  { id: 'scba_gear', label: 'SCBA / Fire Protective Gear', icon: '🧯' },
  { id: 'extrication_tools', label: 'Hydraulic Extrication Cutters', icon: '🔧' },
  { id: 'vhf_radios', label: 'VHF Handheld Radios', icon: '📻' },
  { id: 'floodlights', label: 'Tactical Searchlights', icon: '🔦' },
];

// --- Dispatch Modal Component ---
export function DispatchUnitModal({ initialData, availableUnits, shelters = [], onClose, onSuccess }) {
  const hazardType = (initialData.hazard_type || 'flood').toLowerCase();
  const isFireHazard = hazardType === 'fire' || hazardType === 'building_fire';
  const isMedicalHazard = hazardType === 'medical';
  const suggestedUnitType = isFireHazard ? 'high_clearance_truck' : (isMedicalHazard ? 'medical_ambulance' : 'water_rescue');

  const defaultUnit = availableUnits.find(u => u.status === 'standby' && u.unit_type === suggestedUnitType)
    || availableUnits.find(u => u.status === 'standby')
    || availableUnits[0];

  const defaultEquipments = useMemo(() => {
    if (isFireHazard) return ['scba_gear', 'first_aid', 'vhf_radios', 'extrication_tools'];
    if (isMedicalHazard) return ['first_aid', 'spine_board', 'vhf_radios'];
    return ['rubber_boat', 'life_vests', 'first_aid', 'vhf_radios'];
  }, [isFireHazard, isMedicalHazard]);

  const [unitId, setUnitId] = useState(initialData.rescue_unit_id || (defaultUnit?.id || ''));
  const [victimName, setVictimName] = useState(initialData.victim_name || '');
  const [victimPhone, setVictimPhone] = useState(initialData.victim_phone || '');
  const [lat, setLat] = useState(initialData.victim_latitude || 6.9200);
  const [lng, setLng] = useState(initialData.victim_longitude || 122.0800);
  const [barangay, setBarangay] = useState(initialData.barangay || '');
  const [customBarangay, setCustomBarangay] = useState('');
  const [isManualBarangay, setIsManualBarangay] = useState(false);
  const [headcount, setHeadcount] = useState(initialData.headcount || 1);
  const [targetShelterId, setTargetShelterId] = useState('');
  const [isManualShelter, setIsManualShelter] = useState(false);
  const [selectedEquipments, setSelectedEquipments] = useState(defaultEquipments);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleEquipment = (id) => {
    setSelectedEquipments(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 1. Smart Geocoding: Automatically resolve Barangay from coordinates
  useEffect(() => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      const detected = resolveBarangayFromCoords(latNum, lngNum, shelters);
      if (detected && !isManualBarangay) {
        queueMicrotask(() => setBarangay(detected));
      }
    }
  }, [lat, lng, shelters, isManualBarangay]);

  // 2. Proximity Calculation: Compute distances to all shelters and sort closest first
  const sortedSheltersWithDistance = useMemo(() => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum) || !Array.isArray(shelters)) return shelters || [];

    return [...shelters]
      .map(shelter => {
        const sLat = parseFloat(shelter.latitude);
        const sLng = parseFloat(shelter.longitude);
        const distanceMeters = (!isNaN(sLat) && !isNaN(sLng))
          ? getHaversineDistance({ lat: latNum, lng: lngNum }, { lat: sLat, lng: sLng })
          : 9999999;
        const distanceKm = (distanceMeters / 1000).toFixed(2);
        const availableCapacity = Math.max(0, (shelter.max_capacity || 0) - (shelter.current_occupancy || 0));
        const isClosed = shelter.status === 'closed';

        return {
          ...shelter,
          distanceMeters,
          distanceKm,
          availableCapacity,
          isClosed,
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [shelters, lat, lng]);

  // 3. Recommended Shelter: Closest open shelter with free capacity
  const recommendedShelter = useMemo(() => {
    if (!sortedSheltersWithDistance || sortedSheltersWithDistance.length === 0) return null;
    const bestWithCapacity = sortedSheltersWithDistance.find(s => !s.isClosed && s.availableCapacity > 0);
    if (bestWithCapacity) return bestWithCapacity;
    const bestOpen = sortedSheltersWithDistance.find(s => !s.isClosed);
    return bestOpen || sortedSheltersWithDistance[0];
  }, [sortedSheltersWithDistance]);

  // Auto-select nearest shelter by default
  useEffect(() => {
    if (recommendedShelter?.id && (!targetShelterId || !isManualShelter)) {
      queueMicrotask(() => setTargetShelterId(recommendedShelter.id));
    }
  }, [recommendedShelter?.id, isManualShelter, targetShelterId]);

  const selectedUnit = availableUnits.find(u => String(u.id) === String(unitId));
  const responsibleOfficer = selectedUnit?.assigned_personnel?.name || selectedUnit?.crew_members?.[0]?.name || 'Officer On Duty';
  const unitPhone = selectedUnit?.contact_number || 'N/A';
  const isOverCapacity = selectedUnit?.capacity && parseInt(headcount, 10) > selectedUnit.capacity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unitId) {
      showError('Please select an available rescue unit.');
      return;
    }
    setIsSubmitting(true);
    const finalBarangay = barangay === 'Other' ? (customBarangay || 'Zamboanga City') : (barangay || 'Zamboanga City');
    try {
      await api.post('/rescue/missions', {
        rescue_unit_id: parseInt(unitId, 10),
        pending_incident_id: initialData.pending_incident_id || null,
        victim_name: victimName.trim() || 'Unnamed Evacuees',
        victim_phone: victimPhone || null,
        victim_latitude: parseFloat(lat),
        victim_longitude: parseFloat(lng),
        barangay: finalBarangay,
        headcount: parseInt(headcount, 10),
        triage_level: 'urgent',
        status: 'en_route', // automatic accept for immediate field action
        equipments: selectedEquipments,
        target_shelter_id: targetShelterId ? parseInt(targetShelterId, 10) : (recommendedShelter?.id ? parseInt(recommendedShelter.id, 10) : null),
      });
      onSuccess();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to dispatch rescue unit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
        <div className="bg-red-600 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <LifeBuoy size={20} />
            <h3 className="font-bold text-base">Dispatch Search &amp; Rescue Mission</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Emergency SOS Origin Banner */}
          {initialData.hazard_type && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isFireHazard ? (
                    <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      🔥 FIRE RESCUE
                    </span>
                  ) : isMedicalHazard ? (
                    <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      🚑 MEDICAL RESCUE
                    </span>
                  ) : (
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      🌊 FLOOD RESCUE
                    </span>
                  )}
                  <span className="font-bold text-gray-900 dark:text-slate-100">
                    Distress Order: <strong className="text-red-600 dark:text-red-400">{`${headcount} Victims Stranded`}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 font-mono">
                  CITIZEN SOS ORDER
                </span>
              </div>

              {Array.isArray(initialData.modifiers) && initialData.modifiers.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-red-100 dark:border-red-900/30">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Special Needs:</span>
                  {initialData.modifiers.map(mod => (
                    <span key={mod} className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {mod.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rescue Unit Selector */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-gray-700 dark:text-slate-300">Select Responding Unit</label>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                Recommended: {isFireHazard ? '🚒 Truck / Fire Unit' : (isMedicalHazard ? '🚑 Ambulance' : '🚤 Water Rescue Boat')}
              </span>
            </div>
            <select
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg font-bold text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
              required
            >
              <option value="">Select an available unit...</option>
              {availableUnits.map(u => {
                const isMatch = u.unit_type === suggestedUnitType;
                return (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.call_sign}) — Cap: {u.capacity ?? 4} pers — {u.status.toUpperCase()} {isMatch ? '★ RECOMMENDED' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected Unit Responsible Officer & Contact Person Card */}
          {selectedUnit && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {selectedUnit.call_sign ? selectedUnit.call_sign.substring(0, 3) : 'SRR'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-slate-100 text-xs">
                      Responsible Officer: {responsibleOfficer}
                    </span>
                    <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.2 rounded font-bold">
                      {selectedUnit.call_sign}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <Phone size={11} className="text-blue-500" /> Hot Contact: <strong className="font-mono text-gray-900 dark:text-slate-100">{unitPhone}</strong> • Max Capacity: {selectedUnit.capacity ?? 4} pers
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  READY
                </span>
              </div>
            </div>
          )}

          {/* Victim / Family Name & Contact Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                Victim / Family Name <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={victimName}
                onChange={e => setVictimName(e.target.value)}
                placeholder="e.g. Santos Family or Unnamed Evacuees"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                value={victimPhone}
                onChange={e => setVictimPhone(e.target.value)}
                placeholder="e.g. 09171234567"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg"
              />
            </div>
          </div>

          {/* Headcount & Smart Auto-Geocoded Barangay */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">Headcount</label>
                {selectedUnit && (
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono">
                    Cap: <strong className={isOverCapacity ? 'text-red-500 font-black' : 'text-emerald-500'}>{selectedUnit.capacity ?? 4}</strong>
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                value={headcount}
                onChange={e => setHeadcount(e.target.value)}
                className={`w-full p-2.5 bg-gray-50 dark:bg-slate-800 border rounded-lg text-gray-900 dark:text-slate-100 ${
                  isOverCapacity ? 'border-amber-500 ring-1 ring-amber-500' : 'border-gray-300 dark:border-slate-700'
                }`}
                required
              />
              {isOverCapacity && (
                <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-[10px] flex items-center gap-1.5">
                  <AlertTriangle size={12} className="shrink-0 text-amber-600" />
                  <span><strong>⚠️ Exceeds Capacity:</strong> Unit holds {selectedUnit.capacity} pers (order has {headcount} victims).</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">Barangay (Geocoded)</label>
                <button
                  type="button"
                  onClick={() => setIsManualBarangay(prev => !prev)}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  {isManualBarangay ? 'Auto-detect from GPS' : 'Manual Override'}
                </button>
              </div>

              {!isManualBarangay ? (
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200 text-xs">
                    <MapPin size={13} className="text-blue-500" />
                    <span>Barangay {barangay || 'Detecting...'}</span>
                  </span>
                  <span className="text-[9px] bg-blue-600 text-white font-mono px-1.5 py-0.5 rounded font-bold">
                    Auto-Geocoded
                  </span>
                </div>
              ) : (
                <>
                  <select
                    value={barangay}
                    onChange={e => {
                      setBarangay(e.target.value);
                      setIsManualBarangay(true);
                    }}
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg"
                  >
                    {ZAMBOANGA_BARANGAYS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="Other">Other / Custom...</option>
                  </select>
                  {barangay === 'Other' && (
                    <input
                      type="text"
                      value={customBarangay}
                      onChange={e => setCustomBarangay(e.target.value)}
                      placeholder="Type barangay name"
                      className="w-full mt-2 p-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg"
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Permanently Visible GPS Coordinates & Geocoding Anchor */}
          <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-3 bg-gray-50/70 dark:bg-slate-950/50">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-slate-300 text-xs">
                <MapPin size={13} className="text-red-500" />
                <span>Distress GPS Coordinates (Permanently Visible)</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                Auto-resolves Barangay &amp; Nearest Shelter
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg font-mono text-xs focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={e => setLng(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg font-mono text-xs focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Rescue Equipment Brought Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-700 dark:text-slate-300">
                Rescue Equipment Brought / Deployed ({selectedEquipments.length} selected)
              </label>
              <span className="text-[10px] text-gray-400">Click to toggle items</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {RESCUE_EQUIPMENT_PRESETS.map(eq => {
                const isSelected = selectedEquipments.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleEquipment(eq.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left transition border text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-bold'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 font-medium hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{eq.icon}</span>
                    <span className="truncate flex-1">{eq.label}</span>
                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-slate-600'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Smart Proximity-Based Drop-off Shelter Destination */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-gray-700 dark:text-slate-300">Drop-off Shelter Destination</label>
              {recommendedShelter && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Sparkles size={11} /> Smart Nearest Suggestion
                </span>
              )}
            </div>

            {/* Smart Recommendation Banner */}
            {recommendedShelter && (
              <div className="mb-2.5 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-emerald-900 dark:text-emerald-200 text-xs">
                        RECOMMENDED NEAREST SHELTER:
                      </span>
                      <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {recommendedShelter.distanceKm} km away
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">
                      {recommendedShelter.name} ({recommendedShelter.barangay}) • {recommendedShelter.availableCapacity} spots available ({recommendedShelter.current_occupancy}/{recommendedShelter.max_capacity} occupied)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTargetShelterId(recommendedShelter.id);
                    setIsManualShelter(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 cursor-pointer ${
                    String(targetShelterId) === String(recommendedShelter.id)
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                  }`}
                >
                  {String(targetShelterId) === String(recommendedShelter.id) ? '✓ Selected' : 'Use Nearest'}
                </button>
              </div>
            )}

            {/* Dropdown sorted by proximity (closest first) */}
            <select
              value={targetShelterId}
              onChange={e => {
                setTargetShelterId(e.target.value);
                setIsManualShelter(true);
              }}
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg text-xs font-medium"
            >
              <option value="">Select evacuation center...</option>
              {sortedSheltersWithDistance.map(s => {
                const isRec = s.id === recommendedShelter?.id;
                return (
                  <option key={s.id} value={s.id}>
                    {isRec ? '★ [RECOMMENDED - ' : '['}
                    {s.distanceKm} km] {s.name} ({s.barangay}) — {s.availableCapacity} spots free {s.isClosed ? '(CLOSED)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition shadow flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? 'Deploying...' : 'Confirm & Deploy Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Staging Handover Modal Component ---
function StagingHandoverModal({ mission, shelters, onClose, onConfirm, isSubmitting }) {
  const stagingPoints = shelters.filter(s => s.facility_type === 'assembly_point' || s.facility_type === 'safe_zone');
  const availablePoints = stagingPoints.length > 0 ? stagingPoints : shelters;
  const [selectedPointId, setSelectedPointId] = useState(availablePoints[0]?.id || '');

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
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
function RegisterRescueUnitModal({ staff = [], onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [callSign, setCallSign] = useState('');
  const [unitType, setUnitType] = useState('water_rescue');
  const [capacity, setCapacity] = useState(8);
  const [contactNumber, setContactNumber] = useState('');
  const [assignedPersonnelId, setAssignedPersonnelId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !callSign) {
      showError('Please fill in Unit Name and Call Sign.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/rescue/units', {
        name,
        call_sign: callSign.toUpperCase().trim(),
        unit_type: unitType,
        capacity_persons: parseInt(capacity, 10) || 8,
        contact_number: contactNumber || null,
        assigned_personnel_id: assignedPersonnelId ? parseInt(assignedPersonnelId, 10) : null,
      });
      onSuccess();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to register rescue unit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Truck size={20} />
            <h3 className="font-bold text-base">Register Fleet Rescue Vehicle</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Unit / Vehicle Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Zamboanga Rescue Boat Charlie"
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Radio Call Sign</label>
              <input
                type="text"
                value={callSign}
                onChange={e => setCallSign(e.target.value.toUpperCase())}
                placeholder="e.g. BOAT-CHARLIE"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Unit Type</label>
              <select
                value={unitType}
                onChange={e => setUnitType(e.target.value)}
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl font-semibold"
              >
                <option value="water_rescue">🚤 Water Boat</option>
                <option value="medical_ambulance">🚑 Ambulance</option>
                <option value="high_clearance_truck">🛻 4x4 Heavy Truck</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Capacity (persons)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Direct Radio / Hotline</label>
              <input
                type="text"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                placeholder="0917-RESCUE-03"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Assign Operator In-Charge</label>
            <select
              value={assignedPersonnelId}
              onChange={e => setAssignedPersonnelId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl font-semibold"
            >
              <option value="">No assigned operator (On Duty pool)</option>
              {staff.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.operator_type?.toUpperCase() || u.role}) — {u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition disabled:opacity-60"
            >
              {isSubmitting ? 'Registering...' : 'Register Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
