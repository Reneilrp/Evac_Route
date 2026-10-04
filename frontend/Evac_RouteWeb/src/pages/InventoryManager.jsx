import { useState, useEffect } from 'react';
import { Package, ClipboardList, Plus, AlertCircle, X, Trash2, Truck, CheckCircle, Clock, MapPin, Printer, ShieldAlert } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showSuccess, showError } from '../utils/toast';
import PrintDispatchManifestModal from '../components/PrintDispatchManifestModal';

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
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <Package size={20} className="text-blue-500" /> Receive New Delivery
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"><X size={22} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Item Name</label>
            <input type="text" className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              placeholder="e.g. Rice (25kg sack)" value={itemName} onChange={e => setItemName(e.target.value)} required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Quantity</label>
              <input type="number" min="1" className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                placeholder="e.g. 500" value={stock} onChange={e => setStock(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Unit</label>
              <input type="text" className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                placeholder="e.g. sacks, pcs" value={unit} onChange={e => setUnit(e.target.value)} required />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition">Cancel</button>
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
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800">
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

          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition">
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
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800">
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
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition">Cancel</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold text-sm transition">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main InventoryManager ---
export default function InventoryManager() {
  const { user } = useAuth();
  const isCSWDO = user?.email?.toLowerCase().includes('logistics') || user?.email?.toLowerCase().includes('cswdo');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('stock');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [printingOrder, setPrintingOrder] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddStockModal) setShowAddStockModal(false);
        if (showTemplateForm) setShowTemplateForm(false);
        if (adjustingItem) setAdjustingItem(null);
        if (showDispatchModal) setShowDispatchModal(false);
        if (printingOrder) setPrintingOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddStockModal, showTemplateForm, adjustingItem, showDispatchModal, printingOrder]);

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
      showSuccess('Inventory item added successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to add item.');
    }
  });

  const adjustStockMutation = useMutation({
    mutationFn: ({ id, total_stock }) => api.put(`/inventory/${id}/adjust`, { total_stock }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setAdjustingItem(null);
      showSuccess('Stock level adjusted successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to adjust stock.');
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: (newTemplate) => api.post('/rations/template', newTemplate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setShowTemplateForm(false);
      showSuccess('Ration template created successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to create ration template.');
    }
  });

  const activateTemplateMutation = useMutation({
    mutationFn: (id) => api.put(`/rations/templates/${id}/active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      showSuccess('Ration template activated successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to activate template.');
    }
  });

  const items = inventoryDashboardData?.inventory || [];
  const templates = inventoryDashboardData?.templates || [];
  const activeTemplate = templates.find(t => t.is_active);

  // Dispatch Orders
  const { data: dispatchData, isLoading: isLoadingDispatch } = useQuery({
    queryKey: ['dispatch-orders'],
    queryFn: () => api.get('/dispatch-orders').then(r => r.data),
    refetchInterval: 30000,
  });
  const dispatchOrders = dispatchData?.data ?? [];
  const pendingDispatchCount = dispatchOrders.filter(o => o.status === 'pending').length;

  const { data: sheltersData } = useQuery({
    queryKey: ['shelters-list-dispatch'],
    queryFn: () => api.get('/shelters').then(r => r.data),
  });
  const shelterOptions = sheltersData?.data ?? [];

  const cancelDispatchMutation = useMutation({
    mutationFn: (id) => api.post(`/dispatch-orders/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      showSuccess('Dispatch order cancelled and reserved stock released.');
    },
    onError: (err) => showError(err?.response?.data?.message || 'Could not cancel this order.'),
  });

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
          <h2 className="text-2xl font-bold text-gray-800">
            {isCSWDO ? 'Relief Logistics & Inventory' : 'Central Relief Inventory Monitoring'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isCSWDO
              ? 'Manage CSWDO relief supply stocks, ration formulas, and dispatch manifests.'
              : 'Situational awareness of CSWDO relief supplies, active ration formulas, and delivery dispatches.'}
          </p>
        </div>
      </div>

      {!isCSWDO && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3.5 text-blue-900 shadow-sm">
          <ShieldAlert size={22} className="text-blue-600 shrink-0" />
          <div>
            <div className="text-xs font-black uppercase flex items-center gap-2">
              <span>CDRRMO Situational View</span>
              <span className="text-[9px] bg-blue-100 text-blue-700 border border-blue-300 px-2 py-0.5 rounded-full font-bold">
                Read-Only
              </span>
            </div>
            <p className="text-xs text-blue-700 mt-0.5">
              Central inventory stocks, ration formulas, and transport manifests are managed by <strong>CSWDO Logistics</strong>. CDRRMO monitors stock levels for situational awareness and rescue prioritization.
            </p>
          </div>
        </div>
      )}

      {/* Custom Tabs */}
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'stock' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package size={16} /> Relief Supplies &amp; Stock
        </button>
        <button
          onClick={() => setActiveTab('rations')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'rations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ClipboardList size={16} /> Ration Builder
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'dispatch' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Truck size={16} /> Dispatch Orders
          {pendingDispatchCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {pendingDispatchCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Warehouse Stock */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-semibold text-gray-700">Current Stock Levels</h3>
            {isCSWDO ? (
              <button 
                onClick={() => setShowAddStockModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition text-sm shadow-sm"
              >
                <Plus size={16} /> Receive Delivery
              </button>
            ) : (
              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg font-semibold select-none flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-blue-500" /> Managed by CSWDO Logistics
              </span>
            )}
          </div>

          {items.some(item => (item.available_stock ?? Math.max(0, item.total_stock - (item.reserved_quantity || 0))) < 200) && (
            <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-400 animate-pulse">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Critical Stock Deficits Detected</h4>
                <p className="text-xs mt-0.5">
                  The following relief item available levels are critically low (&lt; 200 units available):{' '}
                  <span className="font-bold">
                    {items.filter(item => (item.available_stock ?? Math.max(0, item.total_stock - (item.reserved_quantity || 0))) < 200)
                      .map(item => `${item.item_name} (${item.available_stock ?? Math.max(0, item.total_stock - (item.reserved_quantity || 0))} ${item.unit_type} avail)`).join(', ')}
                  </span>. Please schedule emergency replenishment.
                </p>
              </div>
            </div>
          )}
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
                    <th className="py-3 px-6 font-semibold">Available to Dispatch (ATP)</th>
                    <th className="py-3 px-6 font-semibold">Reserved (In Dispatches)</th>
                    <th className="py-3 px-6 font-semibold">Physical Total</th>
                    <th className="py-3 px-6 font-semibold">Unit Type</th>
                    <th className="py-3 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                        No inventory items yet. Add your first delivery.
                      </td>
                    </tr>
                  ) : (
                    items.map(item => {
                      const avail = item.available_stock ?? Math.max(0, item.total_stock - (item.reserved_quantity || 0));
                      const reserved = item.reserved_quantity || 0;
                      return (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition">
                          <td className="py-4 px-6 font-medium text-gray-800">{item.item_name}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className={`py-1 px-3 rounded-full text-xs font-bold w-16 text-center inline-block ${
                                avail < 200 ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                                avail < 500 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                                'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                              }`}>
                                {avail}
                              </span>
                              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden flex-shrink-0">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    avail < 200 ? 'bg-red-500' :
                                    avail < 500 ? 'bg-amber-500' :
                                    'bg-green-500'
                                  }`} 
                                  style={{ width: `${Math.min(100, Math.max(5, (avail / 1000) * 100))}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase select-none">
                                {Math.min(100, Math.round((avail / 1000) * 100))}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm">
                            {reserved > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {reserved} {item.unit_type}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">0</span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-semibold text-gray-700 text-sm">{item.total_stock}</td>
                          <td className="py-4 px-6 text-gray-600 text-sm">{item.unit_type}</td>
                          <td className="py-4 px-6 text-right">
                            {isCSWDO ? (
                              <button 
                                onClick={() => setAdjustingItem(item)}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm transition"
                              >
                                Adjust
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs italic">View Only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
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
                    {isCSWDO ? (
                      <button 
                        onClick={() => activateTemplateMutation.mutate(t.id)}
                        disabled={activateTemplateMutation.isPending}
                        className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 text-xs font-bold px-3 py-1.5 rounded transition disabled:opacity-50"
                      >
                        Activate
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 font-semibold bg-gray-50 border border-gray-200 px-2.5 py-1 rounded select-none">
                        CSWDO Managed
                      </span>
                    )}
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
            {isCSWDO ? (
              <button 
                onClick={() => setShowTemplateForm(true)}
                disabled={items.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition w-full max-w-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {items.length === 0 ? 'Add Stock Items First' : 'Create New Template'}
              </button>
            ) : (
              <button 
                disabled
                className="bg-gray-100 text-gray-400 font-bold py-2 px-6 rounded-lg w-full max-w-xs border border-gray-200 cursor-not-allowed"
              >
                CSWDO Managed Profiles
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Dispatch Orders */}
      {activeTab === 'dispatch' && (
        <div>
          {showDispatchModal && (
            <CreateDispatchModal
              inventoryItems={items}
              shelters={shelterOptions}
              onCancel={() => setShowDispatchModal(false)}
              onCreated={() => {
                setShowDispatchModal(false);
                queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
                queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
                showSuccess('Dispatch order created, stock reserved, and staff notified.');
              }}
            />
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-semibold text-gray-700">Delivery Dispatch Orders</h3>
                <p className="text-xs text-gray-400 mt-0.5">Stock is reserved upon creation to prevent over-allocation, and deducted from physical inventory upon delivery confirmation.</p>
              </div>
              {isCSWDO ? (
                <button
                  onClick={() => setShowDispatchModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition text-sm shadow-sm"
                >
                  <Plus size={16} /> New Dispatch Order
                </button>
              ) : (
                <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg font-semibold select-none flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-blue-500" /> Dispatches Initiated by CSWDO
                </span>
              )}
            </div>

            {isLoadingDispatch ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading orders…</div>
            ) : dispatchOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
                <Truck size={32} />
                <p className="text-sm">No dispatch orders yet. Create one to send supplies to a shelter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Destination</th>
                      <th className="px-4 py-3 text-left">Manifest</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Timeline</th>
                      <th className="px-4 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dispatchOrders.map(order => {
                      const scfg = {
                        pending:    { label: 'Pending',    cls: 'bg-red-100 text-red-700',    Icon: Clock },
                        in_transit: { label: 'In Transit', cls: 'bg-amber-100 text-amber-700', Icon: Truck },
                        delivered:  { label: 'Delivered',  cls: 'bg-green-100 text-green-700', Icon: CheckCircle },
                        cancelled:  { label: 'Cancelled',  cls: 'bg-gray-100 text-gray-500',  Icon: X },
                      }[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-500', Icon: Package };
                      const { Icon } = scfg;
                      return (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-700">#{order.id}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                              <MapPin size={13} className="text-blue-500 flex-shrink-0" />
                              {order.shelter?.name ?? '—'}
                            </div>
                            {order.notes && <p className="text-xs text-gray-400 mt-0.5 italic truncate max-w-[180px]">{order.notes}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <ul className="space-y-0.5 text-xs text-gray-600">
                              {order.items?.map(item => (
                                <li key={item.id} className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                                  <span className="font-semibold text-gray-800">{item.inventory_item?.item_name ?? `Item #${item.inventory_item_id}`}</span>
                                  <span className="text-gray-400">× {item.quantity} {item.inventory_item?.unit_type}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${scfg.cls}`}>
                              <Icon size={12} /> {scfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 space-y-0.5">
                            <div>Created: {new Date(order.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                            {order.departed_at && <div className="text-amber-600">Departed: {new Date(order.departed_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
                            {order.delivered_at && <div className="text-green-600">Delivered: {new Date(order.delivered_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPrintingOrder(order)}
                                className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded font-bold flex items-center gap-1 transition shadow-xs"
                                title="Print Official Requisition Manifest"
                              >
                                <Printer size={13} /> Manifest
                              </button>
                              {isCSWDO && ['pending', 'in_transit'].includes(order.status) && (
                                <button
                                  onClick={() => { if (window.confirm(`Cancel order #${order.id} and release reserved stock?`)) cancelDispatchMutation.mutate(order.id); }}
                                  className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 transition p-1"
                                  title="Cancel Order & Release Stock"
                                >
                                  <X size={13} /> Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {printingOrder && (
        <PrintDispatchManifestModal
          order={printingOrder}
          shelterDetails={shelterOptions.find(s => s.id === printingOrder.shelter_id) || printingOrder.shelter}
          onCancel={() => setPrintingOrder(null)}
        />
      )}
    </div>
  );
}

// --- Create Dispatch Modal ---
function CreateDispatchModal({ inventoryItems, shelters, onCancel, onCreated }) {
  const [shelterId, setShelterId] = useState('');
  const [notes, setNotes] = useState('');
  const [manifest, setManifest] = useState([{ inventory_item_id: '', quantity: 1 }]);
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
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-slate-800">
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
              value={shelterId} onChange={e => setShelterId(e.target.value)} required
            >
              <option value="">Select a shelter…</option>
              {shelters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
            </select>
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
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-semibold text-sm transition">
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
