import { useState, useEffect } from 'react';
import { User, ShieldAlert, MapPin, Volume2, Database, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function AdminSettingsModal({ isOpen, onClose, user, setUser }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [housekeepingLoading, setHousekeepingLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Configuration States
  const [masterEmergencyActive, setMasterEmergencyActive] = useState(true);
  const [activeEmergencyTitle, setActiveEmergencyTitle] = useState('ACTIVE EMERGENCY DISASTER RESPONSE MODE');
  const [activeDisasterType, setActiveDisasterType] = useState('all');
  const [mapCenterLat, setMapCenterLat] = useState(6.9126);
  const [mapCenterLng, setMapCenterLng] = useState(122.0729);
  const [mapZoom, setMapZoom] = useState(13);
  const [capacityWarning, setCapacityWarning] = useState(80);
  const [lowStock, setLowStock] = useState(100);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [sirenVolume, setSirenVolume] = useState(70);
  const [retentionDays, setRetentionDays] = useState(90);
  const [autoFloodThreshold, setAutoFloodThreshold] = useState(45);
  const [autoFloodEnabled, setAutoFloodEnabled] = useState(true);

  // Sync profile values when user changes or modal opens
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
    setPassword('');
    setConfirmPassword('');
  }, [user, isOpen]);

  // Fetch configs on open
  useEffect(() => {
    if (isOpen) {
      api.get('/settings')
        .then(res => {
          const cfg = res.data.data;
          setMasterEmergencyActive(cfg.master_emergency_active === true || cfg.master_emergency_active === 'true' || cfg.master_emergency_active === 1 || cfg.master_emergency_active === '1');
          setActiveEmergencyTitle(cfg.active_emergency_title || 'ACTIVE EMERGENCY DISASTER RESPONSE MODE');
          setActiveDisasterType(cfg.active_disaster_type || 'all');
          setMapCenterLat(cfg.map_center_lat);
          setMapCenterLng(cfg.map_center_lng);
          setMapZoom(cfg.map_zoom);
          setCapacityWarning(cfg.capacity_warning_threshold);
          setLowStock(cfg.low_stock_threshold);
          setAudioAlerts(cfg.audio_alerts_enabled);
          setSirenVolume(cfg.siren_volume);
          setRetentionDays(cfg.audit_log_retention_days);
          setAutoFloodThreshold(cfg.auto_flood_rain_threshold_minutes ?? 45);
          setAutoFloodEnabled(cfg.auto_flood_activation_enabled === true || cfg.auto_flood_activation_enabled === 'true' || cfg.auto_flood_activation_enabled === 1 || cfg.auto_flood_activation_enabled === '1');
        })
        .catch(err => {
          console.error("Failed to load system configurations", err);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handler for Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and Email are required");
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        email,
        role: user.role,
        status: user.status,
      };
      if (password) {
        payload.password = password;
      }

      const res = await api.put(`/staff/${user.id}`, payload);
      setUser(res.data.data);
      toast.success("Profile updated successfully!");
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Handler for Operations & Thresholds, Map Defaults, Sound Preferences
  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        master_emergency_active: masterEmergencyActive,
        active_emergency_title: activeEmergencyTitle,
        active_disaster_type: activeDisasterType,
        map_center_lat: parseFloat(mapCenterLat),
        map_center_lng: parseFloat(mapCenterLng),
        map_zoom: parseInt(mapZoom),
        capacity_warning_threshold: parseInt(capacityWarning),
        low_stock_threshold: parseInt(lowStock),
        audio_alerts_enabled: audioAlerts ? 1 : 0,
        siren_volume: parseInt(sirenVolume),
        audit_log_retention_days: parseInt(retentionDays),
        auto_flood_rain_threshold_minutes: parseInt(autoFloodThreshold),
        auto_flood_activation_enabled: autoFloodEnabled ? 1 : 0,
      };
      await api.post('/settings', payload);
      toast.success("System configurations saved successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save system configurations");
    } finally {
      setLoading(false);
    }
  };

  // Handler for SQL DB Backup download
  const handleBackupDownload = async () => {
    setBackupLoading(true);
    try {
      const response = await api.post('/settings/backup', {}, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/sql' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `evac_route_backup_${new Date().toISOString().slice(0, 10)}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Database backup download started.");
    } catch {
      toast.error("Failed to generate database backup");
    } finally {
      setBackupLoading(false);
    }
  };

  // Handler for Housekeeping logs clearing
  const handleClearLogs = async () => {
    if (!window.confirm(`Are you sure you want to permanently clear audit log entries older than ${retentionDays} days?`)) {
      return;
    }
    setHousekeepingLoading(true);
    try {
      const res = await api.post('/settings/housekeeping');
      toast.success(res.data.message || "Housekeeping completed successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete housekeeping");
    } finally {
      setHousekeepingLoading(false);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] h-full sm:h-[560px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
            ⚙️ LGU System Control Center
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition">
            <X size={22} />
          </button>
        </div>

        {/* Layout Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar Menu */}
          <aside className="w-1/3 bg-slate-50/70 dark:bg-slate-950/40 border-r border-slate-200 dark:border-slate-800 p-4 space-y-1.5 overflow-y-auto shrink-0">
            <span className="block text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Settings Groups</span>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === 'profile'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-slate-800'
              }`}
            >
              <User size={15} /> Account Profile
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('thresholds')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === 'thresholds'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldAlert size={15} /> Operations &amp; Thresholds
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === 'map'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin size={15} /> Map &amp; Landing Center
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === 'audio'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-slate-800'
              }`}
            >
              <Volume2 size={15} /> Audio Alerts &amp; Sirens
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('maintenance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === 'maintenance'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-black'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/50 dark:hover:bg-slate-800'
              }`}
            >
              <Database size={15} /> Database &amp; Maintenance
            </button>
          </aside>

          {/* Right Content Area */}
          <main className="flex-1 p-5 overflow-y-auto">
            
            {/* Tab 1: Account Profile */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2">Admin Profile Credentials</h4>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Administrator Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Admin Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@lgu.gov.ph"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                    New Password <span className="text-[10px] text-gray-400 font-normal">(leave blank to keep current)</span>
                  </label>
                  <input 
                    type="password" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-255 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>

                {password && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-255 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm"
                >
                  {loading ? 'Saving...' : 'Update Account Info'}
                </button>
              </form>
            )}

            {/* Tab 2: Operations & Thresholds */}
            {activeTab === 'thresholds' && (
              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2">Master Disaster &amp; Emergency Mode</h4>

                {/* Master Emergency Mode Switch */}
                <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-slate-200">Global Disaster Response Mode</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${masterEmergencyActive ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                        {masterEmergencyActive ? '🚨 Emergency Active' : '🟢 Standby Peacetime'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
                      Activates real-time hazard routing algorithms, emergency banners, and prioritizes rescue dispatches.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={masterEmergencyActive}
                      onChange={e => setMasterEmergencyActive(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Active Emergency Broadcast Title</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. TYPHOON DISASTER EMERGENCY RESPONSE MODE"
                    value={activeEmergencyTitle}
                    onChange={e => setActiveEmergencyTitle(e.target.value)}
                  />
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1">Displayed city-wide on mobile app top banners and public warning tickers.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Disaster Focus Category</label>
                  <select
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={activeDisasterType}
                    onChange={e => setActiveDisasterType(e.target.value)}
                  >
                    <option value="all">Comprehensive Multi-Hazard Operations (All Disasters)</option>
                    <option value="natural">Natural Hazards Priority (Typhoons, Floods, Landslides)</option>
                    <option value="man_made">Civil &amp; Urban Emergencies (Fires, Chemical/HazMat, Structural)</option>
                  </select>
                </div>

                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2 pt-2">Operational Alert Thresholds</h4>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Low-Stock Alert Trigger Limit (Items)</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={lowStock}
                    onChange={e => setLowStock(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1">Generates command board warnings when relief inventory stock levels fall below this count.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Critical Shelter Capacity Threshold (%)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={capacityWarning}
                    onChange={e => setCapacityWarning(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1">Triggers system alert toast when occupancy rate matches or exceeds this percentage.</span>
                </div>

                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2 pt-2">🌧️ Dynamic Rainfall &amp; Automated Flood EOC</h4>
                
                {/* Auto Flood Spot Activation Switch */}
                <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-800 dark:text-slate-200 block">Automated Bad-Drainage Flood Activation</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
                      Automatically activates chronic drainage bottlenecks &amp; road hazards when sustained rainfall reaches the configured threshold.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={autoFloodEnabled}
                      onChange={e => setAutoFloodEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Prolonged Rain Flood Trigger Threshold (Minutes)</label>
                  <input 
                    type="number" 
                    min="10"
                    max="240"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={autoFloodThreshold}
                    onChange={e => setAutoFloodThreshold(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1">CDRRMO early warning duration limit. Example: 45 or 60 continuous minutes of precipitation triggers auto-EOC.</span>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Settings & Thresholds'}
                </button>
              </form>
            )}

            {/* Tab 3: Map Defaults */}
            {activeTab === 'map' && (
              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2">Live Map Landing View</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Center Latitude</label>
                    <input 
                      type="number" 
                      step="any"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      value={mapCenterLat}
                      onChange={e => setMapCenterLat(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Center Longitude</label>
                    <input 
                      type="number" 
                      step="any"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      value={mapCenterLng}
                      onChange={e => setMapCenterLng(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Map Zoom Level (1 - 22)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="22"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-255 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={mapZoom}
                    onChange={e => setMapZoom(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1">Configures default landing coordinates and zoom level when loading the Command Map.</span>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Map Defaults'}
                </button>
              </form>
            )}

            {/* Tab 4: Sound Preferences */}
            {activeTab === 'audio' && (
              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2">Audio Notifications</h4>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <div>
                    <span className="block text-xs font-bold text-gray-750 dark:text-slate-300">Enable Alert Sounders</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">Play audio sirens and alert tones at operator desk.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 text-blue-650 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    checked={audioAlerts}
                    onChange={e => setAudioAlerts(e.target.checked)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Siren Sounder Volume ({sirenVolume}%)</label>
                  <input 
                    type="range" 
                    min="0"
                    max="100"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    value={sirenVolume}
                    onChange={e => setSirenVolume(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Audio Settings'}
                </button>
              </form>
            )}

            {/* Tab 5: Database & Maintenance */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                
                <div>
                  <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 border-b border-gray-200 dark:border-slate-800 pb-2 mb-3">Database Housekeeping</h4>
                  <div className="flex flex-col gap-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400">Audit Logs Retention Period (Days)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        min="1"
                        className="w-32 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        value={retentionDays}
                        onChange={e => setRetentionDays(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={handleClearLogs}
                        disabled={housekeepingLoading}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm"
                      >
                        {housekeepingLoading ? 'Clearing...' : 'Prune Older Logs'}
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1.5">Removes older audit logs to conserve database storage space.</span>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200 mb-3">System Disaster Recovery</h4>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs text-blue-800 dark:text-blue-300 leading-relaxed mb-3">
                    Backup generates an instant <strong>SQL dump</strong> script containing all database schemas, table structures, and resident check-ins and log records. Save it securely.
                  </div>
                  <button
                    type="button"
                    onClick={handleBackupDownload}
                    disabled={backupLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition disabled:opacity-60 shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {backupLoading ? 'Generating Dump...' : <><Database size={14} /> Download SQL Backup Dump</>}
                  </button>
                </div>

              </div>
            )}

          </main>

        </div>

      </div>
    </div>
  );
}