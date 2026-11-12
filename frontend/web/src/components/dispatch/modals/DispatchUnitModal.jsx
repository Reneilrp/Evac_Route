import React, { useState, useEffect, useMemo } from 'react';
import { LifeBuoy, Phone, AlertTriangle, CheckCircle2, MapPin, X, Sparkles } from 'lucide-react';
import api from '../../../services/api';
import { showError } from '../../../utils/toast';
import { getHaversineDistance, resolveBarangayFromCoords, ZAMBOANGA_BARANGAYS } from '../../../utils/mapHelper';

const RESCUE_EQUIPMENT_PRESETS = [
  { id: 'rubber_boat', label: 'Rubber Boat / Inflatable Raft', icon: '🚤' },
  { id: 'life_vests', label: 'Life Vests & Ring Buoys', icon: '🦺' },
  { id: 'first_aid', label: 'First Aid Trauma Kit & Splints', icon: '🩹' },
  { id: 'spine_board', label: 'Spine Board & Cervical Collar', icon: '🩺' },
  { id: 'scba_gear', label: 'SCBA / Fire Protective Gear', icon: '🧯' },
  { id: 'extrication_tools', label: 'Hydraulic Extrication Cutters', icon: '🔧' },
  { id: 'vhf_radios', label: 'VHF Handheld Radios', icon: '📻' },
  { id: 'floodlights', label: 'Tactical Searchlights', icon: '🔦' },
];

