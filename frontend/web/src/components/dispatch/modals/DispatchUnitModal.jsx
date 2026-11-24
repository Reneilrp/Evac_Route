import React, { useState, useEffect, useMemo } from 'react';
import { LifeBuoy, Phone, AlertTriangle, CheckCircle2, MapPin, X, Sparkles, Users, Shield } from 'lucide-react';
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
    if (isFireHazard) return ['scba_gear', 'first_aid', 'extrication_tools'];
    if (isMedicalHazard) return ['first_aid', 'spine_board'];
    return ['rubber_boat', 'life_vests', 'first_aid'];
  }, [isFireHazard, isMedicalHazard]);

  // Support multiple responding units
  const initialUnitId = initialData.rescue_unit_id || defaultUnit?.id;
  const [selectedUnitIds, setSelectedUnitIds] = useState(initialUnitId ? [initialUnitId] : []);
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

  const toggleUnit = (id) => {
    setSelectedUnitIds(prev => {
      if (prev.includes(id)) {
        // Keep at least one unit selected if possible
        return prev.length > 1 ? prev.filter(uId => uId !== id) : prev;
      }
      return [...prev, id];
    });
  };

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

  const selectedUnits = useMemo(() => {
    return availableUnits.filter(u => selectedUnitIds.some(id => String(id) === String(u.id)));
  }, [availableUnits, selectedUnitIds]);

  const totalSelectedCapacity = useMemo(() => {
    return selectedUnits.reduce((acc, u) => acc + (u.capacity || 4), 0);
  }, [selectedUnits]);

  const isOverCapacity = totalSelectedCapacity > 0 && parseInt(headcount, 10) > totalSelectedCapacity;

  // Contextualized Affected Individuals Label
  const affectedIndividualsLabel = isFireHazard
    ? 'Fire-Affected Individuals'
    : isMedicalHazard
    ? 'Medical-Affected Individuals'
    : hazardType === 'flood'
    ? 'Flood-Affected Individuals'
    : 'Affected Individuals';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUnitIds.length === 0) {
      showError('Please select at least one available rescue unit.');
      return;
    }
    setIsSubmitting(true);
    const finalBarangay = barangay === 'Other' ? (customBarangay || 'Zamboanga City') : (barangay || 'Zamboanga City');
    try {
      await api.post('/rescue/missions', {
        rescue_unit_id: parseInt(selectedUnitIds[0], 10),
        rescue_unit_ids: selectedUnitIds.map(id => parseInt(id, 10)),
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="bg-red-600 text-white p-5 flex justify-between items-center shrink-0 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-2.5">
            <LifeBuoy size={20} />
            <h3 className="font-bold text-base">Dispatch Search &amp; Rescue Mission</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer" aria-label="Close Modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* ========================================================= */}
          {/* TOP SECTION: VICTIM & INCIDENT INFORMATION                 */}
          {/* ========================================================= */}

          {/* Emergency Origin Banner with Contextualized "Affected Individuals" */}
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
                  {affectedIndividualsLabel}: <strong className="text-red-600 dark:text-red-400">{`${headcount} Victims Stranded`}</strong>
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 font-mono">
                CITIZEN RESCUE CALL
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
              <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Headcount (Victims)</label>
              <input
                type="number"
                min="1"
                value={headcount}
                onChange={e => setHeadcount(e.target.value)}
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100"
                required
              />
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

          {/* ========================================================= */}
          {/* BOTTOM SECTION: RESPONDING UNITS & TACTICAL EQUIPMENT      */}
          {/* ========================================================= */}

          <div className="pt-2 border-t border-gray-200 dark:border-slate-800">
            {/* Multi-Unit Responding Fleet Selection */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Shield size={14} className="text-red-600" />
                  <label className="font-bold text-gray-800 dark:text-slate-200 text-xs">
                    Assign Responding Rescue Fleet ({selectedUnits.length} selected)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400">
                    Fleet Cap: <strong className={isOverCapacity ? 'text-red-500 font-black' : 'text-emerald-500'}>{totalSelectedCapacity} pers</strong>
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    Recommended: {isFireHazard ? '🚒 Fire Truck' : (isMedicalHazard ? '🚑 Ambulance' : '🚤 Water Boat')}
                  </span>
                </div>
              </div>

              {/* Selectable Fleet Cards (Full-Width Row per Unit) */}
              <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                {availableUnits.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    No rescue units currently on standby in the active fleet roster.
                  </div>
                ) : (
                  availableUnits.map(u => {
                    const isSelected = selectedUnitIds.some(id => String(id) === String(u.id));
                    const isMatch = u.unit_type === suggestedUnitType;
                    const officerName = u.assigned_personnel?.name || u.crew_members?.[0]?.name || 'Officer On Duty';
                    const badgeText = (u.call_sign || u.name || 'FLT').substring(0, 3).toUpperCase();

                    return (
                      <div
                        key={u.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => toggleUnit(u.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleUnit(u.id);
                          }
                        }}
                        className={`w-full p-3 rounded-2xl border transition-all cursor-pointer text-left flex items-center justify-between gap-3.5 ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 dark:border-blue-600 ring-2 ring-blue-500/80 shadow-xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-blue-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {/* Call Sign Square Badge (e.g. BOA) */}
                        <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 uppercase tracking-wider shadow-xs">
                          {badgeText}
                        </div>

                        {/* Officer & Contact Details (1 full row for main detail, 1 full row below for contact & capacity) */}
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          {/* Top Row: Responsible Officer & Call Sign */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              Responsible Officer: <span className="font-bold text-slate-900 dark:text-white">{officerName}</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                              {u.call_sign}
                            </span>
                            {isMatch && (
                              <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">
                                ★ RECOMMENDED
                              </span>
                            )}
                          </div>

                          {/* Bottom Row: Hot Contact & Max Capacity */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                            <span className="text-blue-500 shrink-0 text-xs">📞</span>
                            <span>Hot Contact: <strong className="font-bold text-slate-800 dark:text-slate-200">{u.contact_number || 'N/A'}</strong></span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span>Max Capacity: <strong className="font-bold text-slate-800 dark:text-slate-200">{u.capacity ?? 4} pers</strong></span>
                          </div>
                        </div>

                        {/* Status Pill on the Right (e.g. READY) */}
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shrink-0 flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80'
                        }`}>
                          {isSelected && <span className="font-black text-xs text-blue-600 dark:text-blue-400">✓</span>}
                          READY
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Over-Capacity Warning Banner */}
              {isOverCapacity && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-[10px] flex items-center gap-1.5">
                  <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                  <span>
                    <strong>⚠️ Exceeds Capacity:</strong> Selected fleet holds {totalSelectedCapacity} persons, but incident reports {headcount} victims. Consider selecting additional responding units.
                  </span>
                </div>
              )}
            </div>

            {/* Rescue Equipment Brought Checklist (Scoped Inside Responding Units Section) */}
            <div className="mt-3">
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
              disabled={isSubmitting || selectedUnitIds.length === 0}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition shadow flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? 'Deploying...' : `Confirm & Deploy Unit${selectedUnitIds.length > 1 ? `s (${selectedUnitIds.length})` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DispatchUnitModal;
