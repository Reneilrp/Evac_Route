import React, { useState, useMemo } from 'react';
import { X, Truck } from 'lucide-react';
import api from '../../../services/api';
import { showError } from '../../../utils/toast';

function RegisterRescueUnitModal({ staff = [], onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [callSign, setCallSign] = useState('');
  const [unitType, setUnitType] = useState('water_rescue');
  const [capacity, setCapacity] = useState(8);
  const [contactNumber, setContactNumber] = useState('');
  const [assignedPersonnelId, setAssignedPersonnelId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter staff to ONLY allow CDRRMO Search & Rescue field operators (Exclude System Admin & CSWDO)
  const eligibleStaff = useMemo(() => {
    return (staff || []).filter(u => {
      const opType = (u.operator_type || '').toLowerCase();
      const email = (u.email || '').toLowerCase();

      // Explicitly exclude System Admin
      if (opType === 'admin' || email === 'admin@lgu.gov.ph' || (u.role === 'admin' && opType !== 'cdrrmo')) {
        return false;
      }

      // Explicitly exclude CSWDO personnel (logistics & scanner)
      if (['logistics', 'scanner'].includes(opType) || email.includes('logistics') || email.includes('scanner')) {
        return false;
      }

      return opType.includes('rescue') || opType === 'cdrrmo';
    });
  }, [staff]);

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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
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
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              <option value="">No assigned operator (On Duty pool)</option>
              {eligibleStaff.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.operator_type === 'cdrrmo' ? 'Tactical Command' : 'Field Rescue Operator'}) — {u.email}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
              Only qualified CDRRMO Search &amp; Rescue field operators can be assigned to fleet vehicles.
            </p>
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


export default RegisterRescueUnitModal;