// --- Dispatch Modal Component ---
export function DispatchUnitModal({ initialData, availableUnits, shelters = [], onClose, onSuccess }) {
  const hazardType = (initialData.hazard_type || 'flood').toLowerCase();
  const isFireHazard = hazardType === 'fire' || hazardType === 'building_fire';
  const isMedicalHazard = hazardType === 'medical';
  const suggestedUnitType = isFireHazard ? 'high_clearance_truck' : (isMedicalHazard ? 'medical_ambulance' : 'water_rescue');

  const defaultUnit = availableUnits.find(u => u.status === 'standby' && u.unit_type === suggestedUnitType)
    || availableUnits.find(u => u.status === 'standby')
    || availableUnits[0];

  const defaultEquipments = useMemo(() => {
    if (isFireHazard) return ['scba_gear', 'first_aid', 'vhf_radios', 'extrication_tools'];
    if (isMedicalHazard) return ['first_aid', 'spine_board', 'vhf_radios'];
    return ['rubber_boat', 'life_vests', 'first_aid', 'vhf_radios'];
  }, [isFireHazard, isMedicalHazard]);

  const [unitId, setUnitId] = useState(initialData.rescue_unit_id || (defaultUnit?.id || ''));
  const [victimName, setVictimName] = useState(initialData.victim_name || '');
  const [victimPhone, setVictimPhone] = useState(initialData.victim_phone || '');
  const [lat, setLat] = useState(initialData.victim_latitude || 6.9200);
  const [lng, setLng] = useState(initialData.victim_longitude || 122.0800);
  const [barangay, setBarangay] = useState(initialData.barangay || '');
  const [customBarangay, setCustomBarangay] = useState('');
  const [isManualBarangay, setIsManualBarangay] = useState(false);
  const [headcount, setHeadcount] = useState(initialData.headcount || 1);
  const [targetShelterId, setTargetShelterId] = useState('');
  const [isManualShelter, setIsManualShelter] = useState(false);
  const [selectedEquipments, setSelectedEquipments] = useState(defaultEquipments);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleEquipment = (id) => {
    setSelectedEquipments(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 1. Smart Geocoding: Automatically resolve Barangay from coordinates
  useEffect(() => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      const detected = resolveBarangayFromCoords(latNum, lngNum, shelters);
      if (detected && !isManualBarangay) {
        queueMicrotask(() => setBarangay(detected));
      }
    }
  }, [lat, lng, shelters, isManualBarangay]);

  // 2. Proximity Calculation: Compute distances to all shelters and sort closest first
  const sortedSheltersWithDistance = useMemo(() => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum) || !Array.isArray(shelters)) return shelters || [];

    return [...shelters]
      .map(shelter => {
        const sLat = parseFloat(shelter.latitude);
        const sLng = parseFloat(shelter.longitude);
        const distanceMeters = (!isNaN(sLat) && !isNaN(sLng))
          ? getHaversineDistance({ lat: latNum, lng: lngNum }, { lat: sLat, lng: sLng })
          : 9999999;
        const distanceKm = (distanceMeters / 1000).toFixed(2);
        const availableCapacity = Math.max(0, (shelter.max_capacity || 0) - (shelter.current_occupancy || 0));
        const isClosed = shelter.status === 'closed';

        return {
          ...shelter,
          distanceMeters,
          distanceKm,
          availableCapacity,
          isClosed,
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [shelters, lat, lng]);

  // 3. Recommended Shelter: Closest open shelter with free capacity
  const recommendedShelter = useMemo(() => {
    if (!sortedSheltersWithDistance || sortedSheltersWithDistance.length === 0) return null;
    const bestWithCapacity = sortedSheltersWithDistance.find(s => !s.isClosed && s.availableCapacity > 0);
    if (bestWithCapacity) return bestWithCapacity;
    const bestOpen = sortedSheltersWithDistance.find(s => !s.isClosed);
    return bestOpen || sortedSheltersWithDistance[0];
  }, [sortedSheltersWithDistance]);

  // Auto-select nearest shelter by default
  useEffect(() => {
    if (recommendedShelter?.id && (!targetShelterId || !isManualShelter)) {
      queueMicrotask(() => setTargetShelterId(recommendedShelter.id));
    }
  }, [recommendedShelter?.id, isManualShelter, targetShelterId]);

  const selectedUnit = availableUnits.find(u => String(u.id) === String(unitId));
  const responsibleOfficer = selectedUnit?.assigned_personnel?.name || selectedUnit?.crew_members?.[0]?.name || 'Officer On Duty';
  const unitPhone = selectedUnit?.contact_number || 'N/A';
  const isOverCapacity = selectedUnit?.capacity && parseInt(headcount, 10) > selectedUnit.capacity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unitId) {
      showError('Please select an available rescue unit.');
      return;
    }
    setIsSubmitting(true);
    const finalBarangay = barangay === 'Other' ? (customBarangay || 'Zamboanga City') : (barangay || 'Zamboanga City');
    try {
      await api.post('/rescue/missions', {
        rescue_unit_id: parseInt(unitId, 10),
        pending_incident_id: initialData.pending_incident_id || null,
        victim_name: victimName.trim() || 'Unnamed Evacuees',
        victim_phone: victimPhone || null,
        victim_latitude: parseFloat(lat),
        victim_longitude: parseFloat(lng),
        barangay: finalBarangay,
        headcount: parseInt(headcount, 10),
        triage_level: 'urgent',
        status: 'en_route', // automatic accept for immediate field action
        equipments: selectedEquipments,
        target_shelter_id: targetShelterId ? parseInt(targetShelterId, 10) : (recommendedShelter?.id ? parseInt(recommendedShelter.id, 10) : null),
      });
      onSuccess();
    } catch (err) {
      showError(err?.response?.data?.message || 'Failed to dispatch rescue unit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-xs z-[100] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
        <div className="bg-red-600 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <LifeBuoy size={20} />
            <h3 className="font-bold text-base">Dispatch Search &amp; Rescue Mission</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Emergency SOS Origin Banner */}
          {initialData.hazard_type && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isFireHazard ? (
                    <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      🔥 FIRE RESCUE
                    </span>
                  ) : isMedicalHazard ? (
                    <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      🚑 MEDICAL RESCUE
                    </span>
                  ) : (
                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      🌊 FLOOD RESCUE
                    </span>
                  )}
                  <span className="font-bold text-gray-900 dark:text-slate-100">
                    Distress Order: <strong className="text-red-600 dark:text-red-400">{`${headcount} Victims Stranded`}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 font-mono">
                  CITIZEN SOS ORDER
                </span>
              </div>

              {Array.isArray(initialData.modifiers) && initialData.modifiers.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-red-100 dark:border-red-900/30">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Special Needs:</span>
                  {initialData.modifiers.map(mod => (
                    <span key={mod} className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {mod.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rescue Unit Selector */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-gray-700 dark:text-slate-300">Select Responding Unit</label>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                Recommended: {isFireHazard ? '🚒 Truck / Fire Unit' : (isMedicalHazard ? '🚑 Ambulance' : '🚤 Water Rescue Boat')}
              </span>
            </div>
            <select
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg font-bold text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-red-500"
              required
            >
              <option value="">Select an available unit...</option>
              {availableUnits.map(u => {
                const isMatch = u.unit_type === suggestedUnitType;
                return (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.call_sign}) — Cap: {u.capacity ?? 4} pers — {u.status.toUpperCase()} {isMatch ? '★ RECOMMENDED' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected Unit Responsible Officer & Contact Person Card */}
          {selectedUnit && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {selectedUnit.call_sign ? selectedUnit.call_sign.substring(0, 3) : 'SRR'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-slate-100 text-xs">
                      Responsible Officer: {responsibleOfficer}
                    </span>
                    <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.2 rounded font-bold">
                      {selectedUnit.call_sign}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <Phone size={11} className="text-blue-500" /> Hot Contact: <strong className="font-mono text-gray-900 dark:text-slate-100">{unitPhone}</strong> • Max Capacity: {selectedUnit.capacity ?? 4} pers
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  READY
                </span>
              </div>
            </div>
          )}

          {/* Victim / Family Name & Contact Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                Victim / Family Name <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={victimName}
                onChange={e => setVictimName(e.target.value)}
                placeholder="e.g. Santos Family or Unnamed Evacuees"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Contact Phone</label>
              <input
                type="text"
                value={victimPhone}
                onChange={e => setVictimPhone(e.target.value)}
                placeholder="e.g. 09171234567"
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg"
              />
            </div>
          </div>

          {/* Headcount & Smart Auto-Geocoded Barangay */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">Headcount</label>
                {selectedUnit && (
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono">
                    Cap: <strong className={isOverCapacity ? 'text-red-500 font-black' : 'text-emerald-500'}>{selectedUnit.capacity ?? 4}</strong>
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                value={headcount}
                onChange={e => setHeadcount(e.target.value)}
                className={`w-full p-2.5 bg-gray-50 dark:bg-slate-800 border rounded-lg text-gray-900 dark:text-slate-100 ${
                  isOverCapacity ? 'border-amber-500 ring-1 ring-amber-500' : 'border-gray-300 dark:border-slate-700'
                }`}
                required
              />
              {isOverCapacity && (
                <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-[10px] flex items-center gap-1.5">
                  <AlertTriangle size={12} className="shrink-0 text-amber-600" />
                  <span><strong>⚠️ Exceeds Capacity:</strong> Unit holds {selectedUnit.capacity} pers (order has {headcount} victims).</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">Barangay (Geocoded)</label>
                <button
                  type="button"
                  onClick={() => setIsManualBarangay(prev => !prev)}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  {isManualBarangay ? 'Auto-detect from GPS' : 'Manual Override'}
                </button>
              </div>

              {!isManualBarangay ? (
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200 text-xs">
                    <MapPin size={13} className="text-blue-500" />
                    <span>Barangay {barangay || 'Detecting...'}</span>
                  </span>
                  <span className="text-[9px] bg-blue-600 text-white font-mono px-1.5 py-0.5 rounded font-bold">
                    Auto-Geocoded
                  </span>
                </div>
              ) : (
                <>
                  <select
                    value={barangay}
                    onChange={e => {
                      setBarangay(e.target.value);
                      setIsManualBarangay(true);
                    }}
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg"
                  >
                    {ZAMBOANGA_BARANGAYS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="Other">Other / Custom...</option>
                  </select>
                  {barangay === 'Other' && (
                    <input
                      type="text"
                      value={customBarangay}
                      onChange={e => setCustomBarangay(e.target.value)}
                      placeholder="Type barangay name"
                      className="w-full mt-2 p-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg"
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Permanently Visible GPS Coordinates & Geocoding Anchor */}
          <div className="border border-gray-200 dark:border-slate-800 rounded-xl p-3 bg-gray-50/70 dark:bg-slate-950/50">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-slate-300 text-xs">
                <MapPin size={13} className="text-red-500" />
                <span>Distress GPS Coordinates (Permanently Visible)</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                Auto-resolves Barangay &amp; Nearest Shelter
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg font-mono text-xs focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-slate-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={e => setLng(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg font-mono text-xs focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Rescue Equipment Brought Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-700 dark:text-slate-300">
                Rescue Equipment Brought / Deployed ({selectedEquipments.length} selected)
              </label>
              <span className="text-[10px] text-gray-400">Click to toggle items</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {RESCUE_EQUIPMENT_PRESETS.map(eq => {
                const isSelected = selectedEquipments.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleEquipment(eq.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left transition border text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-bold'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 font-medium hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{eq.icon}</span>
                    <span className="truncate flex-1">{eq.label}</span>
                    <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-slate-600'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Smart Proximity-Based Drop-off Shelter Destination */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-gray-700 dark:text-slate-300">Drop-off Shelter Destination</label>
              {recommendedShelter && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Sparkles size={11} /> Smart Nearest Suggestion
                </span>
              )}
            </div>

            {/* Smart Recommendation Banner */}
            {recommendedShelter && (
              <div className="mb-2.5 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-emerald-900 dark:text-emerald-200 text-xs">
                        RECOMMENDED NEAREST SHELTER:
                      </span>
                      <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        {recommendedShelter.distanceKm} km away
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">
                      {recommendedShelter.name} ({recommendedShelter.barangay}) • {recommendedShelter.availableCapacity} spots available ({recommendedShelter.current_occupancy}/{recommendedShelter.max_capacity} occupied)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTargetShelterId(recommendedShelter.id);
                    setIsManualShelter(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition shrink-0 cursor-pointer ${
                    String(targetShelterId) === String(recommendedShelter.id)
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                  }`}
                >
                  {String(targetShelterId) === String(recommendedShelter.id) ? '✓ Selected' : 'Use Nearest'}
                </button>
              </div>
            )}

            {/* Dropdown sorted by proximity (closest first) */}
            <select
              value={targetShelterId}
              onChange={e => {
                setTargetShelterId(e.target.value);
                setIsManualShelter(true);
              }}
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg text-xs font-medium"
            >
              <option value="">Select evacuation center...</option>
              {sortedSheltersWithDistance.map(s => {
                const isRec = s.id === recommendedShelter?.id;
                return (
                  <option key={s.id} value={s.id}>
                    {isRec ? '★ [RECOMMENDED - ' : '['}
                    {s.distanceKm} km] {s.name} ({s.barangay}) — {s.availableCapacity} spots free {s.isClosed ? '(CLOSED)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition shadow flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? 'Deploying...' : 'Confirm & Deploy Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Staging Handover Modal Component ---


export default DispatchUnitModal;
