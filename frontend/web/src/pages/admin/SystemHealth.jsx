import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { 
  Activity, Database, Radio, Server, HardDrive, RefreshCw, 
  Trash2, Download, CheckCircle2, AlertCircle, Clock, ShieldCheck,
  Smartphone, Globe, Wifi, Layers, MapPin, Key, Copy, Plus, Power, Check, X
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';

export default function SystemHealth() {
  const [isFlushingCache, setIsFlushingCache] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDays, setNewKeyDays] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [createdKeyData, setCreatedKeyData] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showLogs, setShowLogs] = useState(false);

  const { data: healthData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await api.get('/system-health');
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const handleClearCache = async () => {
    if (!window.confirm("Are you sure you want to flush application and configuration caches?")) return;
    setIsFlushingCache(true);
    try {
      const res = await api.post('/system-health/clear-cache');
      showSuccess(res.data.message || "System caches flushed successfully.");
      refetch();
    } catch {
      showError("Failed to flush system caches.");
    } finally {
      setIsFlushingCache(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await api.post('/settings/backup', {}, { responseType: 'blob' });
      const filename = `evac_route_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      const blob = new Blob([res.data], { type: 'application/sql' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess(`Backup downloaded: ${filename}`);
    } catch {
      showError("Failed to export database snapshot.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const { data: apiKeysData, refetch: refetchApiKeys } = useQuery({
    queryKey: ['admin-api-keys'],
    queryFn: async () => {
      const res = await api.get('/admin/api-keys');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const { data: requestLogsData, refetch: refetchLogs } = useQuery({
    queryKey: ['admin-api-key-logs'],
    queryFn: async () => {
      const res = await api.get('/admin/api-keys/logs?limit=25');
      return res.data;
    },
    enabled: showLogs,
    refetchInterval: showLogs ? 5000 : false,
  });

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

  const handleToggleKey = async (id) => {
    try {
      const res = await api.patch(`/admin/api-keys/${id}/toggle`);
      showSuccess(res.data.message || "Key status updated.");
      refetchApiKeys();
    } catch {
      showError("Failed to toggle API key status.");
    }
  };

  const handleDeleteKey = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete API key for '${name}'? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/api-keys/${id}`);
      showSuccess("API key deleted.");
      refetchApiKeys();
    } catch {
      showError("Failed to delete API key.");
    }
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showSuccess("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const db = healthData?.database || {};
  const ws = healthData?.websocket || {};
  const server = healthData?.server || {};
  const records = db.records || {};
  const mobile = healthData?.web_and_mobile?.mobile_client || {};
  const web = healthData?.web_and_mobile?.web_client || {};

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center gap-3 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Activity className="text-sky-600 dark:text-sky-400" size={24} />
            DevOps &amp; Infrastructure Health
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time server telemetry, database performance, WebSocket broker, and client condition monitors.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              refetch();
              showSuccess("Diagnostics refreshed.");
            }}
            disabled={isRefetching || isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg border border-gray-200 dark:border-slate-700 font-semibold text-sm transition"
          >
            <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
            Run Ping
          </button>

          <button
            onClick={handleClearCache}
            disabled={isFlushingCache}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg font-bold text-sm transition"
          >
            <Trash2 size={16} className={isFlushingCache ? 'animate-spin' : ''} />
            Flush Cache
          </button>

          <button
            onClick={handleDownloadBackup}
            disabled={isBackingUp}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm shadow-md shadow-purple-600/20 transition"
          >
            <Download size={16} className={isBackingUp ? 'animate-bounce' : ''} />
            Export SQL Backup
          </button>
        </div>
      </div>

      {/* Grid: 3 Core Backend Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Database Health */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={20} className="text-emerald-500 dark:text-emerald-400" />
              <h2 className="font-bold text-gray-900 dark:text-white text-base">Database Engine</h2>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 ${
              db.status === 'operational' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              {db.status === 'operational' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {db.status || 'Checking...'}
            </span>
          </div>

          <div className="space-y-2 text-sm pt-2">
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Database Driver:</span>
              <span className="font-bold text-gray-800 dark:text-white uppercase">{db.driver || 'MySQL'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Query Ping Latency:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{db.latency_ms ?? 0} ms</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500 dark:text-slate-400">Security / Encryption:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <ShieldCheck size={14} /> TLS Encrypted
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Reverb WebSocket Telemetry */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={20} className="text-blue-500 dark:text-blue-400" />
              <h2 className="font-bold text-gray-900 dark:text-white text-base">WebSocket Broadcast</h2>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 ${
              ws.status === 'operational' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}>
              {ws.status === 'operational' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
              {ws.status || 'Checking...'}
            </span>
          </div>

          <div className="space-y-2 text-sm pt-2">
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Broadcast Protocol:</span>
              <span className="font-bold text-gray-800 dark:text-white uppercase">{ws.driver || 'Laravel Reverb'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">WebSocket Port:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{ws.port || 8080}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500 dark:text-slate-400">Target Host:</span>
              <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{ws.host || '127.0.0.1'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Server & Memory Runtime */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={20} className="text-purple-500 dark:text-purple-400" />
              <h2 className="font-bold text-gray-900 dark:text-white text-base">Server Runtime</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {server.environment || 'Production'}
            </span>
          </div>

          <div className="space-y-2 text-sm pt-2">
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">PHP Version:</span>
              <span className="font-bold text-gray-800 dark:text-white">PHP {server.php_version}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Laravel Core:</span>
              <span className="font-bold text-gray-800 dark:text-white">v{server.laravel_version}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500 dark:text-slate-400">Memory Usage:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{server.memory_usage_mb || 0} MB / {server.memory_peak_mb || 0} MB peak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Web & Mobile Client Condition & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mobile Client Condition */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={20} className="text-sky-500 dark:text-sky-400" />
              <h2 className="font-bold text-gray-900 dark:text-white text-base">Mobile App Telemetry &amp; Status</h2>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 ${
              mobile.apk_download_ready 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}>
              {mobile.apk_download_ready ? <CheckCircle2 size={12} /> : <Clock size={12} />}
              {mobile.apk_download_ready ? 'APK Ready' : 'APK Standby'}
            </span>
          </div>

          <div className="space-y-2 text-sm pt-2">
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Application Name:</span>
              <span className="font-bold text-gray-800 dark:text-white">
                {mobile.app_name || 'Evac_RouteMobile'} {mobile.version ? `(v${mobile.version} • Build ${mobile.version_code || 13})` : ''}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Application Package:</span>
              <span className="font-mono text-xs text-sky-600 dark:text-sky-400">{mobile.package || 'com.pheinz.evacroutemobile'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Target Framework &amp; SDK:</span>
              <span className="font-medium text-gray-800 dark:text-slate-200">{mobile.target_sdk || 'Android 14/15 (Expo SDK 56 / API 34-35)'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Offline Disaster Queue:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{mobile.offline_queue_support || 'Enabled (AsyncStorage + NetInfo auto-sync)'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">APK Distribution Binary:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {mobile.apk_download_ready ? `${mobile.apk_size_mb || 151} MB (Direct Download Available)` : '151 MB (Preview Build)'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500 dark:text-slate-400">Operational GPS Geofence:</span>
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{mobile.gps_geofence || 'Zamboanga City'}</span>
            </div>
          </div>
        </div>

        {/* Web Console Condition */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={20} className="text-emerald-500 dark:text-emerald-400" />
              <h2 className="font-bold text-gray-900 dark:text-white text-base">Web Console &amp; EOC Radar</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 size={12} />
              Production Active
            </span>
          </div>

          <div className="space-y-2 text-sm pt-2">
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Web Application:</span>
              <span className="font-bold text-gray-800 dark:text-white">{web.app_name || 'Evac_RouteWeb (EOC Tactical Console)'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Frontend Bundler &amp; Engine:</span>
              <span className="font-medium text-gray-800 dark:text-slate-200">{web.bundler || 'Vite Production Build'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Map &amp; Routing Engine:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{web.map_engine || 'Mapbox GL JS + 3D Extrusions'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">USGS Seismic Radar:</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">{web.seismic_radar || 'USGS Live Stream (60s Cache TTL, 350km Radius)'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500 dark:text-slate-400">Live Mission Gateway:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{web.websocket_gateway || 'Connected (Laravel Reverb)'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Record Volume Metrics Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={20} className="text-blue-500 dark:text-blue-400" />
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">System Database Volume &amp; Entity Records</h2>
          </div>
          <span className="text-xs text-gray-500 dark:text-slate-400">Live row counts across operational schemas</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="bg-gray-50 dark:bg-slate-950/60 p-3 rounded-lg border border-gray-200 dark:border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block">User Accounts</span>
            <span className="text-xl font-black text-gray-900 dark:text-white mt-1 block">{records.users ?? 0}</span>
          </div>
          <div className="bg-gray-50 dark:bg-slate-950/60 p-3 rounded-lg border border-gray-200 dark:border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block">Shelters (CCCM)</span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{records.shelters ?? 0}</span>
          </div>
          <div className="bg-gray-50 dark:bg-slate-950/60 p-3 rounded-lg border border-gray-200 dark:border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block">Rescue Units</span>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 block">{records.rescue_units ?? 0}</span>
          </div>
          <div className="bg-gray-50 dark:bg-slate-950/60 p-3 rounded-lg border border-gray-200 dark:border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block">Rescue Missions</span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">{records.rescue_missions ?? 0}</span>
          </div>
          <div className="bg-gray-50 dark:bg-slate-950/60 p-3 rounded-lg border border-gray-200 dark:border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block">Inventory SKUs</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{records.inventory_items ?? 0}</span>
          </div>
          <div className="bg-gray-50 dark:bg-slate-950/60 p-3 rounded-lg border border-gray-200 dark:border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block">Audit Log Entries</span>
            <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 block">{records.audit_logs ?? 0}</span>
          </div>
        </div>
      </div>

      {/* 5. Partner API Keys & Traffic Monitoring */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Key size={20} className="text-amber-500 dark:text-amber-400" />
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">Partner Shelters API Keys &amp; Telemetry</h2>
            </div>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Authorized access keys, live request counters, and partner activity logs
            </span>
          </div>

          <button
            onClick={() => {
              setCreatedKeyData(null);
              setShowKeyModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all rounded-lg shadow-sm"
          >
            <Plus size={15} />
            Generate New Key
          </button>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3 rounded-lg text-center">
            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">Total Issued Keys</span>
            <span className="text-xl font-black text-amber-900 dark:text-amber-200 mt-1 block">
              {apiKeysData?.summary?.total_keys ?? 0}
            </span>
          </div>
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-3 rounded-lg text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Active &amp; Authorized</span>
            <span className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-1 block">
              {apiKeysData?.summary?.active_keys ?? 0}
            </span>
          </div>
          <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 p-3 rounded-lg text-center">
            <span className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-400 block">Total Shelters API Requests</span>
            <span className="text-xl font-black text-sky-900 dark:text-sky-200 mt-1 block">
              {apiKeysData?.summary?.total_requests?.toLocaleString() ?? 0}
            </span>
          </div>
        </div>

        {/* API Keys Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-slate-950/70 text-gray-500 dark:text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Partner / Organization</th>
                <th className="p-3">API Key Preview</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Requests Served</th>
                <th className="p-3">Last Used &amp; IP</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 font-medium">
              {(!apiKeysData?.data || apiKeysData.data.length === 0) ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400 dark:text-slate-500 italic">
                    No partner API keys generated yet. Click "Generate New Key" to authorize an external project.
                  </td>
                </tr>
              ) : (
                apiKeysData.data.map((k) => (
                  <tr key={k.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-gray-900 dark:text-white">{k.name}</div>
                      <div className="text-[10px] text-gray-400 dark:text-slate-500">
                        Created {new Date(k.created_at).toLocaleDateString()}
                        {k.expires_at && ` • Expires ${new Date(k.expires_at).toLocaleDateString()}`}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] bg-gray-100 dark:bg-slate-950/80 px-2 py-1 rounded border border-gray-200 dark:border-slate-800 w-fit">
                        <span className="text-gray-700 dark:text-slate-300">{k.masked_key}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(k.key, k.id)}
                          title="Copy Full Key"
                          className="text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors ml-1"
                        >
                          {copiedId === k.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          k.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${k.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {k.status_label || (k.is_active ? 'active' : 'revoked')}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold font-mono text-gray-900 dark:text-white">
                      <span className="bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-2.5 py-0.5 rounded-md text-[11px]">
                        {k.requests_count?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-gray-800 dark:text-slate-200">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : <span className="text-gray-400 dark:text-slate-500 italic">Never</span>}
                      </div>
                      {k.last_ip && (
                        <div className="text-[10px] font-mono text-gray-400 dark:text-slate-500">
                          IP: {k.last_ip}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleKey(k.id)}
                          title={k.is_active ? "Revoke (Deactivate)" : "Reactivate"}
                          className={`p-1.5 rounded border transition-colors ${
                            k.is_active
                              ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                          }`}
                        >
                          <Power size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(k.id, k.name)}
                          title="Delete Key Permanently"
                          className="p-1.5 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-gray-200 dark:border-slate-800 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Live Request Stream Viewer Toggle */}
        <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1.5 transition-colors"
            >
              <Activity size={14} className={showLogs ? "animate-pulse" : ""} />
              {showLogs ? "Hide Live Partner Access Logs" : "Show Recent Partner API Request Stream (Live)"}
            </button>
            {showLogs && (
              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                Auto-refreshing every 5s • Last {requestLogsData?.count ?? 0} hits
              </span>
            )}
          </div>

          {showLogs && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/40">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-gray-400 uppercase text-[9px] tracking-wider border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2">Time</th>
                    <th className="p-2">Partner Name</th>
                    <th className="p-2">Method &amp; Endpoint</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 text-center">Latency</th>
                    <th className="p-2">Caller IP</th>
                    <th className="p-2">Client User-Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                  {(!requestLogsData?.data || requestLogsData.data.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-400 dark:text-slate-500 italic">
                        No requests logged yet. Calls using an API key will appear here in real time.
                      </td>
                    </tr>
                  ) : (
                    requestLogsData.data.map((l) => (
                      <tr key={l.id} className="hover:bg-amber-50/30 dark:hover:bg-slate-900/60 transition-colors">
                        <td className="p-2 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(l.created_at).toLocaleTimeString()}
                        </td>
                        <td className="p-2 font-bold text-gray-900 dark:text-white">
                          {l.key_name || 'Unregistered'}
                        </td>
                        <td className="p-2 text-gray-800 dark:text-slate-200">
                          <span className="text-amber-600 dark:text-amber-400 font-bold mr-1">{l.method}</span>
                          {l.endpoint}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              l.status_code >= 200 && l.status_code < 300
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {l.status_code}
                          </span>
                        </td>
                        <td className="p-2 text-center text-gray-500 dark:text-slate-400">
                          {l.duration_ms ? `${l.duration_ms}ms` : '—'}
                        </td>
                        <td className="p-2 text-gray-600 dark:text-slate-300 whitespace-nowrap">
                          {l.ip_address}
                        </td>
                        <td className="p-2 text-gray-400 dark:text-slate-500 max-w-[200px] truncate" title={l.user_agent}>
                          {l.user_agent}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Generate API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-amber-500" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Generate Partner API Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {createdKeyData ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-lg">
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 size={16} /> Key Generated Successfully!
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mb-3">
                    Copy this key now and send it to <strong>{createdKeyData.name}</strong>.
                  </p>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-2 rounded border border-emerald-300 dark:border-emerald-700 font-mono text-xs break-all">
                    <span className="text-gray-900 dark:text-white select-all">{createdKeyData.key}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(createdKeyData.key, 'modal-key')}
                      className="ml-auto p-1 text-emerald-600 hover:text-emerald-700 flex-shrink-0"
                    >
                      {copiedId === 'modal-key' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-950 p-3 rounded border border-gray-200 dark:border-slate-800">
                  <strong>Partner Integration Instruction:</strong>
                  <pre className="mt-1 font-mono text-[10px] text-amber-600 dark:text-amber-400">
                    X-API-KEY: {createdKeyData.key}
                  </pre>
                </div>

                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="w-full py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Partner / Project Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ateneo DRRM Capstone, WMSU Research"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Validity Duration (Days) <span className="text-gray-400 font-normal">(Optional, leave empty for permanent)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 90 (days)"
                    value={newKeyDays}
                    onChange={(e) => setNewKeyDays(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingKey}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg transition-all shadow-sm"
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
