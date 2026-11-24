import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  QrCode,
  MapPin,
  HeartPulse,
  Truck,
  Printer,
  Unlock,
  Ticket,
  Clock,
  CheckCircle,
  AlertTriangle,
  Soup,
  Users,
} from 'lucide-react';
import api from '../../../services/api';
import { showSuccess, showError } from '../../../utils/toast';

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

function ShelterDetailsModal({
  shelterId,
  onClose,
  onLaunchScanner,
  onQuickDispatch,
  onPrintOverview,
  activeTemplate,
  isCSWDO,
}) {
  const queryClient = useQueryClient();
  const [modalTab, setModalTab] = useState('registry'); // 'registry' | 'triage' | 'donations'

  const { data: detailsData, isLoading } = useQuery({
    queryKey: ['shelter-details', shelterId],
    queryFn: () => api.get(`/shelters/${shelterId}/details`).then((res) => res.data.data),
    refetchInterval: 5000,
  });

  const { data: vulnData } = useQuery({
    queryKey: ['shelter-vuln-web', shelterId],
    queryFn: () => api.get(`/shelters/${shelterId}/vulnerability-summary`).then((res) => res.data.data),
    enabled: !!shelterId,
    refetchInterval: 5000,
  });

  const { data: donationsData } = useQuery({
    queryKey: ['shelter-donations-web', shelterId],
    queryFn: () => api.get(`/shelters/${shelterId}/donations`).then((res) => res.data.data),
    enabled: !!shelterId,
    refetchInterval: 10000,
  });

  const checkoutMutation = useMutation({
    mutationFn: (logId) => api.post(`/evacuation-logs/${logId}/check-out`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelter-details'] });
      queryClient.invalidateQueries({ queryKey: ['shelters-dashboard'] });
      showSuccess('Resident checked out successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to check out resident.');
    },
  });

  const dayPassMutation = useMutation({
    mutationFn: ({ logId, isReturn }) =>
      api.post(`/shelters/${shelterId}/${isReturn ? 'return-day-pass' : 'day-pass'}`, {
        evacuation_log_id: logId,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shelter-details'] });
      showSuccess(variables.isReturn ? 'Resident return recorded safely.' : 'Temporary Day Pass issued.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to update day pass status.');
    },
  });

  const toggleActivationMutation = useMutation({
    mutationFn: (status) =>
      api.post(`/shelters/${shelterId}/toggle-activation`, {
        activation_status: status,
        activation_trigger: 'manual_cdrrmo',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelter-details'] });
      queryClient.invalidateQueries({ queryKey: ['shelters-dashboard'] });
      showSuccess('Shelter activation state updated.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to update shelter status.');
    },
  });

  const mobilizeCswdMutation = useMutation({
    mutationFn: () =>
      api.post(`/shelters/${shelterId}/mobilize-cswd`, {
        team_name: 'CSWDO Central Logistics Unit',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelter-details'] });
      queryClient.invalidateQueries({ queryKey: ['shelters-dashboard'] });
      showSuccess('CSWDO field response team mobilized!');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to mobilize field team.');
    },
  });

  if (isLoading) {
    return (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4"
      >
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-8 flex flex-col items-center justify-center h-64">
          <span className="flex h-8 w-8 relative mb-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-8 w-8 bg-blue-500"></span>
          </span>
          <p className="text-gray-600 dark:text-slate-300 font-bold text-sm">Loading shelter command view...</p>
        </div>
      </div>
    );
  }

  const shelter = detailsData?.shelter;
  const activeLogs = detailsData?.active_logs || [];
  const donations = donationsData || [];
  const isStandby = (shelter?.activation_status || '').toLowerCase() === 'standby';
  const isOpen = (shelter?.status || '').toLowerCase() === 'open' || shelter?.activation_status === 'open';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-gray-900/65 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-slate-50/70 dark:bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-xl flex items-center gap-2">
                <MapPin size={22} className="text-blue-600 dark:text-blue-400" /> {shelter?.name}
              </h3>
              {isStandby && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  🟡 Standby Court
                </span>
              )}
              {shelter?.cswd_mobilized && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  🚚 Field Team Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Barangay: <strong className="text-gray-700 dark:text-slate-200">{shelter?.barangay || 'Zamboanga City'}</strong> ·
              Elev: <strong className="text-gray-700 dark:text-slate-200">{shelter?.elevation_meters || 10}m</strong> ·
              Started: <strong className="text-gray-700 dark:text-slate-200">{new Date(shelter?.created_at).toLocaleString()}</strong> ({getDurationOpen(shelter?.created_at)} ago)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition p-1.5 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1-Click Activate Standby Covered Court */}
            {isStandby && (
              <button
                onClick={() => toggleActivationMutation.mutate('open')}
                disabled={toggleActivationMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-xs cursor-pointer"
              >
                <Unlock size={14} /> 🔓 Clear &amp; Open Court
              </button>
            )}

            {/* Influx CSWDO Field Mobilize */}
            {!shelter?.cswd_mobilized && shelter?.current_occupancy >= 15 && (
              <button
                onClick={() => mobilizeCswdMutation.mutate()}
                disabled={mobilizeCswdMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-xs cursor-pointer"
              >
                <Truck size={14} /> 🚚 Mobilize CSWD Field Team
              </button>
            )}

            {/* Quick Dispatch Presets */}
            {isCSWDO && activeTemplate && (
              <button
                onClick={() => onQuickDispatch && onQuickDispatch(shelter)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Quick dispatch relief supplies based on active template"
              >
                <Truck size={14} className="text-blue-600 dark:text-blue-400" /> Quick Dispatch
              </button>
            )}

            {/* PDF Ration Export */}
            {activeTemplate && (
              <button
                onClick={() => onPrintOverview && onPrintOverview(shelter)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Printer size={14} className="text-blue-600 dark:text-blue-400" /> Export PDF
              </button>
            )}
          </div>

          {/* Gate Scanner Launcher */}
          <button
            onClick={() => onLaunchScanner && onLaunchScanner(shelter)}
            disabled={!isOpen}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs uppercase transition shadow-xs ${
              isOpen
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <QrCode size={14} /> Scan &amp; Admit
          </button>
        </div>

        {/* Modal Stats Bar */}
        <div className="grid grid-cols-3 gap-3 p-5 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800">
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Current Occupants</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-gray-900 dark:text-slate-100">{shelter?.current_occupancy}</span>
              <span className="text-xs text-gray-400">/ {shelter?.max_capacity} Pax</span>
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Remaining Capacity</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {Math.max(0, (shelter?.max_capacity || 0) - (shelter?.current_occupancy || 0))}
              </span>
              <span className="text-xs text-gray-400">slots open</span>
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">High-Risk Vulnerable</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-rose-600 dark:text-rose-400">{vulnData?.total_vulnerable || 0}</span>
              <span className="text-xs text-gray-400">evacuees</span>
            </div>
          </div>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-4 bg-white dark:bg-slate-900">
          <button
            onClick={() => setModalTab('registry')}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              modalTab === 'registry'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Users size={14} /> Evacuee Registry ({activeLogs.length})
          </button>
          <button
            onClick={() => setModalTab('triage')}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              modalTab === 'triage'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <HeartPulse size={14} /> Special Needs &amp; Triage ({vulnData?.total_vulnerable || 0})
          </button>
          <button
            onClick={() => setModalTab('donations')}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              modalTab === 'donations'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Soup size={14} /> On-Site Community Donations ({donations.length})
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: REGISTRY TABLE */}
          {modalTab === 'registry' && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-4">Resident / Voucher</th>
                    <th className="py-2.5 px-4">Headcount</th>
                    <th className="py-2.5 px-4">Check-In Time</th>
                    <th className="py-2.5 px-4">Ration Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                  {activeLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 dark:text-slate-500 font-medium">
                        No evacuees currently checked in to this shelter.
                      </td>
                    </tr>
                  ) : (
                    activeLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-gray-800 dark:text-slate-200">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{log.family_name}</span>
                            {log.walk_in_voucher && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 font-mono font-bold border border-purple-200 dark:border-purple-800">
                                <Ticket size={10} /> {log.walk_in_voucher}
                              </span>
                            )}
                            {log.is_temporary_offsite && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                                ⚠️ Off-site (Day Pass)
                              </span>
                            )}
                          </div>
                          {log.contact_number && log.contact_number !== 'N/A' && (
                            <span className="block text-[10px] text-gray-400 dark:text-slate-500 font-normal">
                              {log.contact_number}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                            {log.actual_headcount || log.headcount}
                          </span>
                          {log.actual_headcount && log.actual_headcount !== log.headcount && (
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 ml-1 font-normal">
                              (of {log.headcount} registered)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-slate-400">
                          {new Date(log.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase w-fit ${
                              log.ration_claimed
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {log.ration_claimed ? 'Claimed' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {log.is_temporary_offsite ? (
                              <button
                                onClick={() => dayPassMutation.mutate({ logId: log.id, isReturn: true })}
                                disabled={dayPassMutation.isPending}
                                className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-1 rounded text-[10px] uppercase transition cursor-pointer"
                              >
                                Return
                              </button>
                            ) : (
                              <button
                                onClick={() => dayPassMutation.mutate({ logId: log.id, isReturn: false })}
                                disabled={dayPassMutation.isPending}
                                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-2 py-1 rounded text-[10px] uppercase transition cursor-pointer"
                                title="Issue temporary day pass for flood mud-cleaning or livestock check"
                              >
                                Day Pass
                              </button>
                            )}
                            <button
                              onClick={() => checkoutMutation.mutate(log.id)}
                              disabled={checkoutMutation.isPending}
                              className="bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold px-2 py-1 rounded text-[10px] uppercase transition cursor-pointer"
                            >
                              Check Out
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: SPECIAL NEEDS & MEDICAL TRIAGE */}
          {modalTab === 'triage' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                  <span className="text-2xl block mb-1">👶</span>
                  <span className="text-xs font-bold text-gray-500 uppercase">Infants</span>
                  <span className="block text-xl font-black text-gray-900 dark:text-slate-100 mt-0.5">
                    {vulnData?.vulnerabilities?.infants || 0}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                  <span className="text-2xl block mb-1">🤰</span>
                  <span className="text-xs font-bold text-gray-500 uppercase">Pregnant</span>
                  <span className="block text-xl font-black text-gray-900 dark:text-slate-100 mt-0.5">
                    {vulnData?.vulnerabilities?.pregnant || 0}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                  <span className="text-2xl block mb-1">🧓</span>
                  <span className="text-xs font-bold text-gray-500 uppercase">Seniors (60+)</span>
                  <span className="block text-xl font-black text-gray-900 dark:text-slate-100 mt-0.5">
                    {vulnData?.vulnerabilities?.seniors || 0}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                  <span className="text-2xl block mb-1">♿</span>
                  <span className="text-xs font-bold text-gray-500 uppercase">PWDs</span>
                  <span className="block text-xl font-black text-gray-900 dark:text-slate-100 mt-0.5">
                    {vulnData?.vulnerabilities?.pwd || 0}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                  <span className="text-2xl block mb-1">💊</span>
                  <span className="text-xs font-bold text-gray-500 uppercase">Meds Needed</span>
                  <span className="block text-xl font-black text-gray-900 dark:text-slate-100 mt-0.5">
                    {vulnData?.vulnerabilities?.maintenance_meds || 0}
                  </span>
                </div>
              </div>

              {vulnData?.total_vulnerable > 0 && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HeartPulse size={22} className="text-rose-600 dark:text-rose-400" />
                    <div>
                      <h4 className="font-bold text-xs text-rose-900 dark:text-rose-200 uppercase">
                        City Health Office (CHO) Medical Alert
                      </h4>
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                        High-risk evacuees detected requiring immediate on-site medical checkup and pediatric nutrition.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => showSuccess(`City Health Office (CHO) notified for ${shelter?.name}.`)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-xs cursor-pointer shrink-0"
                  >
                    📢 Request CHO Augmentation
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ON-SITE DONATIONS */}
          {modalTab === 'donations' && (
            <div>
              {donations.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-slate-500">
                  <Soup size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="font-medium text-xs">No direct community or NGO donations logged for this shelter yet.</p>
                  <p className="text-[11px] text-gray-400 mt-1">Field marshals can record donations using the Mobile Scanner app.</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="min-w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-4">Donor / Category</th>
                        <th className="py-2.5 px-4">Item Description</th>
                        <th className="py-2.5 px-4">Quantity</th>
                        <th className="py-2.5 px-4">Logged Time</th>
                        <th className="py-2.5 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {donations.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-semibold text-gray-800 dark:text-slate-200">
                            <div>{d.donor_name}</div>
                            <span className="text-[10px] text-gray-400 uppercase font-normal">{d.category?.replace(/_/g, ' ')}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-900 dark:text-slate-100">{d.item_name}</td>
                          <td className="py-3 px-4 font-extrabold text-blue-600 dark:text-blue-400">
                            {d.quantity} {d.unit} ({d.estimated_servings} servings)
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-slate-400 text-[11px]">{d.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Close Shelter Window
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShelterDetailsModal;
