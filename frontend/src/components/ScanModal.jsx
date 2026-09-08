import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { Camera, X } from 'lucide-react';

function Portal({ children }) {
  return createPortal(children, document.body);
}

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
    <Portal>
      <div className="modal-backdrop">
        <div className="modal-box modal-md">
          <div className="modal-header">
            <h3 className="modal-title">Scan barcode / QR code</h3>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
          <div className="modal-body">
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: '0.75rem' }}>Point the camera at an item label. It will be looked up automatically.</p>

            <div className="modal-scan-viewport">
              <video ref={videoRef} muted playsInline />
            </div>

            {error && (
              <div className="modal-alert modal-alert--error" style={{ marginTop: '0.75rem' }}>
                <span>{error}</span>
              </div>
            )}

            <div className="modal-loading">
              <span className="loading loading-spinner loading-sm" />
              Waiting for a code...
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" onClick={onClose}>
              <X size={14} /> Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
