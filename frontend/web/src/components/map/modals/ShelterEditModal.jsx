import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { X, Building2, Users, Save, Trash2, Phone, MapPin } from 'lucide-react';

export default function ShelterEditModal({ shelter, onUpdate, onDelete, onCancel, isLoading }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(shelter.name);
  const [cap, setCap] = useState(shelter.max_capacity);
  const [status, setStatus] = useState(shelter.status);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !cap || isNaN(parseInt(cap, 10))) return;
    onUpdate({ name, max_capacity: parseInt(cap, 10), status });
  };

  const handleViewMoreDetails = () => {
    navigate('/admin/shelters', { state: { search: shelter.name } });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            <MapPin size={20} className="text-blue-500" /> Manage Shelter
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1">Shelter Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border dark:border-slate-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1">Max Capacity (Persons)</label>
            <input
              type="number"
              required
              min="1"
              value={cap}
              onChange={e => setCap(e.target.value)}
              className="w-full border dark:border-slate-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border dark:border-slate-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-950 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="open">Open (Accepting Evacuees)</option>
              <option value="full">Full (At Capacity)</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-lg flex items-center justify-between border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Current Occupancy: <strong className="text-gray-700 dark:text-slate-200">{shelter.current_occupancy}</strong>
            </span>
            <button
              type="button"
              onClick={handleViewMoreDetails}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors animate-pulse"
            >
              View More Details &rarr;
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            {user?.role === 'admin' ? (
              <button
                type="button"
                onClick={onDelete}
                className="bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-lg font-semibold text-sm transition"
              >
                Delete
              </button>
            ) : (
              <div className="text-xs text-gray-400 dark:text-slate-500 font-semibold flex items-center bg-gray-50 dark:bg-slate-950 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-800">
                Staff Cannot Delete
              </div>
            )}
            <div className="flex-1 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-4 py-2.5 rounded-lg font-semibold text-sm transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
