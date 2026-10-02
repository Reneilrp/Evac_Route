import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  ShieldAlert, Search, Filter, Calendar, Clock, 
  User, RefreshCw, FileSpreadsheet, ChevronDown, ChevronRight, Activity, Terminal
} from 'lucide-react';

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [actionCategory, setActionCategory] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState(null);

  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, search, actionCategory, fromDate, toDate],
    queryFn: () => {
      const params = { page, per_page: 25 };
      if (search) params.search = search;
      if (actionCategory !== 'all') params.action = actionCategory;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      return api.get('/audit-logs', { params }).then(res => res.data.data);
    },
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="text-purple-600 dark:text-purple-400" />
              Security &amp; Operational Audit Trail
            </h2>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              Admin Exclusive
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Immutable tracking of operator credentials, fleet missions, relief stock alterations, and disaster configuration updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition shadow-xs cursor-pointer"
            title="Refresh Logs"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!logs.length}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-xs transition flex items-center gap-2 text-xs disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet size={16} /> Export Audit Log (CSV)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-gray-100 dark:border-slate-800 mb-6 space-y-3">
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-100 dark:border-slate-800 overflow-hidden">
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
                <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                  <th className="py-3.5 px-6 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-6 font-semibold">Acting Operator</th>
                  <th className="py-3.5 px-6 font-semibold">Action Performed</th>
                  <th className="py-3.5 px-6 font-semibold">Origin IP</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Payload Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const isExpanded = expandedLogId === log.id;
                  const hasDetails = log.new_values || log.old_values;

                  return (
                    <tr key={log.id} className="hover:bg-purple-50/20 dark:hover:bg-slate-800/20 transition">
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
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                      <td className="py-3.5 px-6 text-right">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Expandable Details Modal / Sub-row */}
        {expandedLogId && (() => {
          const log = logs.find(l => l.id === expandedLogId);
          if (!log) return null;
          return (
            <div className="p-4 bg-slate-900 text-slate-100 border-t border-gray-200 dark:border-slate-800 font-mono text-xs">
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
                    <pre className="p-3 bg-slate-950 rounded-lg overflow-x-auto text-[11px] text-rose-200 border border-rose-950">
                      {JSON.stringify(log.old_values, null, 2)}
                    </pre>
                  </div>
                )}
                {log.new_values && (
                  <div>
                    <span className="text-emerald-400 font-bold block mb-1">New State / Recorded Values:</span>
                    <pre className="p-3 bg-slate-950 rounded-lg overflow-x-auto text-[11px] text-emerald-200 border border-emerald-950">
                      {JSON.stringify(log.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
          <span>Showing page {page} of {lastPage} ({total} total audit records)</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-md font-bold disabled:opacity-50 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-md font-bold disabled:opacity-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
