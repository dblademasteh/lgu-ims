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

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Low-stock alerts and requisition updates."
        actions={
          <button className="btn btn-outline btn-sm" onClick={markAll} disabled={!data?.data?.some((n) => !n.isRead)}>
            Mark all as read
          </button>
        }
      />

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
                    <button
                      className={`w-full text-left card card-body !p-4 ${n.isRead ? 'bg-base-200/60 opacity-70' : 'bg-base-200'}`}
                      onClick={() => markRead(n)}
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
                    </button>
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