import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Activity, Database, Radio, Server, HardDrive, RefreshCw, 
  Trash2, Download, CheckCircle2, AlertCircle, Clock, ShieldCheck
} from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';

export default function SystemHealth() {
  const [isFlushingCache, setIsFlushingCache] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

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
    } catch (err) {
      showError("Failed to flush system caches.");
    } finally {
      setIsFlushingCache(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await api.post('/settings/backup');
      const blob = new Blob([res.data.data.sql_dump], { type: 'application/sql' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.data.data.filename || `evac_route_backup_${new Date().toISOString().slice(0,10)}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess(`Backup downloaded: ${res.data.data.filename}`);
    } catch (err) {
      showError("Failed to export database snapshot.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const db = healthData?.database || {};
  const ws = healthData?.websocket || {};
  const server = healthData?.server || {};
  const records = db.records || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Activity size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">
              System Health &amp; Infrastructure Telemetry
            </h1>
            <p className="text-sm text-gray-400">
              Real-time monitoring of database query latency, WebSockets, and server runtime
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetch();
              showSuccess("Diagnostics refreshed.");
            }}
            disabled={isRefetching || isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg border border-gray-600 font-semibold text-sm transition"
          >
            <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
            Run Ping
          </button>

          <button
            onClick={handleClearCache}
            disabled={isFlushingCache}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg font-bold text-sm transition"
          >
            <Trash2 size={16} className={isFlushingCache ? 'animate-spin' : ''} />
            Flush Cache
          </button>

          <button
            onClick={handleDownloadBackup}
            disabled={isBackingUp}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm shadow-lg shadow-purple-600/30 transition"
          >
            <Download size={16} className={isBackingUp ? 'animate-bounce' : ''} />
            Export SQL Backup
          </button>
        </div>
      </div>

      {/* Grid: 3 Core Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Database Health */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={20} className="text-emerald-400" />
              <h2 className="font-bold text-white text-base">Database Engine</h2>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 ${
              db.status === 'operational' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
            }`}>
              {db.status === 'operational' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {db.status || 'Checking...'}
            </span>
          </div>

          <div className="space-y-2 text-sm pt-2">
            <div className="flex justify-between py-1.5 border-b border-gray-700/60">
              <span className="text-gray-400">Database Driver:</span>
              <span className="font-bold text-white uppercase">{db.driver || 'MySQL'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-700/60">
              <span className="text-gray-400">Query Ping Latency:</span>
              <span className="font-bold text-emerald-400">{db.latency_ms ?? 0} ms</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400">Security / Encryption:</span>
              <span className="font-bold text-blue-400 flex items-center gap-1">
                <ShieldCheck size={14} /> TLS Encrypted
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Reverb WebSocket Telemetry */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={20} className="text-blue-400" />
              <h2 className="font-bold text-white text-base">WebSocket Broadcast</h2>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 ${
              ws.status === 'operational' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {ws.status === 'operational' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
              {ws.status || 'Checking...'}
            </span>
          </div>

          <div className="space-y-2 text-sm pt-2">
            <div className="flex justify-between py-1.5 border-b border-gray-700/60">
              <span className="text-gray-400">Broadcast Protocol:</span>
              <span className="font-bold text-white uppercase">{ws.driver || 'Laravel Reverb'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-700/60">
              <span className="text-gray-400">WebSocket Port:</span>
              <span className="font-bold text-blue-400">{ws.port || 8080}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400">Target Host:</span>
              <span className="font-mono text-xs text-gray-300">{ws.host || '127.0.0.1'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Server & Memory Runtime */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={20} className="text-purple-400" />
              <h2 className="font-bold text-white text-base">Server Runtime</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
              {server.environment || 'Production'}
            </span>
          </div>

          <div className="space-y-2 text-sm pt-2">
            <div className="flex justify-between py-1.5 border-b border-gray-700/60">
              <span className="text-gray-400">PHP Version:</span>
              <span className="font-bold text-white">PHP {server.php_version}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-700/60">
              <span className="text-gray-400">Laravel Core:</span>
              <span className="font-bold text-white">v{server.laravel_version}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400">Memory Usage:</span>
              <span className="font-bold text-amber-400">{server.memory_usage_mb || 0} MB / {server.memory_peak_mb || 0} MB peak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Record Volume Metrics Table */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={20} className="text-blue-400" />
            <h2 className="font-bold text-white text-lg">System Database Volume &amp; Entity Records</h2>
          </div>
          <span className="text-xs text-gray-400">Live row counts across operational schemas</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">User Accounts</span>
            <span className="text-xl font-black text-white mt-1 block">{records.users ?? 0}</span>
          </div>
          <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Shelters (CCCM)</span>
            <span className="text-xl font-black text-blue-400 mt-1 block">{records.shelters ?? 0}</span>
          </div>
          <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Rescue Units</span>
            <span className="text-xl font-black text-rose-400 mt-1 block">{records.rescue_units ?? 0}</span>
          </div>
          <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Rescue Missions</span>
            <span className="text-xl font-black text-amber-400 mt-1 block">{records.rescue_missions ?? 0}</span>
          </div>
          <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Inventory SKUs</span>
            <span className="text-xl font-black text-emerald-400 mt-1 block">{records.inventory_items ?? 0}</span>
          </div>
          <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700 text-center">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Audit Log Entries</span>
            <span className="text-xl font-black text-purple-400 mt-1 block">{records.audit_logs ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
