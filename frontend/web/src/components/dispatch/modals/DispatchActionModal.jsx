import React from 'react';
import { X, Truck, CheckCircle2, AlertTriangle, ShieldCheck, MapPin, Package } from 'lucide-react';

/**
 * Custom Confirmation & Status Transition Modal for CSWDO Dispatch Orders.
 * Replaces browser window.confirm with an official, mission-critical modal.
 */
export default function DispatchActionModal({
  isOpen,
  type, // 'depart' | 'deliver' | 'cancel'
  order,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  if (!isOpen || !order) return null;

  const controlNo = `ZAM-LOGISTICS-${String(order.id).padStart(5, '0')}`;
  const shelterName = order.shelter?.name || 'Designated Evacuation Center';
  const barangay = order.shelter?.barangay || 'Zamboanga City';

  const isDepart = type === 'depart';
  const isDeliver = type === 'deliver';
  const isCancel = type === 'cancel';

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[130] flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 flex justify-between items-center text-white ${
          isDepart
            ? 'bg-amber-600 dark:bg-amber-700'
            : isDeliver
            ? 'bg-emerald-600 dark:bg-emerald-700'
            : 'bg-rose-600 dark:bg-rose-700'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              {isDepart && <Truck size={20} />}
              {isDeliver && <CheckCircle2 size={20} />}
              {isCancel && <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">
                {isDepart && 'Dispatch Order: Load & Depart'}
                {isDeliver && 'Shelter Intake: Confirm Delivery'}
                {isCancel && 'Cancel Dispatch Order'}
              </h3>
              <p className="text-[11px] text-white/80 font-mono font-semibold">
                Control No: {controlNo}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg transition disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs text-slate-700 dark:text-slate-200">
          {/* Destination Shelter Details */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <MapPin size={12} className="text-blue-500" />
              <span>Target Evacuation Facility</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  {shelterName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Brgy. {barangay}
                </p>
              </div>
              {order.shelter?.current_occupancy !== undefined && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Census</span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-xs">
                    {order.shelter.current_occupancy} Pax
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Manifest Cargo Summary */}
          {order.items && order.items.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700/70 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <Package size={12} className="text-amber-500" />
                <span>Manifested Relief Commodities ({order.items.length} Line Items)</span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-36 overflow-y-auto pr-1 space-y-1">
                {order.items.map((it, idx) => (
                  <li key={it.id || idx} className="pt-1 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {it.inventory_item?.item_name || it.item_name || 'Relief Item'}
                    </span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                      × {Number(it.quantity).toLocaleString()} {it.inventory_item?.unit_type || it.unit_type || 'units'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Context Advisory / Impact Notice */}
          {isDepart && (
            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 space-y-1 text-amber-900 dark:text-amber-200">
              <p className="font-bold text-xs flex items-center gap-1.5">
                <Truck size={14} className="text-amber-700 dark:text-amber-400" />
                Warehouse Loading &amp; Departure Checklist:
              </p>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                Confirm all commodities are verified, loaded onto the vehicle, and the driver has signed the paper manifest.
                Submitting will update the order status to <strong>In Transit (Dispatched)</strong> and log the official departure time.
              </p>
            </div>
          )}

          {isDeliver && (
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3.5 space-y-1 text-emerald-900 dark:text-emerald-200">
              <p className="font-bold text-xs flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-700 dark:text-emerald-400" />
                Shelter Handover &amp; Physical Stock Deduction:
              </p>
              <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                Confirm that the transport vehicle has arrived and the Shelter Camp Manager has verified and accepted the items.
                <strong> Central Warehouse physical stock will be permanently deducted immediately.</strong>
              </p>
            </div>
          )}

          {isCancel && (
            <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl p-3.5 space-y-1 text-rose-900 dark:text-rose-200">
              <p className="font-bold text-xs flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-700 dark:text-rose-400" />
                Stock Release Notice:
              </p>
              <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
                Are you sure you want to cancel Order #{order.id}? All currently reserved commodities will be immediately released back to Central Warehouse Available-to-Promise (ATP) stock.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onConfirm(order.id)}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-60 cursor-pointer ${
              isDepart
                ? 'bg-amber-600 hover:bg-amber-700'
                : isDeliver
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {isDepart && (
              <>
                <Truck size={14} />
                {isSubmitting ? 'Marking Departed...' : 'Confirm Load & Depart'}
              </>
            )}
            {isDeliver && (
              <>
                <CheckCircle2 size={14} />
                {isSubmitting ? 'Confirming Arrival...' : 'Confirm Delivery & Deduct'}
              </>
            )}
            {isCancel && (
              <>
                <AlertTriangle size={14} />
                {isSubmitting ? 'Cancelling Order...' : 'Cancel Order & Release Stock'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
