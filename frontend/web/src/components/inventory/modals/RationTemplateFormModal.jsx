import React, { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';

function RationTemplateForm({ items, onCancel, onCreate }) {
  const [templateName, setTemplateName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [rationItems, setRationItems] = useState([{ inventory_item_id: '', quantity_per_head: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addRow = () => setRationItems([...rationItems, { inventory_item_id: '', quantity_per_head: 1 }]);
  const removeRow = (index) => setRationItems(rationItems.filter((_, i) => i !== index));
  const updateRow = (index, field, value) => {
    const updated = [...rationItems];
    updated[index] = { ...updated[index], [field]: value };
    setRationItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = rationItems.filter(i => i.inventory_item_id && i.quantity_per_head > 0);
    if (!templateName || validItems.length === 0) return;

    setIsSubmitting(true);
    await onCreate({
      name: templateName,
      is_active: isActive,
      items: validItems.map(i => ({
        inventory_item_id: parseInt(i.inventory_item_id),
        quantity_per_head: parseInt(i.quantity_per_head)
      }))
    });
    setIsSubmitting(false);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <ClipboardList size={20} className="text-blue-500" /> New Ration Template
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Template Name</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              placeholder="e.g. Level 1 Flood Kit"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="is-active"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            <label htmlFor="is-active" className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Set as Active Template <span className="text-gray-400 dark:text-slate-500 font-normal">(deactivates all others)</span>
            </label>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Items Per Head</label>
              <button type="button" onClick={addRow} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-bold flex items-center gap-1">
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {rationItems.map((row, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    value={row.inventory_item_id}
                    onChange={e => updateRow(index, 'inventory_item_id', e.target.value)}
                    required
                  >
                    <option value="">Select item...</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.item_name} ({item.unit_type})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    value={row.quantity_per_head}
                    onChange={e => updateRow(index, 'quantity_per_head', e.target.value)}
                    placeholder="Qty"
                  />
                  {rationItems.length > 1 && (
                    <button type="button" onClick={() => removeRow(index)} className="text-red-400 hover:text-red-600 transition">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 py-2.5 rounded-lg font-semibold text-sm transition cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition disabled:opacity-60">
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Adjust Stock Modal ---

export default RationTemplateForm;
