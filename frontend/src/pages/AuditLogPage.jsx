import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { openReport } from '../api/client';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Pagination, Spinner } from '../components/ui';

const ACTION_STYLE = {
  CREATE: 'bg-success/15 text-success',
  UPDATE: 'bg-info/15 text-info',
  DELETE: 'bg-error/15 text-error',
  ADJUST: 'bg-warning/15 text-warning',
  APPROVE: 'bg-success/15 text-success',
  REJECT: 'bg-error/15 text-error',
  ISSUE: 'bg-primary/15 text-primary',
  CANCEL: 'bg-neutral/15 text-neutral',
  LOGIN: 'bg-info/15 text-info',
  PASSWORD_CHANGE: 'bg-neutral/15 text-neutral',
};

export default function AuditLogPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);

  const load = () => {
    const q = new URLSearchParams({ page });
    if (action) q.set('action', action);
    if (search) q.set('entityType', search);
    api.get(`/audit-logs?${q}`).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load audit logs.'));
  };

  useEffect(load, [page, action, search]);

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        subtitle="Full log of create, update, delete and workflow actions — with before / after values."
        actions={
          <div className="flex gap-2">
            <Link to="/coa-compliance" className="btn btn-outline btn-sm">COA Compliance</Link>
            <button className="btn btn-outline btn-sm" onClick={() => {
              const q = new URLSearchParams({ format: 'pdf' });
              if (action) q.set('action', action);
              if (search) q.set('entityType', search);
              openReport(`/audit-logs/export?${q}`);
            }}>PDF</button>
<button className="btn btn-outline btn-sm" onClick={() => {
              const q = new URLSearchParams({ format: 'excel' });
              if (action) q.set('action', action);
              if (search) q.set('entityType', search);
              openReport(`/audit-logs/export?${q}`, true);
            }}>Excel</button>
          </div>
        }
      />

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <select className="select md:w-52" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
              <option value="">All actions</option>
              {['CREATE', 'UPDATE', 'DELETE', 'ADJUST', 'APPROVE', 'REJECT', 'ISSUE', 'CANCEL', 'LOGIN', 'PASSWORD_CHANGE'].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <label className="input flex-1 md:max-w-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="10" cy="10" r="6" strokeWidth="2"/><path strokeLinecap="round" strokeWidth="2" d="M21 21l-4.35-4.35"/></svg>
              <input type="search" className="flex-1" placeholder="Entity type (Item, Ris, User...)" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </label>
          </div>

          {!data ? (
            <Spinner label="Loading audit log..." />
          ) : data.data.length === 0 ? (
            <EmptyState message="No audit entries found." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table table-sm" aria-label="Audit log table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>IP</th>
                      <th className="text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((l) => (
                      <tr key={l.id} className="hover">
                        <td className="whitespace-nowrap text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                        <td>
                          <div className="font-medium">{l.user?.fullName || 'System'}</div>
                          <div className="text-xs opacity-60">@{l.user?.username || '—'}</div>
                        </td>
                        <td><span className={`badge ${ACTION_STYLE[l.action] || 'badge-ghost'}`}>{l.action}</span></td>
                        <td>
                          <div className="font-medium">{l.entityType}</div>
                          {l.entityId && <div className="text-xs opacity-50 font-mono">{String(l.entityId).slice(0, 8)}…</div>}
                        </td>
                        <td className="text-xs">{l.ip || '—'}</td>
                        <td className="text-right">
                          {(l.before || l.after) && (
                            <button className="btn btn-ghost btn-xs" onClick={() => setDetail(l)}>View diff</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination meta={data.meta} onPage={setPage} />
            </>
          )}
        </div>
      </div>

      {detail && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{detail.action} · {detail.entityType}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>✕</button>
            </div>
            <p className="text-sm text-base-content/60 mt-1">
              {detail.user?.fullName || 'System'} · {new Date(detail.createdAt).toLocaleString()}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {detail.before && (
                <div>
                  <div className="text-xs font-semibold opacity-60 mb-1">BEFORE</div>
                  <pre className="bg-base-200 rounded-box p-3 overflow-auto text-xs max-h-64">{JSON.stringify(detail.before, null, 2)}</pre>
                </div>
              )}
              {detail.after && (
                <div>
                  <div className="text-xs font-semibold opacity-60 mb-1">AFTER</div>
                  <pre className="bg-base-200 rounded-box p-3 overflow-auto text-xs max-h-64">{JSON.stringify(detail.after, null, 2)}</pre>
                </div>
              )}
              {!detail.before && !detail.after && <p className="text-sm opacity-60 col-span-full">No field-level payload recorded for this action.</p>}
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
