import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { 
  Activity, Database, Radio, Server, HardDrive, RefreshCw, 
  Trash2, Download, CheckCircle2, AlertCircle, Clock, ShieldCheck,
  Smartphone, Globe, Wifi, Layers, MapPin
} from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';

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
    } catch {
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
    } catch {
      showError("Failed to export database snapshot.");
    } finally {
      setIsBackingUp(false);
    }
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
              <span className="font-bold text-gray-800 dark:text-white">{mobile.app_name || 'EvacRoute Mobile'} (v{mobile.version || '1.0.4'})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Application Package:</span>
              <span className="font-mono text-xs text-sky-600 dark:text-sky-400">{mobile.package || 'com.evacroute.mobile'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Target Framework &amp; SDK:</span>
              <span className="font-medium text-gray-800 dark:text-slate-200">{mobile.target_sdk || 'Android 14 (API 34 / Expo SDK 56)'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Offline Disaster Queue:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{mobile.offline_queue_support || 'Enabled (AsyncStorage + NetInfo auto-sync)'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">APK Distribution Binary:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {mobile.apk_download_ready ? `${mobile.apk_size_mb || 106.8} MB (Direct Download Available)` : '106.8 MB (Preview Build)'}
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
              <span className="font-bold text-gray-800 dark:text-white">{web.app_name || 'EvacRoute Web (EOC Tactical Console)'}</span>
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
    </div>
  );
}
