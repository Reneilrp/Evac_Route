import React from 'react';
import { X, Shield, Trash2, LifeBuoy, Edit2 } from 'lucide-react';

export default function StaffDetailsModal({
  viewingStaff,
  onClose,
  currentUser,
  onEdit,
  onRevoke,
  onRestore,
  OPERATOR_TYPES = [],
}) {
  if (!viewingStaff) return null;

  const opTypeKey = viewingStaff.operator_type || (viewingStaff.role === 'admin' ? 'admin' : 'general');
  const opConfig = OPERATOR_TYPES.find(t => t.id === opTypeKey) || OPERATOR_TYPES[0];
  const OpIcon = opConfig.icon;
  const isSelf = viewingStaff.id === currentUser?.id;
  const isTargetAdmin = viewingStaff.role === 'admin';
  const canManage = !isSelf && (currentUser?.role === 'admin' || !isTargetAdmin);

  return (
          <div 
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-950 dark:to-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black">
                    <OpIcon size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-slate-100 text-base flex items-center gap-2">
                      {viewingStaff.name}
                      {isSelf && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                          You
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Operator ID #{viewingStaff.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => onClose()}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 text-xs">
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 block mb-1">
                      Assigned Role / Duty
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase border ${opConfig.badgeCls}`}>
                      <OpIcon size={13} />
                      {opConfig.label}
                    </span>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5 leading-tight">
                      {opConfig.description}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 block mb-1">
                      Account Status
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                      viewingStaff.status === 'active'
                        ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900/40'
                        : 'text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
                    }`}>
                      ● {viewingStaff.status}
                    </span>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5 leading-tight">
                      {viewingStaff.status === 'active' ? 'Authorized for system and mobile access' : 'Access temporarily suspended'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 block mb-1">
                      Official Email / Account
                    </span>
                    <div className="font-mono font-semibold text-gray-800 dark:text-slate-200 text-sm">
                      {viewingStaff.email}
                    </div>
                  </div>
                </div>

                {/* Rescuer Vehicle & Crew Duty Assignment */}
                {viewingStaff.operator_type === 'rescue' && (() => {
                  const assignedUnit = viewingStaff.assigned_rescue_unit || viewingStaff.rescue_units?.[0] || null;
                  const crewRoleCfg = RESCUE_ROLES.find(r => r.id === viewingStaff.rescue_role) || RESCUE_ROLES[0];

                  return (
                    <div className="p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5 text-xs">
                          <LifeBuoy size={15} className="text-rose-600" />
                          Field Rescuer Duty &amp; Vehicle Assignment
                        </span>
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                          <span>{crewRoleCfg.icon}</span>
                          <span>{crewRoleCfg.label}</span>
                        </span>
                      </div>

                      {assignedUnit ? (
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-gray-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                              <span className="text-sm">
                                {assignedUnit.unit_type === 'water_rescue' ? '🚤' : assignedUnit.unit_type === 'medical_ambulance' ? '🚑' : '🛻'}
                              </span>
                              <span>{assignedUnit.name}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{assignedUnit.call_sign}</span>
                              <span>•</span>
                              <span>Cap: {assignedUnit.capacity_persons} evacuees</span>
                              {assignedUnit.contact_number && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{assignedUnit.contact_number}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                            {assignedUnit.status}
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-rose-200/60 dark:border-rose-900/40 text-[11px] text-gray-500 dark:text-slate-400 italic">
                          Currently in Standby / Reserve Pool (No fleet vehicle assigned).
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Shelter Scanner Assignment Details */}
                {viewingStaff.operator_type === 'scanner' && (
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                        <QrCode size={15} className="text-emerald-600" />
                        Gate Marshal Shelter Assignment
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Mobile QR Desk
                      </span>
                    </div>

                    {viewingStaff.assigned_shelter ? (
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                            <span>🏢</span>
                            <span>{viewingStaff.assigned_shelter.name}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Barangay {viewingStaff.assigned_shelter.barangay || 'City Center'}</span>
                            <span>•</span>
                            <span>Occupancy: {viewingStaff.assigned_shelter.current_occupancy}/{viewingStaff.assigned_shelter.max_capacity}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded ${
                          viewingStaff.assigned_shelter.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-red-100 text-red-700'
                        }`}>
                          {viewingStaff.assigned_shelter.status}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-gray-500 dark:text-slate-400 italic">
                        Currently Unassigned (Floating gate marshal without designated facility).
                      </div>
                    )}
                  </div>
                )}

                {/* Operator Permissions Notice */}
                <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-300 space-y-1">
                  <div className="font-bold">Access Scope &amp; System Privileges:</div>
                  <p className="text-blue-800 dark:text-blue-400 leading-relaxed">
                    {opConfig.id === 'admin' && 'Has full command over resident logs, shelter allocations, fleet dispatch, and operator accounts.'}
                    {opConfig.id === 'rescue' && 'Assigned to field search & rescue operations, evacuee staging handovers, and fleet management.'}
                    {opConfig.id === 'scanner' && 'Equipped with QR scanner privileges for shelter intake gates and real-time ration validation.'}
                    {opConfig.id === 'logistics' && 'Authorized to manage CSWDO warehouse relief goods, bundle builder, and emergency ration dispatches.'}
                    {opConfig.id === 'general' && 'Standard command center situational monitoring and general incident tracking.'}
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {canManage ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const target = viewingStaff;
                          onClose();
                          openEditModal(target);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                      >
                        <Edit2 size={14} /> Edit Operator
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const target = viewingStaff;
                          onClose();
                          handleRevoke(target);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                      >
                        <Trash2 size={14} /> Revoke Access
                      </button>
                    </>
                  ) : isSelf ? (
                    <span className="text-xs text-gray-400 dark:text-slate-500 italic pr-2">
                      Active Account (Self)
                    </span>
                  ) : (
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-extrabold flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800">
                      <Shield size={13} /> Protected Administrator
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
  );
}
