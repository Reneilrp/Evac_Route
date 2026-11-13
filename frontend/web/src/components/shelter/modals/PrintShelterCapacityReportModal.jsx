import { useRef, useMemo, useState, useEffect } from 'react';
import { Printer, X, Shield, Package, Users, MapPin, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';

export default function PrintShelterCapacityReportModal({
  shelters = [],
  activeTemplate,
  inventoryItems = [],
  initialPlanningMode = 'surge',
  onCancel,
}) {
  const printableRef = useRef(null);
  const [planningMode, setPlanningMode] = useState(initialPlanningMode); // 'surge' or 'capacity'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const currentDate = useMemo(() => new Date(), []);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = currentDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = currentDate.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalShelters = shelters.length;
  const totalCapacity = shelters.reduce((sum, s) => sum + (parseInt(s.max_capacity, 10) || 0), 0);
  const totalOccupancy = shelters.reduce((sum, s) => sum + (parseInt(s.current_occupancy, 10) || 0), 0);
  const overallUtilization = totalCapacity > 0 ? ((totalOccupancy / totalCapacity) * 100).toFixed(1) : 0;

  const templateItems = activeTemplate?.items || [];

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[120] flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static print:block"
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-shelter-capacity-report, #printable-shelter-capacity-report * {
            visibility: visible;
          }
          #printable-shelter-capacity-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-gray-200 print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
        {/* Fixed Top Action Bar (Hidden on Print) */}
        <div className="no-print shrink-0 bg-slate-900 text-white px-5 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center border-b border-slate-800 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/30 p-2 rounded-lg text-blue-400">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Shelters &amp; Capacities Logistical Audit Report</h3>
              <p className="text-xs text-slate-400">Official CSWDO Citywide Evacuation Centers Summary</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Planning Sizing Basis Selector */}
            <div className="hidden sm:flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPlanningMode('surge')}
                className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                  planningMode === 'surge'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Calculate demands based on active checked-in evacuees + 20% surge"
              >
                Surge Contingency (+20%)
              </button>
              <button
                type="button"
                onClick={() => setPlanningMode('capacity')}
                className={`px-3 py-1 rounded font-bold transition cursor-pointer ${
                  planningMode === 'capacity'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Calculate demands based on 100% full shelter capacity pre-positioning"
              >
                Pre-Landfall Staging (100% Cap)
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg transition cursor-pointer hover:bg-slate-800"
              title="Close modal"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Content */}
        <div
          id="printable-shelter-capacity-report"
          ref={printableRef}
          className="overflow-y-auto flex-1 p-6 sm:p-8 font-sans text-gray-900 bg-white print:overflow-visible print:p-0 print:static"
        >
          {/* Official Letterhead */}
          <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
            <div className="flex justify-center items-center gap-2 text-xs uppercase tracking-widest text-gray-600 font-semibold mb-1">
              <span>Republic of the Philippines</span>
              <span>•</span>
              <span>City Government of Zamboanga</span>
            </div>
            <h1 className="text-lg font-black tracking-tight text-gray-900 uppercase">
              City Social Welfare and Development Office (CSWDO)
            </h1>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mt-0.5">
              Emergency Operations Center • Camp Coordination and Camp Management (CCCM) Division
            </h2>
            <div className="mt-2 inline-block bg-blue-50 border border-blue-200 px-4 py-1 rounded text-xs font-mono font-bold tracking-wider text-blue-900 uppercase">
              CITYWIDE EVACUATION SHELTERS &amp; CAPACITY LOGISTICAL AUDIT REPORT
            </div>
          </div>

          {/* Report Meta & Executive Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 border border-gray-300 p-4 rounded-lg mb-6 text-xs">
            <div className="bg-white p-2.5 rounded border border-gray-200">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Total Facilities</span>
              <span className="text-xl font-black text-gray-900">{totalShelters}</span>
              <span className="text-[10px] text-gray-500 block">Designated Shelters</span>
            </div>
            <div className="bg-white p-2.5 rounded border border-gray-200">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Total Capacity</span>
              <span className="text-xl font-black text-gray-900">{totalCapacity.toLocaleString()}</span>
              <span className="text-[10px] text-gray-500 block">Max Accommodatable Pax</span>
            </div>
            <div className="bg-white p-2.5 rounded border border-gray-200">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Active Occupants</span>
              <span className="text-xl font-black text-blue-700">{totalOccupancy.toLocaleString()}</span>
              <span className="text-[10px] text-gray-500 block">Checked-in Evacuees</span>
            </div>
            <div className="bg-white p-2.5 rounded border border-gray-200">
              <span className="text-[10px] font-bold uppercase text-gray-500 block">Citywide Utilization</span>
              <span className="text-xl font-black text-emerald-700">{overallUtilization}%</span>
              <span className="text-[10px] text-gray-500 block">
                Planning Mode: <strong className="uppercase">{planningMode}</strong>
              </span>
            </div>
          </div>

          {/* Active Formula Note */}
          <div className="flex justify-between items-center bg-gray-100 px-3.5 py-2 rounded border border-gray-300 text-xs mb-4">
            <div className="flex items-center gap-2">
              <Package size={14} className="text-blue-600" />
              <span className="font-bold text-gray-800">
                Active Disaster Ration Formula: &ldquo;{activeTemplate?.name || 'Standard Disaster Relief Pack'}&rdquo;
              </span>
            </div>
            <span className="text-[11px] text-gray-600 font-semibold">
              Planning Basis: {planningMode === 'surge' ? 'Active Evacuees + 20% Surge Reserve' : '100% Full Building Capacity Staging'}
            </span>
          </div>

          {/* Detailed Shelters Table */}
          <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Shelter Facility</th>
                  <th className="py-2.5 px-3">Barangay</th>
                  <th className="py-2.5 px-3 text-right">Occupants / Capacity</th>
                  <th className="py-2.5 px-3 text-center">Status / Load</th>
                  <th className="py-2.5 px-3 text-right">Target Demand Pax</th>
                  <th className="py-2.5 px-3">Calculated Relief Needs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {shelters.map((shelter, idx) => {
                  const occ = parseInt(shelter.current_occupancy, 10) || 0;
                  const cap = parseInt(shelter.max_capacity, 10) || 0;
                  const util = cap > 0 ? ((occ / cap) * 100).toFixed(0) : 0;

                  const surgeBuffer = Math.ceil(occ * 0.20);
                  const targetPax = planningMode === 'surge'
                    ? (occ > 0 ? occ + surgeBuffer : 0)
                    : cap;

                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        {shelter.name}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700">
                        {shelter.barangay || 'Zamboanga City'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900">
                        <span className={occ > 0 ? 'text-blue-700 font-black' : 'text-gray-500'}>{occ}</span>
                        <span className="text-gray-400"> / </span>
                        <span>{cap}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {util >= 90 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                            Critical ({util}%)
                          </span>
                        ) : util >= 50 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Moderate ({util}%)
                          </span>
                        ) : occ > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Open ({util}%)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                            Standby (0%)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-gray-900 text-sm">
                        {targetPax > 0 ? `${targetPax} Pax` : 'Standby (0 Pax)'}
                      </td>
                      <td className="py-2.5 px-3">
                        {targetPax > 0 && templateItems.length > 0 ? (
                          <div className="space-y-0.5 text-[11px] text-gray-700">
                            {templateItems.map((item, tIdx) => {
                              const isFam = item.allocation_type === 'per_family';
                              const count = isFam ? Math.max(1, Math.ceil(targetPax / 5)) : targetPax;
                              const qty = count * (item.quantity_per_head || 1);
                              const itemName = item.inventory_item?.item_name || 'Relief Item';
                              const unit = item.inventory_item?.unit_type || 'units';
                              return (
                                <div key={tIdx} className="flex justify-between gap-2">
                                  <span>{itemName}:</span>
                                  <strong className="text-gray-900">{qty.toLocaleString()} {unit}</strong>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No dispatch required (Empty)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Official Signatures Block */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-gray-900 text-xs text-center">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-8">Prepared &amp; Audited By:</p>
              <div className="border-b border-gray-400 pb-1 mb-1">
                <span className="font-bold text-gray-900 uppercase">CSWDO Camp Coordination Officer</span>
              </div>
              <p className="text-[10px] text-gray-500">CCCM &amp; Intake Registry Desk</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-8">Verified By:</p>
              <div className="border-b border-gray-400 pb-1 mb-1">
                <span className="font-bold text-gray-900 uppercase">Central Warehouse Logistics Custodian</span>
              </div>
              <p className="text-[10px] text-gray-500">CSWDO Disaster Supply Depot</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-8">Approved By:</p>
              <div className="border-b border-gray-400 pb-1 mb-1">
                <span className="font-bold text-gray-900 uppercase">CSWDO Department Head</span>
              </div>
              <p className="text-[10px] text-gray-500">City Government of Zamboanga</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 pt-2 border-t border-gray-200 text-[9px] text-gray-400 text-center flex justify-between items-center">
            <span>EvacRoute CSWDO Logistics Engine • Republic of the Philippines</span>
            <span>Generated: {formattedDate} {formattedTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
