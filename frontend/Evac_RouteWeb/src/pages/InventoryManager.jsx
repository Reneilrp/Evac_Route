import React, { useState } from 'react';
import { Package, ClipboardList, Plus, AlertCircle, X, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// --- Add Stock Modal ---
function AddStockModal({ onCancel, onAdd }) {
  const [itemName, setItemName] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemName || !stock || !unit) return;
    onAdd({ item_name: itemName, total_stock: parseInt(stock, 10), unit_type: unit });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <Package size={20} className="text-blue-500" /> Receive New Delivery
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Item Name</label>
            <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Rice (25kg sack)" value={itemName} onChange={e => setItemName(e.target.value)} required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
              <input type="number" min="1" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 500" value={stock} onChange={e => setStock(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
              <input type="text" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. sacks, pcs" value={unit} onChange={e => setUnit(e.target.value)} required />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm transition">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition">Add to Inventory</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Ration Template Builder Form ---
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
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <ClipboardList size={20} className="text-blue-500" /> New Ration Template
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Template Name</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            <label htmlFor="is-active" className="text-sm font-medium text-gray-700">
              Set as Active Template <span className="text-gray-400 font-normal">(deactivates all others)</span>
            </label>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-gray-700">Items Per Head</label>
              <button type="button" onClick={addRow} className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1">
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {rationItems.map((row, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm transition">
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
function AdjustStockModal({ item, onCancel, onAdjust }) {
  const [stock, setStock] = useState(item.total_stock);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (stock === '' || isNaN(parseInt(stock, 10)) || parseInt(stock, 10) < 0) return;
    onAdjust(parseInt(stock, 10));
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <Package size={20} className="text-blue-500" /> Adjust Stock — {item.item_name}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Stock Count ({item.unit_type})</label>
            <input type="number" min="0" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={stock} onChange={e => setStock(e.target.value)} required autoFocus />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm transition">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main InventoryManager ---
export default function InventoryManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('stock');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);

  // Fetch consolidated inventory and ration templates
  const { data: inventoryDashboardData, isLoading } = useQuery({
    queryKey: ['inventory-dashboard-group'],
    queryFn: () => api.get('/inventory/dashboard').then(res => res.data),
  });

  const isLoadingInventory = isLoading;
  const isLoadingTemplates = isLoading;

  const addItemMutation = useMutation({
    mutationFn: (newItem) => api.post('/inventory', newItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    }
  });

  const adjustStockMutation = useMutation({
    mutationFn: ({ id, total_stock }) => api.put(`/inventory/${id}/adjust`, { total_stock }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setAdjustingItem(null);
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to adjust stock.')
  });

  const createTemplateMutation = useMutation({
    mutationFn: (newTemplate) => api.post('/rations/template', newTemplate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setShowTemplateForm(false);
    }
  });

  const activateTemplateMutation = useMutation({
    mutationFn: (id) => api.put(`/rations/templates/${id}/active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to activate template.')
  });

  const items = inventoryDashboardData?.inventory || [];
  const templates = inventoryDashboardData?.templates || [];
  const activeTemplate = templates.find(t => t.is_active);

  const handleAddStock = (newItem) => {
    addItemMutation.mutate(newItem);
    setShowAddStockModal(false);
  };

  const handleAdjustStock = (newStock) => {
    adjustStockMutation.mutate({ id: adjustingItem.id, total_stock: newStock });
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      {showAddStockModal && (
        <AddStockModal
          onCancel={() => setShowAddStockModal(false)}
          onAdd={handleAddStock}
        />
      )}
      {adjustingItem && (
        <AdjustStockModal
          item={adjustingItem}
          onCancel={() => setAdjustingItem(null)}
          onAdjust={handleAdjustStock}
        />
      )}
      {showTemplateForm && (
        <RationTemplateForm
          items={items}
          onCancel={() => setShowTemplateForm(false)}
          onCreate={(data) => createTemplateMutation.mutateAsync(data)}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Inventory &amp; Relief Manager</h2>
          <p className="text-sm text-gray-500 mt-1">Manage CSWDO warehouse stock and ration templates.</p>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'stock' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package size={16} /> Warehouse Stock
        </button>
        <button
          onClick={() => setActiveTab('rations')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'rations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ClipboardList size={16} /> Ration Builder
        </button>
      </div>

      {/* Tab 1: Warehouse Stock */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-semibold text-gray-700">Current Stock Levels</h3>
            <button 
              onClick={() => setShowAddStockModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition text-sm shadow-sm"
            >
              <Plus size={16} /> Receive Delivery
            </button>
          </div>
          <div className="overflow-x-auto">
            {isLoadingInventory ? (
              <div className="flex items-center justify-center h-32">
                <span className="flex h-6 w-6 relative mr-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500"></span>
                </span>
                <p className="text-gray-500 font-medium">Loading inventory...</p>
              </div>
            ) : (
              <table className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="py-3 px-6 font-semibold">Item Name</th>
                    <th className="py-3 px-6 font-semibold">Total Stock</th>
                    <th className="py-3 px-6 font-semibold">Unit Type</th>
                    <th className="py-3 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-400 font-medium">
                        No inventory items yet. Add your first delivery.
                      </td>
                    </tr>
                  ) : (
                    items.map(item => (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition">
                        <td className="py-4 px-6 font-medium text-gray-800">{item.item_name}</td>
                        <td className="py-4 px-6">
                          <span className={`py-1 px-3 rounded-full text-xs font-bold ${item.total_stock < 200 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {item.total_stock}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-600 text-sm">{item.unit_type}</td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => setAdjustingItem(item)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Ration Builder */}
      {activeTab === 'rations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                <h3 className="font-semibold text-gray-700 text-lg">Active Configuration</h3>
                <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live
                </span>
              </div>
              
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-500 text-sm">Loading template configurations...</p>
                </div>
              ) : activeTemplate ? (
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 text-xl mb-1">{activeTemplate.name}</h4>
                  <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                    <AlertCircle size={14} /> Deducted per 1 headcount checked into the shelter.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 divide-y divide-gray-200/50">
                    {activeTemplate.items?.map((item, idx) => {
                      const actualItem = item.inventory_item || item.inventoryItem;
                      return (
                        <div key={idx} className="flex justify-between py-2 text-sm text-gray-700 first:pt-0 last:pb-0">
                          <span className="font-medium">{actualItem?.item_name || 'Item'}</span>
                          <span className="font-bold text-blue-600">{item.quantity_per_head} {actualItem?.unit_type}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 p-4 mb-6">
                  <p className="text-gray-400 text-sm">No active ration template. Activate one from saved templates below or build a new one.</p>
                </div>
              )}
            </div>

            {/* Saved Templates List */}
            <div className="border-t border-gray-100 pt-6 mt-6">
              <h4 className="font-bold text-gray-800 text-sm mb-4">Saved Ration Templates</h4>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {templates.filter(t => !t.is_active).map(t => (
                  <div key={t.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm flex justify-between items-center hover:border-blue-300 transition">
                    <div className="flex-1 mr-3 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {t.items?.map(i => {
                          const actualItem = i.inventory_item || i.inventoryItem;
                          return `${actualItem?.item_name || 'Item'} (${i.quantity_per_head})`;
                        }).join(', ')}
                      </p>
                    </div>
                    <button 
                      onClick={() => activateTemplateMutation.mutate(t.id)}
                      disabled={activateTemplateMutation.isPending}
                      className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 text-xs font-bold px-3 py-1.5 rounded transition disabled:opacity-50"
                    >
                      Activate
                    </button>
                  </div>
                ))}
                {templates.filter(t => !t.is_active).length === 0 && (
                  <p className="text-gray-400 text-xs italic">No other saved templates available.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-6 flex flex-col items-center justify-center text-center">
            <div className="bg-blue-50 p-4 rounded-full mb-4">
              <ClipboardList size={32} className="text-blue-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Build New Template</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              Create a new relief allocation strategy. Define exactly what each person receives upon shelter check-in.
            </p>
            <button 
              onClick={() => setShowTemplateForm(true)}
              disabled={items.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition w-full max-w-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {items.length === 0 ? 'Add Stock Items First' : 'Create New Template'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
