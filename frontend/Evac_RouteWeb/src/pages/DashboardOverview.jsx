import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Users, Home, AlertTriangle, Activity, FileSpreadsheet } from 'lucide-react';
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
            
            if (nameLower === 'occupancy') {
              color = '#3b82f6'; // Blue
              displayName = 'Occupancy';
            } else if (nameLower === 'capacity') {
              color = isDark ? '#ffffff' : '#0f172a'; // White in dark mode, Black in light mode
              displayName = 'Capacity';
            } else if (nameLower === 'stock') {
              color = '#10b981'; // Green
              displayName = 'Stock';
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
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Fetch consolidated dashboard data (shelters, hazards, logs, inventory) in a single request
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.get('/dashboard/overview').then(res => res.data),
    refetchInterval: 5000 // Poll all metrics concurrently every 5 seconds
  });

  const shelters   = dashboardData?.shelters    || [];
  const hazards    = dashboardData?.hazards     || [];
  const recentLogs = dashboardData?.recent_logs || [];
  const inventory  = dashboardData?.inventory   || [];

  // Stats across ALL shelters (not just open ones)
  const totalOccupancy = shelters.reduce((acc, s) => acc + s.current_occupancy, 0);
  const openShelters   = shelters.filter(s => s.status === 'open').length;
  const fullShelters   = shelters.filter(s => s.status === 'full').length;

  // Chart 1: Shelter Occupancy vs Max Capacity
  const shelterChartData = shelters.map(s => ({
    name: s.name.length > 18 ? s.name.substring(0, 15) + '...' : s.name,
    Occupancy: s.current_occupancy,
    Capacity: s.max_capacity
  }));

  // Chart 2: Warehouse Stock levels
  const inventoryChartData = inventory.map(item => ({
    name: item.item_name.split(' (')[0], // Clean name (e.g. "Rice (25kg sack)" -> "Rice")
    Stock: item.total_stock
  }));

  const handleExportSitRep = () => {
    if (!dashboardData) return;

    let csv = '';

    // Header
    csv += `==================================================\n`;
    csv += `EVAC-ROUTE AUTOMATED SITUATIONAL REPORT (SitRep)\n`;
    csv += `Generated At: ,${new Date().toLocaleString()}\n`;
    csv += `==================================================\n\n`;

    // Summary Metrics
    csv += `SUMMARY METRICS\n`;
    csv += `Active Evacuees (Pax),${totalOccupancy}\n`;
    csv += `Open Shelters,${openShelters}\n`;
    csv += `Nearing/Full Shelters,${fullShelters}\n`;
    csv += `Active Hazard Zones,${hazards.length}\n\n`;

    // Shelter Table
    csv += `SHELTER CAPACITY & OPERATIONAL STATUS\n`;
    csv += `Shelter Name,Barangay,Status,Current Occupancy,Max Capacity,Occupancy Rate (%)\n`;
    shelters.forEach(s => {
      const percentage = Math.round((s.current_occupancy / s.max_capacity) * 100);
      csv += `"${s.name}","${s.barangay || 'N/A'}","${s.status}",${s.current_occupancy},${s.max_capacity},${percentage}%\n`;
    });
    csv += `\n`;

    // Hazards Table
    csv += `ACTIVE HAZARDS & RISK AREAS\n`;
    csv += `Hazard Name,Type,Severity,Latitude,Longitude,Radius (meters)\n`;
    hazards.forEach(h => {
      csv += `"${h.name}","${h.hazard_type}","${h.severity_level}",${h.latitude},${h.longitude},${h.radius_meters}\n`;
    });
    csv += `\n`;

    // Inventory Table
    csv += `CSWDO WAREHOUSE RELIEF GOODS INVENTORY\n`;
    csv += `Item Name,Current Stock,Unit Type\n`;
    inventory.forEach(i => {
      csv += `"${i.item_name}",${i.total_stock},"${i.unit_type}"\n`;
    });
    csv += `\n`;

    // Logs Table
    csv += `RECENT ACTIVE CHECK-IN RECORDS\n`;
    csv += `Check-in Time,Family Profile,Shelter Assigned,Recorded Headcount,Ration Claim Status\n`;
    recentLogs.forEach(l => {
      const time = l.checked_in_at ? new Date(l.checked_in_at).toLocaleString() : '—';
      const name = l.family_profile?.user?.name || 'Unknown';
      const shelterName = l.shelter?.name || '—';
      const ration = l.ration_claimed ? 'Claimed' : 'Pending';
      csv += `"${time}","${name}","${shelterName}",${l.recorded_headcount},"${ration}"\n`;
    });

    // Create Blob & Trigger Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EvacRoute_SitRep_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Command Center Overview</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Real-time metrics, warehouse levels, and shelter capacities.</p>
        </div>
        <button
          onClick={handleExportSitRep}
          disabled={!dashboardData}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <FileSpreadsheet size={16} /> Export SitRep (CSV)
        </button>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center">
          <div className="bg-blue-100 p-4 rounded-lg mr-4">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Active Evacuees</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{totalOccupancy}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center">
          <div className="bg-green-100 p-4 rounded-lg mr-4">
            <Home size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Open Shelters</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{openShelters}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center">
          <div className="bg-red-100 p-4 rounded-lg mr-4">
            <Activity size={24} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">100% Capacity</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{fullShelters}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center">
          <div className="bg-orange-100 p-4 rounded-lg mr-4">
            <AlertTriangle size={24} className="text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Active Hazards</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{hazards.length}</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Shelter Capacity Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
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

        {/* Warehouse Stock Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm mb-4">Warehouse Stock Levels</h3>
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

      {/* Live Feed */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/40 flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <h3 className="font-bold text-gray-800 dark:text-slate-100">Recent Check-ins (Live Feed)</h3>
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
    </div>
  );
}
