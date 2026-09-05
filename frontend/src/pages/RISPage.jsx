import { useEffect, useState } from 'react';
import api, { openReport } from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Badge, EmptyState, Money, Pagination, Spinner } from '../components/ui';

const STATUS_FLOW = ['PENDING', 'APPROVED', 'ISSUED', 'REJECTED', 'CANCELLED', 'PARTIALLY_ISSUED'];
const STATUS_BADGE = {
  PENDING: 'warning', APPROVED: 'info', PARTIALLY_ISSUED: 'warning',
  ISSUED: 'success', REJECTED: 'error', CANCELLED: 'neutral',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function RISPage() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const canRequest = useCan('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'DEPARTMENT_HEAD');
  const canManage = useCan('ADMIN', 'PROPERTY_CUSTODIAN', 'WAREHOUSE_STAFF');
  const canIssue = useCan('ADMIN', 'WAREHOUSE_STAFF');
  const canCancel = useCan('ADMIN');
  const canReturn = useCan('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN');

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvalItems, setApprovalItems] = useState([]);

  const load = () => {
    const q = new URLSearchParams({ page });
    if (status) q.set('status', status);
    if (search) q.set('search', search);
    api.get(`/ris?${q}`).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load RIS.'));
  };

  useEffect(load, [page, status]);

  const openDetail = async (id) => {
    try {
      const r = await api.get(`/ris/${id}`);
      setDetail(r.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to load RIS details.');
    }
  };

  const act = async (id, action, body = {}, actLabel) => {
    setConfirm(null);
    try {
      await api[action === 'issue' || action === 'return' ? 'post' : 'patch'](`/ris/${id}/${action}`, body);
      toast.success(`RIS ${actLabel}.`);
      setDetail(null);
      setReturnOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || `Unable to ${action} RIS.`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Requisitions & Issue Slips"
        subtitle="COA-compliant Requisition and Issue Slips — request, approve and issue."
        actions={canRequest && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New requisition
          </button>
        )}
      />

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <label className="input flex-1 md:max-w-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="search" className="flex-1" placeholder="Search RIS number..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </label>
            <select className="select md:w-52" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {STATUS_FLOW.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          {!data ? (
            <Spinner label="Loading requisitions..." />
          ) : data.data.length === 0 ? (
            <EmptyState message="No requisitions found." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>RIS No.</th>
                      <th>Date</th>
                      <th>Department</th>
                      <th>Purpose</th>
                      <th>Requested by</th>
                      <th>Status</th>
                      <th className="text-right">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((r) => (
                      <tr key={r.id} className="hover cursor-pointer" onClick={() => openDetail(r.id)}>
                        <td className="font-mono text-xs font-semibold">{r.risNumber}</td>
                        <td className="whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className="font-medium">{r.department?.name}</span>
                          <span className="text-xs opacity-60 block">{r.department?.code}</span>
                        </td>
                        <td className="max-w-64 truncate">{r.purpose}</td>
                        <td>{r.requestedBy?.fullName}</td>
                        <td><Badge status={r.status}>{r.status.replace(/_/g, ' ')}</Badge></td>
                        <td className="text-right">
                          <button className="btn btn-ghost btn-xs">Details</button>
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
        <RisDetail
          ris={detail}
          user={user}
          canManage={canManage}
          canIssue={canIssue}
          canCancel={canCancel}
          canReturn={canReturn}
          onClose={() => setDetail(null)}
          onApprove={() => {
            setApprovalItems(detail.items.map((it) => ({ id: it.id, approved: '' })));
            setApproveOpen(true);
          }}
          onReject={() => setConfirm({ id: detail.id, action: 'reject', label: 'rejected', kind: 'rem' })}
          onIssue={() => act(detail.id, 'issue', {}, 'issued')}
          onCancel={() => setConfirm({ id: detail.id, action: 'cancel', label: 'cancelled', kind: 'rem' })}
          onReturn={() => setReturnOpen(true)}
        />
      )}

      {createOpen && (
        <CreateRisModal
          onClose={() => setCreateOpen(false)}
          onSaved={() => { setCreateOpen(false); load(); }}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={`Confirm this RIS will be ${confirm.label}. This action cannot be undone.`}
          placeholder="Reason / remarks (optional for reject / cancel)"
          onClose={() => setConfirm(null)}
          onConfirm={async (remarks) => {
            const isReject = confirm.action === 'reject';
            const endpoint = isReject ? 'reject' : 'cancel';
            await act(confirm.id, endpoint, { remarks }, confirm.label);
          }}
        />
      )}

      {returnOpen && detail && (
        <ReturnModal
          ris={detail}
          onClose={() => setReturnOpen(false)}
          onReturn={(items) => act(detail.id, 'return', { items }, 'returned')}
        />
      )}

      {approveOpen && detail && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg">Approve Requisition</h3>
            <p className="text-sm text-base-content/60 mt-1">Set approved quantities per item. Leave blank to approve the full requested quantity.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const items = approvalItems.map((it) => ({ risItemId: it.id, quantityApproved: it.approved }));
              await act(detail.id, 'approve', { items }, 'approved');
              setApproveOpen(false);
            }} className="mt-4">
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead><tr><th>Item</th><th>Requested</th><th>Approved Qty</th></tr></thead>
                  <tbody>
                    {detail.items.map((it) => {
                      const approval = approvalItems.find((a) => a.id === it.id);
                      return (
                        <tr key={it.id}>
                          <td>{it.item?.name} <span className="text-xs opacity-60">{it.item?.sku}</span></td>
                          <td className="font-mono">{Number(it.quantityRequested).toLocaleString()}</td>
                          <td>
                            <input type="number" className="input input-sm w-32" min="0" max={it.quantityRequested} step="0.01"
                              value={approval?.approved ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? '' : Number(e.target.value);
                                setApprovalItems((prev) => {
                                  const next = prev.filter((a) => a.id !== it.id);
                                  if (val === '') return next;
                                  return [...next, { id: it.id, approved: Math.min(val, it.quantityRequested) }];
                                });
                              }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setApproveOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">Approve</button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setApproveOpen(false)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}

function RisDetail({ ris, user, canManage, canIssue, canCancel, canReturn, onClose, onApprove, onReject, onIssue, onCancel, onReturn }) {
  const canAct = canManage || canIssue || canCancel;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-4xl">
        <div className="flex items-start justify-between no-print">
          <h3 className="font-bold text-lg">
            <span className="font-mono">{ris.risNumber}</span>
            <span className="ml-2"><Badge status={ris.status}>{ris.status.replace(/_/g, ' ')}</Badge></span>
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-action no-print mt-0 mb-2">
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" /></svg>
            Print RIS
          </button>
          {['ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status) && ris.items.some((it) => it.item.isAccountable) && (
            <button className="btn btn-outline btn-sm" onClick={() => openReport(`/reports/par/${ris.id}`)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m-6-8h6M5 21h14a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v16a1 1 0 001 1z" /></svg>
              Generate PAR
            </button>
          )}
          {canOperate(ris, user.role, 'approve') && <button className="btn btn-success btn-sm" onClick={onApprove}>Approve</button>}
          {canOperate(ris, user.role, 'reject') && <button className="btn btn-error btn-sm btn-outline" onClick={onReject}>Reject</button>}
          {canOperate(ris, user.role, 'issue') && <button className="btn btn-primary btn-sm" onClick={onIssue}>Issue items</button>}
          {canReturn && ['ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status) && (
            <button className="btn btn-outline btn-sm" onClick={onReturn}>Return items</button>
          )}
          {canOperate(ris, user.role, 'cancel') && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel RIS</button>}
        </div>

        <div className="print-area">
          <div className="text-center mb-3">
            <div className="text-lg font-bold uppercase tracking-wide">Requisition and Issue Slip (RIS)</div>
            <div className="text-sm">{ris.risNumber}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
            <div><div className="text-xs opacity-60">Department</div><div className="font-medium">{ris.department?.name}</div></div>
            <div><div className="text-xs opacity-60">Date requested</div><div>{fmtDate(ris.createdAt)}</div></div>
            <div>
              <div className="text-xs opacity-60">Requested by</div>
              <div>{ris.requestedBy?.fullName}</div>
            </div>
            <div>
              <div className="text-xs opacity-60">Status</div>
              <div className="font-semibold">{ris.status.replace(/_/g, ' ')}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs opacity-60">Purpose</div>
              <div className="font-medium">{ris.purpose}</div>
            </div>
            <div>
              <div className="text-xs opacity-60">Approved by</div>
              <div>{ris.approvedBy?.fullName || '—'} {ris.approvedAt ? `(${fmtDate(ris.approvedAt)})` : ''}</div>
            </div>
            <div>
              <div className="text-xs opacity-60">Issued by</div>
              <div>{ris.issuedBy?.fullName || '—'} {ris.issuedAt ? `(${fmtDate(ris.issuedAt)})` : ''}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Stock No.</th>
                  <th>Fund</th>
                  <th>Item</th>
                  <th>Unit</th>
                  <th className="text-right">Requested</th>
                  <th className="text-right">Approved</th>
                  <th className="text-right">Issued</th>
                  <th className="text-center">Stock<br/>Avail?</th>
                  <th className="text-right">Unit Cost (₱)</th>
                  <th className="text-right">Amount (₱)</th>
                </tr>
              </thead>
              <tbody>
                {ris.items.map((it) => {
                  const available = it.availableStock ?? it.item.currentStock ?? 0;
                  const hasStock = available >= (it.quantityApproved ?? it.quantityRequested ?? 0);
                  return (
                    <tr key={it.id}>
                      <td className="font-mono text-xs">{it.item.stockNumber || '—'}</td>
                      <td className="font-mono text-xs">{it.item.fundCluster || '—'}</td>
                      <td>
                        <div className="font-medium">{it.item.name}</div>
                        <div className="text-xs opacity-60 font-mono">{it.item.sku}</div>
                        {it.item.currentStock <= it.item.reorderThreshold && <div className="text-xs text-error">Low stock: {available} {it.item.unit}</div>}
                      </td>
                      <td>{it.item.unit}</td>
                      <td className="text-right">{it.quantityRequested}</td>
                      <td className="text-right">{it.quantityApproved || '—'}</td>
                      <td className="text-right">{it.quantityIssued || '—'}</td>
                      <td className="text-center">{hasStock ? 'Yes' : 'No'}</td>
                      <td className="text-right"><Money value={it.unitCost} /></td>
                      <td className="text-right font-medium"><Money value={it.lineCost} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan="4" className="text-right">Total</th>
                  <th className="text-right">{ris.totalRequested}</th>
                  <th />
                  <th />
                  <th />
                  <th />
                  <th className="text-right"><Money value={ris.totalCost} /></th>
                </tr>
              </tfoot>
            </table>
          </div>

          {ris.remarks && (
            <div className="mt-3 text-sm">
              <span className="opacity-60">Remarks: </span>{ris.remarks}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8">
            <div className="text-center">
              <div className="border-t border-black pt-1">
                <div className="font-semibold">{ris.requestedBy?.fullName || 'Requested by'}</div>
                <div className="text-xs opacity-60">Requested By</div>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1">
                <div className="font-semibold">{ris.approvedBy?.fullName || '—'}</div>
                <div className="text-xs opacity-60">Approved By</div>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1">
                <div className="font-semibold">{ris.issuedBy?.fullName || '—'}</div>
                <div className="text-xs opacity-60">Issued By</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8">
            <div className="text-center">
              <div className="border-t border-black pt-1">
                <div className="font-semibold">Received By</div>
                <div className="text-xs opacity-60">Name / Signature over printed name</div>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1">
                <div className="font-semibold">Checked by</div>
                <div className="text-xs opacity-60">Property Custodian</div>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1">
                <div className="font-semibold">Date / Time</div>
                <div className="text-xs opacity-60">{fmtDate(ris.issuedAt) || ''}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="no-print flex justify-end">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </dialog>
  );
}

function canOperate(ris, role, op) {
  if (op === 'approve') {
    return ['ADMIN', 'PROPERTY_CUSTODIAN', 'WAREHOUSE_STAFF'].includes(role) && ['PENDING', 'REJECTED'].includes(ris.status);
  }
  if (op === 'reject') {
    return ['ADMIN', 'PROPERTY_CUSTODIAN', 'WAREHOUSE_STAFF'].includes(role) && ['PENDING', 'APPROVED'].includes(ris.status);
  }
  if (op === 'issue') {
    return ['ADMIN', 'WAREHOUSE_STAFF'].includes(role) && ['APPROVED', 'PARTIALLY_ISSUED'].includes(ris.status);
  }
  if (op === 'cancel') {
    return role === 'ADMIN' && ['PENDING', 'APPROVED', 'ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status);
  }
  return false;
}

function CreateRisModal({ onClose, onSaved }) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const isDeptHead = user.role === 'DEPARTMENT_HEAD';

  const [departments, setDepartments] = useState([]);
  const [items, setItems] = useState([]);
  const [lineItems, setLineItems] = useState([{ itemId: '', quantityRequested: '', unitCost: '' }]);
  const [form, setForm] = useState({ departmentId: '', purpose: '', remarks: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data.data)).catch(() => {});
    api.get('/items?limit=200&isActive=true').then((r) => setItems(r.data.data)).catch(() => {});
    if (isDeptHead && user.departmentId) {
      setForm((f) => ({ ...f, departmentId: user.departmentId }));
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      departmentId: form.departmentId,
      purpose: form.purpose,
      remarks: form.remarks || undefined,
      items: lineItems
        .filter((l) => l.itemId && Number(l.quantityRequested) > 0)
        .map((l) => ({ itemId: l.itemId, quantityRequested: Number(l.quantityRequested), unitCost: Number(l.unitCost) || undefined })),
    };
    if (payload.items.length === 0) {
      toast.error('Add at least one item with a quantity.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/ris', payload);
      toast.success('Requisition created.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to create requisition.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <h3 className="font-bold text-lg">New requisition (RIS)</h3>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Department *</legend>
              <select className="select" required disabled={isDeptHead} value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">Select...</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Purpose *</legend>
              <input className="input" required value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. Monthly office supplies for GSO" />
            </fieldset>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Items requested</h4>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setLineItems([...lineItems, { itemId: '', quantityRequested: '', unitCost: '' }])}>
              + Add item
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {lineItems.map((line, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_auto] gap-2 items-end">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Item</legend>
                  <select className="select select-sm" value={line.itemId}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx].itemId = e.target.value;
                      setLineItems(next);
                    }}>
                    <option value="">Select...</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>{i.name} · {i.sku} ({i.currentStock} {i.unit})</option>
                    ))}
                  </select>
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Qty</legend>
                  <input className="input input-sm" type="number" min="0" step="any" value={line.quantityRequested}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx].quantityRequested = e.target.value;
                      setLineItems(next);
                    }} />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Unit cost (₱)</legend>
                  <input className="input input-sm" type="number" min="0" step="0.01" placeholder="optional" value={line.unitCost}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx].unitCost = e.target.value;
                      setLineItems(next);
                    }} />
                </fieldset>
                <button type="button" className="btn btn-ghost btn-sm btn-square text-error" disabled={lineItems.length === 1}
                  onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}>✕</button>
              </div>
            ))}
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Remarks</legend>
            <textarea className="textarea" rows={2} value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional notes" />
          </fieldset>

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              Submit requisition
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function ConfirmModal({ message, placeholder, onClose, onConfirm }) {
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onConfirm(remarks || undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Confirm action</h3>
        <form onSubmit={submit} className="flex flex-col gap-4 mt-2">
          <div role="alert" className="alert alert-warning"><span>{message}</span></div>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">{placeholder}</legend>
            <textarea className="textarea" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </fieldset>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-error" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              Confirm
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function ReturnModal({ ris, onClose, onReturn }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(
    ris.items.map((it) => ({
      risItemId: it.id,
      itemId: it.itemId,
      quantity: it.quantityIssued > 0 ? it.quantityIssued : 0,
      max: it.quantityIssued || 0,
      name: it.item.name,
      sku: it.item.sku,
      unit: it.item.unit,
    }))
  );

  const submit = async (e) => {
    e.preventDefault();
    const payload = items
      .filter((it) => Number(it.quantity) > 0)
      .map((it) => ({ risItemId: it.risItemId, itemId: it.itemId, quantity: Number(it.quantity) }));
    if (payload.length === 0) {
      toast.error('Enter a quantity for at least one item.');
      return;
    }
    setBusy(true);
    try {
      await onReturn(payload);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to return items.');
    } finally {
      setBusy(false);
    }
  };

  const setQty = (idx, value) => {
    const next = [...items];
    next[idx].quantity = Math.min(Number(value) || 0, next[idx].max);
    setItems(next);
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <h3 className="font-bold text-lg">Return items to stock</h3>
        <p className="text-sm text-base-content/60 mt-1">{ris.risNumber} — enter quantities to return.</p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="text-right">Issued</th>
                  <th className="text-right">Return qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.risItemId}>
                    <td>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs opacity-60 font-mono">{it.sku} · {it.unit}</div>
                    </td>
                    <td className="text-right">{it.max}</td>
                    <td className="text-right">
                      <input
                        className="input input-sm w-24 text-right"
                        type="number"
                        min="0"
                        max={it.max}
                        step="any"
                        value={it.quantity || ''}
                        onChange={(e) => setQty(idx, e.target.value)}
                        disabled={it.max <= 0}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              Return to stock
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}