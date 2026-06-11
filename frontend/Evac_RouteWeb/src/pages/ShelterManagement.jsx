import { useState } from 'react';
import { QrCode, Search, MapPin, ClipboardList, FileSpreadsheet, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import QRScannerModal from '../components/common/QRScannerModal';
import api from '../services/api';

export default function ShelterManagement() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedShelterForScanner, setSelectedShelterForScanner] = useState(null);
  const [search, setSearch] = useState('');
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
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <QRScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => { setIsScannerOpen(false); setSelectedShelterForScanner(null); }} 
        selectedShelterId={selectedShelterForScanner} 
      />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Shelter Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage physical locations, capacities, and monitor logistical requirements.</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => { setActiveTab('capacities'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'capacities' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MapPin size={16} /> Shelters &amp; Capacities
        </button>
        <button
          onClick={() => { setActiveTab('ration-planning'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'ration-planning' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ClipboardList size={16} /> Ration Planning &amp; Buffers
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
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tab 1: Shelters & Capacities */}
      {activeTab === 'capacities' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-semibold text-gray-700">Evacuation Centers Status</h3>
            {selectedShelterForScanner && (
              <span className="text-xs bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full">
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
                <p className="text-gray-500 font-medium">Loading shelters...</p>
              </div>
            ) : (
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="py-3 px-6 font-semibold">Shelter Name</th>
                    <th className="py-3 px-6 font-semibold">Capacity Status</th>
                    <th className="py-3 px-6 font-semibold">State</th>
                    <th className="py-3 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredShelters.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-400 font-medium">
                        {search ? 'No shelters match your search.' : 'No active shelters. Use the Live Map to pin one.'}
                      </td>
                    </tr>
                  ) : (
                    filteredShelters.map(shelter => {
                      const percentage = Math.round((shelter.current_occupancy / shelter.max_capacity) * 100);
                      const isSelected = selectedShelterForScanner === shelter.id;
                      return (
                        <tr key={shelter.id} className={`hover:bg-blue-50/30 transition ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''}`}>
                          <td className="py-4 px-6">
                            <div className="font-semibold text-gray-800 flex items-center gap-2">
                              <MapPin size={16} className="text-gray-400" />
                              {shelter.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 pl-6">
                              {shelter.current_occupancy}/{shelter.max_capacity} occupants
                            </div>
                          </td>
                          <td className="py-4 px-6 w-1/3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-gray-700">{shelter.current_occupancy} / {shelter.max_capacity}</span>
                              <span className="text-gray-500">{Math.min(percentage, 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getCapacityColor(shelter.current_occupancy, shelter.max_capacity)}`} 
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${shelter.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {shelter.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleLaunchScanner(shelter)}
                              disabled={shelter.status !== 'open'}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition ${
                                shelter.status === 'open'
                                  ? 'bg-gray-800 hover:bg-gray-900 text-white'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <QrCode size={14} /> Scan
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex items-start gap-4">
              <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-bold text-yellow-800 text-lg">No Active Ration Template Found</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  There is currently no active ration template in the system. Go to the <strong>Inventory &amp; Relief</strong> dashboard to create and activate a template (e.g. specifying water, blankets, and rice quotas per head). Once active, this page will automatically calculate needs and pre-emptive buffer requirements.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Active Planning Profile</span>
                    <div className="flex items-center gap-2 mt-1">
                      <ClipboardList className="text-blue-500" size={20} />
                      <span className="font-black text-gray-800 text-lg leading-tight">{activeTemplate.name}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-500">All predictions are dynamically computed using this profile's quotas.</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Active Evacuee Demand (Current)</span>
                  <div className="text-2xl font-black text-gray-900 mt-1">
                    {shelters.reduce((acc, s) => acc + s.current_occupancy, 0)} <span className="text-sm font-medium text-gray-500">Pax currently checked in</span>
                  </div>
                  <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-1.5">
                    {activeTemplate.items.map(item => {
                      const totalNeeded = shelters.reduce((acc, s) => acc + (s.current_occupancy * item.quantity_per_head), 0);
                      return (
                        <span key={item.id} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded font-bold">
                          {item.inventory_item.item_name.split(' (')[0]}: {totalNeeded} {item.inventory_item.unit_type}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Recommended Stock (Full Max Capacity)</span>
                  <div className="text-2xl font-black text-green-600 mt-1">
                    {shelters.reduce((acc, s) => acc + s.max_capacity, 0)} <span className="text-sm font-medium text-gray-500">Max potential capacity</span>
                  </div>
                  <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-1.5">
                    {activeTemplate.items.map(item => {
                      const totalMax = shelters.reduce((acc, s) => acc + (s.max_capacity * item.quantity_per_head), 0);
                      return (
                        <span key={item.id} className="bg-green-50 text-green-700 px-2.5 py-1 rounded font-bold">
                          {item.inventory_item.item_name.split(' (')[0]}: {totalMax} {item.inventory_item.unit_type}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Demand Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gray-50/50">
                  <div>
                    <h3 className="font-bold text-gray-700">Shelter Logistical Projections</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Calculated requirements and safety stock recommendations based on max capacity slots.</p>
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
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-3 px-6 font-semibold">Shelter Details</th>
                        <th className="py-3 px-6 font-semibold">Occupancy Load</th>
                        <th className="py-3 px-6 font-semibold">Calculated Demands</th>
                        <th className="py-3 px-6 font-semibold">Safety Buffer Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredShelters.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-gray-400 font-medium">
                            No shelters found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredShelters.map(shelter => {
                          const bufferPax = shelter.max_capacity - shelter.current_occupancy;
                          return (
                            <tr key={shelter.id} className="hover:bg-blue-50/10 transition">
                              <td className="py-4 px-6">
                                <div className="font-semibold text-gray-800 flex items-center gap-2">
                                  <MapPin size={16} className="text-gray-400 animate-pulse" />
                                  {shelter.name}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5 pl-6">
                                  Barangay: {shelter.barangay || 'N/A'}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="text-sm font-bold text-gray-700">
                                  {shelter.current_occupancy} <span className="text-xs font-normal text-gray-400">/ {shelter.max_capacity} Pax</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
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
                                        <span className="font-extrabold text-gray-700">
                                          {item.inventory_item.item_name.split(' (')[0]}
                                        </span>
                                        <div className="flex gap-3 text-gray-500 mt-0.5">
                                          <span>Need: <strong>{currentNeed}</strong> {item.inventory_item.unit_type}</span>
                                          <span className="text-gray-300">|</span>
                                          <span className="text-blue-600 font-bold">Max Cap: {maxNeed}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-6 w-1/3">
                                {bufferPax > 0 ? (
                                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                                    <div className="font-bold flex items-center gap-1.5">
                                      <TrendingUp size={14} className="text-blue-600" />
                                      Pre-emptive Stocking Recommendation
                                    </div>
                                    <p className="mt-1.5 text-blue-700 leading-relaxed">
                                      Recommend dispatching an additional{' '}
                                      <strong>
                                        {activeTemplate.items.map(i => `${bufferPax * i.quantity_per_head} ${i.inventory_item.unit_type} of ${i.inventory_item.item_name.split(' (')[0]}`).join(', ')}
                                      </strong>{' '}
                                      to this shelter to establish a 100% capacity buffer for potential new evacuees.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-800 flex items-start gap-2">
                                    <CheckCircle size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
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
    </div>
  );
}
