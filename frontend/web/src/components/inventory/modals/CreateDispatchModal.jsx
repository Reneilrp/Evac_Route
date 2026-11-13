import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Sparkles, Truck } from 'lucide-react';
import api from '../../../services/api';

// --- Create Dispatch Modal ---
function CreateDispatchModal({ inventoryItems, shelters, activeTemplate, onCancel, onCreated }) {
  const [shelterId, setShelterId] = useState('');
  const [notes, setNotes] = useState('');
  const [manifest, setManifest] = useState([{ inventory_item_id: '', quantity: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [contingencyInfo, setContingencyInfo] = useState('');

  const selectedShelterObj = shelters.find(s => String(s.id) === String(shelterId));

  const applyContingencyCalculation = () => {
    if (!selectedShelterObj) {
      setError('Please select a destination shelter first.');
      return;
    }
    const baseOccupancy = Math.max(1, selectedShelterObj.current_occupancy || 10);
    const bufferCount = Math.ceil(baseOccupancy * 1.20);
    const addedMargin = bufferCount - baseOccupancy;

    if (activeTemplate && Array.isArray(activeTemplate.items) && activeTemplate.items.length > 0) {
      const generatedRows = activeTemplate.items.map(tItem => {
        const matchingInv = inventoryItems.find(it => String(it.id) === String(tItem.inventory_item_id || tItem.inventoryItem?.id));
        const isFam = tItem.allocation_type === 'per_family';
        const targetUnits = isFam ? Math.max(1, Math.ceil(bufferCount / 5)) : bufferCount;
        const perHead = Number(tItem.quantity_per_head) || 1;
        const totalNeeded = Math.ceil(perHead * targetUnits);
        const avail = matchingInv?.available_stock ?? matchingInv?.total_stock ?? totalNeeded;
        return {
          inventory_item_id: matchingInv ? String(matchingInv.id) : (inventoryItems[0]?.id ? String(inventoryItems[0].id) : ''),
          quantity: Math.min(totalNeeded, Math.max(1, avail))
        };
      });
      setManifest(generatedRows.filter(r => r.inventory_item_id));
      setNotes(`Automated Demand Calculation: ${baseOccupancy} Evacuees + 20% Emergency Contingency Buffer (+${addedMargin}) = ${bufferCount} target ration packs. Template: ${activeTemplate.name}.`);
      setContingencyInfo(`✓ Applied Template (${activeTemplate.name}): ${baseOccupancy} evacuees + 20% buffer (+${addedMargin}) = ${bufferCount} portions.`);
      setError('');
    } else {
      // Fallback if no template: distribute available items with 20% buffer
      const essentialItems = inventoryItems.slice(0, 3).map(it => ({
        inventory_item_id: String(it.id),
        quantity: Math.min(bufferCount, Math.max(1, it.available_stock ?? it.total_stock ?? bufferCount))
      }));
      setManifest(essentialItems);
      setNotes(`Automated Demand Calculation: ${baseOccupancy} Evacuees + 20% Emergency Contingency Buffer (+${addedMargin}) = ${bufferCount} target portions.`);
      setContingencyInfo(`✓ Standard buffer applied: ${baseOccupancy} evacuees + 20% contingency (+${addedMargin}) = ${bufferCount} portions.`);
      setError('');
    }
  };

  const addRow = () => setManifest([...manifest, { inventory_item_id: '', quantity: 1 }]);
  const removeRow = (i) => setManifest(manifest.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => {
    const updated = [...manifest];
    updated[i] = { ...updated[i], [field]: value };
    setManifest(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shelterId) { setError('Please select a destination shelter.'); return; }
    const validItems = manifest.filter(r => r.inventory_item_id && r.quantity > 0);
    if (validItems.length === 0) { setError('Add at least one item to the manifest.'); return; }

    // Client-side ATP validation
    for (const row of validItems) {
      const invItem = inventoryItems.find(it => String(it.id) === String(row.inventory_item_id));
      if (invItem) {
        const avail = invItem.available_stock ?? Math.max(0, invItem.total_stock - (invItem.reserved_quantity || 0));
        const qty = parseInt(row.quantity, 10);
        if (qty > avail) {
          setError(`Cannot dispatch ${qty} ${invItem.unit_type} of ${invItem.item_name}. Only ${avail} ${invItem.unit_type} are available to promise (Physical Total: ${invItem.total_stock}, Already Reserved: ${invItem.reserved_quantity || 0}).`);
          return;
        }
      }
    }

    setIsSubmitting(true); setError('');
    try {
      await api.post('/dispatch-orders', {
        shelter_id: parseInt(shelterId, 10),
        notes: notes || null,
        items: validItems.map(r => ({ inventory_item_id: parseInt(r.inventory_item_id, 10), quantity: parseInt(r.quantity, 10) })),
      });
      onCreated();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to create dispatch order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <Truck size={20} className="text-blue-500" /> New Dispatch Order
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Destination Shelter</label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              value={shelterId} onChange={e => { setShelterId(e.target.value); setContingencyInfo(''); }} required
            >
              <option value="">Select a shelter…</option>
              {shelters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.status}) — Occupancy: {s.current_occupancy || 0}</option>)}
            </select>
            {shelterId && (
              <div className="mt-2.5 flex items-center justify-between bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-lg p-2.5">
                <span className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                  Current Occupancy: <strong>{selectedShelterObj?.current_occupancy || 0} evacuees</strong>
                </span>
                <button
                  type="button"
                  onClick={applyContingencyCalculation}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-sm transition flex items-center gap-1.5"
                >
                  <Sparkles size={13} /> Auto-Calculate Demand (+20% Buffer)
                </button>
              </div>
            )}
            {contingencyInfo && (
              <div className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-lg px-3 py-1.5">
                {contingencyInfo}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Manifest</label>
            <div className="space-y-2">
              {manifest.map((row, i) => {
                const selectedItem = inventoryItems.find(it => String(it.id) === String(row.inventory_item_id));
                const itemAvail = selectedItem ? (selectedItem.available_stock ?? Math.max(0, selectedItem.total_stock - (selectedItem.reserved_quantity || 0))) : null;

                return (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      value={row.inventory_item_id} onChange={e => updateRow(i, 'inventory_item_id', e.target.value)}
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
                      type="number" min="1" max={itemAvail !== null ? itemAvail : undefined} placeholder="Qty"
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      value={row.quantity} onChange={e => updateRow(i, 'quantity', e.target.value)}
                    />
                    {manifest.length > 1 && (
                      <button type="button" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 transition">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={addRow} className="mt-2 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline flex items-center gap-1">
              <Plus size={14} /> Add Item
            </button>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Instructions for Staff (optional)</label>
            <textarea
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              rows={2} placeholder="e.g. Priority delivery — shelter at 85% capacity"
              value={notes} onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 py-2.5 rounded-lg font-semibold text-sm transition cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2">
              {isSubmitting ? 'Creating…' : 'Create & Notify Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateDispatchModal;
