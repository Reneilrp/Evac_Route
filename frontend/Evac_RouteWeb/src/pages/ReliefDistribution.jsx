import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, ClipboardList, CheckCircle, AlertTriangle, AlertCircle, RefreshCw, Search, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { playScanSuccessTone, playScanErrorTone } from '../services/sound';

export default function ReliefDistribution() {
  const scannerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [manualHash, setManualHash] = useState('');
  const [sessionClaims, setSessionClaims] = useState([]);

  const processClaim = useCallback(async (hash) => {
    setLoading(true);
    setError(null);
    setScanResult(null);
    try {
      const res = await api.post('/relief/claim', { qr_code_hash: hash });
      playScanSuccessTone();
      setScanResult({
        success: true,
        type: 'success',
        message: res.data.message || 'Ration claimed successfully.',
        familyName: res.data.family_name,
        headcount: res.data.headcount,
        claimedAt: res.data.claimed_at,
        hash
      });

      // Add to session log
      setSessionClaims(prev => [
        {
          id: Date.now(),
          familyName: res.data.family_name,
          headcount: res.data.headcount,
          claimedAt: res.data.claimed_at,
          status: 'claimed',
          hash
        },
        ...prev
      ]);
    } catch (err) {
      playScanErrorTone();
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 409) {
        // Double claim
        setScanResult({
          success: false,
          type: 'double_claim',
          message: data?.message || 'Ration already claimed.',
          familyName: data?.family_name,
          headcount: data?.headcount,
          claimedAt: data?.claimed_at,
          hash
        });
        setSessionClaims(prev => [
          {
            id: Date.now(),
            familyName: data?.family_name || 'Unknown',
            headcount: data?.headcount || 0,
            claimedAt: data?.claimed_at || new Date().toISOString(),
            status: 'blocked',
            hash
          },
          ...prev
        ]);
      } else {
        setError(data?.message || 'Ration claim failed. Resident might not be checked in.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const onScanSuccess = useCallback((decodedText) => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(e => console.error("Error clearing scanner", e));
    }
    processClaim(decodedText);
  }, [processClaim]);

  const onScanFailure = () => {
    // Ignore and keep searching
  };

  const initScanner = useCallback(() => {
    setScanResult(null);
    setError(null);
    setManualHash('');
    
    // Tiny delay to ensure DOM is ready
    setTimeout(() => {
      if (document.getElementById("desk-qr-reader")) {
        const scanner = new Html5QrcodeScanner(
          "desk-qr-reader",
          { fps: 10, qrbox: { width: 260, height: 260 } },
          /* verbose= */ false
        );
        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;
      }
    }, 100);
  }, [onScanSuccess]);

  useEffect(() => {
    initScanner();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Clean scanner fail", err));
      }
    };
  }, [initScanner]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualHash.trim()) return;
    if (scannerRef.current) {
      scannerRef.current.clear().catch(e => console.error(e));
    }
    processClaim(manualHash.trim());
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <QrCode className="text-blue-600" size={28} /> Relief Claims Desk
          </h1>
          <p className="text-sm text-gray-500 mt-1">Phase 2: Verify and record family ration packages using client webcam</p>
        </div>
        <button
          onClick={initScanner}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition"
        >
          <RefreshCw size={14} /> Reset Scanner
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Camera Frame */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col items-center">
          <h3 className="font-bold text-gray-800 text-base mb-4 self-start flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span> Live Scanner
          </h3>

          {!scanResult && !error && !loading ? (
            <div className="w-full relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 p-2">
              <div id="desk-qr-reader" className="w-full"></div>
              {/* Overlay pulse scanner effect */}
              <div className="absolute inset-0 pointer-events-none border-2 border-blue-500/30 rounded-xl animate-pulse"></div>
            </div>
          ) : (
            <div className="w-full min-h-[300px] flex flex-col items-center justify-center border border-gray-100 bg-gray-50/50 rounded-xl p-6">
              {loading && (
                <div className="flex flex-col items-center">
                  <span className="flex h-12 w-12 relative mb-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-12 w-12 bg-blue-600"></span>
                  </span>
                  <p className="text-gray-600 font-bold text-sm">Verifying QR Hash...</p>
                </div>
              )}

              {scanResult && scanResult.success && (
                <div className="flex flex-col items-center text-center">
                  <div className="bg-green-100 p-4 rounded-full mb-4 text-green-600">
                    <CheckCircle size={48} />
                  </div>
                  <h4 className="text-xl font-extrabold text-green-700 mb-1">Ration Approved</h4>
                  <p className="text-sm text-gray-600 mb-4">Family Profile: <span className="font-black text-gray-900">{scanResult.familyName}</span></p>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100 text-left w-full mb-6 space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Recorded Headcount:</span> <span className="font-bold text-gray-900">{scanResult.headcount} Pax</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Claim Code Hash:</span> <span className="font-mono text-gray-500 truncate max-w-[150px]">{scanResult.hash}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Claimed Timestamp:</span> <span className="text-gray-900 font-medium">{new Date(scanResult.claimedAt).toLocaleTimeString()}</span></div>
                  </div>

                  <button onClick={initScanner} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg transition w-full shadow-sm text-sm">
                    Scan Next Code
                  </button>
                </div>
              )}

              {scanResult && !scanResult.success && scanResult.type === 'double_claim' && (
                <div className="flex flex-col items-center text-center">
                  <div className="bg-amber-100 p-4 rounded-full mb-4 text-amber-600">
                    <AlertTriangle size={48} />
                  </div>
                  <h4 className="text-xl font-extrabold text-amber-700 mb-1">Double Claim Warning</h4>
                  <p className="text-xs text-amber-600 font-semibold mb-4 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">Ration Package Already Dispensed</p>
                  <p className="text-sm text-gray-600 mb-4">Family Profile: <span className="font-black text-gray-900">{scanResult.familyName}</span></p>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100 text-left w-full mb-6 space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Family Size:</span> <span className="font-bold text-gray-900">{scanResult.headcount} Pax</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Original Claimed At:</span> <span className="text-gray-900 font-bold">{new Date(scanResult.claimedAt).toLocaleString()}</span></div>
                  </div>

                  <button onClick={initScanner} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-lg transition w-full shadow-sm text-sm">
                    Acknowledge &amp; Scan Next
                  </button>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center text-center">
                  <div className="bg-red-100 p-4 rounded-full mb-4 text-red-600">
                    <AlertCircle size={48} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">Verification Failed</h4>
                  <p className="text-sm text-red-600 mb-6 bg-red-50 p-3 rounded-lg border border-red-100 max-w-xs">{error}</p>
                  <button onClick={initScanner} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-lg transition w-full shadow-sm text-sm">
                    Re-initialize Camera
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="w-full mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Manual Entry Fallback</h4>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-mono"
                placeholder="Paste/type QR Code Hash..."
                value={manualHash}
                onChange={e => setManualHash(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-1 disabled:opacity-50"
                disabled={loading}
              >
                Claim <ArrowRight size={14} />
              </button>
            </div>
          </form>

          {/* Dev Simulated Button */}
          <div className="w-full mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs">
            <p className="text-blue-800 font-bold mb-2">Dev Sandbox Helper:</p>
            <div className="flex gap-2 flex-wrap">
              <button 
                type="button" 
                onClick={() => processClaim('dev_hash_family_1')}
                className="bg-white text-blue-700 border border-blue-300 font-semibold px-2 py-1 rounded hover:bg-blue-100 transition"
              >
                Simulate Family 1 Claim
              </button>
              <button 
                type="button" 
                onClick={() => processClaim('dev_hash_family_2')}
                className="bg-white text-blue-700 border border-blue-300 font-semibold px-2 py-1 rounded hover:bg-blue-100 transition"
              >
                Simulate Family 2 Claim
              </button>
            </div>
          </div>
        </div>

        {/* Right: Desk Activity Logs */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
            <ClipboardList className="text-gray-400" size={20} /> Desk Activity Log (Current Session)
          </h3>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Family Name</th>
                  <th className="py-3 px-4">Headcount</th>
                  <th className="py-3 px-4">Claim Time</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {sessionClaims.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400 font-medium">
                      No transactions recorded this session. Approved scans will appear here.
                    </td>
                  </tr>
                ) : (
                  sessionClaims.map(claim => (
                    <tr key={claim.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 px-4 font-bold text-gray-800">{claim.familyName}</td>
                      <td className="py-3 px-4 text-gray-600 font-medium">{claim.headcount} Pax</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {new Date(claim.claimedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                          claim.status === 'claimed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
