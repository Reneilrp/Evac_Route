import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Users, Home, AlertTriangle, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

export default function DashboardOverview() {
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

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Command Center Overview</h2>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="bg-blue-100 p-4 rounded-lg mr-4">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Active Evacuees</p>
            <p className="text-3xl font-black text-gray-900">{totalOccupancy}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="bg-green-100 p-4 rounded-lg mr-4">
            <Home size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Open Shelters</p>
            <p className="text-3xl font-black text-gray-900">{openShelters}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="bg-red-100 p-4 rounded-lg mr-4">
            <Activity size={24} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">100% Capacity</p>
            <p className="text-3xl font-black text-gray-900">{fullShelters}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="bg-orange-100 p-4 rounded-lg mr-4">
            <AlertTriangle size={24} className="text-orange-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Active Hazards</p>
            <p className="text-3xl font-black text-gray-900">{hazards.length}</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Shelter Capacity Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm mb-4">Shelter Occupancy vs Max Capacity</h3>
          <div className="h-64 w-full">
            {shelterChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No shelter data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shelterChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Occupancy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Capacity" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Warehouse Stock Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm mb-4">Warehouse Stock Levels</h3>
          <div className="h-64 w-full">
            {inventoryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No stock data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="Stock" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <h3 className="font-bold text-gray-800">Recent Check-ins (Live Feed)</h3>
        </div>

        {recentLogs.length === 0 ? (
          <div className="p-6">
            <div className="flex items-center justify-center h-28 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <p className="text-gray-400 font-medium flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                Awaiting live check-in data stream...
              </p>
            </div>
          </div>
        ) : (
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="py-3 px-6 font-semibold">Time</th>
                <th className="py-3 px-6 font-semibold">Family</th>
                <th className="py-3 px-6 font-semibold">Shelter</th>
                <th className="py-3 px-6 font-semibold">Headcount</th>
                <th className="py-3 px-6 font-semibold">Ration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentLogs.map(log => (
                <tr key={log.id} className="hover:bg-blue-50/30 transition">
                  <td className="py-3 px-6 text-gray-500 text-sm whitespace-nowrap">
                    {log.checked_in_at ? new Date(log.checked_in_at).toLocaleTimeString() : '—'}
                  </td>
                  <td className="py-3 px-6 font-medium text-gray-800">
                    {log.family_profile?.user?.name || 'Unknown'}
                  </td>
                  <td className="py-3 px-6 text-gray-600 text-sm">
                    {log.shelter?.name || '—'}
                  </td>
                  <td className="py-3 px-6">
                    <span className="bg-blue-100 text-blue-800 py-0.5 px-2.5 rounded-full text-xs font-bold">
                      {log.recorded_headcount}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <span className={`py-0.5 px-2.5 rounded-full text-xs font-bold ${log.ration_claimed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {log.ration_claimed ? 'Claimed' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
