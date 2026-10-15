import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, AlertTriangle, CloudRain, Sun, ShieldAlert, Users,
  CheckCircle2, AlertOctagon,
  Droplets, Waves, Mountain, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { showSuccess, showError } from '../../utils/toast';

const ZAMBOANGA_BARANGAYS = [
  "Arena Blanco", "Ayala", "Baliwasan", "Boalan", "Cabaluay", "Calarian",
  "Canelar", "Cawit", "Culianan", "Curuan", "Divisoria", "Guiwan",
  "Labuan", "Manicahan", "Mampang", "Mercedes", "Pasonanca", "Putik",
  "Recodo", "Rio Hondo", "San Jose", "San Roque", "Santa Catalina",
  "Santa Maria", "Talon-Talon", "Taluksangay", "Tetuan", "Tugbungan",
  "Tumaga", "Vitali", "Zone I (Poblacion)", "Zone II (Poblacion)",
  "Zone III (Poblacion)", "Zone IV (Poblacion)"
];

const PRESET_ICONS = {
  tumaga_basin: <Waves className="text-blue-500" size={20} />,
  saaz_corridor: <Droplets className="text-cyan-500" size={20} />,
  baliwasan_surge: <Waves className="text-teal-500" size={20} />,
  manicahan_flood: <CloudRain className="text-indigo-500" size={20} />,
  pasonanca_slide: <Mountain className="text-amber-500" size={20} />,
};

