import React, { useState } from 'react';
import { Package, X } from 'lucide-react';

export const DISASTER_RELIEF_ITEMS = [
  { name: 'Rice (50kg Sacks)', category: 'Food & Water', unit: 'sacks' },
  { name: 'Bottled Mineral Water (500ml)', category: 'Food & Water', unit: 'bottles' },
  { name: 'Canned Goods (Sardines/Corned Beef)', category: 'Food & Water', unit: 'cans' },
  { name: 'Instant Noodles (Packs)', category: 'Food & Water', unit: 'packs' },
  { name: 'Hygiene Kits (Soap/Toothbrush/Sanitary)', category: 'Sanitation & Hygiene', unit: 'kits' },
  { name: 'First Aid Kits', category: 'Medical & First Aid', unit: 'kits' },
  { name: 'Blankets & Sleeping Mats', category: 'Bedding & Shelter', unit: 'pieces' },
  { name: 'Infant Formula & Diapers', category: 'Food & Water', unit: 'boxes' },
  { name: 'Other (Custom Item)', category: 'Equipment & Tools', unit: 'pieces' },
];

export const INVENTORY_CATEGORIES = [
  'Food & Water',
  'Medical & First Aid',
  'Sanitation & Hygiene',
  'Bedding & Shelter',
  'Clothing & Personal',
  'Equipment & Tools'
];

export const UNIT_TYPES = [
  'sacks',
  'bottles',
  'boxes',
  'cans',
  'packs',
  'kits',
  'pieces',
  'sets'
];


export function AddStockModal({ onCancel, onAdd }) {
  const [selectedPreset, setSelectedPreset] = useState(DISASTER_RELIEF_ITEMS[0].name);
  const [customItemName, setCustomItemName] = useState('');
  const [category, setCategory] = useState(DISASTER_RELIEF_ITEMS[0].category);
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState(DISASTER_RELIEF_ITEMS[0].unit);

  const handlePresetChange = (name) => {
    setSelectedPreset(name);
    const found = DISASTER_RELIEF_ITEMS.find(i => i.name === name);
    if (found && found.name !== 'Other (Custom Item)') {
      setCategory(found.category);
      setUnit(found.unit);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalName = selectedPreset === 'Other (Custom Item)' ? customItemName.trim() : selectedPreset;
    if (!finalName || !stock || !unit) return;
    onAdd({ item_name: finalName, total_stock: parseInt(stock, 10), unit_type: unit });
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <Package size={20} className="text-blue-500" /> Receive New Delivery
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Item Name / Relief Preset</label>
            <select
              value={selectedPreset}
              onChange={e => handlePresetChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            >
              {DISASTER_RELIEF_ITEMS.map(i => (
                <option key={i.name} value={i.name}>{i.name}</option>
              ))}
            </select>
          </div>

          {selectedPreset === 'Other (Custom Item)' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Custom Item Name</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                placeholder="e.g. Tarpaulins, Emergency Radios"
                value={customItemName}
                onChange={e => setCustomItemName(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Item Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            >
              {INVENTORY_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Quantity</label>
              <input type="number" min="1" className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                placeholder="e.g. 500" value={stock} onChange={e => setStock(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Unit of Measurement</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                required
              >
                {UNIT_TYPES.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 py-2.5 rounded-lg font-semibold text-sm transition cursor-pointer">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition cursor-pointer">Add to Inventory</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Ration Template Builder Form ---

export default AddStockModal;
