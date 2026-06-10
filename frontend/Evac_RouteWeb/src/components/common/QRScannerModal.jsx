import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export default function QRScannerModal({ isOpen, onClose, selectedShelterId }) {
  const scannerRef = useRef(null);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && !scanResult) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;

      return () => {
        scanner.clear().catch(error => console.error("Failed to clear html5QrcodeScanner. ", error));
      };
    }
  }, [isOpen, scanResult, selectedShelterId]);

  const onScanSuccess = async (decodedText, decodedResult) => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    setLoading(true);
    setError(null);
    
    try {
      // Execute the massive backend transaction: processCheckIn
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
  };

  const onScanFailure = (error) => {
    // handle scan failure, usually better to ignore and keep scanning
  };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-800">Shelter QR Scanner</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center min-h-[300px] justify-center">
          {!scanResult && !error && !loading && (
            <div className="w-full">
              <div id="qr-reader" className="w-full"></div>
              <p className="text-center text-sm text-gray-500 mt-4">Point camera at Resident's QR Code.</p>
              
              {/* Dev Helper: Replace hash below with one from your seeded family_profiles table */}
              <button 
                onClick={() => onScanSuccess('REPLACE_WITH_REAL_DB_HASH', null)}
                className="mt-4 w-full bg-gray-100 text-gray-600 py-2 rounded text-sm font-medium hover:bg-gray-200 transition border border-dashed border-gray-300"
              >
                [Dev] Simulate Scan — update hash in QRScannerModal.jsx L82
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center">
              <span className="flex h-10 w-10 relative mb-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-10 w-10 bg-blue-500"></span>
              </span>
              <p className="text-gray-600 font-medium">Processing check-in &amp; relief allocation...</p>
            </div>
          )}

          {scanResult && (
            <div className="flex flex-col items-center text-center">
              <CheckCircle size={64} className="text-green-500 mb-4" />
              <h4 className="text-xl font-bold text-gray-900 mb-2">
                {scanResult.data?.action === 'checkout' && 'Check-Out Successful!'}
                {scanResult.data?.action === 'transfer' && 'Shelter Transfer Successful!'}
                {scanResult.data?.action === 'checkin' && 'Check-In Successful!'}
              </h4>
              <p className="text-gray-600 mb-6 px-4">
                {scanResult.data?.action === 'checkout' && `Family checked out. Shelter occupancy decremented.`}
                {scanResult.data?.action === 'transfer' && `Checked out from previous location and checked in here. Inventory allocated: ${scanResult.data?.ration_applied}`}
                {scanResult.data?.action === 'checkin' && `Checked in successfully. Inventory allocated: ${scanResult.data?.ration_applied}`}
              </p>
              <button 
                onClick={resetScanner}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                Scan Next Family
              </button>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center text-center">
              <AlertCircle size={64} className="text-red-500 mb-4" />
              <h4 className="text-xl font-bold text-gray-900 mb-2">Scan Failed</h4>
              <p className="text-red-600 mb-6">{error}</p>
              <button 
                onClick={resetScanner}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition"
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
