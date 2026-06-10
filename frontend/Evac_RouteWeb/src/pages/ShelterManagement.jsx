import React, { useState } from 'react';
import { QrCode, Search, Plus, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import QRScannerModal from '../components/common/QRScannerModal';
import api from '../services/api';

export default function ShelterManagement() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedShelterForScanner, setSelectedShelterForScanner] = useState(null);
  const [search, setSearch] = useState('');

  // Fetch ALL shelters (open, full, closed) for the admin management view
  const { data: sheltersData, isLoading } = useQuery({
    queryKey: ['shelters-all'],
    queryFn: () => api.get('/shelters').then(res => res.data),
    refetchInterval: 5000,
  });

  const shelters = sheltersData?.data || [];

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
          <p className="text-sm text-gray-500 mt-1">Manage physical locations and capacities. Use the map to pin new shelters.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search shelters..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            {selectedShelterForScanner && (
              <span className="text-xs bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full">
                Scanner locked to shelter #{selectedShelterForScanner}
              </span>
            )}
          </div>
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
    </div>
  );
}
