import { useRef, useMemo } from 'react';
import { Printer, X, Shield, Truck } from 'lucide-react';

export default function PrintDispatchManifestModal({ order, shelterDetails, onCancel }) {
  const printableRef = useRef(null);

  const orderCreatedAt = order?.created_at;
  const orderDate = useMemo(() => (orderCreatedAt ? new Date(orderCreatedAt) : new Date()), [orderCreatedAt]);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const shelter = shelterDetails || order.shelter || {};
  const formattedDate = orderDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-manifest, #printable-manifest * {
            visibility: visible;
          }
          #printable-manifest {
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

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden border border-gray-200 print:border-none print:shadow-none print:my-0 print:max-w-none">
        {/* Modal Action Bar (Hidden on Print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/30 p-2 rounded-lg text-blue-400">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base">Disaster Relief Requisition Manifest</h3>
              <p className="text-xs text-slate-400">Official COA &amp; LGU Compliant Dispatch Voucher</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg flex items-center gap-2 shadow transition"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div id="printable-manifest" ref={printableRef} className="p-8 font-sans text-gray-900 bg-white">
          {/* Official Letterhead */}
          <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
            <div className="flex justify-center items-center gap-2 text-xs uppercase tracking-widest text-gray-600 font-semibold mb-1">
              <span>Republic of the Philippines</span>
              <span>•</span>
              <span>City Government of Zamboanga</span>
            </div>
            <h1 className="text-lg font-black tracking-tight text-gray-900 uppercase">
              City Disaster Risk Reduction &amp; Management Office (CDRRMO)
            </h1>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mt-0.5">
              In Coordination with City Social Welfare &amp; Development Office (CSWDO)
            </h2>
            <div className="mt-2 inline-block bg-gray-100 border border-gray-300 px-4 py-1 rounded text-xs font-mono font-bold tracking-wider uppercase">
              Emergency Operations Center (EOC) — Relief Logistics Voucher
            </div>
          </div>

          {/* Control Header & Meta */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 border border-gray-300 p-4 rounded-lg mb-6 text-xs">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Manifest Control No.</p>
              <p className="font-mono font-black text-sm text-blue-900">
                ZAM-LOGISTICS-{String(order.id).padStart(5, '0')}
              </p>
              <p className="text-gray-500 font-semibold uppercase text-[10px] mt-2">Issuance Date &amp; Time</p>
              <p className="font-bold text-gray-800">{formattedDate} at {formattedTime}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 font-semibold uppercase text-[10px]">Order Status</p>
              <p className="font-bold text-xs uppercase tracking-wider text-amber-700">
                {order.status === 'pending' ? 'PENDING DISPATCH / PREPARATION' :
                 order.status === 'in_transit' ? 'IN TRANSIT (DISPATCHED)' :
                 order.status === 'delivered' ? 'DELIVERED & RECEIVED' : order.status}
              </p>
              <p className="text-gray-500 font-semibold uppercase text-[10px] mt-2">Prepared Under</p>
              <p className="font-bold text-gray-800">DRRM-CSWDO Unified Command</p>
            </div>
          </div>

          {/* Destination & Evacuation Shelter Info */}
          <div className="border border-gray-300 rounded-lg p-4 mb-6">
            <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider mb-2 border-b border-gray-200 pb-1 flex items-center gap-1.5">
              <Shield size={13} className="text-blue-600" />
              1. Evacuation Shelter &amp; Beneficiary Profile
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] font-semibold uppercase">Target Shelter</span>
                <span className="font-bold text-gray-900">{shelter.name || 'Evacuation Center'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] font-semibold uppercase">Barangay Location</span>
                <span className="font-bold text-gray-900">{shelter.barangay || 'Zamboanga City'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] font-semibold uppercase">Shelter Occupancy</span>
                <span className="font-bold text-blue-800">
                  {shelter.current_occupancy !== undefined ? `${shelter.current_occupancy} Evacuees` : 'Active Census'}
                  {shelter.max_capacity ? ` (Cap: ${shelter.max_capacity})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Manifest Table */}
          <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
              <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">
                2. Approved Relief Supplies &amp; Food Pack Allocation
              </h3>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 font-bold text-gray-700">
                  <th className="py-2.5 px-3 w-12 text-center">Item</th>
                  <th className="py-2.5 px-3">Stock Description &amp; Item Specification</th>
                  <th className="py-2.5 px-3 text-center">Packaging Unit</th>
                  <th className="py-2.5 px-3 text-right">Requisitioned Qty</th>
                  <th className="py-2.5 px-3 text-center w-28">Verified / Loaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.items && order.items.length > 0 ? (
                  order.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-2.5 px-3 text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {it.inventory_item?.item_name || it.item_name || 'Relief Item'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-600">
                        {it.inventory_item?.unit_type || it.unit_type || 'units'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-gray-900 text-sm">
                        {Number(it.quantity).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center text-gray-400 font-mono text-[10px]">
                        [ &nbsp; ] Checked
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500 italic">No itemized goods specified.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Road Clearance & Safe Delivery Route Advisory */}
          <div className="border border-gray-300 rounded-lg p-3.5 mb-8 bg-amber-50/50 text-xs">
            <h4 className="font-bold text-amber-900 uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1.5">
              <Truck size={13} className="text-amber-700" />
              3. Transport Advisory &amp; Safe Logistics Route
            </h4>
            <p className="text-gray-700 text-xs leading-relaxed">
              {order.notes ? (
                <span><strong>Special Directives:</strong> {order.notes}</span>
              ) : (
                <span><strong>Standard Advisory:</strong> Dispatch via verified passable arterial roads. Avoid reported low-elevation flood paths and consult CDRRMO EOC Live Map before bridge crossings.</span>
              )}
            </p>
          </div>

          {/* Official Signatures & COA Compliance Block */}
          <div className="pt-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">
              Official Certifications &amp; Custody Turnover Sign-off
            </p>
            <div className="grid grid-cols-4 gap-4 text-center">
              {/* Box 1 */}
              <div className="border-t border-gray-400 pt-2">
                <p className="font-bold text-xs text-gray-900">CDRRMO Controller</p>
                <p className="text-[10px] text-gray-500">Requisition Initiator</p>
                <div className="h-8"></div>
                <p className="text-[10px] text-gray-400 font-mono">Sign &amp; Date</p>
              </div>

              {/* Box 2 */}
              <div className="border-t border-gray-400 pt-2">
                <p className="font-bold text-xs text-gray-900">CSWDO Logistics Chief</p>
                <p className="text-[10px] text-gray-500">Approved &amp; Released</p>
                <div className="h-8"></div>
                <p className="text-[10px] text-gray-400 font-mono">Sign &amp; Date</p>
              </div>

              {/* Box 3 */}
              <div className="border-t border-gray-400 pt-2">
                <p className="font-bold text-xs text-gray-900">Logistics Driver</p>
                <p className="text-[10px] text-gray-500">Transport &amp; Custody</p>
                <div className="h-8"></div>
                <p className="text-[10px] text-gray-400 font-mono">Plate No. / Signature</p>
              </div>

              {/* Box 4 */}
              <div className="border-t border-gray-400 pt-2">
                <p className="font-bold text-xs text-gray-900">Shelter Camp Manager</p>
                <p className="text-[10px] text-gray-500">Received &amp; Stock Counted</p>
                <div className="h-8"></div>
                <p className="text-[10px] text-gray-400 font-mono">Sign &amp; Date</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center border-t border-gray-200 pt-3 text-[9px] text-gray-400">
            Evac_Route Disaster Logistics Management System • Zamboanga City EOC • Republic Act 10121 Compliance
          </div>
        </div>
      </div>
    </div>
  );
}
