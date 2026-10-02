import { useState } from 'react';
import { Truck, X, Plus, Trash2, ShieldAlert } from 'lucide-react';
import api from '../services/api';

export default function PrePopulatedDispatchModal({
  initialShelterId = '',
  initialManifest = [],
  initialNotes = '',
  inventoryItems = [],
  shelters = [],
  onCancel,
  onCreated,
}) {
  const [shelterId, setShelterId] = useState(initialShelterId || '');
  const [notes, setNotes] = useState(initialNotes || '');
  const [manifest, setManifest] = useState(
    initialManifest.length > 0 ? initialManifest : [{ inventory_item_id: '', quantity: 1 }]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addRow = () => setManifest([...manifest, { inventory_item_id: '', quantity: 1 }]);
  const removeRow = (i) => setManifest(manifest.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => {
    const updated = [...manifest];
    updated[i] = { ...updated[i], [field]: value };
    setManifest(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shelterId) {
      setError('Please select a destination shelter.');
      return;
    }
    const validItems = manifest.filter(r => r.inventory_item_id && parseInt(r.quantity, 10) > 0);
    if (validItems.length === 0) {
      setError('Add at least one item to the manifest.');
      return;
    }

    // Client-side ATP validation against available_stock
    for (const row of validItems) {
      const invItem = inventoryItems.find(it => String(it.id) === String(row.inventory_item_id));
      if (invItem) {
        const avail = invItem.available_stock ?? Math.max(0, invItem.total_stock - (invItem.reserved_quantity || 0));
        const qty = parseInt(row.quantity, 10);
        if (qty > avail) {
          setError(
            `Cannot dispatch ${qty} ${invItem.unit_type} of ${invItem.item_name}. Warehouse only has ${avail} ${invItem.unit_type} available to promise (Physical Total: ${invItem.total_stock}, Active Reservations: ${invItem.reserved_quantity || 0}). Please adjust quantity before confirming.`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);
    setError('');
    try {
      await api.post('/dispatch-orders', {
        shelter_id: parseInt(shelterId, 10),
        notes: notes || null,
        items: validItems.map(r => ({
          inventory_item_id: parseInt(r.inventory_item_id, 10),
          quantity: parseInt(r.quantity, 10),
        })),
      });
      onCreated();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to create dispatch order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const destShelter = shelters.find(s => String(s.id) === String(shelterId));

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg flex items-center gap-2">
              <Truck size={20} className="text-blue-500" /> Auto-Generated Dispatch Order
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Pre-populated from computed recommendations with real-time warehouse stock reservation.
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-semibold rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Destination Shelter
            </label>
            <select
              className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-800 dark:text-slate-100 bg-white dark:bg-slate-800"
              value={shelterId}
              onChange={e => setShelterId(e.target.value)}
              required
            >
              <option value="">Select a destination shelter…</option>
              {shelters.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.barangay || 'Area'}) — Occupancy: {s.current_occupancy}/{s.max_capacity}
                </option>
              ))}
            </select>
            {destShelter && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                📍 {destShelter.name} currently has {destShelter.max_capacity - destShelter.current_occupancy} open slots available.
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                Manifest Items (Pre-calculated)
              </label>
              <span className="text-[11px] text-gray-400 dark:text-slate-500">
                Validated against Available-To-Promise (ATP)
              </span>
            </div>
            <div className="space-y-2">
              {manifest.map((row, i) => {
                const selectedItem = inventoryItems.find(it => String(it.id) === String(row.inventory_item_id));
                const itemAvail = selectedItem
                  ? (selectedItem.available_stock ?? Math.max(0, selectedItem.total_stock - (selectedItem.reserved_quantity || 0)))
                  : null;
                const isShortage = selectedItem && itemAvail !== null && parseInt(row.quantity, 10) > itemAvail;

                return (
                  <div key={i} className="space-y-1 bg-gray-50/70 dark:bg-slate-950/50 p-2.5 rounded-lg border border-gray-200/70 dark:border-slate-800">
                    <div className="flex gap-2 items-center">
                      <select
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200"
                        value={row.inventory_item_id}
                        onChange={e => updateRow(i, 'inventory_item_id', e.target.value)}
                      >
                        <option value="">Select item…</option>
                        {inventoryItems.map(item => {
                          const avail = item.available_stock ?? Math.max(0, item.total_stock - (item.reserved_quantity || 0));
                          return (
                            <option key={item.id} value={item.id} disabled={avail <= 0}>
                              {item.item_name} (Avail: {avail} / Total: {item.total_stock} {item.unit_type}){avail <= 0 ? ' — Out of Stock' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max={itemAvail !== null ? itemAvail : undefined}
                        placeholder="Qty"
                        className={`w-28 px-3 py-2 border rounded-lg text-sm font-bold focus:outline-none focus:ring-2 bg-white dark:bg-slate-800 ${
                          isShortage
                            ? 'border-red-500 text-red-600 focus:ring-red-500'
                            : 'border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-100 focus:ring-blue-500'
                        }`}
                        value={row.quantity}
                        onChange={e => updateRow(i, 'quantity', e.target.value)}
                      />
                      {manifest.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          className="text-red-400 hover:text-red-600 transition p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {isShortage && (
                      <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold">
                        ⚠️ Requested {row.quantity} exceeds warehouse ATP of {itemAvail} {selectedItem.unit_type}. Adjust to ≤ {itemAvail}.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2 text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> Add Additional Item
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Instructions &amp; Planning Context
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Pre-emptive stocking for incoming evacuees"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
            >
              <Truck size={16} /> {isSubmitting ? 'Reserving & Creating…' : 'Confirm & Reserve Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
