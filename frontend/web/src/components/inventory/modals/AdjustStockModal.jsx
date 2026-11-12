import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, X } from 'lucide-react';
import api from '../../../services/api';

function AdjustStockModal({ item, onCancel, onAdjust }) {
  const [stock, setStock] = useState(item.total_stock);
  const reserved = item.reserved_quantity || 0;
  const avail = item.available_stock ?? Math.max(0, item.total_stock - reserved);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(stock, 10);
    if (stock === '' || isNaN(val) || val < 0) return;
    if (val < reserved) {
      setError(`Cannot reduce total stock below ${reserved} ${item.unit_type} because it is currently reserved in active dispatch orders.`);
      return;
    }
    setError('');
    onAdjust(val);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <Package size={20} className="text-blue-500" /> Adjust Stock — {item.item_name}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg text-red-700 dark:text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}
          <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-lg border border-gray-200 dark:border-slate-800 text-xs space-y-1">
            <div className="flex justify-between text-gray-600 dark:text-slate-400">
              <span>Current Physical Stock:</span>
              <span className="font-bold text-gray-800 dark:text-slate-200">{item.total_stock} {item.unit_type}</span>
            </div>
            <div className="flex justify-between text-amber-700 dark:text-amber-400">
              <span>Reserved in Dispatch Orders:</span>
              <span className="font-bold">{reserved} {item.unit_type}</span>
            </div>
            <div className="flex justify-between text-blue-700 dark:text-blue-400 pt-1 border-t border-gray-200 dark:border-slate-800">
              <span>Available to Promise (ATP):</span>
              <span className="font-bold">{avail} {item.unit_type}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">New Total Stock Count ({item.unit_type})</label>
            <input type="number" min={reserved} className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              value={stock} onChange={e => { setStock(e.target.value); setError(''); }} required autoFocus />
            {reserved > 0 && (
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                Minimum {reserved} {item.unit_type} required to fulfill pending/in-transit reservations.
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 py-2.5 rounded-lg font-semibold text-sm transition cursor-pointer">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main InventoryManager ---

export default AdjustStockModal;
