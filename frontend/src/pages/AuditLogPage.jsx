import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Search, X, ShieldCheck, FileText, FileSpreadsheet, GitCompareArrows } from 'lucide-react';
import api, { openReport } from '../api/client';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Pagination, Spinner } from '../components/ui';

function Portal({ children }) { return createPortal(children, document.body); }

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

  useEffect(() => {
    if (!detail) return;
    const onKey = (e) => { if (e.key === 'Escape') setDetail(null); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [detail]);

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        subtitle="Full log of create, update, delete and workflow actions — with before / after values."
        actions={
          <div className="flex gap-2">
            <Link to="/coa-compliance" className="btn btn-outline btn-sm"><ShieldCheck size={14} /> COA Compliance</Link>
            <button className="btn btn-outline btn-sm" onClick={() => {
              const q = new URLSearchParams({ format: 'pdf' });
              if (action) q.set('action', action);
              if (search) q.set('entityType', search);
              openReport(`/audit-logs/export?${q}`);
            }}><FileText size={14} /> PDF</button>
<button className="btn btn-outline btn-sm" onClick={() => {
              const q = new URLSearchParams({ format: 'excel' });
              if (action) q.set('action', action);
              if (search) q.set('entityType', search);
              openReport(`/audit-logs/export?${q}`, true);
            }}><FileSpreadsheet size={14} /> Excel</button>
          </div>
        }
      />

      <div className="card bg-surface shadow-sm border border-border">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <select className="select select-sm" style={{ width: '10rem' }} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
              <option value="">All actions</option>
              {['CREATE', 'UPDATE', 'DELETE', 'ADJUST', 'APPROVE', 'REJECT', 'ISSUE', 'CANCEL', 'LOGIN', 'PASSWORD_CHANGE'].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="relative flex-1 md:max-w-md">
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
              <input type="search" className="input input-sm w-full pl-9" aria-label="Search entity type" placeholder="Entity type (Item, RIS, User)…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              {search && (
                <button type="button" className="btn btn-ghost btn-xs btn-square" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => { setSearch(''); setPage(1); }} aria-label="Clear search"><X size={12} /></button>
              )}
            </div>
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
                            <button className="btn btn-ghost btn-xs" onClick={() => setDetail(l)}><GitCompareArrows size={12} /> View diff</button>
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
        <Portal>
          <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
            <div className="modal-box modal-xl" role="dialog" aria-modal="true" aria-label={`Diff: ${detail.action} ${detail.entityType}`}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">{detail.action} · {detail.entityType}</h3>
                  <p className="modal-subtitle">
                    {detail.user?.fullName || 'System'} · {new Date(detail.createdAt).toLocaleString()}
                  </p>
                </div>
                <button className="modal-close" onClick={() => setDetail(null)} aria-label="Close"><X size={15} /></button>
              </div>
              <div className="modal-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detail.before && (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="badge badge-error badge-sm">BEFORE</span>
                        <span className="text-xs opacity-60">Previous state</span>
                      </div>
                      <pre className="bg-base-200/60 rounded-box p-4 overflow-auto text-xs leading-relaxed border border-error/20 flex-1 max-h-[60vh]">{JSON.stringify(detail.before, null, 2)}</pre>
                    </div>
                  )}
                  {detail.after && (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="badge badge-success badge-sm">AFTER</span>
                        <span className="text-xs opacity-60">Current state</span>
                      </div>
                      <pre className="bg-base-200/60 rounded-box p-4 overflow-auto text-xs leading-relaxed border border-success/20 flex-1 max-h-[60vh]">{JSON.stringify(detail.after, null, 2)}</pre>
                    </div>
                  )}
                  {!detail.before && !detail.after && (
                    <div className="col-span-full text-center py-8 opacity-60 text-sm">
                      No field-level payload recorded for this action.
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>
                  <X size={14} /> Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
