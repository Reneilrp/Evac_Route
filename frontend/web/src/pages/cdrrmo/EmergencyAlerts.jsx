import { useState, useEffect, useMemo } from 'react';
import { Megaphone, AlertTriangle, ShieldAlert, Info, Trash2, X, PlusCircle, Users, MapPin, Clock, Filter, Search, RotateCcw, Archive, ArchiveRestore } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import BroadcastAlertModal from '../../components/alerts/modals/BroadcastAlertModal';

// List of common barangays in Zamboanga City for quick selection (Alphabetical A-Z)
const COMMON_BARANGAYS = [
  "Arena Blanco",
  "Ayala",
  "Baliwasan",
  "Boalan",
  "Cabaluay",
  "Calarian",
  "Canelar",
  "Cawit",
  "Culianan",
  "Curuan",
  "Divisoria",
  "Guiwan",
  "Labuan",
  "Manicahan",
  "Mampang",
  "Mercedes",
  "Pasonanca",
  "Putik",
  "Recodo",
  "Rio Hondo",
  "San Jose",
  "San Roque",
  "Santa Catalina",
  "Santa Maria",
  "Talon-Talon",
  "Taluksangay",
  "Tetuan",
  "Tugbungan",
  "Tumaga",
  "Vitali",
  "Zone I (Poblacion)",
  "Zone II (Poblacion)",
  "Zone III (Poblacion)",
  "Zone IV (Poblacion)"
];

