import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';

export default function ScanModal({ onScan, onClose }) {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserQRCodeReader();
    codeReaderRef.current = reader;

    (async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, async (result, _, controls) => {
          if (result && !cancelled) {
            cancelled = true;
            try {
              controls && controls.stop();
            } catch {
              /* noop */
            }
            onScan(result.getText());
          }
        });
        if (cancelled) {
          try { controls.stop(); } catch { /* noop */ }
        } else {
          controlsRef.current = controls;
        }
      } catch (e) {
        if (!cancelled) {
          setError('Unable to access the camera. Ensure camera permission is granted or use another device.');
        }
      }
    })();

    return () => {
      cancelled = true;
      try { codeReaderRef.current && codeReaderRef.current.reset(); } catch { /* noop */ }
      try { controlsRef.current && controlsRef.current.stop(); } catch { /* noop */ }
    };
  }, []);

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Scan barcode / QR code</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <p className="text-sm text-base-content/60">Point the camera at an item label. It will be looked up automatically.</p>

        <div className="mt-4 rounded-box overflow-hidden bg-base-300 aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        </div>

        {error && (
          <div role="alert" className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-base-content/60">
          <span className="loading loading-spinner loading-sm" />
          Waiting for a code...
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </dialog>
  );
}