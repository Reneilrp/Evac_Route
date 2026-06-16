import React from "react";
import { useState } from 'react';
import { Download, Search, Filter, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { showSuccess, showError } from '../utils/toast';

export default function EvacuationLogs() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Debounce search string to limit API requests
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page to 1 on search change
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['evacuation-logs', page, debouncedSearch],
    queryFn: () => api.get('/evacuation-logs', {
      params: {
        page,
        search: debouncedSearch
      }
    }).then(res => res.data),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const checkoutMutation = useMutation({
    mutationFn: (logId) => api.post(`/evacuation-logs/${logId}/check-out`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evacuation-logs'] });
      showSuccess('Resident checked out successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to check out resident.');
    }
  });

  // logs come from the paginated Laravel response: data.data.data
  const logs = logsData?.data?.data || [];
  const filteredLogs = logs; // Keep same variable to avoid rewriting table mapping

  const [checkoutConfirmId, setCheckoutConfirmId] = useState(null);

  const handleCheckOut = (logId) => {
    setCheckoutConfirmId(logId);
  };

  const handleConfirmCheckout = () => {
    if (checkoutConfirmId) {
      checkoutMutation.mutate(checkoutConfirmId);
      setCheckoutConfirmId(null);
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Family Name', 'QR Hash', 'Shelter', 'Headcount', 'Ration Claimed', 'Check-In Time', 'Check-Out Time'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(l =>
        `"${l.id}","${l.family_profile?.user?.name || 'N/A'}","${l.family_profile?.qr_code_hash || 'N/A'}","${l.shelter?.name || 'N/A'}","${l.recorded_headcount}","${l.ration_claimed ? 'Yes' : 'No'}","${l.checked_in_at}","${l.checked_out_at || 'Active'}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `evacuation_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Free blob from memory
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Evacuation Logs &amp; Reports</h2>
          <p className="text-sm text-gray-500 mt-1">Audit trail for shelter check-ins and relief allocation.</p>
        </div>
        <button 
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition shadow-sm"
        >
          <Download size={18} /> Export to CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex gap-3 w-1/2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search family name, QR hash, or shelter..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition text-sm shadow-sm hover:bg-gray-50">
              <Filter size={16} /> Filter
            </button>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Calendar size={16} /> {today}
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <span className="flex h-6 w-6 relative mr-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500"></span>
              </span>
              <p className="text-gray-500 font-medium">Loading logs from backend...</p>
            </div>
          ) : (
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-3 px-6 font-semibold">Time</th>
                  <th className="py-3 px-6 font-semibold">Family Profile</th>
                  <th className="py-3 px-6 font-semibold">QR Hash</th>
                  <th className="py-3 px-6 font-semibold">Shelter</th>
                  <th className="py-3 px-6 font-semibold">Headcount</th>
                  <th className="py-3 px-6 font-semibold">Ration</th>
                  <th className="py-3 px-6 font-semibold">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                      {search ? 'No matching logs found.' : 'No check-ins recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-blue-50/30 transition">
                      <td className="py-4 px-6 text-gray-500 text-sm whitespace-nowrap">
                        {log.checked_in_at ? new Date(log.checked_in_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-4 px-6 font-medium text-gray-800">
                        {log.family_profile?.user?.name || 'Unknown'}
                      </td>
                      <td className="py-4 px-6 text-gray-400 text-xs font-mono">
                        {log.family_profile?.qr_code_hash || '—'}
                      </td>
                      <td className="py-4 px-6 text-gray-600 text-sm">
                        {log.shelter?.name || '—'}
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-xs font-bold">
                          {log.recorded_headcount}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`py-1 px-3 rounded-full text-xs font-bold ${log.ration_claimed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {log.ration_claimed ? 'Claimed' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {log.checked_out_at ? (
                          <span className="text-gray-400 text-xs">
                            Checked Out at {new Date(log.checked_out_at).toLocaleTimeString()}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCheckOut(log.id)}
                            disabled={checkoutMutation.isPending}
                            className="bg-red-50 hover:bg-red-500 hover:text-white text-red-600 text-xs font-bold px-3 py-1.5 rounded transition disabled:opacity-50"
                          >
                            Check Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && logsData?.data && (
          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
            <p className="text-xs text-gray-500 font-medium">
              Showing page {page} of {logsData.data.last_page || 1} (Total: {logsData.data.total || 0} logs)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(logsData.data.last_page || 1, p + 1))}
                disabled={page === (logsData.data.last_page || 1)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={checkoutConfirmId !== null}
        onClose={() => setCheckoutConfirmId(null)}
        onConfirm={handleConfirmCheckout}
        title="Confirm Check-Out"
        message="Are you sure you want to manually check out this family? This action will mark them as checked out in the database."
        confirmText="Check-Out"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}
