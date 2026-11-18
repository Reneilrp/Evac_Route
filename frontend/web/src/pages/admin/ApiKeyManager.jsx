import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { 
  Key, Plus, Power, Trash2, Copy, Check, ShieldCheck, 
  Activity, Clock, Globe, RefreshCw, X, AlertCircle, CheckCircle2,
  Terminal, Search, Filter
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';

export default function ApiKeyManager() {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDays, setNewKeyDays] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [createdKeyData, setCreatedKeyData] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [activeTab, setActiveTab] = useState('keys'); // 'keys' or 'logs'
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch API Keys and summary metrics
  const { 
    data: apiKeysData, 
    isLoading: isLoadingKeys, 
    isRefetching: isRefetchingKeys,
    refetch: refetchApiKeys 
  } = useQuery({
    queryKey: ['admin-api-keys'],
    queryFn: async () => {
      const res = await api.get('/admin/api-keys');
      return res.data;
    },
    refetchInterval: 10000,
  });

  // 2. Fetch live request logs
  const { 
    data: logsData, 
    isLoading: isLoadingLogs, 
    isRefetching: isRefetchingLogs,
    refetch: refetchLogs 
  } = useQuery({
    queryKey: ['admin-api-key-logs'],
    queryFn: async () => {
      const res = await api.get('/admin/api-keys/logs?limit=50');
      return res.data;
    },
    refetchInterval: 5000,
  });

  // Action: Generate new key
  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      showError("Please enter a partner or project name.");
      return;
    }
    setIsGeneratingKey(true);
    try {
      const payload = { name: newKeyName.trim() };
      if (newKeyDays) payload.days = parseInt(newKeyDays, 10);
      const res = await api.post('/admin/api-keys', payload);
      setCreatedKeyData(res.data.data);
      showSuccess("New API key generated successfully.");
      refetchApiKeys();
      setNewKeyName('');
      setNewKeyDays('');
    } catch {
      showError("Failed to generate API key.");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  // Action: Toggle active/revoked
  const handleToggleKey = async (id) => {
    try {
      const res = await api.patch(`/admin/api-keys/${id}/toggle`);
      showSuccess(res.data.message || "Key status updated.");
      refetchApiKeys();
    } catch {
      showError("Failed to toggle API key status.");
    }
  };

  // Action: Delete key permanently
  const handleDeleteKey = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete API key for '${name}'? This partner will immediately lose access.`)) return;
    try {
      await api.delete(`/admin/api-keys/${id}`);
      showSuccess("API key deleted.");
      refetchApiKeys();
    } catch {
      showError("Failed to delete API key.");
    }
  };

  // Helper: Copy key to clipboard
  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showSuccess("API Key copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const keys = apiKeysData?.data || [];
  const summary = apiKeysData?.summary || { total_keys: 0, active_keys: 0, total_requests: 0 };
  const logs = logsData?.data || [];

  const filteredKeys = keys.filter(k => 
    k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
              <Key size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Partner Shelters API Keys
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Issue API keys to external teams, enforce authentication, and monitor live telemetry
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { refetchApiKeys(); refetchLogs(); }}
            title="Refresh Data"
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"
          >
            <RefreshCw size={16} className={isRefetchingKeys || isRefetchingLogs ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={() => {
              setCreatedKeyData(null);
              setShowKeyModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition rounded-lg shadow-sm"
          >
            <Plus size={16} />
            Generate New API Key
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
            <Key size={22} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Issued Keys</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {summary.total_keys}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active &amp; Authorized</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary.active_keys}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-lg">
            <Activity size={22} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Requests Served</span>
            <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-0.5">
              {summary.total_requests.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex bg-slate-200 dark:bg-slate-900 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('keys')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition ${
              activeTab === 'keys'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Key size={14} />
            Issued Keys ({keys.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity size={14} className={activeTab === 'logs' ? "text-emerald-500 animate-pulse" : ""} />
            Live Access Logs ({logs.length})
          </button>
        </div>

        {activeTab === 'keys' && (
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search keys by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* TAB 1: ISSUED API KEYS TABLE */}
      {activeTab === 'keys' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Partner / Project Name</th>
                  <th className="p-3.5">API Key Preview</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Requests Served</th>
                  <th className="p-3.5">Last Used &amp; IP</th>
                  <th className="p-3.5">Expires</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {isLoadingKeys ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Loading API keys...
                    </td>
                  </tr>
                ) : filteredKeys.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      {searchTerm ? "No API keys match your search term." : "No API keys generated yet. Click 'Generate New API Key' above to grant access."}
                    </td>
                  </tr>
                ) : (
                  filteredKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{k.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          ID: #{k.id} • Issued {new Date(k.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-xs bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
                          <span className="text-slate-800 dark:text-slate-200 select-all">{k.masked_key}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(k.key, k.id)}
                            title="Copy Full Key"
                            className="p-1 hover:text-blue-600 dark:hover:text-blue-400 text-slate-400 transition"
                          >
                            {copiedId === k.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            k.is_active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${k.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          {k.status_label || (k.is_active ? 'active' : 'revoked')}
                        </span>
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold">
                        <span className="bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 px-2.5 py-0.5 rounded-md text-xs">
                          {k.requests_count?.toLocaleString() || 0}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="text-slate-800 dark:text-slate-200">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : <span className="text-slate-400 italic">Never</span>}
                        </div>
                        {k.last_ip && (
                          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            IP: {k.last_ip}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : <span className="text-slate-400">Never</span>}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleKey(k.id)}
                            title={k.is_active ? "Revoke (Deactivate)" : "Reactivate"}
                            className={`p-2 rounded-lg border transition ${
                              k.is_active
                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                            }`}
                          >
                            <Power size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteKey(k.id, k.name)}
                            title="Delete Key Permanently"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE ACCESS LOGS TABLE */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Activity size={16} className="text-emerald-500 animate-pulse" />
                Live Partner API Request Stream
              </h3>
              <p className="text-xs text-slate-500">Auto-refreshes every 5 seconds as external partners query shelters</p>
            </div>
            <button
              type="button"
              onClick={() => refetchLogs()}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw size={12} className={isRefetchingLogs ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Partner Key Name</th>
                  <th className="p-3">Method &amp; Endpoint</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Latency</th>
                  <th className="p-3">Caller IP</th>
                  <th className="p-3">Client User-Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                      Loading access logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-sans italic">
                      No API requests logged yet. As external applications use their API keys, requests will appear here in real-time.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleTimeString()}
                      </td>

                      <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">
                        {l.key_name || 'Unregistered'}
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-blue-600 dark:text-blue-400 mr-1.5">{l.method}</span>
                        <span className="text-slate-700 dark:text-slate-300">{l.endpoint}</span>
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.status_code >= 200 && l.status_code < 300
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {l.status_code}
                        </span>
                      </td>

                      <td className="p-3 text-center text-slate-500">
                        {l.duration_ms ? `${l.duration_ms}ms` : '—'}
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {l.ip_address}
                      </td>

                      <td className="p-3 text-slate-400 max-w-[200px] truncate" title={l.user_agent}>
                        {l.user_agent}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GENERATE API KEY MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                  <Key size={18} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Generate Partner API Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {createdKeyData ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-xl">
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 size={16} /> Key Generated Successfully!
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3 font-medium">
                    Copy this key now and send it to <strong>{createdKeyData.name}</strong>.
                  </p>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700 font-mono text-xs break-all">
                    <span className="text-slate-900 dark:text-white select-all">{createdKeyData.key}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(createdKeyData.key, 'modal-key')}
                      className="ml-auto p-1.5 text-emerald-600 hover:text-emerald-700 flex-shrink-0"
                    >
                      {copiedId === 'modal-key' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                  <strong>Partner Integration Instruction:</strong>
                  <pre className="mt-1 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                    X-API-KEY: {createdKeyData.key}
                  </pre>
                </div>

                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="w-full py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Partner / Project Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ateneo DRRM Capstone, WMSU Research"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Validity Duration (Days) <span className="text-slate-400 font-normal">(Optional, leave blank for no expiration)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 90"
                    value={newKeyDays}
                    onChange={(e) => setNewKeyDays(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingKey}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition shadow-sm"
                  >
                    {isGeneratingKey ? "Generating..." : "Generate Key"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
