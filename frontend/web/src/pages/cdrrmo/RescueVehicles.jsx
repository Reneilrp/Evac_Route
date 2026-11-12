import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, Radio, ShieldAlert, Plus, Search, Filter, Phone, Users, 
  MapPin, CheckCircle2, AlertTriangle, Edit3, Trash2, X, RefreshCw, Power
} from 'lucide-react';
import api from '../../services/api';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { showSuccess, showError } from '../../utils/toast';
import VehicleModal from '../../components/rescue/modals/VehicleModal';
export { VehicleModal } from '../../components/rescue/modals/VehicleModal';

const UNIT_TYPE_CONFIG = {
  water_rescue: {
    label: 'Water Rescue Craft',
    icon: '🚤',
    badgeCls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  medical_ambulance: {
    label: 'Medical Ambulance',
    icon: '🚑',
    badgeCls: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-200 dark:border-red-800',
  },
  high_clearance_truck: {
    label: '4x4 High-Clearance Truck',
    icon: '🛻',
    badgeCls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
};

export default function RescueVehicles() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [deletingUnitId, setDeletingUnitId] = useState(null);

  // 1. Fetch Rescue Fleet Units
  const { data: unitsData, isLoading, refetch } = useQuery({
    queryKey: ['rescue-units'],
    queryFn: () => api.get('/rescue/units').then(res => res.data?.data || res.data || []),
    refetchInterval: 10000,
  });
  const units = Array.isArray(unitsData) ? unitsData : [];

  // 2. Fetch Staff for operator assignment
  const { data: staffData } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff').then(res => res.data?.data || res.data || []),
  });
  const staff = Array.isArray(staffData) ? staffData : [];

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, currentStatus }) => {
      const nextStatus = currentStatus === 'standby' ? 'off_duty' : 'standby';
      return api.put(`/rescue/units/${id}`, { status: nextStatus });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
      showSuccess(res.data?.message || 'Vehicle readiness status updated.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to update vehicle status.');
    }
  });

  const deleteUnitMutation = useMutation({
    mutationFn: (id) => api.delete(`/rescue/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
      showSuccess('Rescue vehicle removed from fleet roster.');
      setDeletingUnitId(null);
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to remove rescue vehicle.');
      setDeletingUnitId(null);
    }
  });

  // Filtered units
  const filteredUnits = useMemo(() => {
    return units.filter(unit => {
      if (typeFilter !== 'all' && unit.unit_type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'standby' && unit.status !== 'standby') return false;
        if (statusFilter === 'active' && !['dispatched', 'en_route', 'on_scene', 'transporting'].includes(unit.status)) return false;
        if (statusFilter === 'off_duty' && unit.status !== 'off_duty') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const nameMatch = (unit.name || '').toLowerCase().includes(q);
        const callSignMatch = (unit.call_sign || '').toLowerCase().includes(q);
        const contactMatch = (unit.contact_number || '').toLowerCase().includes(q);
        const operatorMatch = (unit.assigned_personnel?.name || '').toLowerCase().includes(q);
        if (!nameMatch && !callSignMatch && !contactMatch && !operatorMatch) return false;
      }
      return true;
    });
  }, [units, typeFilter, statusFilter, search]);

  // Aggregate stats
  const totalCount = units.length;
  const standbyCount = units.filter(u => u.status === 'standby').length;
  const activeMissionCount = units.filter(u => ['dispatched', 'en_route', 'on_scene', 'transporting'].includes(u.status)).length;
  const offDutyCount = units.filter(u => u.status === 'off_duty').length;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 min-h-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-xs">
            <Truck size={18} className="text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-gray-700 dark:text-slate-200">
              Fleet Assets: <span className="text-blue-600 dark:text-blue-400 font-black">{totalCount}</span>
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition shadow-xs cursor-pointer"
            title="Refresh Fleet Status"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/rescue-dispatch')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <span>Live Dispatch Console →</span>
          </button>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-blue-500/20 transition transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus size={15} /> Register Rescue Vehicle
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 shrink-0">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total Fleet</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{totalCount}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">Registered assets</p>
          </div>
          <div className="h-10 w-10 bg-blue-50 dark:bg-blue-950/50 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Truck size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Ready on Standby</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{standbyCount}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">Immediate deployment</p>
          </div>
          <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Radio size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Active Operations</p>
            <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-0.5">{activeMissionCount}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">In the field / en route</p>
          </div>
          <div className="h-10 w-10 bg-sky-50 dark:bg-sky-950/50 rounded-lg flex items-center justify-center text-sky-600 dark:text-sky-400">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Off-Duty / Maintenance</p>
            <p className="text-2xl font-black text-slate-500 dark:text-slate-400 mt-0.5">{offDutyCount}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400">Unavailable for dispatch</p>
          </div>
          <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400">
            <Power size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="mb-5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3 shadow-xs shrink-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Unit Type Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter size={13} /> Type:
          </span>
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Types
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('water_rescue')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
              typeFilter === 'water_rescue'
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                : 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100'
            }`}
          >
            <span>🚤 Water Boats</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('medical_ambulance')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
              typeFilter === 'medical_ambulance'
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100'
            }`}
          >
            <span>🚑 Ambulances</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('high_clearance_truck')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
              typeFilter === 'high_clearance_truck'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            <span>🛻 4x4 Heavy Trucks</span>
          </button>
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            aria-label="Filter by operational status"
          >
            <option value="all">All Statuses</option>
            <option value="standby">Standby Only</option>
            <option value="active">On Mission / Dispatched</option>
            <option value="off_duty">Off Duty / Maintenance</option>
          </select>

          <div className="relative w-48 sm:w-60">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search vehicle, callsign, driver..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pl-8 pr-7 py-1.5 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Vehicle Fleet Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-5 w-5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-blue-500"></span>
            </span>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Loading rescue vehicle fleet...</p>
          </div>
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <Truck size={42} className="text-gray-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-bold text-gray-800 dark:text-slate-200">No rescue vehicles found.</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm">
            {search || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters or search keywords.'
              : 'Register your first rescue vehicle to start building the CDRRMO fleet roster.'}
          </p>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus size={14} /> Register New Vehicle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnits.map((unit) => {
            const typeConfig = UNIT_TYPE_CONFIG[unit.unit_type] || {
              label: unit.unit_type || 'Rescue Vehicle',
              icon: '🚒',
              badgeCls: 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200',
            };
            const isStandby = unit.status === 'standby';
            const isOnMission = ['dispatched', 'en_route', 'on_scene', 'transporting'].includes(unit.status);
            const isOffDuty = unit.status === 'off_duty';

            return (
              <div
                key={unit.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Type Badge & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${typeConfig.badgeCls}`}>
                      <span>{typeConfig.icon}</span>
                      <span>{typeConfig.label}</span>
                    </span>

                    {isStandby && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Standby
                      </span>
                    )}

                    {isOnMission && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                        {unit.status.replace('_', ' ')}
                      </span>
                    )}

                    {isOffDuty && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Off Duty
                      </span>
                    )}
                  </div>

                  {/* Vehicle Title & Radio Call Sign */}
                  <div className="mb-3">
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-slate-100 leading-snug">
                      {unit.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                        📻 {unit.call_sign}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                        <Users size={12} className="text-blue-500" />
                        Cap: {unit.capacity_persons || 8} pax
                      </span>
                    </div>
                  </div>

                  {/* Operational Details */}
                  <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 mb-3">
                    {/* Operator in-charge */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-slate-400 font-medium">Assigned Driver:</span>
                      <span className="font-bold text-gray-800 dark:text-slate-200 text-right truncate max-w-[170px]">
                        {unit.assigned_personnel?.name || 'On-Duty Dispatch Pool'}
                      </span>
                    </div>

                    {/* Contact Number */}
                    {unit.contact_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-slate-400 font-medium">Direct Hotline:</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Phone size={11} /> {unit.contact_number}
                        </span>
                      </div>
                    )}

                    {/* Coordinates */}
                    {unit.current_latitude && unit.current_longitude && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 dark:text-slate-400 font-medium">GPS Location:</span>
                        <span className="font-mono text-gray-600 dark:text-slate-400">
                          {Number(unit.current_latitude).toFixed(4)}, {Number(unit.current_longitude).toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Active Mission Card if deployed */}
                  {isOnMission && unit.active_mission && (
                    <div className="mb-3 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs">
                      <div className="flex items-center justify-between font-bold text-sky-800 dark:text-sky-300 text-[11px] mb-1">
                        <span>🚨 ACTIVE RESCUE MISSION</span>
                        <span>#{unit.active_mission.control_no}</span>
                      </div>
                      <p className="text-[11px] text-gray-700 dark:text-slate-300 font-semibold truncate">
                        Victim: {unit.active_mission.victim_name} ({unit.active_mission.headcount || 1} pax)
                      </p>
                      {unit.active_mission.target_shelter && (
                        <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                          Destination: {unit.active_mission.target_shelter.name}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {/* Locate on Map Button */}
                    {unit.current_latitude && unit.current_longitude && (
                      <button
                        onClick={() => navigate(`/admin/map?focusLat=${unit.current_latitude}&focusLng=${unit.current_longitude}&unitName=${encodeURIComponent(unit.name)}`)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                        title="Locate Vehicle on Map"
                        aria-label="Locate Vehicle on Map"
                      >
                        <MapPin size={15} />
                      </button>
                    )}

                    {/* Edit Vehicle specs */}
                    <button
                      onClick={() => setEditingUnit(unit)}
                      className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                      title="Edit Vehicle Details"
                      aria-label="Edit Vehicle Details"
                    >
                      <Edit3 size={15} />
                    </button>

                    {/* Delete Vehicle */}
                    {!isOnMission && (
                      <button
                        onClick={() => setDeletingUnitId(unit.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                        title="Remove Vehicle from Fleet"
                        aria-label="Remove Vehicle from Fleet"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Toggle Readiness (Standby vs Off-Duty) */}
                  {!isOnMission && (
                    <button
                      onClick={() => toggleStatusMutation.mutate({ id: unit.id, currentStatus: unit.status })}
                      disabled={toggleStatusMutation.isPending}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        isStandby
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-xs'
                      }`}
                      title={isStandby ? 'Set Vehicle to Off Duty / Maintenance' : 'Set Vehicle to Standby (Ready to Deploy)'}
                    >
                      <Power size={12} />
                      <span>{isStandby ? 'Mark Off-Duty' : 'Set Ready'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Vehicle Modal */}
      {isRegisterModalOpen && (
        <VehicleModal
          title="Register Fleet Rescue Vehicle"
          staff={staff}
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={() => {
            setIsRegisterModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
            showSuccess('New rescue vehicle registered into fleet roster.');
          }}
        />
      )}

      {/* Edit Vehicle Modal */}
      {editingUnit && (
        <VehicleModal
          title="Edit Rescue Vehicle Specifications"
          initialData={editingUnit}
          staff={staff}
          onClose={() => setEditingUnit(null)}
          onSuccess={() => {
            setEditingUnit(null);
            queryClient.invalidateQueries({ queryKey: ['rescue-units'] });
            showSuccess('Rescue vehicle details updated successfully.');
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingUnitId !== null}
        onClose={() => setDeletingUnitId(null)}
        onConfirm={() => deleteUnitMutation.mutate(deletingUnitId)}
        title="Remove Vehicle from Fleet"
        message="Are you sure you want to remove this rescue vehicle from the CDRRMO fleet roster? This action cannot be undone."
        confirmText="Remove Vehicle"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}

