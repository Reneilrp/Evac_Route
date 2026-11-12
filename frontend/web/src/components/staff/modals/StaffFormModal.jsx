import React from 'react';
import { User, X, Shield, LifeBuoy, QrCode } from 'lucide-react';
import { RESCUE_ROLES } from '../../../config/staffRoles';

export default function StaffFormModal({
  isOpen,
  onClose,
  editingStaff,
  agencyScope,
  availableModalRoles = [],
  handleSubmit,
  isSubmitting,
  OPERATOR_TYPES = [],
  name, setName,
  email, setEmail,
  password, setPassword,
  operatorType, setOperatorType,
  status, setStatus,
  rescueMode, setRescueMode,
  rescueRole, setRescueRole,
  rescueUnitName, setRescueUnitName,
  rescueCallSign, setRescueCallSign,
  rescueUnitType, setRescueUnitType,
  rescueCapacity, setRescueCapacity,
  rescueContact, setRescueContact,
  existingRescueUnitId, setExistingRescueUnitId,
  assignedShelterId, setAssignedShelterId,
  rescueUnits = [],
  shelters = [],
}) {
  if (!isOpen) return null;

  return (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-slate-950 dark:to-slate-900">
              <h3 className="font-black text-gray-900 dark:text-slate-100 text-base flex items-center gap-2">
                <User size={18} className="text-blue-600" /> 
                {editingStaff ? `Edit Operator #${editingStaff.id}` : (agencyScope === 'cdrmo' ? 'Register New Field Rescue Operator' : 'Register New CSWDO Operator')}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Operator Type Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  1. {agencyScope === 'cdrmo' ? 'Operator Duty Assignment' : 'Choose Operator Duty & Role'}
                </label>
                {editingStaff?.role === 'admin' ? (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-xl flex items-center gap-2.5">
                    <Shield size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-purple-900 dark:text-purple-200">System Administrator Account</div>
                      <div className="text-[11px] text-purple-700 dark:text-purple-300">
                        System administrator privileges are protected and cannot be changed to an operational staff role.
                      </div>
                    </div>
                  </div>
                ) : availableModalRoles.length === 1 ? (
                  <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-rose-600 text-white shrink-0">
                      <LifeBuoy size={18} />
                    </span>
                    <div>
                      <div className="font-black text-xs text-rose-950 dark:text-rose-200">CDRRMO Field Rescue Operator</div>
                      <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-tight">
                        Field Search &amp; Rescue personnel assigned to a dedicated rescue vehicle, boat, or medic crew.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableModalRoles.map(type => {
                      const Icon = type.icon;
                      const isSelected = operatorType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setOperatorType(type.id)}
                          className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 shadow-xs'
                              : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                          }`}
                        >
                          <span className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                          }`}>
                            <Icon size={15} />
                          </span>
                          <div>
                            <div className="font-black text-xs">{type.label}</div>
                            <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">
                              {type.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Basic Credentials */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  2. Operator Profile &amp; Login
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="e.g. Captain Juan Dela Cruz" 
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Email / Login ID</label>
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="e.g. pilot.juan@lgu.gov.ph" 
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                      {editingStaff ? 'New Password (Leave blank to keep current)' : 'Password (Min. 6 chars)'}
                    </label>
                    <input 
                      type="password" 
                      required={!editingStaff}
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Account Status</label>
                    <select 
                      value={status} 
                      onChange={e => setStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active (Authorized)</option>
                      <option value="inactive">Inactive (Suspended)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Specific Configuration: Rescue Operator Assignment */}
              {operatorType === 'rescue' && (
                <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800 bg-rose-50/30 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  <div className="flex items-center gap-2">
                    <LifeBuoy size={16} className="text-rose-600 dark:text-rose-400" />
                    <label className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">
                      3. Rescuer Duty Role &amp; Vehicle Link
                    </label>
                  </div>

                  {/* Rescuer Role Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                      Crew Member Duty Specialty
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {RESCUE_ROLES.map(role => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setRescueRole(role.id)}
                          className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                            rescueRole === role.id
                              ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-bold'
                              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="text-base">{role.icon}</span>
                          <span className="text-xs">{role.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vehicle Assignment Options */}
                  <div className="space-y-2 pt-2 border-t border-rose-100 dark:border-rose-900/30">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Fleet Vehicle Assignment
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setRescueMode('existing')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                          rescueMode === 'existing'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        Assign to Existing Unit
                      </button>
                      <button
                        type="button"
                        onClick={() => setRescueMode('new')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                          rescueMode === 'new'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        Register New Fleet Vehicle
                      </button>
                    </div>

                    {rescueMode === 'existing' ? (
                      <div>
                        <select
                          value={existingRescueUnitId}
                          onChange={(e) => setExistingRescueUnitId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                        >
                          <option value="">-- Unassigned (Standby Pool / Reserve) --</option>
                          {rescueUnits.map(unit => (
                            <option key={unit.id} value={unit.id}>
                              {unit.unit_type === 'water_rescue' ? '🚤' : unit.unit_type === 'medical_ambulance' ? '🚑' : '🛻'} {unit.name} ({unit.call_sign}) — Cap: {unit.capacity_persons}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                          The mobile rescuer will receive missions and duty notifications assigned to this vessel / vehicle.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Call Sign / Plate</label>
                            <input
                              type="text"
                              value={rescueCallSign}
                              onChange={(e) => setRescueCallSign(e.target.value)}
                              placeholder="e.g. RESCUE-BOAT-05"
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white font-mono uppercase"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Vehicle Unit Name</label>
                            <input
                              type="text"
                              value={rescueUnitName}
                              onChange={(e) => setRescueUnitName(e.target.value)}
                              placeholder="e.g. Zamboanga Delta Rubber Boat"
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Vehicle Type</label>
                            <select
                              value={rescueUnitType}
                              onChange={(e) => setRescueUnitType(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white"
                            >
                              <option value="water_rescue">🚤 Water Rescue Boat</option>
                              <option value="medical_ambulance">🚑 Medical Ambulance</option>
                              <option value="high_clearance_truck">🛻 4x4 Heavy Rescue Truck</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Evacuee Capacity</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={rescueCapacity}
                              onChange={(e) => setRescueCapacity(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Radio / Hotline</label>
                            <input
                              type="text"
                              value={rescueContact}
                              onChange={(e) => setRescueContact(e.target.value)}
                              placeholder="e.g. 0917-123-4567"
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Specific Configuration: Shelter Scanner Assignment */}
              {operatorType === 'scanner' && (
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-center gap-2">
                    <QrCode size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                      3. Evacuation Shelter Facility Assignment
                    </label>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Assign this gate marshal to their designated evacuation center. Their mobile scanner app will check in evacuees and issue ration packs for this facility.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Designated Evacuation Shelter
                    </label>
                    <select
                      value={assignedShelterId}
                      onChange={(e) => setAssignedShelterId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Unassigned (Floating Gate Marshal) --</option>
                      {shelters.map(s => (
                        <option key={s.id} value={s.id}>
                          🏢 {s.name} ({s.barangay || 'City Center'}) — {s.current_occupancy}/{s.max_capacity} Occupancy
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting 
                    ? 'Saving...' 
                    : editingStaff ? 'Save Operator Changes' : 'Register Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
