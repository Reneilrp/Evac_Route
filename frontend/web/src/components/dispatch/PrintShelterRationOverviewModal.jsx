import { useRef, useMemo, useState, useEffect } from 'react';
import { Printer, X, Shield, Package, Users, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function PrintShelterRationOverviewModal({
  shelter,
  activeTemplate,
  inventoryItems = [],
  baseType = 'occupancy',
  bufferPercent = 20,
  extraPacks = 0,
  manualBundleCount = null,
  onCancel,
}) {
  const printableRef = useRef(null);

  const actualOccupancy = parseInt(shelter?.current_occupancy || 0, 10);
  const maxCapacity = parseInt(shelter?.max_capacity || 0, 10);

  // Allow live interactive switching between Live Occupancy vs Shelter Full Capacity inside modal
  const [sizingMode, setSizingMode] = useState(() => {
    if (baseType) return baseType;
    return actualOccupancy > 0 ? 'occupancy' : 'capacity';
  });

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
  if (!shelter) return null;

  const handlePrint = () => {
    window.print();
  };

  const isOccupancyBase = sizingMode === 'occupancy';
  const effectivePax = isOccupancyBase ? (actualOccupancy > 0 ? actualOccupancy : 1) : maxCapacity;
  const estimatedFamilies = Math.max(1, Math.ceil(effectivePax / 5));

  const calculatedBufferPax = Math.ceil(effectivePax * (bufferPercent / 100));
  const recommendedPackCount = manualBundleCount !== null
    ? manualBundleCount
    : Math.max(1, effectivePax + calculatedBufferPax + extraPacks);

  const formattedDate = currentDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = currentDate.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  });

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
          #printable-shelter-overview, #printable-shelter-overview * {
            visibility: visible;
          }
          #printable-shelter-overview {
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

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden border border-gray-200 print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
        {/* Modal Action Bar (Hidden on Print, pinned sticky at top) */}
        <div className="no-print shrink-0 bg-slate-900 text-white px-5 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center border-b border-slate-800 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/30 p-2 rounded-lg text-blue-400">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Shelter Relief Allocation &amp; Quick Dispatch Overview</h3>
              <p className="text-xs text-slate-400">Official CSWDO Headcount &amp; Ration Requirements Summary</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Live Occupancy vs Full Capacity Sizing Basis Switcher */}
            <div className="hidden sm:flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setSizingMode('occupancy')}
                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                  sizingMode === 'occupancy'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Calculate demands based on active checked-in evacuees"
              >
                Live Occupancy ({actualOccupancy} Pax)
              </button>
              <button
                type="button"
                onClick={() => setSizingMode('capacity')}
                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                  sizingMode === 'capacity'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Calculate demands based on 100% full shelter capacity"
              >
                Max Capacity ({maxCapacity} Pax)
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

        {/* Printable Content */}
        <div id="printable-shelter-overview" ref={printableRef} className="overflow-y-auto flex-1 p-6 sm:p-8 font-sans text-gray-900 bg-white print:overflow-visible print:p-0 print:static">
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
              Emergency Operations Center (EOC) • Disaster Relief Logistics Division
            </h2>
            <div className="mt-2 inline-block bg-blue-50 border border-blue-200 px-4 py-1 rounded text-xs font-mono font-bold tracking-wider text-blue-900 uppercase">
              SHELTER RATION ALLOCATION &amp; DISPATCH MANIFEST OVERVIEW
            </div>
          </div>

          {/* Shelter Demographics & Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-300 p-4 rounded-lg mb-6 text-xs">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Target Evacuation Facility</p>
              <p className="font-black text-base text-gray-900">{shelter.name}</p>
              <p className="text-gray-600 font-medium mt-1 flex items-center gap-1">
                <MapPin size={12} className="text-red-500" />
                Barangay: <strong>{shelter.barangay || 'Zamboanga City'}</strong>
              </p>
              <p className="text-gray-500 font-semibold uppercase text-[10px] mt-2">Issuance Date &amp; Time</p>
              <p className="font-bold text-gray-800">{formattedDate} at {formattedTime}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-right">
              <div className="bg-white p-2.5 rounded border border-gray-200 text-left">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Actual Occupancy</span>
                <span className="text-lg font-black text-blue-700">{actualOccupancy}</span>
                <span className="text-[10px] text-gray-500 font-semibold block">Checked-in Persons</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-gray-200 text-left">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Shelter Capacity</span>
                <span className="text-lg font-black text-gray-800">{maxCapacity}</span>
                <span className="text-[10px] text-gray-500 font-semibold block">Maximum Capacity</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-gray-200 text-left">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Target Sizing Basis</span>
                <span className="text-xs font-black text-emerald-700 block">
                  {isOccupancyBase ? `Live Occupancy (${effectivePax} Pax)` : `Full Capacity (${effectivePax} Pax)`}
                </span>
                <span className="text-[10px] text-gray-500 block">+{bufferPercent}% Buffer ({calculatedBufferPax} Pax)</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-gray-200 text-left">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Recommended Packs</span>
                <span className="text-lg font-black text-indigo-700">{recommendedPackCount}</span>
                <span className="text-[10px] text-gray-500 font-semibold block">Full Relief Bundles</span>
              </div>
            </div>
          </div>

          {/* Active Ration Template Rules */}
          <div className="border border-gray-300 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-200">
              <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-blue-600" />
                Active Disaster Ration Formula: &ldquo;{activeTemplate?.name || 'Standard Disaster Relief Pack'}&rdquo;
              </h3>
              <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded">
                Family Conversion Factor: 5 Persons = 1 Household
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Standardized CSWDO humanitarian relief quota approved for urban evacuees in Zamboanga City shelters:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {templateItems.map((item, idx) => {
                const invItem = inventoryItems.find(it => String(it.id) === String(item.inventory_item_id));
                const isFam = item.allocation_type === 'per_family';
                return (
                  <div key={idx} className="bg-gray-50 border border-gray-200 p-2.5 rounded">
                    <span className="font-bold text-gray-900 block">{invItem?.item_name || 'Relief Item'}</span>
                    <span className="text-[11px] text-gray-600 block mt-0.5">
                      Quota:{' '}
                      <strong className="text-blue-700">
                        {item.quantity_per_head} {invItem?.unit_type || 'units'}
                      </strong>{' '}
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isFam ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isFam ? 'Per Family (per 5 pax)' : 'Per Individual Person'}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Itemized Allocation & Dispatch Table */}
          <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
              <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider">
                Itemized Relief Supply Requirement for {shelter.name}
              </h3>
              <span className="text-[10px] font-bold text-gray-500 uppercase">
                Calculated for {effectivePax} Base Pax + {bufferPercent}% Contingency ({calculatedBufferPax} Pax)
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300 text-gray-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Allocation Rule</th>
                  <th className="py-2.5 px-3 text-right">Base Need</th>
                  <th className="py-2.5 px-3 text-right">Buffer (+{bufferPercent}%)</th>
                  <th className="py-2.5 px-3 text-right">Total To Dispatch</th>
                  <th className="py-2.5 px-3 text-right">Warehouse ATP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {templateItems.map((item, idx) => {
                  const invItem = inventoryItems.find(it => String(it.id) === String(item.inventory_item_id));
                  const isFam = item.allocation_type === 'per_family';
                  const quota = item.quantity_per_head || 1;
                  const unit = invItem?.unit_type || 'units';

                  const baseMultiplier = isFam ? Math.max(1, Math.ceil(effectivePax / 5)) : effectivePax;
                  const totalMultiplier = manualBundleCount !== null
                    ? (isFam ? Math.max(1, Math.ceil(manualBundleCount / 5)) : manualBundleCount)
                    : (isFam
                        ? Math.max(baseMultiplier, Math.ceil((effectivePax + calculatedBufferPax + extraPacks) / 5))
                        : Math.max(1, effectivePax + calculatedBufferPax + extraPacks));
                  const bufferMultiplier = Math.max(0, totalMultiplier - baseMultiplier);

                  const baseQty = baseMultiplier * quota;
                  const bufferQty = bufferMultiplier * quota;
                  const totalQty = baseQty + bufferQty;

                  const avail = invItem
                    ? (invItem.available_stock ?? Math.max(0, invItem.total_stock - (invItem.reserved_quantity || 0)))
                    : 0;
                  const isShortage = totalQty > avail;

                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-bold text-gray-900">
                        {invItem?.item_name || 'Relief Item'}
                      </td>
                      <td className="py-2 px-3 text-gray-600 capitalize">
                        {(invItem?.category || 'General').replace('_', ' ')}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isFam ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isFam ? 'Per Family' : 'Per Person'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-gray-700">
                        {baseQty} {unit}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-emerald-700">
                        +{bufferQty} {unit}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-gray-900 text-sm">
                        {totalQty} {unit}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">
                        {isShortage ? (
                          <span className="text-red-700 font-bold">
                            ⚠️ Shortage ({avail} {unit})
                          </span>
                        ) : (
                          <span className="text-emerald-700">
                            ✓ {avail} {unit} Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Official Signatures Block */}
          <div className="grid grid-cols-3 gap-6 pt-4 border-t-2 border-gray-900 text-xs text-center">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-8">Prepared &amp; Requisitioned By:</p>
              <div className="border-b border-gray-400 pb-1 mb-1">
                <span className="font-bold text-gray-900 uppercase">CSWDO Logistics Officer</span>
              </div>
              <p className="text-[10px] text-gray-500">Disaster Response &amp; Intake Desk</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-8">Dispatched / Approved By:</p>
              <div className="border-b border-gray-400 pb-1 mb-1">
                <span className="font-bold text-gray-900 uppercase">Central Warehouse Custodian</span>
              </div>
              <p className="text-[10px] text-gray-500">Inventory Supply &amp; Transport Unit</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-8">Received At Shelter Desk By:</p>
              <div className="border-b border-gray-400 pb-1 mb-1">
                <span className="font-bold text-gray-900 uppercase">Shelter Camp Manager</span>
              </div>
              <p className="text-[10px] text-gray-500">{shelter.name} — Brgy. {shelter.barangay || 'Council'}</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 pt-2 border-t border-gray-200 text-[9px] text-gray-400 text-center flex justify-between items-center">
            <span>EvacRoute CSWDO Logistics Engine • Republic of the Philippines</span>
            <span>Generated: {formattedDate} {formattedTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