export default function EmergencyAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter States
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedScope, setSelectedScope] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [archiveFilter, setArchiveFilter] = useState('active'); // 'active' | 'archived'
  
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isModalOpen) setIsModalOpen(false);
        if (deletingAlertId) setDeletingAlertId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, deletingAlertId]);

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
    } catch {
      toast.error('Failed to revoke warning.');
    } finally {
      setDeletingAlertId(null);
    }
  };

  const handleArchive = async (alertId) => {
    try {
      await api.post(`/alerts/${alertId}/archive`);
      toast.success('Emergency warning archived.');
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, archived_at: new Date().toISOString() } : a));
    } catch {
      toast.error('Failed to archive warning.');
    }
  };

  const handleUnarchive = async (alertId) => {
    try {
      await api.post(`/alerts/${alertId}/unarchive`);
      toast.success('Emergency warning restored to active feed.');
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, archived_at: null } : a));
    } catch {
      toast.error('Failed to restore warning.');
    }
  };

  const activeAlerts = useMemo(() => alerts.filter(a => !a.archived_at), [alerts]);
  const archivedAlerts = useMemo(() => alerts.filter(a => !!a.archived_at), [alerts]);

  // Discovered extra severities (if any beyond standard critical/warning/info)
  const extraSeverities = useMemo(() => {
    const targetPool = archiveFilter === 'archived' ? archivedAlerts : activeAlerts;
    return Array.from(
      new Set(
        targetPool
          .map(a => a.severity?.toLowerCase())
          .filter(s => s && !['critical', 'warning', 'info'].includes(s))
      )
    );
  }, [archiveFilter, activeAlerts, archivedAlerts]);

  // Aggregate severity counts for filter tabs
  const severityCounts = useMemo(() => {
    const targetPool = archiveFilter === 'archived' ? archivedAlerts : activeAlerts;
    const counts = {
      all: targetPool.length,
      critical: targetPool.filter(a => (a.severity || '').toLowerCase() === 'critical').length,
      warning: targetPool.filter(a => (a.severity || '').toLowerCase() === 'warning').length,
      info: targetPool.filter(a => (a.severity || '').toLowerCase() === 'info').length,
    };
    extraSeverities.forEach(sev => {
      counts[sev] = targetPool.filter(a => (a.severity || '').toLowerCase() === sev).length;
    });
    return counts;
  }, [archiveFilter, activeAlerts, archivedAlerts, extraSeverities]);

  // Filtered alerts based on archive status, severity, scope, and search keyword
  const filteredAlerts = useMemo(() => {
    const targetPool = archiveFilter === 'archived' ? archivedAlerts : activeAlerts;
    return targetPool.filter(alert => {
      const alertSeverity = (alert.severity || 'info').toLowerCase();
      if (selectedSeverity !== 'all' && alertSeverity !== selectedSeverity) {
        return false;
      }
      if (selectedScope === 'city' && alert.scope !== 'all') {
        return false;
      }
      if (selectedScope === 'barangay' && alert.scope !== 'barangay') {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (alert.title || '').toLowerCase().includes(q);
        const msgMatch = (alert.message || '').toLowerCase().includes(q);
        const brgyMatch = (alert.barangay || '').toLowerCase().includes(q);
        const creatorMatch = (alert.creator?.name || '').toLowerCase().includes(q);
        if (!titleMatch && !msgMatch && !brgyMatch && !creatorMatch) {
          return false;
        }
      }
      return true;
    });
  }, [archiveFilter, activeAlerts, archivedAlerts, selectedSeverity, selectedScope, searchQuery]);

  const getSeverityBadge = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <ShieldAlert size={12} className="animate-pulse" /> Critical
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle size={12} /> Warning
          </span>
        );
      case 'info':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Info size={12} /> Info
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 capitalize">
            <Megaphone size={12} /> {level || 'Notice'}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 p-6">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setArchiveFilter('active')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              archiveFilter === 'active'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Megaphone size={14} />
            <span>Active Warnings</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
              {activeAlerts.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setArchiveFilter('archived')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              archiveFilter === 'archived'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Archive size={14} />
            <span>Archived Warnings</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
              {archivedAlerts.length}
            </span>
          </button>
        </div>

        <button
          onClick={openModal}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-red-500/20 transition transform hover:-translate-y-0.5 cursor-pointer"
        >
          <PlusCircle size={15} /> Broadcast New Warning
        </button>
      </div>

      {/* Filter Toolbar Section */}
      <div className="mb-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3 shadow-sm shrink-0 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Severity Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter size={13} /> Severity:
          </span>

          {/* All Severities */}
          <button
            type="button"
            onClick={() => setSelectedSeverity('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedSeverity === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>All</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
              selectedSeverity === 'all'
                ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {severityCounts.all}
            </span>
          </button>

          {/* Critical Severity Filter */}
          <button
            type="button"
            onClick={() => setSelectedSeverity('critical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
              selectedSeverity === 'critical'
                ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-500/20'
                : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/50'
            }`}
          >
            <ShieldAlert size={13} className={selectedSeverity === 'critical' ? 'animate-pulse' : ''} />
            <span>Critical</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
              selectedSeverity === 'critical'
                ? 'bg-white/25 text-white'
                : 'bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-300'
            }`}>
              {severityCounts.critical}
            </span>
          </button>

          {/* Warning Severity Filter */}
          <button
            type="button"
            onClick={() => setSelectedSeverity('warning')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
              selectedSeverity === 'warning'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/20'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-950/50'
            }`}
          >
            <AlertTriangle size={13} />
            <span>Warning</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
              selectedSeverity === 'warning'
                ? 'bg-white/25 text-white'
                : 'bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
            }`}>
              {severityCounts.warning}
            </span>
          </button>

          {/* Info Severity Filter */}
          <button
            type="button"
            onClick={() => setSelectedSeverity('info')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
              selectedSeverity === 'info'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-950/50'
            }`}
          >
            <Info size={13} />
            <span>Info</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
              selectedSeverity === 'info'
                ? 'bg-white/25 text-white'
                : 'bg-blue-200 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300'
            }`}>
              {severityCounts.info}
            </span>
          </button>

          {/* Dynamic Extra Severities (if any) */}
          {extraSeverities.map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => setSelectedSeverity(sev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer capitalize border ${
                selectedSeverity === sev
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-500/20'
                  : 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/40 hover:bg-purple-100'
              }`}
            >
              <Megaphone size={13} />
              <span>{sev}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                selectedSeverity === sev ? 'bg-white/25 text-white' : 'bg-purple-200 text-purple-800'
              }`}>
                {severityCounts[sev]}
              </span>
            </button>
          ))}
        </div>

        {/* Scope and Search controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Scope Selector */}
          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            aria-label="Filter warnings by scope"
          >
            <option value="all">All Scopes</option>
            <option value="city">City-wide Only</option>
            <option value="barangay">Barangay Specific</option>
          </select>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-52">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search warnings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg pl-8 pr-7 py-1.5 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Reset button if filter is active */}
          {(selectedSeverity !== 'all' || selectedScope !== 'all' || searchQuery.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSelectedSeverity('all');
                setSelectedScope('all');
                setSearchQuery('');
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Alert Feed */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
            Warning Logs &amp; Active Broadcasts
            {selectedSeverity !== 'all' || selectedScope !== 'all' || searchQuery.trim() ? (
              <span className="ml-2 text-blue-600 dark:text-blue-400 font-semibold normal-case">
                (Showing {filteredAlerts.length} of {alerts.length})
              </span>
            ) : (
              <span className="ml-2 font-semibold">({alerts.length})</span>
            )}
          </h3>
        </div>

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
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
            <Filter size={40} className="text-gray-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-bold text-gray-600 dark:text-slate-300">No warnings match the selected filter.</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm">
              No warnings found with severity <span className="font-semibold capitalize text-gray-700 dark:text-slate-200">{selectedSeverity}</span>
              {selectedScope !== 'all' ? ` in ${selectedScope === 'city' ? 'City-wide' : 'Barangay'} scope` : ''}
              {searchQuery ? ` matching "${searchQuery}"` : ''}.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedSeverity('all');
                setSelectedScope('all');
                setSearchQuery('');
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <RotateCcw size={13} /> Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAlerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                  (alert.severity || '').toLowerCase() === 'critical' 
                    ? 'bg-red-50/20 dark:bg-red-950/10 border-red-200 dark:border-red-900/30' 
                    : (alert.severity || '').toLowerCase() === 'warning' 
                    ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30'
                    : (alert.severity || '').toLowerCase() === 'info'
                    ? 'bg-blue-50/20 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/30'
                    : 'bg-slate-50/70 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800'
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
                    <div className="flex items-center gap-1">
                      {archiveFilter === 'archived' || alert.archived_at ? (
                        <button
                          onClick={() => handleUnarchive(alert.id)}
                          className="text-gray-400 hover:text-amber-500 p-1.5 hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                          title="Restore / Unarchive Warning"
                          aria-label="Restore Warning"
                        >
                          <ArchiveRestore size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchive(alert.id)}
                          className="text-gray-400 hover:text-amber-500 p-1.5 hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                          title="Archive Warning"
                          aria-label="Archive Warning"
                        >
                          <Archive size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingAlertId(alert.id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                        title="Revoke / Delete Alert"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-extrabold text-sm text-gray-800 dark:text-slate-100 mt-2.5 leading-snug">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-slate-300 mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {alert.message}
                  </p>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800/60 mt-4 pt-3 flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
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
      <BroadcastAlertModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAlerts}
        commonBarangays={COMMON_BARANGAYS}
      />

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
