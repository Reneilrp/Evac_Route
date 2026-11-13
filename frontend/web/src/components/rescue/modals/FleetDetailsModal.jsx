import React, { useEffect } from 'react';
import { 
  X, Truck, Users, Phone, MapPin, Radio, Shield, 
  CheckCircle2, AlertTriangle, Edit3, Power, ExternalLink,
  Compass, Award, Activity, HeartPulse
} from 'lucide-react';
import { RESCUE_ROLES } from '../../../config/staffRoles';

const UNIT_TYPE_CONFIG = {
  water_rescue: {
    label: 'Water Rescue Craft',
    icon: '🚤',
    badgeCls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    leadTitle: 'Vessel Commander / Boat Captain',
  },
  medical_ambulance: {
    label: 'Medical Ambulance',
    icon: '🚑',
    badgeCls: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-200 dark:border-red-800',
    leadTitle: 'Chief Paramedic / Lead Medic',
  },
  high_clearance_truck: {
    label: '4x4 High-Clearance Truck',
    icon: '🛻',
    badgeCls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    leadTitle: 'Lead Driver / Quick Response Commander',
  },
};

const STATUS_CONFIG = {
  standby: {
    label: 'Standby (Ready to Deploy)',
    badgeCls: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    dotCls: 'bg-emerald-500 animate-pulse',
  },
  dispatched: {
    label: 'Dispatched to Location',
    badgeCls: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    dotCls: 'bg-sky-500 animate-pulse',
  },
  en_route: {
    label: 'En Route to Target',
    badgeCls: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    dotCls: 'bg-sky-500 animate-pulse',
  },
  on_scene: {
    label: 'On Scene (Active Extraction)',
    badgeCls: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    dotCls: 'bg-rose-500 animate-ping',
  },
  transporting: {
    label: 'Transporting Evacuees',
    badgeCls: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    dotCls: 'bg-indigo-500 animate-pulse',
  },
  off_duty: {
    label: 'Off-Duty / In Maintenance',
    badgeCls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    dotCls: 'bg-slate-400',
  },
};

