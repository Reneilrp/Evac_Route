import { useState, useEffect } from 'react';
import { Package, ClipboardList, Plus, AlertCircle, X, Trash2, Truck, CheckCircle, Clock, MapPin, Printer, ShieldAlert, Sparkles, Archive, ArchiveRestore, Edit2, Copy, Users, User, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toast';
import PrintDispatchManifestModal from '../../components/dispatch/PrintDispatchManifestModal';

import AddStockModal from '../../components/inventory/modals/AddStockModal';
import RationTemplateForm from '../../components/inventory/modals/RationTemplateFormModal';
import AdjustStockModal from '../../components/inventory/modals/AdjustStockModal';
import CreateDispatchModal from '../../components/inventory/modals/CreateDispatchModal';
export { AddStockModal, DISASTER_RELIEF_ITEMS, INVENTORY_CATEGORIES, UNIT_TYPES } from '../../components/inventory/modals/AddStockModal';

// --- Add Stock Modal ---
export default function InventoryManager() {
  const { user } = useAuth();
  const isCSWDO = user?.email?.toLowerCase().includes('logistics') || user?.email?.toLowerCase().includes('cswdo');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('stock');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [printingOrder, setPrintingOrder] = useState(null);
  const [dispatchArchiveFilter, setDispatchArchiveFilter] = useState('active');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddStockModal) setShowAddStockModal(false);
        if (showTemplateForm) { setShowTemplateForm(false); setEditingTemplate(null); }
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
      setEditingTemplate(null);
      showSuccess('Ration template created successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to create ration template.');
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/rations/templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setShowTemplateForm(false);
      setEditingTemplate(null);
      showSuccess('Ration template updated successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to update ration template.');
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => api.delete(`/rations/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-group'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      showSuccess('Ration template deleted successfully.');
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to delete template.');
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
    queryKey: ['dispatch-orders', dispatchArchiveFilter],
    queryFn: () => api.get('/dispatch-orders', {
      params: {
        archived: dispatchArchiveFilter === 'archived' ? 'true' : undefined
      }
    }).then(r => r.data),
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

  const archiveDispatchMutation = useMutation({
    mutationFn: (id) => api.post(`/dispatch-orders/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      showSuccess('Dispatch order archived.');
    },
    onError: (err) => showError(err?.response?.data?.message || 'Could not archive dispatch order.'),
  });

  const unarchiveDispatchMutation = useMutation({
    mutationFn: (id) => api.post(`/dispatch-orders/${id}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      showSuccess('Dispatch order restored to active list.');
    },
    onError: (err) => showError(err?.response?.data?.message || 'Could not restore dispatch order.'),
  });

  const handleAddStock = (newItem) => {
    addItemMutation.mutate(newItem);
    setShowAddStockModal(false);
  };

  const handleAdjustStock = (newStock) => {
    adjustStockMutation.mutate({ id: adjustingItem.id, total_stock: newStock });
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950">
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
          initialTemplate={editingTemplate}
          onCancel={() => { setShowTemplateForm(false); setEditingTemplate(null); }}
          onCreate={(data) => createTemplateMutation.mutateAsync(data)}
          onUpdate={(id, data) => updateTemplateMutation.mutateAsync({ id, data })}
        />
      )}

      {!isCSWDO && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-center gap-3.5 text-blue-900 dark:text-blue-200 shadow-sm">
          <ShieldAlert size={22} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <div className="text-xs font-black uppercase flex items-center gap-2">
              <span>CDRRMO Situational View</span>
              <span className="text-[9px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 px-2 py-0.5 rounded-full font-bold">
                Read-Only
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              Central inventory stocks, ration formulas, and transport manifests are managed by <strong>CSWDO Logistics</strong>. CDRRMO monitors stock levels for situational awareness and rescue prioritization.
            </p>
          </div>
        </div>
      )}

      {/* Custom Tabs */}
      <div className="flex space-x-1 bg-gray-200 dark:bg-slate-800 p-1 rounded-lg w-fit mb-6 border border-gray-300 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
            activeTab === 'stock' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
          }`}
        >
          <Package size={16} /> Relief Supplies &amp; Stock
        </button>
        <button
          onClick={() => setActiveTab('rations')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
            activeTab === 'rations' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
          }`}
        >
          <ClipboardList size={16} /> Ration Builder
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
            activeTab === 'dispatch' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
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
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/40">
            <h3 className="font-semibold text-gray-700 dark:text-slate-200">Current Stock Levels</h3>
            {isCSWDO ? (
              <button 
                onClick={() => setShowAddStockModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition text-sm shadow-sm cursor-pointer"
              >
                <Plus size={16} /> Receive Delivery
              </button>
            ) : (
              <span className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 px-3 py-1.5 rounded-lg font-semibold select-none flex items-center gap-1.5">
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
                  <tr className="bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-6 font-semibold">Item Name</th>
                    <th className="py-3 px-6 font-semibold">
                      <span>Free Available Stock</span>
                      <span className="block text-[10px] font-normal normal-case text-gray-400">Ready to dispatch</span>
                    </th>
                    <th className="py-3 px-6 font-semibold">
                      <span>Reserved in Transit</span>
                      <span className="block text-[10px] font-normal normal-case text-gray-400">Committed to orders</span>
                    </th>
                    <th className="py-3 px-6 font-semibold">
                      <span>Warehouse Total</span>
                      <span className="block text-[10px] font-normal normal-case text-gray-400">Physical count</span>
                    </th>
                    <th className="py-3 px-6 font-semibold">Stock Health</th>
                    <th className="py-3 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 dark:text-slate-500 font-medium">
                        No inventory items yet. Add your first delivery.
                      </td>
                    </tr>
                  ) : (
                    items.map(item => {
                      const avail = item.available_stock ?? Math.max(0, item.total_stock - (item.reserved_quantity || 0));
                      const reserved = item.reserved_quantity || 0;
                      const total = item.total_stock || 0;
                      const freePercent = total > 0 ? Math.round((avail / total) * 100) : 0;

                      // Dynamic emergency severity badge
                      let healthBadge = {
                        label: 'Adequate',
                        cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
                        barCls: 'bg-emerald-500',
                      };
                      if (avail === 0) {
                        healthBadge = {
                          label: 'Depleted',
                          cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 font-black',
                          barCls: 'bg-rose-600',
                        };
                      } else if (avail < 50) {
                        healthBadge = {
                          label: 'Critical',
                          cls: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800/60 font-bold',
                          barCls: 'bg-red-500',
                        };
                      } else if (avail < 200) {
                        healthBadge = {
                          label: 'Low Reserve',
                          cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 font-semibold',
                          barCls: 'bg-amber-500',
                        };
                      }

                      return (
                        <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition">
                          <td className="py-4 px-6 font-semibold text-gray-900 dark:text-slate-100">{item.item_name}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-gray-900 dark:text-slate-100 text-sm">
                                {avail.toLocaleString()} <span className="text-xs font-normal text-gray-500">{item.unit_type}</span>
                              </span>
                              <div className="w-20 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden flex-shrink-0">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${healthBadge.barCls}`} 
                                  style={{ width: `${Math.min(100, Math.max(freePercent > 0 ? 5 : 0, freePercent))}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">
                                {freePercent}% Free
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm">
                            {reserved > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                                {reserved.toLocaleString()} {item.unit_type}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-slate-500 text-xs">0 {item.unit_type}</span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-semibold text-gray-800 dark:text-slate-200 text-sm">
                            {total.toLocaleString()} {item.unit_type}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${healthBadge.cls}`}>
                              {healthBadge.label}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {isCSWDO ? (
                              <button 
                                onClick={() => setAdjustingItem(item)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
                              >
                                Adjust Stock
                              </button>
                            ) : (
                              <span className="text-gray-400 dark:text-slate-500 text-xs italic">View Only</span>
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
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-700 dark:text-slate-200 text-lg">Active Configuration</h3>
                  <span className="flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border border-green-200 dark:border-green-800">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Live
                  </span>
                </div>
                {isCSWDO && activeTemplate && (
                  <button
                    onClick={() => { setEditingTemplate(activeTemplate); setShowTemplateForm(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                  >
                    <Edit2 size={13} /> Edit Active
                  </button>
                )}
              </div>
              
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-500 dark:text-slate-400 text-sm">Loading template configurations...</p>
                </div>
              ) : activeTemplate ? (
                <div className="mb-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-gray-900 dark:text-slate-100 text-xl leading-snug">{activeTemplate.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        Standardized relief distribution profile applied upon resident check-in.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-200 dark:border-slate-700 divide-y divide-gray-200/50 dark:divide-slate-700/50 space-y-1">
                    {activeTemplate.items?.map((item, idx) => {
                      const actualItem = item.inventory_item || item.inventoryItem;
                      const isFam = item.allocation_type === 'per_family';
                      return (
                        <div key={idx} className="flex justify-between items-center py-2.5 text-sm text-gray-700 dark:text-slate-300 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-slate-100">{actualItem?.item_name || 'Item'}</span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isFam 
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {isFam ? <Users size={10} /> : <User size={10} />}
                              {isFam ? 'Per Family' : 'Per Person'}
                            </span>
                          </div>
                          <span className="font-extrabold text-blue-600 dark:text-blue-400">
                            {item.quantity_per_head} {actualItem?.unit_type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-lg bg-gray-50 dark:bg-slate-950/40 p-4 mb-6">
                  <p className="text-gray-400 dark:text-slate-500 text-sm">No active ration template. Activate one from saved templates below or build a new one.</p>
                </div>
              )}
            </div>

            {/* Saved Templates List */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 mt-6">
              <h4 className="font-bold text-gray-800 dark:text-slate-200 text-sm mb-4">Saved Ration Profiles</h4>
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                {templates.filter(t => !t.is_active).map(t => (
                  <div key={t.id} className="bg-white dark:bg-slate-800/80 rounded-xl p-3.5 border border-gray-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-blue-300 dark:hover:border-blue-500 transition">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-slate-100 text-sm truncate">{t.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {t.items?.map((i, iIdx) => {
                          const actualItem = i.inventory_item || i.inventoryItem;
                          const isFam = i.allocation_type === 'per_family';
                          return (
                            <span key={iIdx} className="text-[10px] font-semibold bg-gray-100 dark:bg-slate-700/60 text-gray-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                              {actualItem?.item_name || 'Item'} × {i.quantity_per_head} {isFam ? '(Fam)' : '(Pax)'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    {isCSWDO ? (
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button 
                          onClick={() => activateTemplateMutation.mutate(t.id)}
                          disabled={activateTemplateMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          Activate
                        </button>
                        <button 
                          onClick={() => { setEditingTemplate(t); setShowTemplateForm(true); }}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition cursor-pointer"
                          title="Edit Template"
                          aria-label="Edit Template"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingTemplate({
                              ...t,
                              id: undefined,
                              name: `${t.name} (Copy)`,
                              is_active: false,
                            });
                            setShowTemplateForm(true);
                          }}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition cursor-pointer"
                          title="Clone as New Template"
                          aria-label="Clone as New Template"
                        >
                          <Copy size={13} />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm(`Delete ration template "${t.name}"?`)) {
                              deleteTemplateMutation.mutate(t.id);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                          title="Delete Template"
                          aria-label="Delete Template"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2.5 py-1 rounded select-none">
                        CSWDO Managed
                      </span>
                    )}
                  </div>
                ))}
                {templates.filter(t => !t.is_active).length === 0 && (
                  <p className="text-gray-400 dark:text-slate-500 text-xs italic">No other saved templates available.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center">
            <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-full mb-4">
              <ClipboardList size={32} className="text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-slate-100 mb-2">Build New Template</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-sm">
              Create a standardized disaster relief profile. Specify items allocated per family household vs. per individual evacuee.
            </p>
            {isCSWDO ? (
              <button 
                onClick={() => { setEditingTemplate(null); setShowTemplateForm(true); }}
                disabled={items.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition w-full max-w-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm text-sm"
              >
                {items.length === 0 ? 'Add Stock Items First' : 'Create New Template'}
              </button>
            ) : (
              <button 
                disabled
                className="bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 font-bold py-2.5 px-6 rounded-xl w-full max-w-xs border border-gray-200 dark:border-slate-700 cursor-not-allowed text-sm"
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
              activeTemplate={activeTemplate}
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

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/50 dark:bg-slate-950/40">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-700 dark:text-slate-200">Delivery Dispatch Orders</h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDispatchArchiveFilter('active')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        dispatchArchiveFilter === 'active'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Truck size={12} />
                      <span>Active</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDispatchArchiveFilter('archived')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        dispatchArchiveFilter === 'archived'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Archive size={12} />
                      <span>Archived</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Stock is reserved upon creation to prevent over-allocation, and deducted from physical inventory upon delivery confirmation.</p>
              </div>
              {isCSWDO ? (
                <button
                  onClick={() => setShowDispatchModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition text-sm shadow-sm cursor-pointer"
                >
                  <Plus size={16} /> New Dispatch Order
                </button>
              ) : (
                <span className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 px-3 py-1.5 rounded-lg font-semibold select-none flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-blue-500" /> Dispatches Initiated by CSWDO
                </span>
              )}
            </div>

            {isLoadingDispatch ? (
              <div className="flex items-center justify-center h-32 text-gray-400 dark:text-slate-500 text-sm">Loading orders…</div>
            ) : dispatchOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400 dark:text-slate-500">
                <Truck size={32} />
                <p className="text-sm">No dispatch orders yet. Create one to send supplies to a shelter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 dark:bg-slate-950/80 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Destination</th>
                      <th className="px-4 py-3 text-left">Manifest</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Timeline</th>
                      <th className="px-4 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {dispatchOrders.map(order => {
                      const scfg = {
                        pending:    { label: 'Pending',    cls: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',    Icon: Clock },
                        in_transit: { label: 'In Transit', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', Icon: Truck },
                        delivered:  { label: 'Delivered',  cls: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400', Icon: CheckCircle },
                        cancelled:  { label: 'Cancelled',  cls: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',  Icon: X },
                      }[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400', Icon: Package };
                      const { Icon } = scfg;
                      return (
                        <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-gray-700 dark:text-slate-300">#{order.id}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-slate-200">
                              <MapPin size={13} className="text-blue-500 flex-shrink-0" />
                              {order.shelter?.name ?? '—'}
                            </div>
                            {order.notes && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 italic truncate max-w-[180px]">{order.notes}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <ul className="space-y-0.5 text-xs text-gray-600 dark:text-slate-350">
                              {order.items?.map(item => (
                                <li key={item.id} className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                                  <span className="font-semibold text-gray-800 dark:text-slate-200">{item.inventory_item?.item_name ?? `Item #${item.inventory_item_id}`}</span>
                                  <span className="text-gray-400 dark:text-slate-500">× {item.quantity} {item.inventory_item?.unit_type}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${scfg.cls}`}>
                              <Icon size={12} /> {scfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 space-y-0.5">
                            <div>Created: {new Date(order.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                            {order.departed_at && <div className="text-amber-600 dark:text-amber-400">Departed: {new Date(order.departed_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
                            {order.delivered_at && <div className="text-green-600 dark:text-green-400">Delivered: {new Date(order.delivered_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPrintingOrder(order)}
                                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:hover:bg-blue-900/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="Print Official Requisition Manifest"
                              >
                                <Printer size={13} /> Manifest
                              </button>
                              {isCSWDO && ['pending', 'in_transit'].includes(order.status) && (
                                <button
                                  onClick={() => { if (window.confirm(`Cancel order #${order.id} and release reserved stock?`)) cancelDispatchMutation.mutate(order.id); }}
                                  className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 transition p-1 cursor-pointer"
                                  title="Cancel Order & Release Stock"
                                >
                                  <X size={13} /> Cancel
                                </button>
                              )}
                              {['delivered', 'cancelled'].includes(order.status) && (
                                order.archived_at || dispatchArchiveFilter === 'archived' ? (
                                  <button
                                    onClick={() => unarchiveDispatchMutation.mutate(order.id)}
                                    disabled={unarchiveDispatchMutation.isPending}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition p-1 cursor-pointer"
                                    title="Restore Manifest to Active List"
                                  >
                                    <ArchiveRestore size={13} /> Restore
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => archiveDispatchMutation.mutate(order.id)}
                                    disabled={archiveDispatchMutation.isPending}
                                    className="text-xs text-amber-600 hover:text-amber-800 font-semibold flex items-center gap-1 transition p-1 cursor-pointer"
                                    title="Archive Manifest"
                                  >
                                    <Archive size={13} /> Archive
                                  </button>
                                )
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

