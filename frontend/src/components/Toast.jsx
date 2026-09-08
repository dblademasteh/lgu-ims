import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

function ToastItem({ toast, onDismiss }) {
  const { id, message, type = 'info', duration = 4500 } = toast;
  const [exiting, setExiting] = useState(false);
  const remainingRef = useRef(duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(id), 160);
    }, remainingRef.current);
  }, [id, onDismiss]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startTimeRef.current));
    }
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  const handleClose = (e) => {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(id), 160);
  };

  const icons = {
    success: <CheckCircle2 size={18} className="toast-icon-success" />,
    error: <AlertCircle size={18} className="toast-icon-error" />,
    warning: <AlertTriangle size={18} className="toast-icon-warning" />,
    info: <Info size={18} className="toast-icon-info" />,
  };

  return (
    <div
      role="alert"
      className={`toast-item toast-item--${type}${exiting ? ' toast-item--exiting' : ''}`}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
    >
      <div className="toast-icon-wrap" aria-hidden="true">
        {icons[type] || icons.info}
      </div>
      <div className="toast-message">{message}</div>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss notification"
        onClick={handleClose}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((message, type = 'info', duration = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const value = useMemo(
    () => ({
      push,
      success: (m, d) => push(m, 'success', d),
      error: (m, d) => push(m, 'error', d),
      info: (m, d) => push(m, 'info', d),
      warning: (m, d) => push(m, 'warning', d),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' && toasts.length > 0 &&
        createPortal(
          <aside
            className="toast-container toast-top-right"
            aria-label="Notifications"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </aside>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}