export function FleetDetailsModal({
  unit,
  onClose,
  onEdit,
  onToggleStatus,
  onLocate,
  onManageStaff,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!unit) return null;

  const typeConfig = UNIT_TYPE_CONFIG[unit.unit_type] || {
    label: unit.unit_type || 'Rescue Vehicle',
    icon: '🚒',
    badgeCls: 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200 border-gray-300',
    leadTitle: 'Lead Operator / Captain',
  };

  const statusConfig = STATUS_CONFIG[unit.status] || {
    label: unit.status?.replace('_', ' ') || 'Unknown',
    badgeCls: 'bg-slate-100 text-slate-700 border-slate-300',
    dotCls: 'bg-slate-400',
  };

  const captain = unit.assigned_personnel || null;
  const crewMembers = Array.isArray(unit.crew_members) ? unit.crew_members : [];
  
  // Non-captain crew members (exclude the captain if they're also listed in crew_members)
  const otherCrew = crewMembers.filter(m => !captain || m.id !== captain.id);
  const totalCrewCount = (captain ? 1 : 0) + otherCrew.length;

  const isOnMission = ['dispatched', 'en_route', 'on_scene', 'transporting'].includes(unit.status);
  const activeMission = unit.active_mission || null;

  const getRoleLabel = (roleKey) => {
    const found = RESCUE_ROLES.find(r => r.id === roleKey);
    return found ? `${found.icon} ${found.label}` : '🦺 Rescuer';
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fleet-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex justify-between items-start shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              {typeConfig.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30 uppercase tracking-wider">
                  📻 {unit.call_sign}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConfig.badgeCls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotCls}`}></span>
                  {statusConfig.label}
                </span>
              </div>
              <h2 id="fleet-modal-title" className="text-lg font-black text-white leading-tight">
                {unit.name}
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-2">
                <span>{typeConfig.label}</span>
                <span>•</span>
                <span>CDRRMO Quick Response Fleet</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-200">
          {/* Key Metric Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Total Crew On-Board
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-slate-900 dark:text-slate-100">{totalCrewCount}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">personnel</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Evacuee Capacity
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-blue-600 dark:text-blue-400">{unit.capacity_persons || 8}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">pax max</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Missions Dispatched
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{unit.missions_count ?? 0}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">total sorties</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Operational State
              </span>
              <div className="mt-1 font-bold text-xs truncate">
                {isOnMission ? (
                  <span className="text-sky-600 dark:text-sky-400">Deployed</span>
                ) : unit.status === 'standby' ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Ready on Base</span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">Maintenance</span>
                )}
              </div>
            </div>
          </div>

          {/* Captain / Vessel Commander Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-900/60 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Award size={14} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Fleet Captain & Lead Operator
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    {typeConfig.leadTitle}
                  </span>
                </div>
              </div>

              {captain && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  ⭐ Designated Commander
                </span>
              )}
            </div>

            {captain ? (
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                    {captain.name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 leading-tight">
                      {captain.name}
                    </h4>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {captain.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                        {getRoleLabel(captain.rescue_role)}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {captain.status || 'active'}
                      </span>
                    </div>
                  </div>
                </div>

                {unit.contact_number && (
                  <div className="flex items-center gap-1.5 sm:self-center font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/40">
                    <Phone size={13} />
                    <span>{unit.contact_number}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-dashed border-amber-300 dark:border-amber-800/80 text-center">
                <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                  No designated Captain assigned to this fleet unit.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Operated on dynamic shift rotation from the active CDRRMO rescue field pool.
                </p>
                {onManageStaff && (
                  <button
                    onClick={onManageStaff}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                  >
                    <span>Assign Captain in Staff Operator Roster</span>
                    <ExternalLink size={11} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Other Crew Members inside Fleet */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Assigned Fleet Crew Members ({otherCrew.length})
                </h3>
              </div>

              {onManageStaff && (
                <button
                  onClick={onManageStaff}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
                >
                  <span>Manage Crew Roster</span>
                  <ExternalLink size={11} />
                </button>
              )}
            </div>

            {otherCrew.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {otherCrew.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {member.name?.charAt(0) || 'R'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {member.name}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                          {member.email}
                        </p>
                        <div className="mt-1">
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {getRoleLabel(member.rescue_role)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="shrink-0 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No additional crew members currently assigned to this vehicle.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">
                  Field rescue swimmers, emergency medics, and comms crew can be linked in the Staff Operator registry.
                </p>
              </div>
            )}
          </div>

          {/* Active Mission Telemetry (if deployed) */}
          {isOnMission && activeMission && (
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 space-y-2">
              <div className="flex items-center justify-between font-black text-sky-900 dark:text-sky-200 text-xs">
                <span className="flex items-center gap-1.5">
                  <Activity size={15} className="text-sky-600 animate-spin" />
                  ACTIVE EMERGENCY RESCUE SORTIE
                </span>
                <span className="font-mono bg-sky-200 dark:bg-sky-900 px-2 py-0.5 rounded">
                  #{activeMission.control_no}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">
                    Distress Party / Victim
                  </span>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {activeMission.victim_name} ({activeMission.headcount || 1} evacuee pax)
                  </p>
                  {activeMission.victim_phone && (
                    <p className="font-mono text-[11px] text-sky-700 dark:text-sky-300">
                      {activeMission.victim_phone}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">
                    Assigned Destination
                  </span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                    {activeMission.target_shelter?.name || 'Designated High-Ground Safe Zone'}
                  </p>
                  {activeMission.special_needs && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold truncate mt-0.5">
                      ⚠️ Needs: {activeMission.special_needs}
                    </p>
                  )}
                </div>
              </div>

              {activeMission.situation_description && (
                <div className="text-[11px] bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-lg border border-sky-200 dark:border-sky-900/60 text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-sky-900 dark:text-sky-300">Situation: </span>
                  {activeMission.situation_description}
                </div>
              )}
            </div>
          )}

          {/* Telemetry & Communications */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Direct Communications & GPS Telemetry
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                  <Phone size={12} className="text-blue-500" /> Tactical Hotline:
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {unit.contact_number || 'Direct CDRRMO Trunkline'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                  <MapPin size={12} className="text-rose-500" /> GPS Fix:
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {unit.current_latitude && unit.current_longitude 
                    ? `${Number(unit.current_latitude).toFixed(4)}, ${Number(unit.current_longitude).toFixed(4)}`
                    : 'CDRRMO Base Station'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>

            {onLocate && unit.current_latitude && unit.current_longitude && (
              <button
                onClick={() => {
                  onClose();
                  onLocate(unit);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition cursor-pointer"
              >
                <Compass size={14} />
                <span>Locate on Map</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isOnMission && onToggleStatus && (
              <button
                onClick={() => onToggleStatus(unit)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  unit.status === 'standby'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-300'
                    : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-xs'
                }`}
              >
                <Power size={13} />
                <span>{unit.status === 'standby' ? 'Mark Off-Duty' : 'Set Standby Ready'}</span>
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(unit);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition cursor-pointer"
              >
                <Edit3 size={13} />
                <span>Edit Vehicle</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FleetDetailsModal;
