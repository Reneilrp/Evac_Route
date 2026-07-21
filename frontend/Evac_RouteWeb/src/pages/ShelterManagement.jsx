import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { QrCode, Search, MapPin, ClipboardList, FileSpreadsheet, AlertTriangle, CheckCircle, TrendingUp, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRScannerModal from '../components/common/QRScannerModal';
import api from '../services/api';
import { showSuccess, showError } from '../utils/toast';

const getDurationOpen = (createdAt) => {
  if (!createdAt) return '—';
  const start = new Date(createdAt);
  const now = new Date();
  const diffMs = now - start;
  if (diffMs < 0) return 'Just opened';
  
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffHrs / 24);
  const hours = diffHrs % 24;
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0 || parts.length === 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  return parts.join(', ');
};

export default function ShelterManagement() {
  const location = useLocation();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedShelterForScanner, setSelectedShelterForScanner] = useState(null);
  const [selectedShelterForDetails, setSelectedShelterForDetails] = useState(null);
  const [search, setSearch] = useState(location.state?.search || '');
  const [activeTab, setActiveTab] = useState('capacities'); // 'capacities' or 'ration-planning'

  // Consolidated query fetching both shelters and templates in one request
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['shelters-dashboard'],
    queryFn: () => api.get('/shelters/dashboard').then(res => res.data),
    refetchInterval: 5000,
  });

  const shelters = dashboardData?.shelters || [];
  const activeTemplate = dashboardData?.templates?.find(t => t.is_active);

  const filteredShelters = shelters.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.barangay || '').toLowerCase().includes(search.toLowerCase())
  );

  const getCapacityColor = (occupancy, capacity) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleLaunchScanner = (shelter) => {
    setSelectedShelterForScanner(shelter.id);
    setIsScannerOpen(true);
  };

  // Export Ration Demand Planning Report to CSV
  const handleExportRationNeeds = () => {
    if (!shelters.length || !activeTemplate) return;

    let csv = '';
    csv += `==================================================\n`;
    csv += `EVAC-ROUTE AUTOMATED SHELTER RATION PLANNING REPORT\n`;
    csv += `Active Template: ,"${activeTemplate.name}"\n`;
    csv += `Generated At: ,${new Date().toLocaleString()}\n`;
    csv += `==================================================\n\n`;

    // Setup CSV headers based on active template items
    let header = 'Shelter Name,Barangay,Current Occupancy,Max Capacity,Available Capacity';
    activeTemplate.items.forEach(item => {
      const name = item.inventory_item.item_name.replace(/,/g, '');
      const unit = item.inventory_item.unit_type;
      header += `,Current ${name} Needed (${unit}),Recommended ${name} (Full Cap),Buffer Margin Needed`;
    });
    csv += header + '\n';

    shelters.forEach(s => {
      const bufferPax = s.max_capacity - s.current_occupancy;
      let row = `"${s.name}","${s.barangay || 'N/A'}",${s.current_occupancy},${s.max_capacity},${bufferPax}`;
      
      activeTemplate.items.forEach(item => {
        const currentNeed = s.current_occupancy * item.quantity_per_head;
        const maxNeed = s.max_capacity * item.quantity_per_head;
        const bufferNeed = bufferPax * item.quantity_per_head;
        row += `,${currentNeed},${maxNeed},${bufferNeed}`;
      });
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EvacRoute_ShelterRationPlan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950">
      <QRScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => { setIsScannerOpen(false); setSelectedShelterForScanner(null); }} 
        selectedShelterId={selectedShelterForScanner} 
      />

      {selectedShelterForDetails && (
        <ShelterDetailsModal 
          shelterId={selectedShelterForDetails} 
          onClose={() => setSelectedShelterForDetails(null)} 
          onLaunchScanner={(shelter) => {
            setSelectedShelterForDetails(null);
            handleLaunchScanner(shelter);
          }}
        />
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Shelter Management</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage physical locations, capacities, and monitor logistical requirements.</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex space-x-1 bg-gray-200 dark:bg-slate-900 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => { setActiveTab('capacities'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'capacities' ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <MapPin size={16} /> Shelters &amp; Capacities
        </button>
        <button
          onClick={() => { setActiveTab('ration-planning'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'ration-planning' ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <ClipboardList size={16} /> Ration Planning &amp; Buffers
        </button>
        <button
          onClick={() => { setActiveTab('barangay-calculator'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'barangay-calculator' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          ⚡ Proactive Barangay Calculator
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative w-64 mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search shelters..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tab 1: Shelters & Capacities */}
      {activeTab === 'capacities' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
            <h3 className="font-semibold text-gray-700 dark:text-slate-200">Evacuation Centers Status</h3>
            {selectedShelterForScanner && (
              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold px-3 py-1 rounded-full">
                Scanner locked to shelter #{selectedShelterForScanner}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <span className="flex h-6 w-6 relative mr-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500"></span>
                </span>
                <p className="text-gray-500 dark:text-slate-400 font-medium">Loading shelters...</p>
              </div>
            ) : (
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-6 font-semibold">Shelter Name</th>
                    <th className="py-3 px-6 font-semibold">Capacity Status</th>
                    <th className="py-3 px-6 font-semibold">State</th>
                    <th className="py-3 px-6 font-semibold">Opened</th>
                    <th className="py-3 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredShelters.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-400 dark:text-slate-500 font-medium">
                        {search ? 'No shelters match your search.' : 'No active shelters. Use the Live Map to pin one.'}
                      </td>
                    </tr>
                  ) : (
                    filteredShelters.map(shelter => {
                      const percentage = Math.round((shelter.current_occupancy / shelter.max_capacity) * 100);
                      const isSelected = selectedShelterForScanner === shelter.id;
                      return (
                        <tr key={shelter.id} className={`hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition ${isSelected ? 'bg-blue-50 dark:bg-slate-800 ring-1 ring-inset ring-blue-200 dark:ring-blue-900' : ''}`}>
                          <td className="py-4 px-6">
                            <div className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2 flex-wrap">
                              <MapPin size={16} className="text-gray-400 dark:text-slate-500" />
                              <span>{shelter.name}</span>
                              {shelter.facility_type === 'police_station' && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  👮 Police HQ
                                </span>
                              )}
                              {shelter.facility_type === 'military_base' && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  🪖 Military Outpost
                                </span>
                              )}
                              {shelter.facility_type === 'hospital' && (
                                <span className="text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  🏥 Hospital
                                </span>
                              )}
                              {shelter.facility_type === 'fire_station' && (
                                <span className="text-[10px] bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  🚒 Fire Station
                                </span>
                              )}
                              {shelter.facility_type === 'safe_zone' && (
                                <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  🛡️ Safe Zone
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 pl-6">
                              {shelter.current_occupancy}/{shelter.max_capacity} occupants
                            </div>
                          </td>
                          <td className="py-4 px-6 w-1/3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-gray-700 dark:text-slate-300">{shelter.current_occupancy} / {shelter.max_capacity}</span>
                              <span className={`font-bold ${shelter.current_occupancy > shelter.max_capacity ? 'text-red-500 animate-pulse' : 'text-gray-500 dark:text-slate-400'}`}>
                                {percentage}% {shelter.current_occupancy > shelter.max_capacity ? '(OVERFLOW)' : ''}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${shelter.current_occupancy > shelter.max_capacity ? 'bg-red-600 animate-pulse' : getCapacityColor(shelter.current_occupancy, shelter.max_capacity)}`} 
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {shelter.current_occupancy > shelter.max_capacity ? (
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-600 text-white shadow-sm shadow-red-500/50 animate-pulse flex items-center gap-1 w-fit">
                                ⚠️ OVERFLOW (+{shelter.current_occupancy - shelter.max_capacity})
                              </span>
                            ) : (
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                shelter.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 
                                shelter.status === 'full' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
                                'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                              }`}>
                                {shelter.status}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-gray-700 dark:text-slate-300 text-xs">
                            <div className="font-semibold">
                              {new Date(shelter.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                              {new Date(shelter.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                              {getDurationOpen(shelter.created_at)} ago
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setSelectedShelterForDetails(shelter.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-sm"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Ration Planning & Buffer Recommendations */}
      {activeTab === 'ration-planning' && (
        <div>
          {!activeTemplate ? (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-xl p-6 flex items-start gap-4">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-bold text-yellow-800 dark:text-yellow-400 text-lg">No Active Ration Template Found</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  There is currently no active ration template in the system. Go to the <strong>Inventory &amp; Relief</strong> dashboard to create and activate a template (e.g. specifying water, blankets, and rice quotas per head). Once active, this page will automatically calculate needs and pre-emptive buffer requirements.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Active Planning Profile</span>
                    <div className="flex items-center gap-2 mt-1">
                      <ClipboardList className="text-blue-500 dark:text-blue-400" size={20} />
                      <span className="font-black text-gray-800 dark:text-slate-100 text-lg leading-tight">{activeTemplate.name}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">All predictions are dynamically computed using this profile's quotas.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Active Evacuee Demand (Current)</span>
                  <div className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">
                    {shelters.reduce((acc, s) => acc + s.current_occupancy, 0)} <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Pax currently checked in</span>
                  </div>
                  <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-1.5">
                    {activeTemplate.items.map(item => {
                      const totalNeeded = shelters.reduce((acc, s) => acc + (s.current_occupancy * item.quantity_per_head), 0);
                      return (
                        <span key={item.id} className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded font-bold border border-blue-100 dark:border-blue-900/50">
                          {item.inventory_item.item_name.split(' (')[0]}: {totalNeeded} {item.inventory_item.unit_type}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Recommended Stock (Full Max Capacity)</span>
                  <div className="text-2xl font-black text-green-600 dark:text-green-400 mt-1">
                    {shelters.reduce((acc, s) => acc + s.max_capacity, 0)} <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Max potential capacity</span>
                  </div>
                  <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-1.5">
                    {activeTemplate.items.map(item => {
                      const totalMax = shelters.reduce((acc, s) => acc + (s.max_capacity * item.quantity_per_head), 0);
                      return (
                        <span key={item.id} className="bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-2.5 py-1 rounded font-bold border border-green-100 dark:border-green-900/50">
                          {item.inventory_item.item_name.split(' (')[0]}: {totalMax} {item.inventory_item.unit_type}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Demand Table */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50/50 dark:bg-slate-950/50">
                  <div>
                    <h3 className="font-bold text-gray-700 dark:text-slate-200">Shelter Logistical Projections</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Calculated requirements and safety stock recommendations based on max capacity slots.</p>
                  </div>
                  <button 
                    onClick={handleExportRationNeeds}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition text-sm shadow-sm self-start"
                  >
                    <FileSpreadsheet size={16} /> Download Planning Sheet (CSV)
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        <th className="py-3 px-6 font-semibold">Shelter Details</th>
                        <th className="py-3 px-6 font-semibold">Occupancy Load</th>
                        <th className="py-3 px-6 font-semibold">Calculated Demands</th>
                        <th className="py-3 px-6 font-semibold">Safety Buffer Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredShelters.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-gray-400 dark:text-slate-500 font-medium">
                            No shelters found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredShelters.map(shelter => {
                          const bufferPax = shelter.max_capacity - shelter.current_occupancy;
                          return (
                            <tr key={shelter.id} className="hover:bg-blue-50/10 dark:hover:bg-slate-800/10 transition">
                              <td className="py-4 px-6">
                                <div className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                                  <MapPin size={16} className="text-gray-400 dark:text-slate-500 animate-pulse" />
                                  {shelter.name}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 pl-6">
                                  Barangay: {shelter.barangay || 'N/A'}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="text-sm font-bold text-gray-700 dark:text-slate-300">
                                  {shelter.current_occupancy} <span className="text-xs font-normal text-gray-400 dark:text-slate-500">/ {shelter.max_capacity} Pax</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                  {bufferPax} remaining slots
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="space-y-2">
                                  {activeTemplate.items.map(item => {
                                    const currentNeed = shelter.current_occupancy * item.quantity_per_head;
                                    const maxNeed = shelter.max_capacity * item.quantity_per_head;
                                    return (
                                      <div key={item.id} className="text-xs">
                                        <span className="font-extrabold text-gray-700 dark:text-slate-200">
                                          {item.inventory_item.item_name.split(' (')[0]}
                                        </span>
                                        <div className="flex gap-3 text-gray-500 dark:text-slate-400 mt-0.5">
                                          <span>Need: <strong>{currentNeed}</strong> {item.inventory_item.unit_type}</span>
                                          <span className="text-gray-300 dark:text-slate-700">|</span>
                                          <span className="text-blue-600 dark:text-blue-400 font-bold">Max Cap: {maxNeed}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-6 w-1/3">
                                {bufferPax > 0 ? (
                                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-300">
                                    <div className="font-bold flex items-center gap-1.5">
                                      <TrendingUp size={14} className="text-blue-600 dark:text-blue-400" />
                                      Pre-emptive Stocking Recommendation
                                    </div>
                                    <p className="mt-1.5 text-blue-700 dark:text-blue-400 leading-relaxed">
                                      Recommend dispatching an additional{' '}
                                      <strong>
                                        {activeTemplate.items.map(i => `${bufferPax * i.quantity_per_head} ${i.inventory_item.unit_type} of ${i.inventory_item.item_name.split(' (')[0]}`).join(', ')}
                                      </strong>{' '}
                                      to this shelter to establish a 100% capacity buffer for potential new evacuees.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl p-3 text-xs text-green-800 dark:text-green-305 flex items-start gap-2">
                                    <CheckCircle size={15} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                    <span>
                                      <strong>Shelter at Full Capacity</strong>. Ration supply is fully allocated. No additional pre-emptive stocking buffer required.
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: Proactive Barangay Relief Calculator (Zero Background GPS / Privacy-Preserving) */}
      {activeTab === 'barangay-calculator' && (
        <BarangayReliefCalculatorWidget />
      )}
    </div>
  );
}

// ─── Proactive Barangay Relief Calculator Component (Zero Background GPS) ────
function BarangayReliefCalculatorWidget() {
  const [selectedBarangay, setSelectedBarangay] = useState('Tumaga');
  const [customInput, setCustomInput] = useState('');

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['barangay-relief-summary', selectedBarangay],
    queryFn: () => api.get(`/lgu/barangay-relief-summary/${selectedBarangay}`).then(res => res.data),
    enabled: !!selectedBarangay,
  });

  const handleSearchBarangay = (e) => {
    e.preventDefault();
    if (customInput.trim()) {
      setSelectedBarangay(customInput.trim());
    }
  };

  const summary = summaryData;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-xl shadow-lg border border-blue-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              ⚡ Proactive Barangay Relief Estimator
            </h3>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl">
              <strong>Privacy-Preserving &amp; Energy-Efficient:</strong> Pre-stages relief supply manifests for affected Barangays based on demographic profiles—without invasive or battery-draining continuous background GPS tracking.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-lg border border-white/20">
            <span className="text-xs font-semibold px-2">Quick Barangays:</span>
            {['Tumaga', 'Tetuan', 'Pasonanca', 'San Roque'].map(b => (
              <button
                key={b}
                onClick={() => { setSelectedBarangay(b); setCustomInput(b); }}
                className={`text-xs px-3 py-1 rounded-md font-bold transition ${
                  selectedBarangay.toLowerCase() === b.toLowerCase() 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-white/10 hover:bg-white/20 text-blue-100'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearchBarangay} className="mt-4 flex gap-2 max-w-md">
          <input
            type="text"
            placeholder="Type any barangay name (e.g. Tumaga)..."
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            className="flex-1 px-4 py-2 text-sm rounded-lg bg-white/10 text-white placeholder-blue-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
          >
            Calculate Relief
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-gray-100 dark:border-slate-800 text-center">
          <span className="animate-pulse font-bold text-gray-500">Calculating proactive relief manifest for Brgy. {selectedBarangay}...</span>
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Target Barangay</span>
            <div className="text-xl font-black text-gray-900 dark:text-slate-100 mt-1">
              📍 Brgy. {summary.barangay}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Registered Families: <strong>{summary.total_registered_families}</strong>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Registered Headcount</span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {summary.total_affected_headcount} <span className="text-xs font-medium text-gray-500">Base Pax</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Active Template: <strong>{summary.active_ration_template}</strong>
            </p>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              🛡️ +{summary.contingency_buffer_percentage}% Safety Contingency Buffer
            </span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              +{summary.safety_buffer_headcount} <span className="text-xs font-medium text-emerald-600">Reserve Pax</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Recommended Target: <strong>{summary.recommended_total_headcount} Pax Total</strong>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Pre-Staging Dispatch</span>
            <button
              onClick={() => alert(`Pre-staging dispatch manifest generated for Brgy. ${summary.barangay}! Loaded supplies for ${summary.recommended_total_headcount} persons (80 Base + 16 Buffer Reserve).`)}
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              🚚 Dispatch {summary.recommended_total_headcount} Pax Manifest
            </button>
          </div>

          {/* Supply Breakdown Table */}
          <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-gray-800 dark:text-slate-200 text-sm">
                Proactive Relief Supply Breakdown Manifest (Brgy. {summary.barangay})
              </h4>
              <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-full">
                Includes +{summary.contingency_buffer_percentage}% Safety Contingency Buffer (+{summary.safety_buffer_headcount} Extra Pax)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {summary.estimated_supplies_needed?.map((item, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-slate-950 p-4 rounded-lg border border-gray-100 dark:border-slate-800">
                  <span className="block text-xs font-bold text-gray-700 dark:text-slate-300">{item.item_name}</span>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {item.recommended_total_amount} <span className="text-xs font-semibold text-gray-500">{item.unit_type}</span>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500 space-y-0.5 border-t border-gray-200 dark:border-slate-800 pt-1.5">
                    <p>• Base Need ({summary.total_affected_headcount} pax): <strong>{item.base_required} {item.unit_type}</strong></p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold">• Safety Buffer (+{summary.safety_buffer_headcount} pax): <strong>+{item.safety_buffer_amount} {item.unit_type}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Scoped Shelter Details Modal Component ─────────────────────────────────
function ShelterDetailsModal({ shelterId, onClose, onLaunchScanner }) {
  const { data: detailsData, isLoading } = useQuery({
    queryKey: ['shelter-details', shelterId],
    queryFn: () => api.get(`/shelters/${shelterId}/details`).then(res => res.data.data),
    refetchInterval: 5000,
  });

  const queryClient = useQueryClient();
  const checkoutMutation = useMutation({
    mutationFn: (logId) => api.post(`/evacuation-logs/${logId}/check-out`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelter-details'] });
      queryClient.invalidateQueries({ queryKey: ['shelters-dashboard'] });
      showSuccess('Resident checked out successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to check out resident.');
    }
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl p-6 flex items-center justify-center h-64">
          <span className="flex h-6 w-6 relative mr-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500"></span>
          </span>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

  const shelter = detailsData?.shelter;
  const activeLogs = detailsData?.active_logs || [];


  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-slate-100 text-xl flex items-center gap-2">
              <MapPin size={22} className="text-blue-500" /> {shelter?.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Started: <strong className="text-gray-700 dark:text-slate-200">{new Date(shelter?.created_at).toLocaleString()}</strong> ({getDurationOpen(shelter?.created_at)} ago)
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg">
            <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Status</span>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
              shelter?.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
              shelter?.status === 'full' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
              'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
            }`}>
              {shelter?.status}
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg">
            <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Occupancy</span>
            <span className="block mt-1 text-sm font-bold text-gray-700 dark:text-slate-200">
              {shelter?.current_occupancy} / {shelter?.max_capacity}
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-lg">
            <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Capacity Load</span>
            <span className="block mt-1 text-sm font-bold text-gray-700 dark:text-slate-200">
              {Math.min(100, Math.round((shelter?.current_occupancy / shelter?.max_capacity) * 100))}%
            </span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-gray-800 dark:text-slate-100 text-sm">Currently Checked-in Residents</h4>
            <button
              onClick={() => onLaunchScanner(shelter)}
              disabled={shelter?.status !== 'open'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs uppercase transition shadow-sm ${
                shelter?.status === 'open'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <QrCode size={14} /> Scan &amp; Check In
            </button>
          </div>

          <div className="border border-gray-100 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-4">Family Name</th>
                  <th className="py-2.5 px-4">Headcount</th>
                  <th className="py-2.5 px-4">Checked In</th>
                  <th className="py-2.5 px-4">Ration</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                {activeLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-slate-500 font-semibold">
                      No residents checked in currently.
                    </td>
                  </tr>
                ) : (
                  activeLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-semibold text-gray-800 dark:text-slate-200">
                        {log.family_name}
                        {log.contact_number && log.contact_number !== 'N/A' && (
                          <span className="block text-[10px] text-gray-400 dark:text-slate-500 font-normal">{log.contact_number}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-750 dark:text-slate-300 font-bold">{log.headcount}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-slate-400">
                        {new Date(log.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase w-fit ${
                            log.ration_claimed 
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' 
                              : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {log.ration_claimed ? 'Claimed' : 'Pending'}
                          </span>
                          {log.ration_claimed && log.claimed_ration_items && log.claimed_ration_items.length > 0 && (
                            <div className="mt-1 border-t border-green-100 dark:border-green-900/30 pt-1 text-[9px] text-green-755 dark:text-green-300 space-y-0.5 bg-green-50/50 dark:bg-green-950/10 p-1.5 rounded">
                              {log.claimed_ration_items.map((item, idx) => (
                                <div key={idx} className="flex justify-between gap-2 font-medium">
                                  <span>{item.item_name}:</span>
                                  <span className="font-bold">{item.quantity} {item.unit_type}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => checkoutMutation.mutate(log.id)}
                          disabled={checkoutMutation.isPending}
                          className="bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold px-2 py-1 rounded text-[10px] uppercase transition"
                        >
                          {checkoutMutation.isPending ? 'Checking out...' : 'Check Out'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-lg font-bold text-xs uppercase transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
