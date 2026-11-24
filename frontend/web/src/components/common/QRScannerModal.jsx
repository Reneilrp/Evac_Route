import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, CheckCircle, AlertCircle, AlertTriangle, QrCode, UserPlus, Search, FileText, HeartHandshake, Plus, Minus, WifiOff, Package } from 'lucide-react';
import api from '../../services/api';

export default function QRScannerModal({ isOpen, onClose, selectedShelterId }) {
  const scannerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'manual_search' | 'rapid_walkin'
  const [verifiedData, setVerifiedData] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Headcount Adjuster State
  const [adjustedHeadcount, setAdjustedHeadcount] = useState(1);
  const [selectedNfis, setSelectedNfis] = useState(['food_pack', 'blanket_mat', 'hygiene_kit', 'dignity_kit', 'medicines']);

  // Manual Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Rapid Walk-In Form State
  const [walkinName, setWalkinName] = useState('');
  const [walkinHeadcount, setWalkinHeadcount] = useState('4');
  const [walkinBarangay, setWalkinBarangay] = useState('Tetuan');
  const [walkinContact, setWalkinContact] = useState('');

  const toggleNfi = (id) => {
    setSelectedNfis(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const onScanSuccess = useCallback(async (decodedText) => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    setLoading(true);
    setError(null);
    setVerifiedData(null);
    
    try {
      // Step 1: Verify QR code with instant anti-duplication & headcount lookup
      const verifyRes = await api.post(`/shelters/${selectedShelterId}/verify-qr`, {
        qr_code_hash: decodedText
      });
      const data = verifyRes.data.data;
      setVerifiedData({
        ...data,
        rawToken: decodedText
      });
      setAdjustedHeadcount(data.recorded_headcount || 1);
    } catch (err) {
      // Offline fallback: parse offline token and queue locally
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK';
      if (isNetworkError) {
        let extractedId = 'Resident';
        let extractedHeadcount = 4;
        if (decodedText.includes(':')) {
          const parts = decodedText.split(':');
          extractedId = parts[0] || 'Resident';
          if (parts.length >= 4 && !isNaN(parseInt(parts[3], 10))) {
            extractedHeadcount = parseInt(parts[3], 10);
          }
        }
        setVerifiedData({
          rawToken: decodedText,
          family_name: `IDP Household #${extractedId} (Offline Token)`,
          recorded_headcount: extractedHeadcount,
          has_claimed: false,
          is_offline: true,
          duplicate_warning: null
        });
        setAdjustedHeadcount(extractedHeadcount);
      } else {
        console.error(err);
        setError(err.response?.data?.message || 'Verification failed. QR code may be invalid or expired.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedShelterId]);

  const handleConfirmIntake = async () => {
    if (!verifiedData) return;
    setLoading(true);
    setError(null);

    // If offline, save in localStorage queue
    if (verifiedData.is_offline) {
      try {
        const queue = JSON.parse(localStorage.getItem('evac_offline_checkins') || '[]');
        queue.push({
          shelter_id: selectedShelterId,
          qr_code_hash: verifiedData.rawToken,
          actual_headcount: adjustedHeadcount,
          claimed_nfi_items: selectedNfis,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('evac_offline_checkins', JSON.stringify(queue));
        setScanResult({
          message: `Network Offline: IDP Intake for ${adjustedHeadcount} Pax queued safely on this device.`,
          data: {
            action: 'checkin',
            is_offline: true,
            ration_applied: 'CSWDO Disaster Relief & NFI Pack (Queued)',
            idp_headcount: adjustedHeadcount
          }
        });
        setVerifiedData(null);
        return;
      } catch (_e) {}
    }

    try {
      const res = await api.post(`/shelters/${selectedShelterId}/check-in`, {
        qr_code_hash: verifiedData.rawToken,
        actual_headcount: adjustedHeadcount,
        claimed_nfi_items: selectedNfis
      });
      setScanResult(res.data);
      setVerifiedData(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual resident search by Name / Barangay / Phone
  const handleSearch = async (queryStr) => {
    setSearchQuery(queryStr);
    if (!queryStr || queryStr.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get('/residents', { params: { search: queryStr } });
      setSearchResults(res.data.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResidentForCheckIn = async (resident) => {
    onScanSuccess(resident.qr_code_hash || `hash_${resident.id}`);
  };

  const handleRapidWalkIn = async (e) => {
    e.preventDefault();
    if (!walkinName || !walkinHeadcount || !walkinBarangay) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.post(`/shelters/${selectedShelterId}/rapid-check-in`, {
        name: walkinName,
        headcount: parseInt(walkinHeadcount, 10),
        barangay: walkinBarangay,
        contact_number: walkinContact || 'N/A'
      });
      setScanResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Rapid walk-in registration failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'scan' && !scanResult && !verifiedData && !loading && !error) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, () => {});
      scannerRef.current = scanner;

      return () => {
        scanner.clear().catch(err => console.error("Failed to clear scanner:", err));
      };
    }
  }, [isOpen, activeTab, scanResult, verifiedData, loading, error, onScanSuccess]);

  const resetScanner = () => {
    setScanResult(null);
    setVerifiedData(null);
    setError(null);
    setWalkinName('');
    setWalkinHeadcount('4');
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <QrCode size={20} className="text-blue-500" /> CSWDO Intake &amp; Relief Desk (IDPs)
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <HeartHandshake size={12} /> Equitable Access: Non-discriminatory intake for all Internally Displaced Persons (IDPs)
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition">
            <X size={22} />
          </button>
        </div>

        {/* 3 Non-Discriminatory Relief Claim Options */}
        {!scanResult && !verifiedData && !loading && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-gray-100/50 dark:bg-slate-900/50 p-1">
            <button
              onClick={() => { setActiveTab('scan'); setError(null); }}
              className={`flex-1 py-2 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'scan' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'
              }`}
            >
              <QrCode size={13} /> 1. Scan IDP QR
            </button>
            <button
              onClick={() => { setActiveTab('manual_search'); setError(null); }}
              className={`flex-1 py-2 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'manual_search' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'
              }`}
            >
              <Search size={13} /> 2. Search Name / Brgy
            </button>
            <button
              onClick={() => { setActiveTab('rapid_walkin'); setError(null); }}
              className={`flex-1 py-2 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'rapid_walkin' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'
              }`}
            >
              <UserPlus size={13} /> 3. 1st-Time Walk-In
            </button>
          </div>
        )}

        <div className="p-6 flex flex-col items-center min-h-[340px] justify-center">
          {/* Method 1: QR Camera Scanner */}
          {activeTab === 'scan' && !scanResult && !verifiedData && !error && !loading && (
            <div className="w-full">
              <div id="qr-reader" className="w-full"></div>
              <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-4">Point camera at IDP resident's mobile app QR Code.</p>
              
              <button 
                onClick={() => onScanSuccess('hash_test_code_0')}
                className="mt-4 w-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 py-2 rounded text-xs font-medium hover:bg-gray-200 transition border border-dashed border-gray-300 dark:border-slate-700"
              >
                [Dev] Test Scan Registered IDP Resident (Cruz Family)
              </button>
            </div>
          )}

          {/* Method 2: Manual Search by Name or Barangay */}
          {activeTab === 'manual_search' && !scanResult && !verifiedData && !error && !loading && (
            <div className="w-full space-y-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 mb-2">
                🤝 <strong>No QR Code Required:</strong> Type IDP family name or barangay to issue relief rations directly.
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type IDP name, barangay, or phone..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {searching && (
                <p className="text-xs text-gray-500 text-center py-4">Searching resident database...</p>
              )}

              {!searching && searchResults.length > 0 && (
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
                  {searchResults.map(res => (
                    <div key={res.id} className="p-3 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 flex justify-between items-center transition">
                      <div>
                        <p className="font-semibold text-sm text-gray-800 dark:text-slate-200">{res.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          Brgy. {res.barangay} • IDP Family of {res.headcount} • Status: <span className="font-bold">{res.current_status}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleSelectResidentForCheckIn(res)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded transition"
                      >
                        {res.current_status === 'checked_in' ? 'Check-Out' : 'Verify & Intake'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">No existing IDP resident matches "{searchQuery}".</p>
                  <button
                    onClick={() => {
                      setWalkinName(searchQuery);
                      setActiveTab('rapid_walkin');
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    + Register "{searchQuery}" as a 1st-Time Walk-In IDP
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Method 3: Rapid Walk-In Form for Unregistered IDPs */}
          {activeTab === 'rapid_walkin' && !scanResult && !verifiedData && !error && !loading && (
            <form onSubmit={handleRapidWalkIn} className="w-full space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300 mb-2">
                ⚡ <strong>On-the-Spot IDP Registration:</strong> For displaced residents arriving without accounts or smartphones.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Head of Family Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan Dela Cruz"
                  value={walkinName}
                  onChange={e => setWalkinName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Headcount (Family Members)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    placeholder="e.g. 4"
                    value={walkinHeadcount}
                    onChange={e => setWalkinHeadcount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Barangay</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tetuan"
                    value={walkinBarangay}
                    onChange={e => setWalkinBarangay(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Contact Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 09123456789"
                  value={walkinContact}
                  onChange={e => setWalkinContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition mt-2 flex items-center justify-center gap-2"
              >
                <FileText size={16} /> Register &amp; Issue IDP Relief Pass
              </button>
            </form>
          )}

          {/* Verification & Intake Staging Panel (Headcount Adjuster & Anti-Duplication Alert) */}
          {verifiedData && !loading && !scanResult && (
            <div className="w-full space-y-4">
              {/* Anti-Duplication Warning Banner & Rejection Guard */}
              {(verifiedData.has_claimed || verifiedData.duplicate_warning) && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h5 className="font-extrabold text-xs text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                        ⚠️ Duplicate Scan Flagged: Relief Already Claimed Today
                      </h5>
                      <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                        {verifiedData.duplicate_warning || 'This IDP household has already claimed relief rations today. Double-claiming is strictly prohibited under CSWDO camp rules.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1 border-t border-rose-200 dark:border-rose-900/60">
                    <button
                      type="button"
                      onClick={() => {
                        resetScanner();
                        setError('Duplicate scan rejected: IDP household has already claimed relief items today.');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      Reject Duplicate Scan
                    </button>
                  </div>
                </div>
              )}

              {/* IDP Family Profile Header */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100">
                    {verifiedData.family_name || 'Internally Displaced Person (IDP) Household'}
                  </h4>
                  {verifiedData.is_offline && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <WifiOff size={10} /> Offline Validated
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Sector: {verifiedData.barangay || 'Zamboanga City'} • Registered Headcount: <strong>{verifiedData.recorded_headcount} IDPs</strong>
                </p>
              </div>

              {/* Headcount Adjuster Stepper */}
              <div className="bg-blue-50/50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-blue-100 dark:border-slate-700">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 text-center">
                  Verify Physical Headcount Present at Shelter Gate
                </label>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustedHeadcount(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-gray-800 dark:text-slate-100 flex items-center justify-center hover:bg-slate-300 transition"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="text-center min-w-[70px]">
                    <span className="text-3xl font-black text-blue-600 dark:text-blue-400 block">
                      {adjustedHeadcount}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Present IDPs</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdjustedHeadcount(prev => prev + 1)}
                    className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {adjustedHeadcount < verifiedData.recorded_headcount && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center mt-2 font-medium">
                    ⚠️ Partial Intake: {verifiedData.recorded_headcount - adjustedHeadcount} member(s) absent (will check in later).
                  </p>
                )}
              </div>

              {/* CSWDO Non-Food Items (NFIs) & Dignity Kit Checklist */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Package size={14} className="text-blue-500" /> CSWDO Relief Items &amp; Dignity Kits Checklist:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'food_pack', label: 'Food Pack (Family)', icon: '🍚' },
                    { id: 'blanket_mat', label: 'Blankets & Mats', icon: '🛏️' },
                    { id: 'hygiene_kit', label: 'Family Hygiene Kit', icon: '🧼' },
                    { id: 'dignity_kit', label: 'Dignity Kit (Women)', icon: '🌸' },
                    { id: 'medicines', label: 'First Aid / Meds', icon: '💊' },
                  ].map(nfi => {
                    const isChecked = selectedNfis.includes(nfi.id);
                    return (
                      <button
                        type="button"
                        key={nfi.id}
                        onClick={() => toggleNfi(nfi.id)}
                        className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                          isChecked 
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 font-bold' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
                        }`}
                      >
                        <span>{nfi.icon}</span>
                        <span>{nfi.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confirm / Cancel Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetScanner}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmIntake}
                  className="flex-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition"
                >
                  <CheckCircle size={15} /> Confirm Intake ({adjustedHeadcount} IDPs)
                </button>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center">
              <span className="flex h-10 w-10 relative mb-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-10 w-10 bg-blue-500"></span>
              </span>
              <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Processing IDP intake &amp; updating inventory allocations...</p>
            </div>
          )}

          {/* Success Payload Display */}
          {scanResult && (
            <div className="flex flex-col items-center text-center w-full">
              <CheckCircle size={56} className="text-green-500 mb-3" />
              <h4 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
                {scanResult.data?.action === 'rapid_checkin' && 'Walk-In Registration & Intake Success!'}
                {scanResult.data?.action === 'checkout' && 'Check-Out Successful!'}
                {scanResult.data?.action === 'transfer' && 'Shelter Transfer Successful!'}
                {scanResult.data?.action === 'checkin' && 'IDP Shelter Intake Complete!'}
              </h4>
              
              <div className="bg-gray-50 dark:bg-slate-800/80 p-3.5 rounded-lg w-full text-left text-xs space-y-1.5 mb-4 border border-slate-200 dark:border-slate-700">
                <p><strong className="text-gray-700 dark:text-slate-200">Result Message:</strong> {scanResult.message}</p>
                <p><strong className="text-gray-700 dark:text-slate-200">Allocated Rations:</strong> {scanResult.data?.ration_applied}</p>
                {scanResult.data?.idp_headcount && (
                  <p><strong className="text-gray-700 dark:text-slate-200">Admitted IDP Headcount:</strong> {scanResult.data?.idp_headcount} Persons</p>
                )}
                {scanResult.data?.generated_qr_hash && (
                  <p className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                    Temporary IDP ID: {scanResult.data?.generated_qr_hash}
                  </p>
                )}
              </div>

              <button 
                onClick={resetScanner}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition"
              >
                Intake Next IDP Household
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex flex-col items-center text-center">
              <AlertCircle size={56} className="text-red-500 mb-3" />
              <h4 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">Intake Failed</h4>
              <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
              <button 
                onClick={resetScanner}
                className="bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold py-2 px-6 rounded-lg text-sm transition"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
