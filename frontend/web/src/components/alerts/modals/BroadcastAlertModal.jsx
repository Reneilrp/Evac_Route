import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export default function BroadcastAlertModal({
  isOpen,
  onClose,
  onSuccess,
  commonBarangays = [],
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('warning');
  const [scope, setScope] = useState('all');
  const [selectedBarangay, setSelectedBarangay] = useState('Tumaga');
  const [customBarangay, setCustomBarangay] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setMessage('');
      setSeverity('warning');
      setScope('all');
      setSelectedBarangay(commonBarangays[0] || 'Tumaga');
      setCustomBarangay('');
    }
  }, [isOpen, commonBarangays]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Please enter alert title and description.');
      return;
    }

    const targetBarangay = scope === 'barangay' 
      ? (customBarangay.trim() || selectedBarangay) 
      : null;

    if (scope === 'barangay' && !targetBarangay) {
      toast.error('Please select or enter a target barangay.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        message,
        severity,
        scope,
        barangay: targetBarangay
      };

      await api.post('/alerts', payload);
      toast.success('Emergency warning broadcasted successfully!');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to broadcast warning.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm flex items-center gap-2">
            📢 Dispatch Warning Broadcast
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Alert Title */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">
              Warning Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Rising Water Alert, Force Evacuation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">
              Warning Message &amp; Instructions
            </label>
            <textarea
              required
              rows="4"
              placeholder="Provide precise details, routes, and instructions to the residents..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
            />
          </div>

          {/* Severity & Target Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="critical">Critical (Red)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1.5">
                Broadcast Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="all">All Residents (Zamboanga)</option>
                <option value="barangay">Specific Barangay</option>
              </select>
            </div>
          </div>

          {/* Barangay Selector */}
          {scope === 'barangay' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                  Target Barangay
                </label>
                <select
                  value={selectedBarangay}
                  onChange={(e) => setSelectedBarangay(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {commonBarangays.map((brgy) => (
                    <option key={brgy} value={brgy}>{brgy}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                  Or Custom Barangay / Area
                </label>
                <input
                  type="text"
                  placeholder="e.g., Tetuan Zone 4, Tugbungan"
                  value={customBarangay}
                  onChange={(e) => setCustomBarangay(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border dark:border-slate-800 text-xs font-bold rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              {isSubmitting ? 'Broadcasting...' : 'Broadcast Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
