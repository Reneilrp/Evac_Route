import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, PhoneCall, Radio, Users, Send
} from 'lucide-react';
import api from '../../services/api';
import { showSuccess, showError } from '../../utils/toast';

const ZAMBOANGA_BARANGAYS = [
  "Arena Blanco", "Ayala", "Baliwasan", "Boalan", "Cabaluay", "Calarian",
  "Canelar", "Cawit", "Culianan", "Curuan", "Divisoria", "Guiwan",
  "Labuan", "Manicahan", "Mampang", "Mercedes", "Pasonanca", "Putik",
  "Recodo", "Rio Hondo", "San Jose", "San Roque", "Santa Catalina",
  "Santa Maria", "Talon-Talon", "Taluksangay", "Tetuan", "Tugbungan",
  "Tumaga", "Vitali", "Zone I (Poblacion)", "Zone II (Poblacion)",
  "Zone III (Poblacion)", "Zone IV (Poblacion)"
];

const ZAMBOANGA_BARANGAY_CENTROIDS = {
  "Tetuan": { lat: 6.9194, lng: 122.0840 },
  "Baliwasan": { lat: 6.9159, lng: 122.0599 },
  "Canelar": { lat: 6.9165, lng: 122.0696 },
  "San Jose Cawa-Cawa": { lat: 6.9140, lng: 122.0650 },
  "San Jose Gusu": { lat: 6.9197, lng: 122.0532 },
  "Pasonanca": { lat: 6.9471, lng: 122.0728 },
  "Tumaga": { lat: 6.9380, lng: 122.0720 },
  "Guiwan": { lat: 6.9289, lng: 122.0922 },
  "Putik": { lat: 6.9350, lng: 122.1050 },
  "Tugbungan": { lat: 6.9150, lng: 122.0800 },
  "Santa Maria": { lat: 6.9300, lng: 122.0700 },
  "Calarian": { lat: 6.9245, lng: 122.0246 },
  "Mampang": { lat: 6.9157, lng: 122.1339 },
  "Talon-Talon": { lat: 6.8950, lng: 122.1000 },
  "Ayala": { lat: 6.9592, lng: 121.9498 },
  "Recodo": { lat: 6.9700, lng: 121.9700 },
  "Cawit": { lat: 6.9556, lng: 121.9739 },
  "Labuan": { lat: 7.0918, lng: 121.9027 },
  "Vitali": { lat: 7.3777, lng: 122.2893 },
  "Curuan": { lat: 7.2100, lng: 122.2313 },
  "Manicahan": { lat: 7.0200, lng: 122.1500 },
  "Cabaluay": { lat: 6.9800, lng: 122.1700 },
  "Mercedes": { lat: 6.9500, lng: 122.1400 },
  "Boalan": { lat: 6.9450, lng: 122.1150 },
  "Culianan": { lat: 6.9700, lng: 122.1400 },
  "Zone I (Poblacion)": { lat: 6.9052, lng: 122.0738 },
  "Zone II (Poblacion)": { lat: 6.9060, lng: 122.0750 },
  "Zone III (Poblacion)": { lat: 6.9070, lng: 122.0760 },
  "Zone IV (Poblacion)": { lat: 6.9080, lng: 122.0770 },
  "Rio Hondo": { lat: 6.9000, lng: 122.0650 },
  "Campo Islam": { lat: 6.9145, lng: 122.0462 },
  "Arena Blanco": { lat: 6.8850, lng: 122.0900 },
  "Santa Catalina": { lat: 6.9100, lng: 122.0850 },
  "Santa Barbara": { lat: 6.9080, lng: 122.0800 },
  "Camino Nuevo": { lat: 6.9123, lng: 122.0762 },
  "San Roque": { lat: 6.9400, lng: 122.0600 },
  "Cabatangan": { lat: 6.9440, lng: 122.0544 },
};

