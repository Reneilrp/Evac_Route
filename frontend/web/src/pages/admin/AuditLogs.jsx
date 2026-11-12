import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { showSuccess, showError } from '../../utils/toast';
import { 
  ShieldAlert, Search, Clock,
  RefreshCw, FileSpreadsheet, ChevronDown, ChevronRight, Terminal,
  Archive, ArchiveRestore
} from 'lucide-react';

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [actionCategory, setActionCategory] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [archiveFilter, setArchiveFilter] = useState('active');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const queryClient = useQueryClient();

  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, search, actionCategory, fromDate, toDate, archiveFilter],
    queryFn: () => {
      const params = { page, per_page: 25 };
      if (search) params.search = search;
      if (actionCategory !== 'all') params.action = actionCategory;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (archiveFilter === 'archived') params.archived = 'true';
      return api.get('/audit-logs', { params }).then(res => res.data.data);
    },
  });

  const archiveOldMutation = useMutation({
    mutationFn: () => api.post('/audit-logs/archive-old', { days: 90 }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      showSuccess(res.data?.message || 'Audit logs older than 90 days archived successfully.');
      setIsArchiveModalOpen(false);
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to archive old audit logs.');
      setIsArchiveModalOpen(false);
    }
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id) => api.post(`/audit-logs/${id}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      showSuccess('Audit log restored to active trail.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to restore audit log.');
    }
  });

  const logs = auditData?.data || [];
  const total = auditData?.total || 0;
  const lastPage = auditData?.last_page || 1;

  const toggleExpand = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getActionBadge = (action) => {
    if (action.includes('staff') || action.includes('user')) {
      return {
        bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/50',
        label: action.replace('_', ' ').toUpperCase()
      };
    }
    if (action.includes('inventory') || action.includes('dispatch') || action.includes('relief')) {
      return {
        bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
        label: action.replace('_', ' ').toUpperCase()
      };
    }
    if (action.includes('settings') || action.includes('emergency') || action.includes('hazard')) {
      return {
        bg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/50',
        label: action.replace('_', ' ').toUpperCase()
      };
    }
    return {
      bg: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700',
      label: action.replace('_', ' ').toUpperCase()
    };
  };

  const getActionDescription = (log) => {
    const action = log.action || '';
    const newVals = log.new_values || {};
    const oldVals = log.old_values || {};

    if (action.includes('staff_created') || action.includes('user_created')) {
      return `Created user account for ${newVals.name || 'new staff'}${newVals.role ? ` (${newVals.role})` : ''}`;
    }
    if (action.includes('staff_updated') || action.includes('user_updated')) {
      return `Updated account details for ${newVals.name || oldVals.name || 'user'}`;
    }
    if (action.includes('staff_deleted') || action.includes('user_deleted') || action.includes('staff_revoked')) {
      return `Revoked user account access for ${oldVals.name || 'operator'}`;
    }
    if (action.includes('stock_added') || action.includes('inventory_created')) {
      return `Received delivery of ${newVals.item_name || 'supplies'} (${newVals.quantity || ''} ${newVals.unit || ''})`;
    }
    if (action.includes('stock_adjusted') || action.includes('inventory_updated')) {
      return `Adjusted stock for ${newVals.item_name || oldVals.item_name || 'inventory item'}`;
    }
    if (action.includes('dispatch') || action.includes('rescue_mission')) {
      return `Dispatched rescue mission ${newVals.team_name ? `to ${newVals.team_name}` : ''}`;
    }
    if (action.includes('emergency') || action.includes('alert')) {
      return `Broadcasted emergency warning: ${newVals.title || 'Critical Alert'}`;
    }
    if (action.includes('hazard')) {
      return `Reported or updated hazard pin: ${newVals.hazard_type || 'Road Obstruction'}`;
    }
    if (action.includes('shelter')) {
      return `Updated shelter records for ${newVals.name || oldVals.name || 'facility'}`;
    }
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleExportCSV = () => {
    if (!logs.length) return;
    let csv = `ID,Timestamp,User Name,User Email,Action,IP Address,Details\n`;
    logs.forEach(log => {
      const time = log.created_at ? new Date(log.created_at).toLocaleString() : '—';
      const user = log.user?.name || 'System / Automated';
      const email = log.user?.email || 'N/A';
      const action = log.action || 'unknown';
      const ip = log.ip_address || '—';
      const values = JSON.stringify(log.new_values || {}).replace(/"/g, '""');
      csv += `"${log.id}","${time}","${user}","${email}","${action}","${ip}","${values}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EvacRoute_Security_AuditLogs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setArchiveFilter('active'); setPage(1); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              archiveFilter === 'active'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>Active Audit Trail</span>
          </button>
          <button
            type="button"
            onClick={() => { setArchiveFilter('archived'); setPage(1); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              archiveFilter === 'archived'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Archive size={14} />
            <span>Archived Logs</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {archiveFilter === 'active' && (
            <button
              onClick={() => setIsArchiveModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Archive records older than 90 days to cold storage"
            >
              <Archive size={14} /> Archive Logs &gt; 90 Days
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition shadow-xs cursor-pointer"
            title="Refresh Logs"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!logs.length}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3.5 rounded-xl shadow-xs transition flex items-center gap-1.5 text-xs disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet size={15} /> Export Audit Log (CSV)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search by user / keyword */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search user, action, or IP..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Action Category Filter */}
          <div>
            <select
              value={actionCategory}
              onChange={(e) => { setActionCategory(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Action Categories</option>
              <option value="staff">Staff &amp; Credentials (Create/Update)</option>
              <option value="inventory">Relief Inventory &amp; Logistics</option>
              <option value="dispatch">Dispatch Orders &amp; Delivery</option>
              <option value="settings">System Controls &amp; Settings</option>
              <option value="hazard">Disaster Hazards &amp; Simulation</option>
            </select>
          </div>

          {/* Date From */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-400">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-400">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <span className="flex h-6 w-6 relative mr-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-purple-500"></span>
            </span>
            <p className="text-gray-500 dark:text-slate-400 font-medium text-xs">Querying security audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-slate-500 text-xs">
            <ShieldAlert size={36} className="mx-auto mb-3 opacity-40 text-purple-500" />
            <p className="font-bold">No audit trail records matched the criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-6 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-6 font-semibold">Acting Operator</th>
                  <th className="py-3.5 px-6 font-semibold">Action Performed</th>
                  <th className="py-3.5 px-6 font-semibold">Origin IP</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Payload Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const isExpanded = expandedLogId === log.id;
                  const hasDetails = log.new_values || log.old_values;

                  return (
                    <Fragment key={log.id}>
                      <tr className={`hover:bg-purple-50/20 dark:hover:bg-slate-800/20 transition ${isExpanded ? 'bg-purple-50/30 dark:bg-slate-800/30' : ''}`}>
                        <td className="py-3.5 px-6 whitespace-nowrap text-gray-500 dark:text-slate-400 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-slate-300">
                            <Clock size={12} className="text-purple-500" />
                            {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {log.created_at ? new Date(log.created_at).toLocaleDateString() : '—'}
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          {log.user ? (
                            <div>
                              <div className="font-bold text-gray-900 dark:text-slate-100">{log.user.name}</div>
                              <div className="text-[10px] font-mono text-gray-400">{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">System Automation</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase border ${badge.bg}`}>
                              {badge.label}
                            </span>
                            <span className="text-gray-600 dark:text-slate-300 font-medium text-[11px]">
                              {getActionDescription(log)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                          {log.ip_address || '127.0.0.1'}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(archiveFilter === 'archived' || log.archived_at) && (
                              <button
                                onClick={() => unarchiveMutation.mutate(log.id)}
                                disabled={unarchiveMutation.isPending}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                                title="Restore Log to Active Trail"
                              >
                                <ArchiveRestore size={13} />
                                <span>Restore</span>
                              </button>
                            )}
                            {hasDetails ? (
                              <button
                                onClick={() => toggleExpand(log.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            ) : (
                              <span className="text-gray-400 text-[10px] italic">No Payload</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-900 text-slate-100 font-mono text-xs">
                          <td colSpan={5} className="p-4 border-t border-b border-purple-500/30">
                            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-800">
                              <span className="font-bold flex items-center gap-2 text-purple-400">
                                <Terminal size={14} /> Audit Log Event #{log.id} Payload Inspection
                              </span>
                              <button
                                onClick={() => setExpandedLogId(null)}
                                className="text-slate-400 hover:text-white text-xs cursor-pointer"
                              >
                                ✕ Close
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {log.old_values && (
                                <div>
                                  <span className="text-rose-400 font-bold block mb-1">Previous Values (Before Action):</span>
                                  <pre className="p-3 bg-slate-950 rounded-lg overflow-x-auto text-[11px] text-rose-200 border border-rose-950 max-h-60">
                                    {JSON.stringify(log.old_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_values && (
                                <div>
                                  <span className="text-emerald-400 font-bold block mb-1">New State / Recorded Values:</span>
                                  <pre className="p-3 bg-slate-950 rounded-lg overflow-x-auto text-[11px] text-emerald-200 border border-emerald-950 max-h-60">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
          <span>Showing page {page} of {lastPage} ({total} total audit records)</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onConfirm={() => archiveOldMutation.mutate()}
        title="Archive Historical Audit Logs"
        message="Are you sure you want to archive all audit log records older than 90 days? They will be preserved in cold storage and accessible via the Archived Logs tab."
        confirmText="Archive Logs > 90 Days"
        cancelText="Cancel"
        confirmButtonClass="bg-amber-600 hover:bg-amber-700"
      />
    </div>
  );
}
