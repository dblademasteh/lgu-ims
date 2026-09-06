import { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Pagination, Spinner } from '../components/ui';

const TYPE_ICON = {
  LOW_STOCK: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  RIS: 'M9 12h6m-6 4h6M5 21h14a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v16a1 1 0 001 1z',
  SYSTEM: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

export default function NotificationsPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [prefs, setPrefs] = useState([]);
  const [prefsBusy, setPrefsBusy] = useState(false);

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
    await api.patch(`/notifications/${n.id}/read`).catch(() => {});
    load();
  };

  const markAll = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    toast.success('All notifications marked as read.');
    load();
  };

  const deleteNotification = async (n) => {
    await api.delete(`/notifications/${n.id}`).catch(() => {});
    toast.success('Notification deleted.');
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
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Low-stock alerts and requisition updates."
        actions={
          <button className="btn btn-outline btn-sm" onClick={markAll} disabled={!data || ((data.unreadCount ?? data.data.filter((n) => !n.isRead).length) === 0)}>
            Mark all as read
          </button>
        }
      />

      <div className="card bg-base-100 shadow-sm mb-4">
        <div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold">Preferences</h3>
              <p className="text-sm text-base-content/60">Choose which channels receive each notification type.</p>
            </div>
            <button className="btn btn-primary btn-sm" disabled={prefsBusy} onClick={savePrefs}>
              {prefsBusy && <span className="loading loading-spinner loading-xs" />}
              Save preferences
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {prefs.map((p) => (
              <div key={p.type} className="rounded-lg border border-base-300 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{TYPE_LABEL[p.type] || p.type.replace(/_/g, ' ')}</span>
                </div>
                {[
                  { key: 'inApp', label: 'In-app alerts', hint: 'Show in the notification bell' },
                  { key: 'email', label: 'Email notifications', hint: 'Send to your inbox' },
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center gap-3 cursor-pointer py-1">
                    <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={Boolean(p[opt.key])} onChange={(e) => togglePref(p.type, opt.key, e.target.checked)} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <label className="flex items-center gap-2 cursor-pointer px-2 mb-3 w-fit">
            <input type="checkbox" className="checkbox checkbox-sm" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} />
            <span className="text-sm">Unread only</span>
          </label>

          {!data ? (
            <Spinner label="Loading notifications..." />
          ) : data.data.length === 0 ? (
            <EmptyState message="No notifications." />
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {data.data.map((n) => (
                  <li key={n.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`w-full text-left card card-body !p-4 ${n.isRead ? 'bg-base-200/60 opacity-70' : 'bg-base-200'}`}
                      onClick={() => markRead(n)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markRead(n); } }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 ${n.type === 'LOW_STOCK' ? 'bg-warning/15 text-warning' : n.type === 'RIS' ? 'bg-info/15 text-info' : 'bg-neutral/10'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={TYPE_ICON[n.type] || TYPE_ICON.SYSTEM} /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{n.title}</span>
                            {!n.isRead && <span className="badge badge-primary badge-xs">new</span>}
                          </div>
                          <p className="text-sm text-base-content/70 mt-0.5">{n.message}</p>
                          <div className="text-xs opacity-50 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                        <button className="btn btn-ghost btn-xs text-error" onClick={(e) => { e.stopPropagation(); deleteNotification(n); }}>Delete</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination meta={data.meta} onPage={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}