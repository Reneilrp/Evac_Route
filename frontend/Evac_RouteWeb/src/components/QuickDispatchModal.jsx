import { useState, useEffect } from 'react';
import { Truck, X, Plus, Minus, Package, Layers, AlertTriangle, Sparkles, RefreshCw, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function QuickDispatchModal({
  shelter,
  activeTemplate,
  inventoryItems = [],
  onCancel,
  onCreated,
}) {
  if (!shelter || !activeTemplate) return null;

  // Dispatch Mode: 'bundle' (Full Relief Pack) vs 'single' (Single Supply Top-Up)
  const [dispatchMode, setDispatchMode] = useState('bundle');

  // Base sizing choice: defaults to shelter capacity (e.g. 20)
  const [baseType, setBaseType] = useState('capacity'); // 'capacity' or 'occupancy'
  const basePax = baseType === 'capacity' ? (shelter.max_capacity || 20) : (shelter.current_occupancy || 0);

  // Suggested contingency buffer: 20% by default
  const [bufferPercent, setBufferPercent] = useState(20);

  // --- BUNDLE MODE STATE ---
  const [extraPacks, setExtraPacks] = useState(0);
  const [manualBundleCount, setManualBundleCount] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const calculatedBundleBuffer = Math.ceil(basePax * (bufferPercent / 100));
  const suggestedPackCount = Math.max(1, basePax + calculatedBundleBuffer + extraPacks);
  const bundleCount = manualBundleCount !== null ? manualBundleCount : suggestedPackCount;

  // --- SINGLE SUPPLY MODE STATE ---
  // Default to first item from activeTemplate or inventoryItems
  const defaultItemId = activeTemplate.items?.[0]?.inventory_item_id || inventoryItems[0]?.id || '';
  const [selectedItemId, setSelectedItemId] = useState(defaultItemId);
  const [extraSingleQty, setExtraSingleQty] = useState(0);
  const [manualSingleQty, setManualSingleQty] = useState(null);

  // Selected item object from inventory
  const selectedInvItem = inventoryItems.find(it => String(it.id) === String(selectedItemId)) || null;

  // Check if selected item has a quota in the active template
  const templateItem = activeTemplate.items?.find(it => String(it.inventory_item_id) === String(selectedItemId));
  const itemQuota = templateItem?.quantity_per_head || 1;

  const calculatedSingleBuffer = Math.ceil(basePax * (bufferPercent / 100));
  const suggestedSingleQty = Math.max(1, (basePax + calculatedSingleBuffer) * itemQuota + extraSingleQty);
  const singleQty = manualSingleQty !== null ? manualSingleQty : suggestedSingleQty;

  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Keep notes synchronized with mode and selected counts
  useEffect(() => {
    if (dispatchMode === 'bundle') {
      setNotes(
        `Quick dispatch for ${shelter.name} (${shelter.barangay || 'Area'}): ${bundleCount} ${activeTemplate.name || 'Standard Disaster Relief Packs'} (${basePax} base + ${bufferPercent}% buffer).`
      );
    } else {
      const itemName = selectedInvItem?.item_name || 'Supplies';
      const unit = selectedInvItem?.unit_type || 'units';
      setNotes(
        `Emergency single-supply top-up for ${shelter.name} (${shelter.barangay || 'Area'}): ${singleQty} ${unit} of ${itemName} (${basePax} pax + ${bufferPercent}% buffer).`
      );
    }
  }, [dispatchMode, bundleCount, singleQty, selectedInvItem, shelter.name, shelter.barangay, activeTemplate.name, basePax, bufferPercent]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Buffer and sizing controls
  const handleSelectBuffer = (pct) => {
    setBufferPercent(pct);
    setManualBundleCount(null);
    setManualSingleQty(null);
  };

  const handleSelectBase = (type) => {
    setBaseType(type);
    setManualBundleCount(null);
    setManualSingleQty(null);
  };

  // Bundle count adjustments
  const handleAddExtraPacks = (amount) => {
    setExtraPacks(prev => Math.max(0, prev + amount));
    setManualBundleCount(null);
  };

  const handleBundleIncrement = (delta) => {
    const nextVal = Math.max(1, bundleCount + delta);
    setManualBundleCount(nextVal);
  };

  const handleBundleManualInput = (val) => {
    const parsed = parseInt(val, 10);
    setManualBundleCount(isNaN(parsed) || parsed < 1 ? 1 : parsed);
  };

  const handleResetBundle = () => {
    setBufferPercent(20);
    setExtraPacks(0);
    setManualBundleCount(null);
  };

  // Single item adjustments
  const handleAddExtraSingle = (amount) => {
    setExtraSingleQty(prev => Math.max(0, prev + amount));
    setManualSingleQty(null);
  };

  const handleSingleIncrement = (delta) => {
    const nextVal = Math.max(1, singleQty + delta);
    setManualSingleQty(nextVal);
  };

  const handleSingleManualInput = (val) => {
    const parsed = parseInt(val, 10);
    setManualSingleQty(isNaN(parsed) || parsed < 1 ? 1 : parsed);
  };

  const handleResetSingle = () => {
    setBufferPercent(20);
    setExtraSingleQty(0);
    setManualSingleQty(null);
  };

  // --- WAREHOUSE ATP CALCULATIONS ---
  // Bundle ATP
  let maxCompletePacks = Infinity;
  let bundleBottleneck = null;

  if (activeTemplate.items && activeTemplate.items.length > 0) {
    for (const item of activeTemplate.items) {
      const invItem = inventoryItems.find(it => String(it.id) === String(item.inventory_item_id));
      const avail = invItem ? (invItem.available_stock ?? Math.max(0, invItem.total_stock - (invItem.reserved_quantity || 0))) : 0;
      const quota = item.quantity_per_head || 1;
      const packsPossible = Math.floor(avail / quota);

      if (packsPossible < maxCompletePacks) {
        maxCompletePacks = packsPossible;
        bundleBottleneck = {
          name: invItem?.item_name || 'Component item',
          unit: invItem?.unit_type || 'units',
          avail,
          quota,
          maxPacks: packsPossible,
          needed: bundleCount * quota,
        };
      }
    }
  }
  if (maxCompletePacks === Infinity) maxCompletePacks = 0;
  const hasBundleShortage = bundleCount > maxCompletePacks;

  // Single Item ATP
  const singleAvail = selectedInvItem
    ? (selectedInvItem.available_stock ?? Math.max(0, selectedInvItem.total_stock - (selectedInvItem.reserved_quantity || 0)))
    : 0;
  const hasSingleShortage = singleQty > singleAvail;

  // Format bundle contents summary line
  const packContentsSummary = activeTemplate.items?.map(item => {
    const invItem = inventoryItems.find(it => String(it.id) === String(item.inventory_item_id));
    const cleanName = (invItem?.item_name || 'Item').split(' (')[0];
    const unit = invItem?.unit_type || 'units';
    return `${item.quantity_per_head} ${unit} ${cleanName}`;
  }).join(' • ') || 'Constituent relief items';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let itemsPayload = [];

    if (dispatchMode === 'bundle') {
      if (bundleCount < 1) {
        setError('Please specify at least 1 relief pack.');
        return;
      }
      if (hasBundleShortage) {
        setError(
          `Cannot dispatch ${bundleCount} packs. Warehouse can only assemble ${maxCompletePacks} complete packs (limited by ${bundleBottleneck?.name}: ${bundleBottleneck?.avail} available, requires ${bundleBottleneck?.needed}).`
        );
        return;
      }
      itemsPayload = activeTemplate.items.map(item => ({
        inventory_item_id: parseInt(item.inventory_item_id, 10),
        quantity: bundleCount * (item.quantity_per_head || 1),
      }));
    } else {
      if (!selectedItemId) {
        setError('Please select an item to dispatch.');
        return;
      }
      if (singleQty < 1) {
        setError('Please specify a valid quantity.');
        return;
      }
      if (hasSingleShortage) {
        setError(
          `Cannot dispatch ${singleQty} ${selectedInvItem?.unit_type}. Warehouse only has ${singleAvail} ${selectedInvItem?.unit_type} available to promise.`
        );
        return;
      }
      itemsPayload = [
        {
          inventory_item_id: parseInt(selectedItemId, 10),
          quantity: parseInt(singleQty, 10),
        },
      ];
    }

    setIsSubmitting(true);

    try {
      await api.post('/dispatch-orders', {
        shelter_id: shelter.id,
        notes: notes || null,
        items: itemsPayload,
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
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-slate-950/60 dark:to-slate-900/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
                <Truck size={18} />
              </span>
              <h3 className="font-black text-gray-900 dark:text-slate-100 text-lg">
                Quick Dispatch — {shelter.name}
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Barangay: <strong>{shelter.barangay || 'N/A'}</strong> • Capacity: <strong>{shelter.max_capacity} Pax</strong> • Occupants: <strong>{shelter.current_occupancy} Pax</strong>
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition p-1">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher: Full Bundle vs Single Supply Top-Up */}
          <div className="flex bg-gray-100 dark:bg-slate-800/90 p-1 rounded-xl border border-gray-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setDispatchMode('bundle')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                dispatchMode === 'bundle'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <Package size={15} />
              <span>Full Relief Bundle</span>
            </button>
            <button
              type="button"
              onClick={() => setDispatchMode('single')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                dispatchMode === 'single'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers size={15} />
              <span>Single Supply Top-Up</span>
            </button>
          </div>

          {/* Sizing & Buffer Presets */}
          <div className="bg-gray-50 dark:bg-slate-950/50 p-4 rounded-xl border border-gray-200/80 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                1. Sizing Basis
              </span>
              <div className="flex bg-gray-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleSelectBase('capacity')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    baseType === 'capacity'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                  }`}
                >
                  Capacity ({shelter.max_capacity} Pax)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectBase('occupancy')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    baseType === 'occupancy'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                  }`}
                >
                  Occupants ({shelter.current_occupancy} Pax)
                </button>
              </div>
            </div>

            {/* Suggested Buffer Pills */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 flex items-center gap-1">
                  <Sparkles size={14} className="text-amber-500" /> Contingency Buffer:
                </span>
                <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                  +{bufferPercent}% ({dispatchMode === 'bundle' ? `${calculatedBundleBuffer} extra packs` : `${calculatedSingleBuffer} pax buffer`})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '0% Exact', val: 0 },
                  { label: '+10%', val: 10 },
                  { label: '+20% (Suggested)', val: 20 },
                  { label: '+30%', val: 30 },
                  { label: '+50%', val: 50 },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => handleSelectBuffer(opt.val)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition ${
                      bufferPercent === opt.val &&
                      (dispatchMode === 'bundle' ? manualBundleCount === null : manualSingleQty === null)
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra Rations Steppers */}
            <div className="pt-2 border-t border-gray-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                Quick Extra Add:
              </span>
              <div className="flex items-center gap-1.5">
                {(dispatchMode === 'bundle' ? [10, 20, 30] : [10, 20, 50, 100]).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => (dispatchMode === 'bundle' ? handleAddExtraPacks(n) : handleAddExtraSingle(n))}
                    className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-blue-50 border border-gray-300 dark:border-slate-700 rounded-lg text-blue-700 dark:text-blue-300 transition"
                  >
                    +{n} {dispatchMode === 'bundle' ? 'Packs' : ''}
                  </button>
                ))}
                {((dispatchMode === 'bundle' && (extraPacks > 0 || manualBundleCount !== null)) ||
                  (dispatchMode === 'single' && (extraSingleQty > 0 || manualSingleQty !== null))) && (
                  <button
                    type="button"
                    onClick={dispatchMode === 'bundle' ? handleResetBundle : handleResetSingle}
                    className="p-1 text-gray-400 hover:text-red-500 transition"
                    title="Reset to calculated formula"
                  >
                    <RefreshCw size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MODE A: UNIFIED BUNDLE CARD */}
          {dispatchMode === 'bundle' && (
            <div className="bg-gradient-to-br from-white to-blue-50/40 dark:from-slate-900 dark:to-slate-800/60 p-4 rounded-2xl border-2 border-blue-200/80 dark:border-blue-900/60 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 rounded-xl">
                    <Package size={20} />
                  </span>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-slate-100 text-sm">
                      {activeTemplate.name || 'Standard Disaster Relief Pack'}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                      {packContentsSummary}
                    </p>
                  </div>
                </div>

                {/* Bundle Quantity Stepper */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleBundleIncrement(-1)}
                    disabled={bundleCount <= 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 disabled:opacity-30 transition font-bold"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={bundleCount}
                    onChange={e => handleBundleManualInput(e.target.value)}
                    className="w-14 text-center font-black text-base text-gray-900 dark:text-slate-100 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleBundleIncrement(1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 transition font-bold"
                  >
                    <Plus size={14} />
                  </button>
                  <span className="text-xs font-extrabold text-gray-500 dark:text-slate-400 pr-1.5">
                    Packs
                  </span>
                </div>
              </div>

              {/* Live Warehouse Readiness / ATP Status for Bundle */}
              <div className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 text-xs ${
                hasBundleShortage
                  ? 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {hasBundleShortage ? (
                    <>
                      <AlertTriangle size={15} className="text-red-600 flex-shrink-0" />
                      <span>
                        Warehouse can only assemble {maxCompletePacks} packs (Shortage on {bundleBottleneck?.name?.split(' (')[0]}: {bundleBottleneck?.avail} avail, need {bundleBottleneck?.needed})
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                      <span>
                        Warehouse Ready: Stock available for up to {maxCompletePacks} complete packs
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Collapsible Breakdown Toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                >
                  {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showBreakdown ? 'Hide constituent items breakdown' : 'View constituent items breakdown'}
                </button>

                {showBreakdown && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-950/60 rounded-xl border border-gray-200/70 dark:border-slate-800 space-y-1.5 text-xs animate-in fade-in duration-150">
                    {activeTemplate.items?.map(item => {
                      const invItem = inventoryItems.find(it => String(it.id) === String(item.inventory_item_id));
                      const avail = invItem ? (invItem.available_stock ?? Math.max(0, invItem.total_stock - (invItem.reserved_quantity || 0))) : 0;
                      const totalNeeded = bundleCount * (item.quantity_per_head || 1);
                      const isItemShort = totalNeeded > avail;

                      return (
                        <div key={item.id} className="flex justify-between items-center text-gray-700 dark:text-slate-300">
                          <span>
                            {invItem?.item_name?.split(' (')[0] || 'Item'} ({item.quantity_per_head} {invItem?.unit_type || 'units'}/pack × {bundleCount} packs):
                          </span>
                          <span className={`font-bold ${isItemShort ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-slate-100'}`}>
                            {totalNeeded} {invItem?.unit_type || 'units'}
                            <span className="text-[10px] font-normal text-gray-500 dark:text-slate-400 ml-1">
                              (ATP: {avail})
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE B: SINGLE SUPPLY TOP-UP CARD */}
          {dispatchMode === 'single' && (
            <div className="bg-gradient-to-br from-white to-indigo-50/40 dark:from-slate-900 dark:to-slate-800/60 p-4 rounded-2xl border-2 border-indigo-200/80 dark:border-indigo-900/60 shadow-sm space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  2. Select Item to Top-Up
                </label>
                <select
                  value={selectedItemId}
                  onChange={e => {
                    setSelectedItemId(e.target.value);
                    setManualSingleQty(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {inventoryItems.map(item => {
                    const avail = item.available_stock ?? Math.max(0, item.total_stock - (item.reserved_quantity || 0));
                    const quota = activeTemplate.items?.find(ti => String(ti.inventory_item_id) === String(item.id))?.quantity_per_head;
                    return (
                      <option key={item.id} value={item.id} disabled={avail <= 0}>
                        {item.item_name} (Avail: {avail} {item.unit_type}){quota ? ` • Quota: ${quota} ${item.unit_type}/pax` : ''} {avail <= 0 ? ' [Out of Stock]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedInvItem && (
                <div className="pt-2 border-t border-gray-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-gray-900 dark:text-slate-100">
                        {selectedInvItem.item_name}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                      {templateItem ? `Standard Quota: ${itemQuota} ${selectedInvItem.unit_type}/person` : `Ad-hoc replenishment`}
                      {calculatedSingleBuffer > 0 ? ` (+${calculatedSingleBuffer} pax buffer)` : ''}
                    </p>
                  </div>

                  {/* Quantity Stepper & Direct Input */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xs">
                    <button
                      type="button"
                      onClick={() => handleSingleIncrement(-1)}
                      disabled={singleQty <= 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 disabled:opacity-30 transition font-bold"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={singleQty}
                      onChange={e => handleSingleManualInput(e.target.value)}
                      className="w-16 text-center font-black text-base text-gray-900 dark:text-slate-100 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSingleIncrement(1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 transition font-bold"
                    >
                      <Plus size={14} />
                    </button>
                    <span className="text-xs font-extrabold text-gray-500 dark:text-slate-400 pr-1.5">
                      {selectedInvItem.unit_type}
                    </span>
                  </div>
                </div>
              )}

              {/* Single Item ATP Status */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                hasSingleShortage
                  ? 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {hasSingleShortage ? (
                    <>
                      <AlertTriangle size={15} className="text-red-600 flex-shrink-0" />
                      <span>
                        Shortage: Requested {singleQty} exceeds warehouse ATP of {singleAvail} {selectedInvItem?.unit_type}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                      <span>
                        Warehouse Ready: {singleAvail} {selectedInvItem?.unit_type} available to promise
                      </span>
                    </>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 font-normal">
                  Total: {selectedInvItem?.total_stock} | Res: {selectedInvItem?.reserved_quantity || 0}
                </span>
              </div>
            </div>
          )}

          {/* Dispatch Instructions */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              3. Dispatch Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 py-2.5 rounded-xl font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                (dispatchMode === 'bundle' ? hasBundleShortage || bundleCount < 1 : hasSingleShortage || singleQty < 1)
              }
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
            >
              <Truck size={15} />
              {isSubmitting
                ? 'Reserving & Creating…'
                : dispatchMode === 'bundle'
                ? `Confirm & Reserve (${bundleCount} Packs)`
                : `Confirm & Reserve (${singleQty} ${selectedInvItem?.unit_type || 'units'})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
