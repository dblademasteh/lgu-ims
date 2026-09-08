import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Pagination, Spinner } from '../components/ui';
import { AlertTriangle, CalendarClock, CheckCheck, ClipboardList, Info, Save, ShieldCheck, Trash2 } from 'lucide-react';

const TYPE_META = {
  LOW_STOCK: { label: 'Low stock alerts', Icon: AlertTriangle, tone: 'var(--warning)' },
  RIS: { label: 'Requisition (RIS) updates', Icon: ClipboardList, tone: 'var(--accent)' },
  SYSTEM: { label: 'System notifications', Icon: Info, tone: 'var(--muted)' },
  EXPIRY: { label: 'Item expiry alerts', Icon: CalendarClock, tone: 'var(--error)' },
  WARRANTY: { label: 'Warranty expiry alerts', Icon: ShieldCheck, tone: 'var(--warning)' },
};

export default function NotificationsPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [prefs, setPrefs] = useState([]);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [markAllBusy, setMarkAllBusy] = useState(false);

  const loadPrefs = () => {
    api.get('/notification-preferences').then((r) => setPrefs(r.data.data || [])).catch(() => {});
  };

  useEffect(() => { loadPrefs(); }, []);

  const load = () => {
    const q = new URLSearchParams({ page });
    if (unreadOnly) q.set('unread', 'true');
    api.get(`/notifications?${q}`).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load notifications.'));
  };

  useEffect(load, [page, unreadOnly]);

  const markRead = async (n) => {
    if (n.isRead) return;
    try {
      await api.patch(`/notifications/${n.id}/read`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to mark notification as read.');
    }
    load();
  };

  const markAll = async () => {
    if (markAllBusy) return;
    setMarkAllBusy(true);
    try {
      await api.patch('/notifications/read-all');
      toast.success('All notifications marked as read.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to mark all as read.');
    } finally {
      setMarkAllBusy(false);
      load();
    }
  };

  const deleteNotification = async (n) => {
    try {
      await api.delete(`/notifications/${n.id}`);
      toast.success('Notification deleted.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to delete notification.');
    }
    load();
  };

  const cleanup = async () => {
    try {
      const r = await api.post('/notifications/cleanup');
      toast.success(r.data?.message || 'Old notifications cleaned up.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to clean up notifications.');
    }
    load();
  };

  const togglePref = (type, key, value) => {
    setPrefs((prev) => prev.map((p) => (p.type === type ? { ...p, [key]: value } : p)));
  };

  const savePrefs = async () => {
    setPrefsBusy(true);
    try {
      await api.patch('/notification-preferences', { preferences: prefs });
      toast.success('Notification preferences saved.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save preferences.');
    } finally {
      setPrefsBusy(false);
    }
  };

  const TYPE_LABEL = {
    LOW_STOCK: 'Low stock alerts',
    RIS: 'Requisition (RIS) updates',
    SYSTEM: 'System notifications',
    EXPIRY: 'Item expiry alerts',
    WARRANTY: 'Warranty expiry alerts',
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Low-stock alerts and requisition updates."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={cleanup}>
              <Trash2 size={14} /> Clean up read (90d+)
            </button>
          </div>
        }
      />

      <div className="card bg-surface shadow-sm mb-4">
        <div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold">Preferences</h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Choose which channels receive each notification type.</p>
            </div>
            <button className="btn btn-primary btn-sm" disabled={prefsBusy} onClick={savePrefs}>
              {prefsBusy && <span className="loading loading-spinner loading-xs" />}
              <Save size={14} /> Save preferences
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {prefs.map((p) => (
              <div key={p.type} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{TYPE_LABEL[p.type] || p.type.replace(/_/g, ' ')}</span>
                </div>
                {[
                  { key: 'inApp', label: 'In-app alerts', hint: 'Show in the notification bell' },
                  { key: 'email', label: 'Email notifications', hint: 'Send to your inbox' },
                ].map((opt) => (
                  <div key={opt.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.25rem 0' }}>
                    <span className="text-sm" title={opt.hint}>{opt.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(p[opt.key])}
                      aria-label={`${TYPE_LABEL[p.type] || p.type} — ${opt.label}`}
                      className={`sp-toggle ${p[opt.key] ? 'on' : ''}`}
                      onClick={() => togglePref(p.type, opt.key, !p[opt.key])}
                    >
                      <span className="sp-toggle-thumb" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-surface shadow-sm border border-border">
        <div className="card-body">
          <label className="flex items-center gap-2 cursor-pointer px-2 mb-3 w-fit">
            <input type="checkbox" className="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} />
            <span className="text-sm">Unread only</span>
          </label>

          {!data ? (
            <Spinner label="Loading notifications..." />
          ) : data.data.length === 0 ? (
            <EmptyState message="No notifications." />
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {data.data.map((n) => {
                  const meta = TYPE_META[n.type] || TYPE_META.SYSTEM;
                  const TypeIcon = meta.Icon;
                  return (
                  <li key={n.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      className="card card-body"
                      style={{ padding: '1rem', background: 'var(--surface-alt)', opacity: n.isRead ? 0.7 : 1, cursor: 'pointer' }}
                      onClick={() => markRead(n)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markRead(n); } }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg p-2" style={{ background: `color-mix(in oklab, ${meta.tone} 15%, transparent)`, color: meta.tone }}>
                          <TypeIcon size={20} strokeWidth={1.8} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{n.title}</span>
                            {!n.isRead && <span className="badge badge-primary">new</span>}
                          </div>
                          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{n.message}</p>
                          <div className="text-xs mt-1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--faint)' }}>
                            <span>{new Date(n.createdAt).toLocaleString()}</span>
                            <span className="badge badge-ghost">{meta.label}</span>
                            {(n.itemId || n.item) && (
                              <Link
                                to={`/items?search=${encodeURIComponent(n.item?.sku || '')}`}
                                onClick={(e) => e.stopPropagation()}
                                className="badge badge-info"
                                style={{ cursor: 'pointer', textDecoration: 'none' }}
                              >
                                View item{n.item?.sku ? ` · ${n.item.sku}` : ''}
                              </Link>
                            )}
                          </div>
                        </div>
                        <button className="btn btn-ghost btn-xs text-error" onClick={(e) => { e.stopPropagation(); deleteNotification(n); }}><Trash2 size={12} /> Delete</button>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
              <Pagination meta={data.meta} onPage={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}