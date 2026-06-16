import { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, ShieldAlert, Info, Trash2, X, PlusCircle, Users, MapPin, Calendar, Clock } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/common/ConfirmationModal';

// List of common barangays in Zamboanga City for quick selection
const COMMON_BARANGAYS = [
  "Tumaga",
  "Tetuan",
  "Guiwan",
  "Santa Maria",
  "Calarian",
  "Pasonanca",
  "Divisoria",
  "San Roque",
  "Baliwasan",
  "Putik",
  "Talon-Talon",
  "Cabaluay",
  "Mercedes",
  "Manicahan"
];

export default function EmergencyAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form States
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('warning');
  const [scope, setScope] = useState('all');
  const [selectedBarangay, setSelectedBarangay] = useState('Tumaga');
  const [customBarangay, setCustomBarangay] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion state
  const [deletingAlertId, setDeletingAlertId] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data.data);
    } catch (err) {
      toast.error('Failed to load warning alerts feed.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const openModal = () => {
    setTitle('');
    setMessage('');
    setSeverity('warning');
    setScope('all');
    setSelectedBarangay('Tumaga');
    setCustomBarangay('');
    setIsModalOpen(true);
  };

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
      setIsModalOpen(false);
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to broadcast warning.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!deletingAlertId) return;

    try {
      await api.delete(`/alerts/${deletingAlertId}`);
      toast.success('Emergency warning revoked successfully.');
      setAlerts(prev => prev.filter(alert => alert.id !== deletingAlertId));
    } catch (err) {
      toast.error('Failed to revoke warning.');
    } finally {
      setDeletingAlertId(null);
    }
  };

  const getSeverityBadge = (level) => {
    switch (level) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldAlert size={12} className="animate-pulse" /> Critical
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle size={12} /> Warning
          </span>
        );
      case 'info':
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Info size={12} /> Info
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 p-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            📢 Emergency Warnings Dispatcher
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Broadcast emergency alerts, evacuation notices, and hazard updates directly to residents.
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-red-500/20 transition transform hover:-translate-y-0.5"
        >
          <PlusCircle size={18} /> Broadcast New Warning
        </button>
      </div>

      {/* Main Alert Feed */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-6">
        <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">
          Warning Logs &amp; Active Broadcasts
        </h3>

        {loading && alerts.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
            <Megaphone size={48} className="text-gray-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-gray-500 dark:text-slate-400">No active warnings broadcasted.</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm">
              Use the button above to broadcast localized warnings to residents of Zamboanga City or specific barangays.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                  alert.severity === 'critical' 
                    ? 'bg-red-50/20 dark:bg-red-950/10 border-red-200 dark:border-red-900/30' 
                    : alert.severity === 'warning' 
                    ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30'
                    : 'bg-slate-50/50 dark:bg-slate-950/20 border-gray-100 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(alert.severity)}
                      <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-slate-400">
                        {alert.scope === 'all' ? (
                          <>
                            <Users size={12} className="text-blue-500" /> Zamboanga City
                          </>
                        ) : (
                          <>
                            <MapPin size={12} className="text-emerald-500" /> Barangay: {alert.barangay}
                          </>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => setDeletingAlertId(alert.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg transition"
                      title="Revoke / Delete Alert"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <h4 className="font-extrabold text-sm text-gray-800 dark:text-slate-100 mt-2.5 leading-snug">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-slate-300 mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {alert.message}
                  </p>
                </div>

                <div className="border-t border-gray-100 dark:border-slate-800/60 mt-4 pt-3 flex justify-between items-center text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {new Date(alert.created_at).toLocaleString()}
                  </span>
                  <span>
                    By: {alert.creator?.name || 'System Admin'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm flex items-center gap-2">
                📢 Dispatch Warning Broadcast
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"
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
                      {COMMON_BARANGAYS.map((brgy) => (
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border dark:border-slate-800 text-xs font-bold rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-xs font-bold rounded-lg transition"
                >
                  {isSubmitting ? 'Broadcasting...' : 'Broadcast Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingAlertId !== null}
        onClose={() => setDeletingAlertId(null)}
        onConfirm={handleRevoke}
        title="Revoke Emergency Warning"
        message="Are you sure you want to revoke and delete this warning? It will no longer show up on resident app screens, but historical reports remain logged."
        confirmText="Revoke Broadcast"
        cancelText="Keep Broadcast"
      />
    </div>
  );
}
