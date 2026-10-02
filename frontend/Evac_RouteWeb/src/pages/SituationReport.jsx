import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  FileText, Printer, RefreshCw, ShieldAlert, AlertTriangle, 
  Users, Home, LifeBuoy, Package, CheckCircle2, MapPin, Building2
} from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';

export default function SituationReport() {
  const { data: sitrepData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['sitrep-report'],
    queryFn: async () => {
      const res = await api.get('/reports/sitrep');
      return res.data.data;
    },
    refetchInterval: 60000,
  });

  const handlePrint = () => {
    window.print();
  };

  const meta = sitrepData?.meta || {};
  const hazards = sitrepData?.hazards_summary || {};
  const population = sitrepData?.population_summary || {};
  const cccm = sitrepData?.cccm_summary || {};
  const srr = sitrepData?.srr_summary || {};
  const relief = sitrepData?.relief_summary || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:p-0 print:m-0 print:max-w-none print:text-black">
      {/* Action Header - Hidden during print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30">
              <FileText size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide">
                NDRRMC / DROMIC Situation Report (SitRep)
              </h1>
              <p className="text-sm text-gray-400">
                Official Consolidated Inter-Agency Disaster Monitoring &amp; Operations Report
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetch();
              showSuccess("Report refreshed with latest emergency data.");
            }}
            disabled={isRefetching || isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg border border-gray-600 font-semibold text-sm transition"
          >
            <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm shadow-lg shadow-purple-600/30 transition"
          >
            <Printer size={16} />
            Print Official SitRep
          </button>
        </div>
      </div>

      {/* Official Government Print Header */}
      <div className="bg-gray-800 print:bg-white p-8 rounded-xl border border-gray-700 print:border-none shadow-xl">
        <div className="text-center border-b border-gray-700 print:border-gray-300 pb-6 mb-6">
          <p className="text-xs font-bold text-gray-400 print:text-gray-600 uppercase tracking-widest">
            Republic of the Philippines
          </p>
          <h2 className="text-xl font-extrabold text-white print:text-gray-900 tracking-wider uppercase mt-1">
            {meta.lgu_name || 'City Government of Zamboanga'}
          </h2>
          <p className="text-sm font-semibold text-purple-400 print:text-purple-700 mt-0.5">
            {meta.council || 'City Disaster Risk Reduction & Management Council (CDRRMC)'}
          </p>
          <div className="inline-block mt-4 px-4 py-1.5 bg-gray-900/60 print:bg-gray-100 rounded-full border border-gray-700 print:border-gray-300">
            <span className="text-xs font-black text-amber-400 print:text-amber-800 tracking-wider uppercase">
              {meta.report_title || 'SITUATION REPORT (SitRep)'}
            </span>
          </div>
        </div>

        {/* Report Metadata Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-900/40 print:bg-gray-50 p-4 rounded-lg border border-gray-700/60 print:border-gray-200 text-xs mb-8">
          <div>
            <span className="text-gray-400 print:text-gray-500 block uppercase font-bold text-[10px]">Operational State</span>
            <span className={`font-bold inline-block mt-1 ${meta.master_emergency_active ? 'text-red-400 print:text-red-700' : 'text-emerald-400 print:text-emerald-700'}`}>
              {meta.master_emergency_active ? '🚨 CALAMITY / EMERGENCY ACTIVE' : '🟢 PEACETIME / STANDBY'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 print:text-gray-500 block uppercase font-bold text-[10px]">Disaster Focus</span>
            <span className="font-semibold text-gray-200 print:text-gray-800 mt-1 block capitalize">
              {meta.disaster_focus || 'All Multi-Hazards'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 print:text-gray-500 block uppercase font-bold text-[10px]">Report Timestamp</span>
            <span className="font-semibold text-gray-200 print:text-gray-800 mt-1 block">
              {meta.generated_at || new Date().toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400 print:text-gray-500 block uppercase font-bold text-[10px]">Authorized Officer</span>
            <span className="font-semibold text-gray-200 print:text-gray-800 mt-1 block">
              {meta.prepared_by} ({meta.prepared_by_role?.toUpperCase()})
            </span>
          </div>
        </div>

        {/* Section 1: Executive Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900/60 print:bg-gray-50 p-4 rounded-lg border border-gray-700/80 print:border-gray-300">
            <div className="flex items-center justify-between text-gray-400 print:text-gray-600 text-xs font-bold uppercase mb-2">
              <span>Evacuees Inside EC</span>
              <Users size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white print:text-gray-900">
              {population.evacuated_individuals_inside_ec || 0}
            </div>
            <p className="text-[11px] text-gray-400 print:text-gray-500 mt-1">
              From <strong className="text-gray-200 print:text-gray-800">{population.evacuated_families_inside_ec || 0}</strong> families
            </p>
          </div>

          <div className="bg-gray-900/60 print:bg-gray-50 p-4 rounded-lg border border-gray-700/80 print:border-gray-300">
            <div className="flex items-center justify-between text-gray-400 print:text-gray-600 text-xs font-bold uppercase mb-2">
              <span>Shelter Capacity</span>
              <Building2 size={16} className="text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white print:text-gray-900">
              {cccm.utilization_rate_pct || 0}%
            </div>
            <p className="text-[11px] text-gray-400 print:text-gray-500 mt-1">
              <strong className="text-gray-200 print:text-gray-800">{cccm.active_evacuation_centers || 0}</strong> active centers ({cccm.current_occupancy || 0} / {cccm.total_capacity || 0})
            </p>
          </div>

          <div className="bg-gray-900/60 print:bg-gray-50 p-4 rounded-lg border border-gray-700/80 print:border-gray-300">
            <div className="flex items-center justify-between text-gray-400 print:text-gray-600 text-xs font-bold uppercase mb-2">
              <span>SRR Rescue Fleet</span>
              <LifeBuoy size={16} className="text-rose-400" />
            </div>
            <div className="text-2xl font-black text-white print:text-gray-900">
              {srr.rescued_individuals || 0}
            </div>
            <p className="text-[11px] text-gray-400 print:text-gray-500 mt-1">
              Persons rescued across <strong className="text-gray-200 print:text-gray-800">{srr.completed_missions || 0}</strong> missions
            </p>
          </div>

          <div className="bg-gray-900/60 print:bg-gray-50 p-4 rounded-lg border border-gray-700/80 print:border-gray-300">
            <div className="flex items-center justify-between text-gray-400 print:text-gray-600 text-xs font-bold uppercase mb-2">
              <span>Relief Packs Claimed</span>
              <Package size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white print:text-gray-900">
              {relief.relief_rations_claimed || 0}
            </div>
            <p className="text-[11px] text-gray-400 print:text-gray-500 mt-1">
              <strong className="text-gray-200 print:text-gray-800">{relief.completed_dispatches || 0}</strong> bulk dispatches fulfilled
            </p>
          </div>
        </div>

        {/* Section 2: CCCM Evacuation Center Breakdown */}
        <div className="mb-8">
          <h3 className="text-sm font-black text-white print:text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Home size={18} className="text-blue-400" />
            1. Camp Coordination &amp; Camp Management (CCCM) by Barangay
          </h3>
          <div className="overflow-x-auto border border-gray-700 print:border-gray-300 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-900/80 print:bg-gray-100 text-gray-400 print:text-gray-700 uppercase font-bold border-b border-gray-700 print:border-gray-300">
                <tr>
                  <th className="p-3">Barangay</th>
                  <th className="p-3 text-center">Shelters</th>
                  <th className="p-3 text-center">Evacuees Inside</th>
                  <th className="p-3 text-center">Capacity</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60 print:divide-gray-200">
                {cccm.barangay_breakdown && cccm.barangay_breakdown.length > 0 ? (
                  cccm.barangay_breakdown.map((b, idx) => {
                    const pct = b.capacity > 0 ? Math.round((b.evacuees_inside / b.capacity) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-700/30 print:hover:bg-transparent">
                        <td className="p-3 font-semibold text-white print:text-gray-900">{b.barangay}</td>
                        <td className="p-3 text-center text-gray-300 print:text-gray-800">{b.total_shelters}</td>
                        <td className="p-3 text-center font-bold text-blue-400 print:text-blue-700">{b.evacuees_inside}</td>
                        <td className="p-3 text-center text-gray-400 print:text-gray-600">{b.capacity}</td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pct >= 100 ? 'bg-red-500/20 text-red-300' : pct >= 80 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {pct}% Utilized
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">No shelter occupancy recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Dual Columns (SRR Missions & FNFI Relief) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* SRR Rescue Summary */}
          <div className="border border-gray-700 print:border-gray-300 p-4 rounded-lg bg-gray-900/30 print:bg-transparent">
            <h3 className="text-xs font-black text-white print:text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <LifeBuoy size={16} className="text-rose-400" />
              2. Search, Rescue, &amp; Retrieval (SRR) Operations
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-800 print:border-gray-200">
                <span className="text-gray-400 print:text-gray-600">Total Rescue Fleet Units:</span>
                <span className="font-bold text-white print:text-gray-900">{srr.total_rescue_units || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800 print:border-gray-200">
                <span className="text-gray-400 print:text-gray-600">Active Deployed Units:</span>
                <span className="font-bold text-amber-400 print:text-amber-700">{srr.dispatched_units || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800 print:border-gray-200">
                <span className="text-gray-400 print:text-gray-600">Standby Fleet Units:</span>
                <span className="font-bold text-emerald-400 print:text-emerald-700">{srr.standby_units || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800 print:border-gray-200">
                <span className="text-gray-400 print:text-gray-600">Ongoing Rescue Missions:</span>
                <span className="font-bold text-rose-400 print:text-rose-700">{srr.ongoing_missions || 0}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-400 print:text-gray-600">Successfully Rescued Persons:</span>
                <span className="font-black text-emerald-400 print:text-emerald-700">{srr.rescued_individuals || 0} individuals</span>
              </div>
            </div>
          </div>

          {/* FNFI Relief Summary */}
          <div className="border border-gray-700 print:border-gray-300 p-4 rounded-lg bg-gray-900/30 print:bg-transparent">
            <h3 className="text-xs font-black text-white print:text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package size={16} className="text-amber-400" />
              3. Food &amp; Non-Food Items (FNFI) Assistance
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-800 print:border-gray-200">
                <span className="text-gray-400 print:text-gray-600">Warehouse Stock Commodities:</span>
                <span className="font-bold text-white print:text-gray-900">{relief.total_stock_commodities || 0} items</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800 print:border-gray-200">
                <span className="text-gray-400 print:text-gray-600">Critical Low Stock Commodities:</span>
                <span className={`font-bold ${relief.low_stock_alerts > 0 ? 'text-red-400 print:text-red-700' : 'text-gray-300'}`}>
                  {relief.low_stock_alerts || 0} items
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800 print:border-gray-200">
                <span className="text-gray-400 print:text-gray-600">Total Bulk Dispatch Orders:</span>
                <span className="font-bold text-white print:text-gray-900">{relief.total_dispatch_orders || 0}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800 print:border-gray-200">
                <span className="text-gray-400 print:text-gray-600">In-Transit Truck Shipments:</span>
                <span className="font-bold text-amber-400 print:text-amber-700">{relief.in_transit_dispatches || 0}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-400 print:text-gray-600">Completed Shelter Relief Claims:</span>
                <span className="font-black text-emerald-400 print:text-emerald-700">{relief.relief_rations_claimed || 0} packs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Sign-off & Certification */}
        <div className="pt-8 mt-8 border-t border-gray-700 print:border-gray-300 grid grid-cols-2 text-center text-xs">
          <div>
            <p className="text-gray-400 print:text-gray-500 mb-8">Prepared &amp; Verified by:</p>
            <div className="w-48 mx-auto border-b border-gray-500 print:border-gray-800"></div>
            <p className="font-bold text-white print:text-gray-900 mt-2">{meta.prepared_by || 'System Administrator'}</p>
            <p className="text-[10px] text-gray-400 print:text-gray-500 uppercase">CDRRMC Data &amp; Telemetry Desk</p>
          </div>

          <div>
            <p className="text-gray-400 print:text-gray-500 mb-8">Noted &amp; Approved for Transmission:</p>
            <div className="w-48 mx-auto border-b border-gray-500 print:border-gray-800"></div>
            <p className="font-bold text-white print:text-gray-900 mt-2">Hon. City Mayor / CDRRMC Chairperson</p>
            <p className="text-[10px] text-gray-400 print:text-gray-500 uppercase">City Government of Zamboanga</p>
          </div>
        </div>
      </div>
    </div>
  );
}
