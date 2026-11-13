import { useRef, useMemo, useEffect } from 'react';
import { Printer, X, Package, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PrintStockReportModal({ items = [], onCancel }) {
  const printableRef = useRef(null);

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
    const originalTitle = document.title;
    const dateStr = new Date().toISOString().slice(0, 10);
    document.title = `CSWDO_Relief_Stock_Report_${dateStr}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
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

  const totalSKUs = items.length;
  const totalPhysicalStock = items.reduce((sum, it) => sum + (it.total_stock || 0), 0);
  const totalReservedStock = items.reduce((sum, it) => sum + (it.reserved_quantity || 0), 0);
  const totalAvailableStock = items.reduce(
    (sum, it) => sum + (it.available_stock ?? Math.max(0, (it.total_stock || 0) - (it.reserved_quantity || 0))),
    0
  );
  const criticalItems = items.filter(
    (it) => (it.available_stock ?? Math.max(0, (it.total_stock || 0) - (it.reserved_quantity || 0))) < 200
  );

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      className="print-modal-overlay fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-[120] flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static print:block"
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        @media print {
          html, body {
            background: white !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden;
          }
          .print-modal-overlay,
          .print-modal-overlay * {
            visibility: visible;
          }
          .print-modal-overlay {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            width: 100% !important;
          }
          .print-modal-card {
            position: static !important;
            display: block !important;
            border: none !important;
            box-shadow: none !important;
            max-width: none !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .print-modal-content {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="print-modal-card bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden border border-gray-200 print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
        {/* Fixed Top Action Bar (Always Visible at Top of Modal, Hidden on Print) */}
        <div className="no-print shrink-0 bg-slate-900 text-white px-5 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center border-b border-slate-800 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/30 p-2 rounded-lg text-blue-400">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Relief Stock Monitoring Report</h3>
              <p className="text-xs text-slate-400">Official CSWDO Central Warehouse Stock Audit</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
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
        <div id="printable-stock-report" ref={printableRef} className="print-modal-content overflow-y-auto flex-1 p-6 sm:p-8 font-sans text-gray-900 bg-white print:overflow-visible print:p-0 print:static">
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
              Emergency Operations Center (EOC) • Central Disaster Relief Warehouse
            </h2>
            <div className="mt-2 inline-block bg-blue-50 border border-blue-200 px-4 py-1 rounded text-xs font-mono font-bold tracking-wider text-blue-900 uppercase">
              OFFICIAL RELIEF SUPPLIES INVENTORY AUDIT &amp; AVAILABILITY REPORT
            </div>
          </div>

          {/* Audit Metadata & Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-xs">
            <div className="bg-gray-50 border border-gray-300 p-3 rounded-lg">
              <span className="text-gray-500 font-semibold uppercase text-[10px] block">Total Relief SKUs</span>
              <span className="text-xl font-black text-gray-900 mt-0.5 block">{totalSKUs}</span>
              <span className="text-[10px] text-gray-500">Cataloged supply lines</span>
            </div>

            <div className="bg-gray-50 border border-gray-300 p-3 rounded-lg">
              <span className="text-gray-500 font-semibold uppercase text-[10px] block">Physical On-Hand</span>
              <span className="text-xl font-black text-gray-900 mt-0.5 block">{totalPhysicalStock.toLocaleString()}</span>
              <span className="text-[10px] text-gray-500">Total units in warehouse</span>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <span className="text-blue-700 font-semibold uppercase text-[10px] block">Reserved for Dispatches</span>
              <span className="text-xl font-black text-blue-800 mt-0.5 block">{totalReservedStock.toLocaleString()}</span>
              <span className="text-[10px] text-blue-600">Pending shelter delivery</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
              <span className="text-emerald-700 font-semibold uppercase text-[10px] block">Available to Promise (ATP)</span>
              <span className="text-xl font-black text-emerald-800 mt-0.5 block">{totalAvailableStock.toLocaleString()}</span>
              <span className="text-[10px] text-emerald-600">Uncommitted ready stock</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-600 mb-4 px-1">
            <span><strong>Warehouse Facility:</strong> Zamboanga City Central Disaster Logistics Hub, Tetuan</span>
            <span><strong>Audit Timestamp:</strong> {formattedDate} at {formattedTime}</span>
          </div>

          {/* Critical Shortage Warning Box (If any) */}
          {criticalItems.length > 0 && (
            <div className="mb-6 p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-900">
              <div className="font-bold flex items-center gap-1.5 text-red-800 uppercase text-[11px] mb-1">
                <AlertCircle size={14} className="text-red-600" />
                Critical Inventory Deficits Alert ({criticalItems.length} SKUs &lt; 200 Units Available)
              </div>
              <p className="text-[11px] text-red-700">
                The following relief items have uncommitted stock levels below the 200-unit emergency safety threshold:{' '}
                <strong>
                  {criticalItems.map((it) => {
                    const av = it.available_stock ?? Math.max(0, (it.total_stock || 0) - (it.reserved_quantity || 0));
                    return `${it.item_name} (${av} ${it.unit_type})`;
                  }).join(', ')}
                </strong>
                . Re-procurement or inter-agency mutual aid requisition required immediately.
              </p>
            </div>
          )}

          {/* Full Inventory Table */}
          <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Item Name &amp; Description</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-right">Physical Stock</th>
                  <th className="py-2.5 px-3 text-right">Committed</th>
                  <th className="py-2.5 px-3 text-right">Available (ATP)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => {
                  const avail = item.available_stock ?? Math.max(0, (item.total_stock || 0) - (item.reserved_quantity || 0));
                  const isCritical = avail < 200;
                  const isWarning = avail >= 200 && avail < 500;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        {item.item_name}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 capitalize">
                        {(item.category || 'General').replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 font-mono text-[11px]">
                        {item.unit_type}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-gray-800">
                        {(item.total_stock || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-blue-700">
                        {(item.reserved_quantity || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-gray-900 text-sm">
                        {avail.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isCritical ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                            Critical Deficit
                          </span>
                        ) : isWarning ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Reorder Soon
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Healthy
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
          <div className="print-avoid-break grid grid-cols-2 gap-8 pt-6 border-t-2 border-gray-900 text-xs text-center">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-8">Audited &amp; Certified By:</p>
              <div className="border-b border-gray-400 pb-1 mb-1">
                <span className="font-bold text-gray-900 uppercase">Warehouse Logistics Custodian</span>
              </div>
              <p className="text-[10px] text-gray-500">CSWDO Central Disaster Supply Depot</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-8">Verified &amp; Approved By:</p>
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
