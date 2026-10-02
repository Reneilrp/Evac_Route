import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Home, AlertTriangle, Activity, FileSpreadsheet, 
  Flag, LifeBuoy, Megaphone, Package, ExternalLink, ShieldAlert
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

// Custom Tooltip component to override Recharts default structure
// and style both the variable labels and values with custom colors.
const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-2.5 shadow-xl text-xs">
        <p className="text-gray-500 dark:text-slate-400 font-bold mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => {
            const rawName = entry.name || entry.dataKey || '';
            const nameLower = rawName.toLowerCase();
            const value = entry.value;
            
            let displayName = rawName;
            let color = isDark ? '#e2e8f0' : '#475569';
            
            if (nameLower === 'occupancy' || nameLower === 'responding') {
              color = '#3b82f6'; // Blue
            } else if (nameLower === 'capacity') {
              color = isDark ? '#ffffff' : '#0f172a';
            } else if (nameLower === 'stock' || nameLower === 'standby' || nameLower === 'resolved') {
              color = '#10b981'; // Green
            } else if (nameLower === 'pending' || nameLower === 'dispatched') {
              color = '#ef4444'; // Red
            } else if (nameLower === 'verified') {
              color = '#f59e0b'; // Amber
            } else if (nameLower === 'maintenance') {
              color = '#64748b'; // Slate
            }

            return (
              <div key={index} className="font-bold flex gap-1.5" style={{ color }}>
                <span>{displayName}:</span>
                <span>{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardOverview() {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  // Agency operational segregation: CDRRMO (DRRM Tactical Command) or CSWDO (Camp & Relief Hub)
  const isCswdoUser = user?.operator_type === 'logistics' || user?.operator_type === 'scanner' || (user?.email?.toLowerCase().includes('logistics') || user?.email?.toLowerCase().includes('cswdo'));
  const activeAgency = isCswdoUser ? 'cswdo' : 'cdrmo';

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Fetch consolidated dashboard data (shelters, hazards, logs, inventory, tactical) in a single request
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.get('/dashboard/overview').then(res => res.data),
    refetchInterval: 5000 // Poll all metrics concurrently every 5 seconds
  });

  const shelters   = dashboardData?.shelters    || [];
  const hazards    = dashboardData?.hazards     || [];
  const recentLogs = dashboardData?.recent_logs || [];
  const inventory  = dashboardData?.inventory   || [];
  const tactical   = dashboardData?.tactical    || {
    pending_incidents: 0,
    approved_incidents: 0,
    rejected_incidents: 0,
    total_incidents: 0,
    rescue_standby: 0,
    rescue_dispatched: 0,
    rescue_maintenance: 0,
    rescue_total: 0,
    recent_incidents: [],
    alerts_count: 0
  };

  // CSWDO stats
  const totalOccupancy = shelters.reduce((acc, s) => acc + s.current_occupancy, 0);
  const openShelters   = shelters.filter(s => s.status === 'open').length;
  const fullShelters   = shelters.filter(s => s.status === 'full').length;

  // CSWDO Chart 1: Shelter Occupancy vs Max Capacity
  const shelterChartData = shelters.map(s => ({
    name: s.name.length > 18 ? s.name.substring(0, 15) + '...' : s.name,
    Occupancy: s.current_occupancy,
    Capacity: s.max_capacity
  }));

  // CSWDO Chart 2: Warehouse Stock levels
  const inventoryChartData = inventory.map(item => ({
    name: item.item_name.split(' (')[0],
    Stock: item.total_stock
  }));

  // CDRRMO Chart 1: Incident Queue Breakdown
  const incidentChartData = [
    { name: 'Pending Review', Count: tactical.pending_incidents || 0 },
    { name: 'Approved (Hazard)', Count: tactical.approved_incidents || 0 },
    { name: 'Rejected', Count: tactical.rejected_incidents || 0 }
  ];

  // CDRRMO Chart 2: Rescue Fleet Deployment
  const fleetChartData = [
    { name: 'Standby / Ready', Units: tactical.rescue_standby },
    { name: 'Dispatched / Active', Units: tactical.rescue_dispatched },
    { name: 'Under Maintenance', Units: tactical.rescue_maintenance }
  ];

  const handleExportSitRep = () => {
    if (!dashboardData) return;

    let csv = '';

    if (activeAgency === 'cdrmo') {
      // CDRRMO Tactical SitRep
      csv += `==================================================\n`;
      csv += `CDRRMO DISASTER & TACTICAL OPERATIONS SITREP\n`;
      csv += `Generated At: ,${new Date().toLocaleString()}\n`;
      csv += `Operational Division: ,CDRRMO Tactical Command\n`;
      csv += `==================================================\n\n`;

      csv += `TACTICAL SUMMARY METRICS\n`;
      csv += `Active Hazard Zones,${hazards.length}\n`;
      csv += `Pending Distress Calls,${tactical.pending_incidents}\n`;
      csv += `Approved Hazard Incidents,${tactical.approved_incidents || 0}\n`;
      csv += `Rescue Fleet Ready,${tactical.rescue_standby}/${tactical.rescue_total}\n`;
      csv += `Rescue Fleet Dispatched,${tactical.rescue_dispatched}\n`;
      csv += `Emergency Broadcasts Active,${tactical.alerts_count}\n\n`;

      csv += `ACTIVE HAZARDS & CRITICAL FLOOD RISK ZONES\n`;
      csv += `Hazard Name,Type,Severity,Latitude,Longitude,Radius (meters)\n`;
      hazards.forEach(h => {
        csv += `"${h.name}","${h.hazard_type}","${h.severity_level}",${h.latitude},${h.longitude},${h.radius_meters}\n`;
      });
      csv += `\n`;

      csv += `RECENT FIELD INCIDENT REPORTS & DISTRESS CALLS\n`;
      csv += `Report ID,Title,Hazard Type,Severity,Status,Reporter,Reported At\n`;
      (tactical.recent_incidents || []).forEach(inc => {
        csv += `"#${inc.id}","${inc.name}","${inc.hazard_type}","${inc.severity_level}","${inc.status}","${inc.reporter?.name || 'Resident'}","${inc.created_at || '—'}"\n`;
      });
    } else {
      // CSWDO Camp & Relief SitRep
      csv += `==================================================\n`;
      csv += `CSWDO CAMP MANAGEMENT & RELIEF SITREP\n`;
      csv += `Generated At: ,${new Date().toLocaleString()}\n`;
      csv += `Operational Division: ,CSWDO Relief Operations\n`;
      csv += `==================================================\n\n`;

      csv += `CAMP SUMMARY METRICS\n`;
      csv += `Active Evacuees (Pax),${totalOccupancy}\n`;
      csv += `Open Shelters,${openShelters}\n`;
      csv += `Shelters at Full Capacity,${fullShelters}\n`;
      csv += `Stock Items Monitored,${inventory.length}\n\n`;

      csv += `SHELTER CAPACITY & OCCUPANCY STATUS\n`;
      csv += `Shelter Name,Barangay,Status,Current Occupancy,Max Capacity,Occupancy Rate (%)\n`;
      shelters.forEach(s => {
        const percentage = Math.round((s.current_occupancy / s.max_capacity) * 100);
        csv += `"${s.name}","${s.barangay || 'N/A'}","${s.status}",${s.current_occupancy},${s.max_capacity},${percentage}%\n`;
      });
      csv += `\n`;

      csv += `CSWDO CENTRAL RELIEF COMMODITY STOCKS\n`;
      csv += `Item Name,Current Stock,Unit Type\n`;
      inventory.forEach(i => {
        csv += `"${i.item_name}",${i.total_stock},"${i.unit_type}"\n`;
      });
      csv += `\n`;

      csv += `RECENT ACTIVE CHECK-IN RECORDS\n`;
      csv += `Check-in Time,Family Profile,Shelter Assigned,Headcount,Ration Status\n`;
      recentLogs.forEach(l => {
        const time = l.checked_in_at ? new Date(l.checked_in_at).toLocaleString() : '—';
        const name = l.family_profile?.user?.name || 'Unknown';
        const shelterName = l.shelter?.name || '—';
        const ration = l.ration_claimed ? 'Claimed' : 'Pending';
        csv += `"${time}","${name}","${shelterName}",${l.recorded_headcount},"${ration}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EvacRoute_${activeAgency.toUpperCase()}_SitRep_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-gray-800 dark:text-slate-100 tracking-tight">
              {activeAgency === 'cdrmo' ? 'CDRRMO Tactical Operations Dashboard' : 'CSWDO Relief & Camp Operations Dashboard'}
            </h2>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
              activeAgency === 'cdrmo' 
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}>
              {activeAgency === 'cdrmo' ? 'Disaster Command' : 'Social Welfare & Camp'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {activeAgency === 'cdrmo' 
              ? 'Real-time disaster hazard tracking, distress call queue, and Search & Rescue fleet readiness.' 
              : 'Evacuation center occupancy, relief pack inventory, and camp intake monitoring.'}
          </p>
        </div>
        <button
          onClick={handleExportSitRep}
          disabled={!dashboardData}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-xs transition flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
        >
          <FileSpreadsheet size={16} /> 
          Export {activeAgency === 'cdrmo' ? 'Tactical' : 'Camp'} SitRep (CSV)
        </button>
      </div>
      
      {/* Stat Cards Grid */}
      {activeAgency === 'cdrmo' ? (
        /* CDRRMO TACTICAL STAT CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 flex items-center">
            <div className="bg-orange-100 dark:bg-orange-950/70 p-4 rounded-lg mr-4">
              <AlertTriangle size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Active Hazards</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{hazards.length}</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Enforced hazard perimeters</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 flex items-center">
            <div className="bg-red-100 dark:bg-red-950/70 p-4 rounded-lg mr-4">
              <Flag size={24} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Pending Distress Calls</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{tactical.pending_incidents}</p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">{tactical.approved_incidents || 0} confirmed as hazards</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 flex items-center">
            <div className="bg-blue-100 dark:bg-blue-950/70 p-4 rounded-lg mr-4">
              <LifeBuoy size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Rescue Fleet Ready</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">
                {tactical.rescue_standby} <span className="text-lg font-bold text-gray-400">/ {tactical.rescue_total}</span>
              </p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">{tactical.rescue_dispatched} dispatched on mission</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 flex items-center">
            <div className="bg-purple-100 dark:bg-purple-950/70 p-4 rounded-lg mr-4">
              <Megaphone size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Active Warnings</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{tactical.alerts_count}</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Emergency broadcasts</p>
            </div>
          </div>
        </div>
      ) : (
        /* CSWDO RELIEF STAT CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 flex items-center">
            <div className="bg-blue-100 dark:bg-blue-950/70 p-4 rounded-lg mr-4">
              <Users size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Active Evacuees</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{totalOccupancy}</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Total registered occupants</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 flex items-center">
            <div className="bg-green-100 dark:bg-green-950/70 p-4 rounded-lg mr-4">
              <Home size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Open Shelters</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{openShelters}</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Active evacuation camps</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 flex items-center">
            <div className="bg-red-100 dark:bg-red-950/70 p-4 rounded-lg mr-4">
              <Activity size={24} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">100% Capacity</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{fullShelters}</p>
              <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-0.5">Camps requiring diversion</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800 flex items-center">
            <div className="bg-amber-100 dark:bg-amber-950/70 p-4 rounded-lg mr-4">
              <Package size={24} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Relief Items</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{inventory.length}</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Commodities tracked</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts Grid */}
      {activeAgency === 'cdrmo' ? (
        /* CDRRMO TACTICAL CHARTS */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm">Distress Incident Reports by Status</h3>
              <Link to="/admin/incidents" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1">
                View Queue <ExternalLink size={12} />
              </Link>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incidentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Bar name="Count" dataKey="Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm">Search &amp; Rescue Fleet Deployment</h3>
              <Link to="/admin/rescue-dispatch" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1">
                Dispatch Desk <ExternalLink size={12} />
              </Link>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fleetChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Bar name="Units" dataKey="Units" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        /* CSWDO CHARTS */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm mb-4">Shelter Occupancy vs Max Capacity</h3>
            <div className="h-64 w-full">
              {shelterChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No shelter data.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shelterChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                      formatter={(value) => <span style={{ color: isDark ? '#f8fafc' : '#475569', fontWeight: 'bold' }}>{value}</span>}
                    />
                    <Bar name="Occupancy" dataKey="Occupancy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar name="Capacity" dataKey="Capacity" fill={isDark ? '#64748b' : '#cbd5e1'} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xs border border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm mb-4">Relief Supplies &amp; Logistics Stock</h3>
            <div className="h-64 w-full">
              {inventoryChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No stock data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                      formatter={(value) => <span style={{ color: isDark ? '#f8fafc' : '#475569', fontWeight: 'bold' }}>{value}</span>}
                    />
                    <Bar name="Stock" dataKey="Stock" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Feed Component */}
      {activeAgency === 'cdrmo' ? (
        /* CDRRMO TACTICAL LIVE INCIDENTS FEED */
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <h3 className="font-bold text-gray-800 dark:text-slate-100">Live Field Incident &amp; Distress Stream</h3>
            </div>
            <Link to="/admin/incidents" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Open Queue ({tactical.pending_incidents} pending) &rarr;
            </Link>
          </div>

          {(tactical.recent_incidents || []).length === 0 ? (
            <div className="p-6">
              <div className="flex items-center justify-center h-28 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-950/20">
                <p className="text-gray-400 dark:text-slate-500 font-medium flex items-center gap-2 text-xs">
                  <ShieldAlert size={16} /> No pending field incidents reported at this time.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-6 font-semibold">Incident / Location</th>
                    <th className="py-3 px-6 font-semibold">Hazard Type</th>
                    <th className="py-3 px-6 font-semibold">Severity</th>
                    <th className="py-3 px-6 font-semibold">Reporter</th>
                    <th className="py-3 px-6 font-semibold">Status</th>
                    <th className="py-3 px-6 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {(tactical.recent_incidents || []).map(inc => (
                    <tr key={inc.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3 px-6 font-medium text-gray-800 dark:text-slate-200 text-sm">
                        {inc.name}
                      </td>
                      <td className="py-3 px-6 text-xs text-gray-600 dark:text-slate-400 uppercase font-semibold">
                        {inc.hazard_type}
                      </td>
                      <td className="py-3 px-6">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          inc.severity_level === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400' :
                          inc.severity_level === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}>
                          {inc.severity_level}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-xs text-gray-500 dark:text-slate-400">
                        {inc.reporter?.name || 'Resident'}
                      </td>
                      <td className="py-3 px-6">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          inc.status === 'pending' ? 'bg-red-500 text-white animate-pulse' :
                          inc.status === 'verified' ? 'bg-amber-500 text-white' :
                          inc.status === 'responding' ? 'bg-blue-500 text-white' :
                          'bg-green-600 text-white'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <Link 
                          to="/admin/incidents" 
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Review &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* CSWDO RECENT CHECK-INS FEED */
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/40 flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <h3 className="font-bold text-gray-800 dark:text-slate-100">Recent Check-ins (Live Camp Feed)</h3>
          </div>

          {recentLogs.length === 0 ? (
            <div className="p-6">
              <div className="flex items-center justify-center h-28 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-950/20">
                <p className="text-gray-400 dark:text-slate-500 font-medium flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                  Awaiting live check-in data stream...
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-6 font-semibold">Time</th>
                    <th className="py-3 px-6 font-semibold">Family</th>
                    <th className="py-3 px-6 font-semibold">Shelter</th>
                    <th className="py-3 px-6 font-semibold">Headcount</th>
                    <th className="py-3 px-6 font-semibold">Ration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {recentLogs.map(log => (
                    <tr key={log.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3 px-6 text-gray-500 dark:text-slate-400 text-sm whitespace-nowrap">
                        {log.checked_in_at ? new Date(log.checked_in_at).toLocaleTimeString() : '—'}
                      </td>
                      <td className="py-3 px-6 font-medium text-gray-800 dark:text-slate-200">
                        {log.family_profile?.user?.name || 'Unknown'}
                      </td>
                      <td className="py-3 px-6 text-gray-600 dark:text-slate-350 text-sm">
                        {log.shelter?.name || '—'}
                      </td>
                      <td className="py-3 px-6">
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 py-0.5 px-2.5 rounded-full text-xs font-bold">
                          {log.recorded_headcount}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span className={`py-0.5 px-2.5 rounded-full text-xs font-bold ${log.ration_claimed ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {log.ration_claimed ? 'Claimed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
