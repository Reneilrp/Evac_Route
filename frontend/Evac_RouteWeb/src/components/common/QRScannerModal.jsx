import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, CheckCircle, AlertCircle, QrCode, UserPlus, Search, FileText, HeartHandshake } from 'lucide-react';
import api from '../../services/api';

export default function QRScannerModal({ isOpen, onClose, selectedShelterId }) {
  const scannerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'manual_search' | 'rapid_walkin'
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Manual Search State (REV-05: No QR Code Needed)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Rapid Walk-In Form State (REV-05)
  const [walkinName, setWalkinName] = useState('');
  const [walkinHeadcount, setWalkinHeadcount] = useState('4');
  const [walkinBarangay, setWalkinBarangay] = useState('Tetuan');
  const [walkinContact, setWalkinContact] = useState('');

  const onScanSuccess = useCallback(async (decodedText) => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    setLoading(true);
    setError(null);
    
    try {
      const res = await api.post(`/shelters/${selectedShelterId}/check-in`, {
        qr_code_hash: decodedText
      });
      setScanResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setLoading(false);
    }
  }, [selectedShelterId]);

  // Handle manual resident search by Name / Barangay / Phone (No QR Needed)
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
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/shelters/${selectedShelterId}/check-in`, {
        qr_code_hash: resident.qr_code_hash
      });
      setScanResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setLoading(false);
    }
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
    if (isOpen && activeTab === 'scan' && !scanResult && !loading && !error) {
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
  }, [isOpen, activeTab, scanResult, loading, error, onScanSuccess]);

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
    setWalkinName('');
    setWalkinHeadcount('4');
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <QrCode size={20} className="text-blue-500" /> Shelter Relief Desk Check-In
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <HeartHandshake size={12} /> Equitable Access: QR Code is OPTIONAL for claiming relief
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition">
            <X size={22} />
          </button>
        </div>

        {/* 3 Non-Discriminatory Relief Claim Options */}
        {!scanResult && !loading && (
          <div className="flex border-b border-gray-100 dark:border-slate-800 bg-gray-100/50 dark:bg-slate-900/50 p-1">
            <button
              onClick={() => { setActiveTab('scan'); setError(null); }}
              className={`flex-1 py-2 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'scan' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-slate-400'
              }`}
            >
              <QrCode size={13} /> 1. Scan App QR
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
          {activeTab === 'scan' && !scanResult && !error && !loading && (
            <div className="w-full">
              <div id="qr-reader" className="w-full"></div>
              <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-4">Point camera at Resident's mobile app QR Code.</p>
              
              <button 
                onClick={() => onScanSuccess('hash_test_code_0')}
                className="mt-4 w-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 py-2 rounded text-xs font-medium hover:bg-gray-200 transition border border-dashed border-gray-300 dark:border-slate-700"
              >
                [Dev] Test Scan Registered Resident (Cruz Family)
              </button>
            </div>
          )}

          {/* Method 2: Manual Search by Name or Barangay (NO QR CODE NEEDED) */}
          {activeTab === 'manual_search' && !scanResult && !error && !loading && (
            <div className="w-full space-y-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 mb-2">
                🤝 <strong>No QR Code Required:</strong> Type resident name or barangay to issue relief rations directly.
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type resident name, barangay, or phone..."
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
                          Brgy. {res.barangay} • Family of {res.headcount} • Status: <span className="font-bold">{res.current_status}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleSelectResidentForCheckIn(res)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded transition"
                      >
                        {res.current_status === 'checked_in' ? 'Check-Out' : 'Check-In & Issue Rations'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">No existing resident matches "{searchQuery}".</p>
                  <button
                    onClick={() => {
                      setWalkinName(searchQuery);
                      setActiveTab('rapid_walkin');
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    + Register "{searchQuery}" as a 1st-Time Walk-In Evacuee
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Method 3: REV-05 Rapid Walk-In Form for Unregistered Residents */}
          {activeTab === 'rapid_walkin' && !scanResult && !error && !loading && (
            <form onSubmit={handleRapidWalkIn} className="w-full space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300 mb-2">
                ⚡ <strong>On-the-Spot Registration:</strong> For affected residents without smartphones or accounts.
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
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Family Headcount</label>
                  <input
                    type="number"
                    min="1"
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
                <FileText size={16} /> Register &amp; Issue Relief Rations
              </button>
            </form>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center">
              <span className="flex h-10 w-10 relative mb-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-10 w-10 bg-blue-500"></span>
              </span>
              <p className="text-gray-600 dark:text-slate-300 font-medium text-sm">Processing check-in &amp; deducting inventory rations...</p>
            </div>
          )}

          {/* Success Payload Display */}
          {scanResult && (
            <div className="flex flex-col items-center text-center w-full">
              <CheckCircle size={56} className="text-green-500 mb-3" />
              <h4 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
                {scanResult.data?.action === 'rapid_checkin' && 'Walk-In Registration & Check-In Success!'}
                {scanResult.data?.action === 'checkout' && 'Check-Out Successful!'}
                {scanResult.data?.action === 'transfer' && 'Shelter Transfer Successful!'}
                {scanResult.data?.action === 'checkin' && 'Check-In Successful!'}
              </h4>
              
              <div className="bg-gray-50 dark:bg-slate-800/80 p-3 rounded-lg w-full text-left text-xs space-y-1 mb-4 border border-gray-100 dark:border-slate-700">
                <p><strong className="text-gray-700 dark:text-slate-200">Result Message:</strong> {scanResult.message}</p>
                <p><strong className="text-gray-700 dark:text-slate-200">Allocated Rations:</strong> {scanResult.data?.ration_applied}</p>
                {scanResult.data?.generated_qr_hash && (
                  <p className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                    Temporary Resident ID: {scanResult.data?.generated_qr_hash}
                  </p>
                )}
              </div>

              <button 
                onClick={resetScanner}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition"
              >
                Check In Next Resident
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex flex-col items-center text-center">
              <AlertCircle size={56} className="text-red-500 mb-3" />
              <h4 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">Check-In Failed</h4>
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
