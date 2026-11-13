import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, ClipboardList, Users, User, Package, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

function RationTemplateForm({ items = [], initialTemplate = null, onCancel, onCreate, onUpdate }) {
  const isEditing = Boolean(initialTemplate && initialTemplate.id);

  const [templateName, setTemplateName] = useState(initialTemplate?.name || '');
  const [isActive, setIsActive] = useState(initialTemplate ? Boolean(initialTemplate.is_active) : true);
  
  // Initialize rows from initialTemplate or default empty row
  const [rationItems, setRationItems] = useState(() => {
    if (initialTemplate && Array.isArray(initialTemplate.items) && initialTemplate.items.length > 0) {
      return initialTemplate.items.map(it => ({
        inventory_item_id: String(it.inventory_item_id || it.inventory_item?.id || it.inventoryItem?.id || ''),
        quantity_per_head: Number(it.quantity_per_head) || 1,
        allocation_type: it.allocation_type || 'per_head',
      }));
    }
    return [{ inventory_item_id: '', quantity_per_head: 1, allocation_type: 'per_family' }];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const addRow = () => {
    // Find first item not already in list
    const usedIds = new Set(rationItems.map(r => String(r.inventory_item_id)));
    const nextAvail = items.find(it => !usedIds.has(String(it.id)));
    setRationItems([
      ...rationItems,
      {
        inventory_item_id: nextAvail ? String(nextAvail.id) : '',
        quantity_per_head: 1,
        allocation_type: 'per_head',
      }
    ]);
  };

  const removeRow = (index) => {
    if (rationItems.length <= 1) return;
    setRationItems(rationItems.filter((_, i) => i !== index));
  };

  const updateRow = (index, field, value) => {
    const updated = [...rationItems];
    updated[index] = { ...updated[index], [field]: value };
    setRationItems(updated);
    setValidationError('');
  };

  const selectedItemIds = new Set(rationItems.map(r => String(r.inventory_item_id)).filter(Boolean));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!templateName.trim()) {
      setValidationError('Please enter a template name.');
      return;
    }

    const validItems = rationItems.filter(i => i.inventory_item_id && Number(i.quantity_per_head) > 0);
    if (validItems.length === 0) {
      setValidationError('Please add at least one item with a valid quantity.');
      return;
    }

    // Check for duplicate items
    const idSet = new Set();
    for (const it of validItems) {
      if (idSet.has(it.inventory_item_id)) {
        setValidationError('Duplicate items detected in the template. Please merge into a single row.');
        return;
      }
      idSet.add(it.inventory_item_id);
    }

    setIsSubmitting(true);
    setValidationError('');

    const payload = {
      name: templateName.trim(),
      is_active: isActive,
      items: validItems.map(i => ({
        inventory_item_id: parseInt(i.inventory_item_id, 10),
        quantity_per_head: parseInt(i.quantity_per_head, 10),
        allocation_type: i.allocation_type || 'per_head',
      })),
    };

    try {
      if (isEditing && onUpdate) {
        await onUpdate(initialTemplate.id, payload);
      } else {
        await onCreate(payload);
      }
    } catch (err) {
      setValidationError(err?.response?.data?.message || 'Failed to save ration template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulation calculations for preview
  const simFamilyHeadcount = 5;

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <ClipboardList size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg leading-snug">
                {isEditing ? 'Edit Ration Template' : 'Build New Ration Template'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Configure standardized relief goods issued upon shelter check-in.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onCancel} 
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {validationError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 font-medium">
              <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Template Name & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400"
                placeholder="e.g. DSWD Standard Family Pack + Water"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="pt-1 sm:pt-6">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/60 cursor-pointer hover:bg-gray-100/60 transition">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                />
                <div className="text-xs">
                  <span className="font-bold text-gray-800 dark:text-slate-200 block">Set as Active</span>
                  <span className="text-[10px] text-gray-500 dark:text-slate-400">Live check-in profile</span>
                </div>
              </label>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-slate-800">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 block">
                  Supplies &amp; Allocation Rules
                </label>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Select whether each item is granted <strong>Per Household (Family)</strong> or <strong>Per Individual (Person)</strong>.
                </p>
              </div>
              <button 
                type="button" 
                onClick={addRow} 
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 dark:text-blue-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border border-blue-200 dark:border-blue-800/80 cursor-pointer"
              >
                <Plus size={14} /> Add Supply
              </button>
            </div>

            <div className="space-y-3">
              {rationItems.map((row, index) => {
                const selectedInv = items.find(it => String(it.id) === String(row.inventory_item_id));
                const availStock = selectedInv ? (selectedInv.available_stock ?? Math.max(0, selectedInv.total_stock - (selectedInv.reserved_quantity || 0))) : null;

                return (
                  <div 
                    key={index} 
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-950/30 space-y-2.5 transition hover:border-blue-200 dark:hover:border-blue-900/60"
                  >
                    <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                      {/* Item Selector */}
                      <div className="flex-1 w-full">
                        <select
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                          value={row.inventory_item_id}
                          onChange={e => updateRow(index, 'inventory_item_id', e.target.value)}
                          required
                        >
                          <option value="">Select relief supply...</option>
                          {items.map(item => {
                            const isAlreadySelected = selectedItemIds.has(String(item.id)) && String(item.id) !== String(row.inventory_item_id);
                            return (
                              <option 
                                key={item.id} 
                                value={item.id}
                                disabled={isAlreadySelected}
                              >
                                {item.item_name} ({item.unit_type}) — Avail: {item.available_stock ?? Math.max(0, item.total_stock - (item.reserved_quantity || 0))} {item.unit_type}
                                {isAlreadySelected ? ' (Already in list)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Quantity Input */}
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium sm:hidden">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          className="w-20 px-2.5 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                          value={row.quantity_per_head}
                          onChange={e => updateRow(index, 'quantity_per_head', Math.max(1, parseInt(e.target.value, 10) || 1))}
                          placeholder="Qty"
                        />
                        <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 min-w-[50px] truncate">
                          {selectedInv?.unit_type || 'units'}
                        </span>
                      </div>

                      {/* Allocation Mode Segmented Pill */}
                      <div className="flex items-center bg-gray-200 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-300 dark:border-slate-700 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateRow(index, 'allocation_type', 'per_family')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                            row.allocation_type === 'per_family'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                          }`}
                          title="Allocated once per registered family household"
                        >
                          <Users size={12} />
                          <span>Per Family</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRow(index, 'allocation_type', 'per_head')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                            row.allocation_type === 'per_head'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                          }`}
                          title="Multiplied by total persons in the family"
                        >
                          <User size={12} />
                          <span>Per Person</span>
                        </button>
                      </div>

                      {/* Remove Row Button */}
                      {rationItems.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeRow(index)} 
                          className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 cursor-pointer"
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Explanatory Rule Subtitle */}
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center justify-between px-1">
                      <span>
                        {row.allocation_type === 'per_family' ? (
                          <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                            🏠 <strong>Per Household:</strong> 1 family gets exactly {row.quantity_per_head} {selectedInv?.unit_type || 'units'} upon registration.
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                            👤 <strong>Per Individual:</strong> Multiplied by verified family headcount ({row.quantity_per_head} × members).
                          </span>
                        )}
                      </span>
                      {availStock !== null && (
                        <span className={`text-[10px] font-bold ${availStock < 100 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-slate-500'}`}>
                          Warehouse Free: {availStock} {selectedInv?.unit_type}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Check-in Simulation Box */}
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
              <Sparkles size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Distribution Simulation (Example Family of {simFamilyHeadcount} Pax)
              </h4>
            </div>
            <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
              Upon scanning this family at the shelter, the system will automatically issue:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {rationItems.filter(r => r.inventory_item_id).map((row, idx) => {
                const inv = items.find(it => String(it.id) === String(row.inventory_item_id));
                const totalIssued = row.allocation_type === 'per_family' 
                  ? Number(row.quantity_per_head) 
                  : Number(row.quantity_per_head) * simFamilyHeadcount;

                return (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800 shadow-2xs"
                  >
                    <CheckCircle2 size={13} className="text-blue-600 dark:text-blue-400" />
                    <span>{inv?.item_name || 'Item'}:</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {totalIssued} {inv?.unit_type || 'units'}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">
                      ({row.allocation_type === 'per_family' ? '1 pack/fam' : `${row.quantity_per_head}×${simFamilyHeadcount}pax`})
                    </span>
                  </span>
                );
              })}
              {rationItems.filter(r => r.inventory_item_id).length === 0 && (
                <span className="text-xs text-gray-400 italic">Select supplies above to view live calculation.</span>
              )}
            </div>
          </div>
        </form>

        {/* Modal Actions */}
        <div className="flex gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/50">
          <button 
            type="button" 
            onClick={onCancel} 
            className="flex-1 bg-white hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Save Template Changes' : 'Create Template')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RationTemplateForm;