export default function ProactiveDisasterModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'declare' | 'risk'

  // Form state for Tab 2: Declare Zone
  const [selectedBarangay, setSelectedBarangay] = useState('Tumaga');
  const [hazardType, setHazardType] = useState('flood');
  const [severityLevel, setSeverityLevel] = useState('critical');
  const [radiusMeters, setRadiusMeters] = useState(1000);
  const [durationHours, setDurationHours] = useState(6);
  const [sendBroadcast, setSendBroadcast] = useState(true);
  const [customAdvisory, setCustomAdvisory] = useState('');

  // Inspector state for Tab 3: Risk
  const [riskBarangay, setRiskBarangay] = useState('Tumaga');

  // 1. Fetch live weather telemetry
  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather/live-status'],
    queryFn: async () => {
      const res = await api.get('/weather/live-status');
      return res.data?.data;
    },
    refetchInterval: 30000,
    enabled: isOpen,
  });

  // 2. Fetch geohazard presets
  const { data: presetsData, isLoading: presetsLoading } = useQuery({
    queryKey: ['hazards/presets'],
    queryFn: async () => {
      const res = await api.get('/hazards/presets');
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // 3. Fetch population at risk for selected barangay
  const { data: riskData, isLoading: riskLoading } = useQuery({
    queryKey: ['lgu/population-at-risk', riskBarangay],
    queryFn: async () => {
      const res = await api.get(`/lgu/population-at-risk/${encodeURIComponent(riskBarangay)}`);
      return res.data;
    },
    enabled: isOpen && activeTab === 'risk',
  });

  // Toggle Preset Mutation
  const togglePresetMutation = useMutation({
    mutationFn: async (key) => {
      const res = await api.post(`/hazards/presets/${key}/toggle`);
      return res.data;
    },
    onSuccess: (data) => {
      showSuccess(data.message || 'Preset status updated successfully.');
      queryClient.invalidateQueries(['hazards/presets']);
      queryClient.invalidateQueries(['mapDashboard']);
      queryClient.invalidateQueries(['hazards']);
      queryClient.invalidateQueries(['weather/live-status']);
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to toggle geohazard preset.');
    },
  });

  // Declare Zone Mutation
  const declareZoneMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/hazards/declare-zone', payload);
      return res.data;
    },
    onSuccess: (data) => {
      showSuccess(data.message || 'Disaster hazard zone officially declared.');
      queryClient.invalidateQueries(['mapDashboard']);
      queryClient.invalidateQueries(['hazards']);
      queryClient.invalidateQueries(['alerts']);
      queryClient.invalidateQueries(['hazards/presets']);
      onClose();
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to declare hazard zone.');
    },
  });

  const handleDeclareSubmit = (e) => {
    e.preventDefault();
    declareZoneMutation.mutate({
      barangay: selectedBarangay,
      hazard_type: hazardType,
      severity_level: severityLevel,
      radius_meters: Number(radiusMeters),
      estimated_duration_hours: Number(durationHours),
      send_broadcast: sendBroadcast,
      advisory_message: customAdvisory || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-md">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900 dark:text-slate-100 tracking-tight">
                  CDRRMO Proactive Hazard Command &amp; Early Warning
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                  Top-Down Operations
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Pre-emptive river basin activation, barangay geofence declarations, and shelter capacity matching
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Hydrology & Weather Telemetry Bar */}
        <div className="px-6 py-3 bg-blue-50/80 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            {weatherLoading ? (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            ) : weatherData?.is_raining ? (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
              </span>
            ) : (
              <Sun className="text-amber-500" size={16} />
            )}
            <span className="font-bold text-gray-800 dark:text-slate-200">
              {weatherLoading ? 'Connecting to weather telemetry...' : weatherData?.is_raining ? '🌦️ Rainfall Detected over Zamboanga' : '☀️ Watershed Telemetry: Clear Skies'}
            </span>
            {weatherData?.continuous_rain_duration_minutes > 0 && (
              <span className="bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-extrabold px-2 py-0.5 rounded-md text-[11px]">
                {weatherData.continuous_rain_duration_minutes} mins continuous
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-600 dark:text-slate-300 italic flex items-center gap-1.5">
            <Sparkles size={13} className="text-blue-500" />
            <span>{weatherData?.system_recommendation || 'Continuous Open-Meteo telemetry active.'}</span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center border-b border-gray-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 text-xs font-bold">
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'presets'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
            }`}
          >
            <Waves size={16} />
            <span>Pre-Mapped Geohazard Presets ({presetsData?.length || 5})</span>
          </button>
          <button
            onClick={() => setActiveTab('declare')}
            className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'declare'
                ? 'border-red-600 text-red-600 dark:text-red-400 font-black'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
            }`}
          >
            <AlertOctagon size={16} />
            <span>Declare Barangay Hazard Zone</span>
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'risk'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-black'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
            }`}
          >
            <Users size={16} />
            <span>Population At-Risk &amp; Shelter Deficit</span>
          </button>
        </div>

        {/* Tab Contents Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: GEOHAZARD PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-extrabold block">Official MGB Region IX &amp; LiDAR Calibrated Corridors</strong>
                  Activating any corridor instantly creates an active hazard polygon, triggers A* routing bypass on resident phones, and dispatches an official evacuation advisory.
                </div>
              </div>

              {presetsLoading ? (
                <div className="py-12 text-center text-xs text-gray-400">Loading geohazard corridors...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {presetsData?.map((preset) => (
                    <div
                      key={preset.key}
                      className={`p-4 rounded-xl border transition-all ${
                        preset.is_active
                          ? 'bg-red-50/80 dark:bg-red-950/30 border-red-300 dark:border-red-800 shadow-sm'
                          : 'bg-white dark:bg-slate-900/70 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800">
                            {PRESET_ICONS[preset.key] || <Waves size={18} />}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-gray-900 dark:text-slate-100">
                              {preset.name}
                            </h4>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                              Radius: {preset.radius_meters}m • Duration: {preset.estimated_duration_hours}h
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            preset.is_active
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                          }`}
                        >
                          {preset.is_active ? 'ACTIVE ALERT' : 'INACTIVE'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-slate-300 mt-2.5 line-clamp-2">
                        {preset.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {preset.barangays?.map((b) => (
                          <span
                            key={b}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300"
                          >
                            {b}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500">
                          Lat: {preset.latitude}, Lon: {preset.longitude}
                        </span>
                        <button
                          disabled={togglePresetMutation.isPending}
                          onClick={() => togglePresetMutation.mutate(preset.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition cursor-pointer ${
                            preset.is_active
                              ? 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 text-gray-800 dark:text-slate-200'
                              : 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                          }`}
                        >
                          {preset.is_active ? 'Deactivate Corridor' : 'Activate Corridor'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DECLARE BARANGAY HAZARD ZONE */}
          {activeTab === 'declare' && (
            <form onSubmit={handleDeclareSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Target Barangay
                    </label>
                    <select
                      value={selectedBarangay}
                      onChange={(e) => setSelectedBarangay(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      {ZAMBOANGA_BARANGAYS.map((b) => (
                        <option key={b} value={b}>Barangay {b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Hazard Type
                    </label>
                    <select
                      value={hazardType}
                      onChange={(e) => setHazardType(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      <option value="flood">🌊 Flash Flood / Swelling</option>
                      <option value="debris">⛰️ Landslide / Rock Debris</option>
                      <option value="fire">🚒 Structural / Forest Fire</option>
                      <option value="earthquake">🌋 Earthquake Tremors</option>
                      <option value="maintenance">🚧 Emergency Road Obstruction</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Severity Level
                    </label>
                    <select
                      value={severityLevel}
                      onChange={(e) => setSeverityLevel(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      <option value="critical">🔴 Critical (Mandatory Evacuation)</option>
                      <option value="high">🟠 High (Pre-emptive Evacuation)</option>
                      <option value="medium">🟡 Medium (Advisory Alert)</option>
                      <option value="low">⚪ Low (Standby)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Hazard Radius (Meters)
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={5000}
                      step={50}
                      value={radiusMeters}
                      onChange={(e) => setRadiusMeters(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                      Est. Duration (Hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">
                    Custom Advisory Notice (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customAdvisory}
                    onChange={(e) => setCustomAdvisory(e.target.value)}
                    placeholder="e.g. Tumaga river water level breached alert stage. Move to high-ground shelters immediately."
                    className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="send_broadcast"
                    checked={sendBroadcast}
                    onChange={(e) => setSendBroadcast(e.target.checked)}
                    className="h-4 w-4 rounded text-red-600 focus:ring-red-500 border-gray-300 dark:border-slate-700 cursor-pointer"
                  />
                  <label htmlFor="send_broadcast" className="text-xs font-bold text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                    Broadcast immediate Emergency Push Notification to all residents in this area
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={declareZoneMutation.isPending}
                  className="px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <AlertOctagon size={16} />
                  <span>{declareZoneMutation.isPending ? 'Declaring Zone...' : 'Officially Declare Active Hazard Zone'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: POPULATION AT RISK & SHELTER DEFICIT */}
          {activeTab === 'risk' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 bg-gray-50 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="text-purple-600" size={18} />
                  <span className="text-xs font-bold text-gray-800 dark:text-slate-200">Inspect Barangay:</span>
                  <select
                    value={riskBarangay}
                    onChange={(e) => setRiskBarangay(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-900 dark:text-slate-100 outline-none"
                  >
                    {ZAMBOANGA_BARANGAYS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                  Data sourced from registered Resident Family Profiles
                </span>
              </div>

              {riskLoading ? (
                <div className="py-12 text-center text-xs text-gray-400">Calculating risk and shelter matching...</div>
              ) : riskData ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                      riskData.shelter_feasibility?.has_deficit
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {riskData.shelter_feasibility?.has_deficit ? (
                        <AlertTriangle size={24} className="text-rose-600 shrink-0" />
                      ) : (
                        <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                      )}
                      <div>
                        <h4 className="text-sm font-black uppercase">
                          {riskData.shelter_feasibility?.has_deficit ? '🚨 Shelter Capacity Deficit Warning' : '✅ Shelter Capacity Adequate'}
                        </h4>
                        <p className="text-xs mt-0.5">{riskData.shelter_feasibility?.recommendation}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase block opacity-75">Net Bed Balance</span>
                      <span className="text-xl font-black font-mono">
                        {riskData.shelter_feasibility?.capacity_surplus_or_deficit > 0
                          ? `+${riskData.shelter_feasibility.capacity_surplus_or_deficit}`
                          : riskData.shelter_feasibility?.capacity_surplus_or_deficit}
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase block">Registered Families</span>
                      <span className="text-2xl font-black text-gray-900 dark:text-slate-100">
                        {riskData.risk_summary?.total_registered_households}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400 block mt-0.5">Households</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
                      <span className="text-[10px] font-bold text-purple-500 uppercase block">At-Risk Individuals</span>
                      <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                        {riskData.risk_summary?.total_registered_headcount}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400 block mt-0.5">Total Headcount</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
                      <span className="text-[10px] font-bold text-blue-500 uppercase block">Total Shelter Beds</span>
                      <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                        {riskData.shelter_feasibility?.total_shelter_capacity}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400 block mt-0.5">Across {riskData.shelter_feasibility?.matched_shelters_count} Shelters</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase block">Available Vacancies</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {riskData.shelter_feasibility?.available_shelter_capacity}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400 block mt-0.5">Currently Free</span>
                    </div>
                  </div>

                  {/* Transportation Breakdown */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                    <h5 className="text-xs font-black text-gray-800 dark:text-slate-200 mb-2">
                      Evacuation Transportation Logistics Profile:
                    </h5>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">🚶 Pedestrians (On Foot)</span>
                        <span className="text-base font-black text-gray-800 dark:text-slate-200">
                          {riskData.risk_summary?.transportation_modes?.pedestrian || 0} families
                        </span>
                      </div>
                      <div className="p-2.5 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">🛵 2-Wheel (Motorcycle)</span>
                        <span className="text-base font-black text-gray-800 dark:text-slate-200">
                          {riskData.risk_summary?.transportation_modes?.['2_wheel'] || 0} families
                        </span>
                      </div>
                      <div className="p-2.5 bg-gray-50 dark:bg-slate-800/60 rounded-lg">
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">🚗 4-Wheel (Vehicle)</span>
                        <span className="text-base font-black text-gray-800 dark:text-slate-200">
                          {riskData.risk_summary?.transportation_modes?.['4_wheel'] || 0} families
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
