import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, QrCode } from 'lucide-react';
import api from '../../../services/api';
import { showSuccess, showError } from '../../../utils/toast';

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
      <div 
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      >
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
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
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
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Status</span>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
              shelter?.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
              shelter?.status === 'full' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400' :
              'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
            }`}>
              {shelter?.status}
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Occupancy</span>
            <span className="block mt-1 text-sm font-bold text-gray-700 dark:text-slate-200">
              {shelter?.current_occupancy} / {shelter?.max_capacity}
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
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

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
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

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}


export default ShelterDetailsModal;