export default function HotlineIntakeModal({ isOpen, onClose, rescueUnits = [], shelters = [] }) {
  const queryClient = useQueryClient();

  const [intakeSource, setIntakeSource] = useState('vhf_radio'); // 'vhf_radio' | 'hotline_911' | 'walk_in'
  const [informantName, setInformantName] = useState('');
  const [informantContact, setInformantContact] = useState('');
  const [victimName, setVictimName] = useState('');
  const [victimPhone, setVictimPhone] = useState('');
  const [barangay, setBarangay] = useState('Tumaga');
  const [latitude, setLatitude] = useState(6.9380);
  const [longitude, setLongitude] = useState(122.0720);
  const [headcount, setHeadcount] = useState(4);
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [triageLevel, setTriageLevel] = useState('critical');
  const [rescueUnitId, setRescueUnitId] = useState('');
  const [targetShelterId, setTargetShelterId] = useState('');
  const [situationDescription, setSituationDescription] = useState('');

  // Auto-update coordinates when barangay changes
  useEffect(() => {
    if (ZAMBOANGA_BARANGAY_CENTROIDS[barangay]) {
      const coords = ZAMBOANGA_BARANGAY_CENTROIDS[barangay];
      queueMicrotask(() => {
        setLatitude(coords.lat);
        setLongitude(coords.lng);
      });
    }
  }, [barangay]);

  // Auto-select first available rescue unit and shelter
  useEffect(() => {
    const available = rescueUnits.filter((u) => u.status === 'standby');
    if (available.length > 0 && !rescueUnitId) {
      queueMicrotask(() => setRescueUnitId(available[0].id));
    }
    if (shelters.length > 0 && !targetShelterId) {
      queueMicrotask(() => setTargetShelterId(shelters[0].id));
    }
  }, [rescueUnits, shelters, rescueUnitId, targetShelterId]);

  const intakeMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/rescue/hotline-intake', payload);
      return res.data;
    },
    onSuccess: (data) => {
      showSuccess(data.message || 'Offline distress call registered and rescue unit dispatched.');
      queryClient.invalidateQueries(['rescueUnits']);
      queryClient.invalidateQueries(['rescueMissions']);
      queryClient.invalidateQueries(['mapDashboard']);
      onClose();
    },
    onError: (err) => {
      showError(err.response?.data?.message || 'Failed to process hotline intake.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rescueUnitId) {
      showError('Please select a rescue unit to dispatch.');
      return;
    }

    intakeMutation.mutate({
      intake_source: intakeSource,
      informant_name: informantName || 'Anonymous Caller',
      informant_contact: informantContact || undefined,
      victim_name: victimName,
      victim_phone: victimPhone || undefined,
      barangay: barangay,
      victim_latitude: Number(latitude),
      victim_longitude: Number(longitude),
      headcount: Number(headcount),
      special_needs: specialNeeds || undefined,
      triage_level: triageLevel,
      rescue_unit_id: Number(rescueUnitId),
      target_shelter_id: targetShelterId ? Number(targetShelterId) : undefined,
      status: 'en_route',
      situation_description: situationDescription,
    });
  };

  if (!isOpen) return null;

  const availableUnits = rescueUnits.filter((u) => u.status === 'standby');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/70 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-md">
              <PhoneCall size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-gray-900 dark:text-slate-100">
                  Manual Emergency Call &amp; Direct Dispatch
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                  Off-App Intake
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Log distress calls from citizens calling via phone (911), two-way radio, or field walk-ins
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Intake Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Source Selection */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase mb-1.5">
              How Was This Emergency Reported?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIntakeSource('hotline_911')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition cursor-pointer ${
                  intakeSource === 'hotline_911'
                    ? 'bg-red-600 text-white border-red-700 shadow-xs'
                    : 'bg-gray-50 dark:bg-slate-800/60 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                }`}
              >
                <PhoneCall size={16} />
                <span>📞 Phone Call (911)</span>
              </button>

              <button
                type="button"
                onClick={() => setIntakeSource('vhf_radio')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition cursor-pointer ${
                  intakeSource === 'vhf_radio'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-gray-50 dark:bg-slate-800/60 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                }`}
              >
                <Radio size={16} />
                <span>📻 Radio (Tanod Patrol)</span>
              </button>

              <button
                type="button"
                onClick={() => setIntakeSource('walk_in')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition cursor-pointer ${
                  intakeSource === 'walk_in'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-gray-50 dark:bg-slate-800/60 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                }`}
              >
                <Users size={16} />
                <span>🚶 Walk-In / Eyewitness</span>
              </button>
            </div>
          </div>

          {/* Informant Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                Informant / Caller Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tanod Romeo, 911 Dispatcher, Juan"
                value={informantName}
                onChange={(e) => setInformantName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                Call-Sign or Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. VHF-CH3, 0917-123-4567"
                value={informantContact}
                onChange={(e) => setInformantContact(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Victim Details */}
          <div className="space-y-3 bg-gray-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Victim / Household Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dela Cruz Family (Stranded in Rooftop)"
                  value={victimName}
                  onChange={(e) => setVictimName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Victim Phone (If any)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0918-987-6543"
                  value={victimPhone}
                  onChange={(e) => setVictimPhone(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Barangay *
                </label>
                <select
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {ZAMBOANGA_BARANGAYS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Headcount (Persons) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  required
                  value={headcount}
                  onChange={(e) => setHeadcount(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                  Triage Priority *
                </label>
                <select
                  value={triageLevel}
                  onChange={(e) => setTriageLevel(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="critical">🔴 Critical Priority (Immediate Life Threat)</option>
                  <option value="urgent">🟠 Urgent Priority (Rising Water / Medical)</option>
                  <option value="standard">🔵 Standard Priority (Pre-emptive Extraction)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                Special Needs / Vulnerabilities
              </label>
              <input
                type="text"
                placeholder="e.g. 1 bedridden senior citizen, 1 infant, oxygen tank needed"
                value={specialNeeds}
                onChange={(e) => setSpecialNeeds(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                Situation Description &amp; Reported Landmarks *
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Water reached 6 feet along Saaz riverbank behind Villa San Ignacio. Trapped with 4 family members."
                value={situationDescription}
                onChange={(e) => setSituationDescription(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
          </div>

          {/* Unit & Shelter Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                Dispatch Available Rescue Unit * ({availableUnits.length} Standby)
              </label>
              <select
                required
                value={rescueUnitId}
                onChange={(e) => setRescueUnitId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
              >
                {availableUnits.length === 0 ? (
                  <option value="">No Standby Units Available</option>
                ) : (
                  availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.call_sign}) • Cap: {u.capacity_persons}p • {u.unit_type}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 mb-1">
                Destination Evacuation Shelter
              </label>
              <select
                value={targetShelterId}
                onChange={(e) => setTargetShelterId(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
              >
                {shelters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.barangay || 'Shelter'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={intakeMutation.isPending || availableUnits.length === 0}
              className="px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send size={15} />
              <span>{intakeMutation.isPending ? 'Dispatching...' : 'Dispatch Immediate Rescue Mission'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
