import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { FaTimes, FaCamera, FaImage } from 'react-icons/fa';

interface QRScannerProps {
  onResult: (decodedText: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onResult, onClose }) => {
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Konfigurasi scanner dengan opsi lebih lengkap
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA, Html5QrcodeScanType.SCAN_TYPE_FILE],
        rememberLastUsedCamera: true,
        showZoomSliderIfSupported: true
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        // Hentikan kamera setelah scan sukses
        scanner.clear().then(() => {
          onResult(decodedText);
        }).catch((err) => {
          console.error("Failed to clear scanner", err);
          onResult(decodedText);
        });
      },
      (error) => {
        // Hanya log error yang penting
        if (error.includes('NotAllowedError') || error.includes('Permission')) {
          setError('Akses kamera ditolak. Silakan izinkan akses kamera di browser.');
        }
      }
    );

    // Cleanup saat komponen ditutup
    return () => {
      try {
        scanner.clear().catch(err => console.warn("Failed to clear scanner", err));
      } catch (e) {
        console.warn("Scanner instance error", e);
      }
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="p-4 bg-gradient-to-r from-[#013220] to-[#025230] text-white flex justify-between items-center">
          <h3 className="flex items-center gap-2 font-black text-lg"><FaCamera className="text-sgd-400" /> Scan QR Alat</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition active:scale-95">
            <FaTimes />
          </button>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-white p-4">
          <div id="reader" className="w-full rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg bg-black"></div>
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-100">
            <p className="text-sm text-red-600 font-semibold flex items-center gap-2">
              ⚠️ {error}
            </p>
          </div>
        )}

        <div className="p-6 text-center space-y-3">
          <p className="text-gray-600 text-sm font-medium">
            📷 Arahkan kamera ke stiker QR Code pada alat
          </p>
          <div className="flex items-center gap-2 justify-center text-xs text-slate-500">
            <FaImage className="text-sgd-500" />
            <span>Atau gunakan tombol "Choose File" untuk upload gambar QR</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;