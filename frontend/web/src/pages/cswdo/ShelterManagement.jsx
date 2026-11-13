import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { QrCode, Search, MapPin, ClipboardList, FileSpreadsheet, AlertTriangle, CheckCircle, TrendingUp, X, Truck, Printer } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import QRScannerModal from '../../components/common/QRScannerModal';
import PrePopulatedDispatchModal from '../../components/dispatch/PrePopulatedDispatchModal';
import QuickDispatchModal from '../../components/dispatch/QuickDispatchModal';
import PrintShelterRationOverviewModal from '../../components/dispatch/PrintShelterRationOverviewModal';
import PrintShelterCapacityReportModal from '../../components/shelter/modals/PrintShelterCapacityReportModal';
import api from '../../services/api';
import BarangayReliefCalculatorWidget from '../../components/shelter/BarangayReliefCalculatorWidget';
import ShelterDetailsModal from '../../components/shelter/modals/ShelterDetailsModal';
import { showSuccess, showError } from '../../utils/toast';

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
  const { user } = useAuth();
  const isCSWDO = user?.email?.toLowerCase().includes('logistics') || user?.email?.toLowerCase().includes('cswdo');
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedShelterForScanner, setSelectedShelterForScanner] = useState(null);
  const [selectedShelterForDetails, setSelectedShelterForDetails] = useState(null);
  const [dispatchModalConfig, setDispatchModalConfig] = useState(null);
  const [quickDispatchShelter, setQuickDispatchShelter] = useState(null);
  const [printingShelterOverview, setPrintingShelterOverview] = useState(null);
  const [showCapacityReport, setShowCapacityReport] = useState(false);
  const [search, setSearch] = useState(location.state?.search || '');
  const [activeTab, setActiveTab] = useState('capacities'); // 'capacities' or 'ration-planning'
  const [planningMode, setPlanningMode] = useState('surge'); // 'surge' (+20% of occupants) vs 'pre-staging' (100% full capacity)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isScannerOpen) { setIsScannerOpen(false); setSelectedShelterForScanner(null); }
        if (selectedShelterForDetails) setSelectedShelterForDetails(null);
        if (quickDispatchShelter) setQuickDispatchShelter(null);
        if (dispatchModalConfig) setDispatchModalConfig(null);
        if (printingShelterOverview) setPrintingShelterOverview(null);
        if (showCapacityReport) setShowCapacityReport(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScannerOpen, selectedShelterForDetails, quickDispatchShelter, dispatchModalConfig, printingShelterOverview, showCapacityReport]);

  // Consolidated query fetching shelters, templates, and central inventory
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['shelters-dashboard'],
    queryFn: () => api.get('/shelters/dashboard').then(res => res.data),
    refetchInterval: 5000,
  });

  const shelters = dashboardData?.shelters || [];
  const activeTemplate = dashboardData?.templates?.find(t => t.is_active === true || t.is_active === 1 || t.is_active === '1') || dashboardData?.templates?.[0];
  const inventoryItems = dashboardData?.inventory || [];

  const handleOpenDispatchForShelter = (shelter, targetPax, modeLabel) => {
    if (!activeTemplate?.items) return;
    const initialManifest = activeTemplate.items.map(item => {
      const isFam = item.allocation_type === 'per_family';
      const targetCount = isFam ? Math.max(1, Math.ceil(targetPax / 5)) : targetPax;
      return {
        inventory_item_id: item.inventory_item_id,
        quantity: Math.max(1, targetCount * item.quantity_per_head),
      };
    });

    setDispatchModalConfig({
      initialShelterId: shelter.id,
      initialManifest,
      initialNotes: `${modeLabel || 'Replenishment'} for ${shelter.name} (${targetPax} target evacuees) based on "${activeTemplate.name}".`,
    });
  };

  const handleOpenDispatchForBarangay = (summary) => {
    if (!summary?.estimated_supplies_needed) return;
    const matchingShelter = shelters.find(s => (s.barangay || '').toLowerCase() === (summary.barangay || '').toLowerCase());
    const initialManifest = summary.estimated_supplies_needed.map(item => ({
      inventory_item_id: item.inventory_item_id,
      quantity: Math.max(1, item.recommended_total_amount),
    }));

    setDispatchModalConfig({
      initialShelterId: matchingShelter ? matchingShelter.id : (shelters[0]?.id || ''),
      initialManifest,
      initialNotes: `Proactive demographic pre-staging for Brgy. ${summary.barangay} (${summary.recommended_total_headcount} Pax: ${summary.total_affected_headcount} base + ${summary.safety_buffer_headcount} reserve).`,
    });
  };

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
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search shelters..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tab 1: Shelters & Capacities */}
      {activeTab === 'capacities' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
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
                              {shelter.type === 'primary' ? (
                                <span className="font-bold flex items-center gap-1">⭐ <span className="text-blue-600 dark:text-blue-400">{shelter.name}</span></span>
                              ) : (
                                <span>{shelter.name}</span>
                              )}
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

                            {activeTemplate && (
                              <div className="mt-2.5 flex items-center justify-between text-[11px] bg-gray-50/70 dark:bg-slate-950/40 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                {(() => {
                                  const occ = shelter.current_occupancy || 0;
                                  if (occ === 0) {
                                    return (
                                      <span className="text-gray-400 dark:text-slate-500 font-medium text-[10px]">
                                        Standby Ready (No current occupants)
                                      </span>
                                    );
                                  }

                                  const surgePax = Math.ceil(occ * 0.20);
                                  const targetSurgePax = occ + surgePax;
                                  let isShortage = false;

                                  for (const item of activeTemplate.items) {
                                    const isFam = item.allocation_type === 'per_family';
                                    const count = isFam ? Math.max(1, Math.ceil(targetSurgePax / 5)) : targetSurgePax;
                                    const needed = count * item.quantity_per_head;
                                    const inv = inventoryItems.find(it => it.id === item.inventory_item_id);
                                    const avail = inv?.available_stock ?? Math.max(0, (inv?.total_stock || 0) - (inv?.reserved_quantity || 0));
                                    if (avail < needed) {
                                      isShortage = true;
                                      break;
                                    }
                                  }

                                  return (
                                    <>
                                      <span className="text-gray-500 dark:text-slate-400 font-medium truncate max-w-[170px]" title="Active demand + 20% surge contingency">
                                        Surge Need ({occ} + {surgePax}):{' '}
                                        <strong className="text-gray-700 dark:text-slate-200">
                                          {activeTemplate.items.map(i => {
                                            const isFam = i.allocation_type === 'per_family';
                                            const c = isFam ? Math.max(1, Math.ceil(targetSurgePax / 5)) : targetSurgePax;
                                            return `${c * i.quantity_per_head} ${i.inventory_item?.unit_type || ''}`;
                                          }).join(', ')}
                                        </strong>
                                      </span>
                                      {isShortage ? (
                                        <span className="text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/50 text-[10px] flex items-center gap-1">
                                          <AlertTriangle size={10} /> Central Shortage
                                        </span>
                                      ) : (
                                        <span className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50 text-[10px] flex items-center gap-1">
                                          <CheckCircle size={10} /> Stock Ready
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
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
                            <div className="flex items-center justify-end gap-2">
                              {isCSWDO && activeTemplate && (
                                <button
                                  onClick={() => setQuickDispatchShelter(shelter)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
                                  title="Quick Dispatch Smart Presets"
                                >
                                  <Truck size={13} /> Quick Dispatch
                                </button>
                              )}
                              {activeTemplate && (
                                <button
                                  onClick={() => setPrintingShelterOverview(shelter)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-2xs cursor-pointer"
                                  title="Export or print official CSWDO ration allocation overview PDF"
                                >
                                  <Printer size={13} className="text-blue-600 dark:text-blue-400" />
                                  <span>PDF Overview</span>
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedShelterForDetails(shelter.id)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:hover:bg-blue-900/70 dark:text-blue-300 dark:border-blue-800/80 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-2xs cursor-pointer"
                              >
                                View Details
                              </button>
                            </div>
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
              {/* Planning Mode Selector & Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-slate-200 flex items-center gap-2">
                    <span>Relief Buffer Strategy:</span>
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                      {planningMode === 'surge' ? 'Active Evacuee Surge (+20% Contingency)' : 'Pre-Landfall Staging (100% Shelter Capacity)'}
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {planningMode === 'surge'
                      ? 'Recommends supplies to support currently verified occupants + 20% walk-in surge.'
                      : 'Pre-emptive prepositioning to stock remaining empty slots up to 100% full capacity before disaster impact.'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPlanningMode('surge')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      planningMode === 'surge'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <TrendingUp size={13} />
                    <span>Active Surge (+20%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanningMode('pre-staging')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      planningMode === 'pre-staging'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Truck size={13} />
                    <span>Pre-Landfall (100% Cap)</span>
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Active Planning Profile</span>
                    <div className="flex items-center gap-2 mt-1">
                      <ClipboardList className="text-blue-500 dark:text-blue-400" size={20} />
                      <span className="font-black text-gray-800 dark:text-slate-100 text-lg leading-tight">{activeTemplate.name}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-500 dark:text-slate-400">
                    Dual household (Family) &amp; individual (Pax) quotas applied dynamically.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Active Evacuee Demand (Current)</span>
                  <div className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">
                    {shelters.reduce((acc, s) => acc + s.current_occupancy, 0)} <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Pax currently checked in</span>
                  </div>
                  <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-1.5">
                    {activeTemplate.items.map(item => {
                      const totalNeeded = shelters.reduce((acc, s) => {
                        const isFam = item.allocation_type === 'per_family';
                        const units = isFam ? Math.ceil(s.current_occupancy / 5) : s.current_occupancy;
                        return acc + (units * item.quantity_per_head);
                      }, 0);
                      return (
                        <span key={item.id} className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded font-bold border border-blue-100 dark:border-blue-900/50">
                          {item.inventory_item?.item_name?.split(' (')[0] || 'Item'}: {totalNeeded} {item.inventory_item?.unit_type}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    {planningMode === 'surge' ? 'Target Stock (Occupants + 20% Surge)' : 'Pre-Landfall Stock (100% Capacity)'}
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {planningMode === 'surge'
                      ? shelters.reduce((acc, s) => acc + Math.ceil(s.current_occupancy * 1.20), 0)
                      : shelters.reduce((acc, s) => acc + s.max_capacity, 0)}{' '}
                    <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                      {planningMode === 'surge' ? 'Pax surge target' : 'Max potential capacity'}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-1.5">
                    {activeTemplate.items.map(item => {
                      const totalTarget = shelters.reduce((acc, s) => {
                        const isFam = item.allocation_type === 'per_family';
                        const targetPax = planningMode === 'surge' 
                          ? Math.ceil(s.current_occupancy * 1.20)
                          : s.max_capacity;
                        const units = isFam ? Math.ceil(targetPax / 5) : targetPax;
                        return acc + (units * item.quantity_per_head);
                      }, 0);
                      return (
                        <span key={item.id} className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded font-bold border border-emerald-100 dark:border-emerald-900/50">
                          {item.inventory_item?.item_name?.split(' (')[0] || 'Item'}: {totalTarget} {item.inventory_item?.unit_type}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Demand Table */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50/50 dark:bg-slate-950/50">
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-slate-100">Shelter Logistical Projections</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {planningMode === 'surge'
                        ? 'Operational demand based on checked-in families + 20% immediate walk-in surge.'
                        : 'Full max capacity logistics for pre-storm prepositioning.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      onClick={() => setShowCapacityReport(true)}
                      disabled={!filteredShelters.length && !shelters.length}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg font-semibold flex items-center gap-2 transition text-sm shadow-sm self-start cursor-pointer disabled:opacity-50"
                      title="Print or export official CSWDO citywide shelter capacities and demands overview PDF"
                    >
                      <Printer size={16} /> Print Overview (PDF)
                    </button>
                    <button 
                      onClick={handleExportRationNeeds}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg font-semibold flex items-center gap-2 transition text-sm shadow-sm self-start cursor-pointer"
                    >
                      <FileSpreadsheet size={16} /> Planning Sheet (CSV)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        <th className="py-3 px-6 font-semibold">Shelter Details</th>
                        <th className="py-3 px-6 font-semibold">Occupancy Load</th>
                        <th className="py-3 px-6 font-semibold">Calculated Demands</th>
                        <th className="py-3 px-6 font-semibold">
                          {planningMode === 'surge' ? 'Surge Contingency Recommendation' : 'Pre-Landfall Staging Recommendation'}
                        </th>
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
                          const occ = shelter.current_occupancy || 0;
                          const surgeBuffer = Math.ceil(occ * 0.20);
                          const targetSurge = occ + surgeBuffer;
                          const remainingSlots = Math.max(0, shelter.max_capacity - occ);

                          const targetPax = planningMode === 'surge' ? targetSurge : shelter.max_capacity;
                          const bufferPax = planningMode === 'surge' ? surgeBuffer : remainingSlots;

                          return (
                            <tr key={shelter.id} className="hover:bg-blue-50/10 dark:hover:bg-slate-800/10 transition">
                              <td className="py-4 px-6">
                                <div className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                                  <MapPin size={16} className="text-blue-500 animate-pulse" />
                                  {shelter.name}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 pl-6">
                                  Barangay: {shelter.barangay || 'N/A'}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="text-sm font-bold text-gray-800 dark:text-slate-200">
                                  {occ} <span className="text-xs font-normal text-gray-400 dark:text-slate-500">/ {shelter.max_capacity} Pax</span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                  {remainingSlots} remaining capacity slots
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="space-y-2">
                                  {activeTemplate.items.map(item => {
                                    const isFam = item.allocation_type === 'per_family';
                                    const currCount = isFam ? Math.ceil(occ / 5) : occ;
                                    const maxCount = isFam ? Math.ceil(shelter.max_capacity / 5) : shelter.max_capacity;

                                    const currentNeed = currCount * item.quantity_per_head;
                                    const maxNeed = maxCount * item.quantity_per_head;
                                    const itemName = item.inventory_item?.item_name?.split(' (')[0] || 'Item';
                                    const unit = item.inventory_item?.unit_type || '';

                                    return (
                                      <div key={item.id} className="text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-extrabold text-gray-800 dark:text-slate-200">
                                            {itemName}
                                          </span>
                                          <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                                            ({isFam ? 'Per Family' : 'Per Person'})
                                          </span>
                                        </div>
                                        <div className="flex gap-3 text-gray-500 dark:text-slate-400 mt-0.5">
                                          <span>Current: <strong>{currentNeed}</strong> {unit}</span>
                                          <span className="text-gray-300 dark:text-slate-700">|</span>
                                          <span className="text-blue-600 dark:text-blue-400 font-bold">Full Cap: {maxNeed} {unit}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-6 w-1/3">
                                {planningMode === 'surge' ? (
                                  occ > 0 ? (
                                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3.5 text-xs text-blue-800 dark:text-blue-300">
                                      <div className="font-bold flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                          <TrendingUp size={14} className="text-blue-600 dark:text-blue-400" />
                                          Surge Contingency (+20%)
                                        </span>
                                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-extrabold px-2 py-0.5 rounded-full">
                                          +{surgeBuffer} Surge Pax
                                        </span>
                                      </div>
                                      <p className="mt-1.5 text-blue-700 dark:text-blue-400 leading-relaxed">
                                        Target for <strong>{targetSurge} Pax</strong> ({occ} active evacuees + {surgeBuffer} reserve):{' '}
                                        <strong className="text-blue-900 dark:text-blue-200">
                                          {activeTemplate.items.map(i => {
                                            const isFam = i.allocation_type === 'per_family';
                                            const c = isFam ? Math.max(1, Math.ceil(targetSurge / 5)) : targetSurge;
                                            return `${c * i.quantity_per_head} ${i.inventory_item?.unit_type || ''} ${i.inventory_item?.item_name?.split(' (')[0] || ''}`;
                                          }).join(', ')}
                                        </strong>.
                                      </p>

                                      {isCSWDO ? (
                                        <button
                                          onClick={() => handleOpenDispatchForShelter(shelter, targetSurge, 'Surge Contingency (+20%)')}
                                          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                        >
                                          <Truck size={14} /> Dispatch Surge Manifest ({targetSurge} Pax)
                                        </button>
                                      ) : (
                                        <span className="mt-2 block text-[10px] text-gray-400 dark:text-slate-500 font-semibold italic text-center">
                                          Dispatches managed by CSWDO Logistics
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-xs text-gray-600 dark:text-slate-400 flex items-start gap-2">
                                      <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                                      <span>
                                        <strong>Shelter is currently empty</strong>. Switch to <em>Pre-Landfall (100% Cap)</em> mode above if you wish to preposition goods before arrivals.
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  remainingSlots > 0 ? (
                                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200">
                                      <div className="font-bold flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                          <Truck size={14} className="text-amber-600 dark:text-amber-400" />
                                          Pre-Landfall Staging
                                        </span>
                                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-extrabold px-2 py-0.5 rounded-full">
                                          +{remainingSlots} Slots
                                        </span>
                                      </div>
                                      <p className="mt-1.5 text-amber-800 dark:text-amber-300 leading-relaxed">
                                        Stocking remaining slots up to 100% capacity ({shelter.max_capacity} Pax total):{' '}
                                        <strong className="text-amber-950 dark:text-amber-100">
                                          {activeTemplate.items.map(i => {
                                            const isFam = i.allocation_type === 'per_family';
                                            const c = isFam ? Math.max(1, Math.ceil(remainingSlots / 5)) : remainingSlots;
                                            return `${c * i.quantity_per_head} ${i.inventory_item?.unit_type || ''} ${i.inventory_item?.item_name?.split(' (')[0] || ''}`;
                                          }).join(', ')}
                                        </strong>.
                                      </p>

                                      {isCSWDO ? (
                                        <button
                                          onClick={() => handleOpenDispatchForShelter(shelter, remainingSlots, 'Pre-Landfall 100% Staging')}
                                          className="mt-3 w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                        >
                                          <Truck size={14} /> Dispatch Full Capacity Stocking ({remainingSlots} Slots)
                                        </button>
                                      ) : (
                                        <span className="mt-2 block text-[10px] text-gray-400 dark:text-slate-500 font-semibold italic text-center">
                                          Dispatches managed by CSWDO Logistics
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                                      <CheckCircle size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                      <span>
                                        <strong>Shelter is at 100% capacity</strong>. No additional capacity buffer needed.
                                      </span>
                                    </div>
                                  )
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
        <BarangayReliefCalculatorWidget
          isCSWDO={isCSWDO}
          onDispatchManifest={(summary) => handleOpenDispatchForBarangay(summary)}
        />
      )}

      {/* Quick Dispatch Modal (Direct with 20% suggested buffer & extra rations customizer) */}
      {quickDispatchShelter && (
        <QuickDispatchModal
          shelter={quickDispatchShelter}
          activeTemplate={activeTemplate}
          inventoryItems={inventoryItems}
          onCancel={() => setQuickDispatchShelter(null)}
          onCreated={() => {
            setQuickDispatchShelter(null);
            queryClient.invalidateQueries({ queryKey: ['shelters-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
            queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
            showSuccess('Quick dispatch order created and warehouse stock reserved!');
          }}
        />
      )}

      {/* Auto-Generated Pre-Populated Dispatch Modal */}
      {dispatchModalConfig && (
        <PrePopulatedDispatchModal
          initialShelterId={dispatchModalConfig.initialShelterId}
          initialManifest={dispatchModalConfig.initialManifest}
          initialNotes={dispatchModalConfig.initialNotes}
          inventoryItems={inventoryItems}
          shelters={shelters}
          onCancel={() => setDispatchModalConfig(null)}
          onCreated={() => {
            setDispatchModalConfig(null);
            queryClient.invalidateQueries({ queryKey: ['shelters-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
            queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
            showSuccess('Dispatch order generated and warehouse stock reserved!');
          }}
        />
      )}
      {/* Printable Individual Shelter Allocation & Ration Overview Modal */}
      {printingShelterOverview && (
        <PrintShelterRationOverviewModal
          shelter={printingShelterOverview}
          activeTemplate={activeTemplate}
          inventoryItems={inventoryItems}
          baseType={(printingShelterOverview.current_occupancy || 0) > 0 ? 'occupancy' : 'capacity'}
          bufferPercent={20}
          onCancel={() => setPrintingShelterOverview(null)}
        />
      )}

      {/* Printable Citywide Shelter Capacities & Logistical Audit Report Modal */}
      {showCapacityReport && (
        <PrintShelterCapacityReportModal
          shelters={shelters}
          activeTemplate={activeTemplate}
          inventoryItems={inventoryItems}
          initialPlanningMode={planningMode}
          onCancel={() => setShowCapacityReport(false)}
        />
      )}
    </div>
  );
}

