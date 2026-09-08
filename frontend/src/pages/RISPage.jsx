import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, CopyPlus, Plus, Eye, Printer, FileText, CheckCircle2, XCircle, BadgeCheck, PackageCheck, Undo2, Send, Trash2, Save } from 'lucide-react';
import api, { openReport } from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Badge, EmptyState, FormModal, Money, Pagination, Spinner } from '../components/ui';

function Portal({ children }) { return createPortal(children, document.body); }
const STATUS_FLOW = ['PENDING', 'APPROVED', 'CERTIFIED', 'ISSUED', 'PARTIALLY_ISSUED', 'REJECTED', 'CANCELLED'];

const STATUS_BADGE = {
  PENDING: 'warning',
  APPROVED: 'info',
  CERTIFIED: 'info',
  PARTIALLY_ISSUED: 'warning',
  ISSUED: 'success',
  REJECTED: 'error',
  CANCELLED: 'neutral',
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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvalItems, setApprovalItems] = useState([]);

  const load = () => {
    const q = new URLSearchParams({ page });
    if (status) q.set('status', status);
    if (search) q.set('search', search);
    api.get(`/ris?${q}`).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load RIS.'));
  };

  useEffect(load, [page, status, search]);

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
      const res = action === 'issue' || action === 'return'
        ? await api.post(`/ris/${id}/${action}`, body)
        : await api.patch(`/ris/${id}/${action}`, body);
      toast.success(`RIS ${actLabel}.`);
      if (res.data.shortfalls?.length) {
        const lines = res.data.shortfalls.map((s) => `${s.itemName}: issued ${s.issued} of ${s.requested} (only ${s.available} in stock)`).join('\n');
        toast.warning(`Stock shortfall:\n${lines}`);
      }
      setDetail(null);
      setReturnOpen(false);
      setApproveOpen(false);
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
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={() => setBulkOpen(true)}>
              <CopyPlus size={15} />
              Bulk Create
            </button>
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={15} />
              New requisition
            </button>
          </div>
        )}
      />

      <div className="card bg-surface shadow-sm border border-border">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1 md:max-w-md">
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
              <input type="search" className="input input-sm w-full pl-9" aria-label="Search RIS numbers" placeholder="Search RIS number…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              {search && (
                <button type="button" className="btn btn-ghost btn-xs btn-square" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => { setSearch(''); setPage(1); }} aria-label="Clear search"><X size={12} /></button>
              )}
            </div>
            <select className="select select-sm" style={{ width: '10rem' }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
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
                <table className="table table-sm" aria-label="RIS list table">
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
                          <button className="btn btn-ghost btn-xs"><Eye size={12} /> Details</button>
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
          onCertify={() => act(detail.id, 'certify', {}, 'certified')}
          onIssue={() => setIssueOpen(true)}
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

      {bulkOpen && (
        <BulkCreateModal
          onClose={() => setBulkOpen(false)}
          onSaved={() => { setBulkOpen(false); load(); }}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={`Confirm this RIS will be ${confirm.label}. This action cannot be undone.`}
          placeholder="Reason / remarks (optional for reject / cancel)"
          onClose={() => setConfirm(null)}
          onConfirm={async (remarks) => {
            const isIssue = confirm.action === 'issue';
            const endpoint = isIssue ? 'issue' : confirm.action === 'reject' ? 'reject' : 'cancel';
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

      {issueOpen && detail && (
        <IssueModal
          ris={detail}
          onClose={() => setIssueOpen(false)}
          onIssue={(items) => {
            setIssueOpen(false);
            act(detail.id, 'issue', { items }, 'issued');
          }}
        />
      )}

      {approveOpen && detail && (
        <Portal>
          <div className="modal-backdrop">
            <div className="modal-box modal-xl">
              <div className="modal-header">
                <h3 className="modal-title">Approve Requisition</h3>
                <button className="modal-close" onClick={() => setApproveOpen(false)}><X size={15} /></button>
              </div>
              <div className="modal-body">
                <p className="text-sm text-base-content/60">Set approved quantities per item. Leave blank to approve the full requested quantity.</p>
                <form id="approve-form" onSubmit={async (e) => {
                  e.preventDefault();
                  const items = approvalItems.map((it) => ({ risItemId: it.id, quantityApproved: it.approved }));
                  await act(detail.id, 'approve', { items }, 'approved');
                  setApproveOpen(false);
                }} className="mt-4">
                  <div className="overflow-x-auto">
                    <table className="table table-sm" aria-label="RIS list table">
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
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setApproveOpen(false)}>
                  <X size={14} /> Cancel
                </button>
                <button type="submit" form="approve-form" className="btn btn-success">
                  <CheckCircle2 size={14} /> Approve
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function RisDetail({ ris, user, canManage, canIssue, canCancel, canReturn, onClose, onApprove, onReject, onCertify, onIssue, onCancel, onReturn }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const tone = ['ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status)
    ? 'success'
    : ['REJECTED', 'CANCELLED'].includes(ris.status)
      ? 'danger'
      : 'info';

  return (
    <Portal>
      <FormModal
        title={`Requisition and Issue Slip · ${ris.risNumber}`}
          formNo="Form No. LGU-IMS-RIS-01"
          icon={FileText}
          tone={tone}
          badge={<Badge status={ris.status}>{ris.status.replace(/_/g, ' ')}</Badge>}
          size="modal-xl"
          onClose={onClose}
        >
          <div className="modal-body">
            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
                <Printer size={14} />
                Print RIS
              </button>
              {['ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status) && (
                <button className="btn btn-outline btn-sm" onClick={() => openReport(`/reports/acknowledgment/${ris.id}`)}>
                  <FileText size={14} />
                  Acknowledgment Slip
                </button>
              )}
              {['ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status) && ris.items.some((it) => it.item.isAccountable) && (
                <button className="btn btn-outline btn-sm" onClick={() => openReport(`/reports/par/${ris.id}`)}>
                  <FileText size={14} />
                  Generate PAR
                </button>
              )}
              {canOperate(ris, user.role, 'approve') && <button className="btn btn-success btn-sm" onClick={onApprove}><CheckCircle2 size={14} /> Approve</button>}
              {canOperate(ris, user.role, 'reject') && <button className="btn btn-error btn-sm btn-outline" onClick={onReject}><XCircle size={14} /> Reject</button>}
              {canOperate(ris, user.role, 'certify') && <button className="btn btn-info btn-sm" onClick={onCertify}><BadgeCheck size={14} /> Certify</button>}
              {canOperate(ris, user.role, 'issue') && <button className="btn btn-primary btn-sm" onClick={onIssue}><PackageCheck size={14} /> Issue items</button>}
              {canReturn && ['ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status) && (
                <button className="btn btn-outline btn-sm" onClick={onReturn}><Undo2 size={14} /> Return items</button>
              )}
              {canOperate(ris, user.role, 'cancel') && <button className="btn btn-ghost btn-sm" onClick={onCancel}><XCircle size={14} /> Cancel RIS</button>}
            </div>

            <div className="print-area">
              <div className="text-center mb-3">
                <div className="text-lg font-bold uppercase tracking-wide">Requisition and Issue Slip (RIS)</div>
                <div className="text-sm">{ris.risNumber}</div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                <div><div className="lbl">Department</div><div className="font-medium">{ris.department?.name}</div></div>
                <div><div className="lbl">Date requested</div><div>{fmtDate(ris.createdAt)}</div></div>
                <div>
                  <div className="lbl">Requested by</div>
                  <div>{ris.requestedBy?.fullName}</div>
                </div>
                <div>
                  <div className="lbl">Status</div>
                  <div className="font-semibold">{ris.status.replace(/_/g, ' ')}</div>
                </div>
                <div className="col-span-2">
                  <div className="lbl">Purpose</div>
                  <div className="font-medium">{ris.purpose}</div>
                </div>
                <div>
                  <div className="lbl">Approved by</div>
                  <div>{ris.approvedBy?.fullName || '—'} {ris.approvedAt ? `(${fmtDate(ris.approvedAt)})` : ''}</div>
                </div>
                <div>
                  <div className="lbl">Issued by</div>
                  <div>{ris.issuedBy?.fullName || '—'} {ris.issuedAt ? `(${fmtDate(ris.issuedAt)})` : ''}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table table-sm" aria-label="RIS items">
                  <thead>
                    <tr>
                      <th>Stock No.</th>
                      <th>Fund</th>
                      <th>Item</th>
                      <th>Unit</th>
                      <th className="text-right">Requested</th>
                      <th className="text-right">Approved</th>
                      <th className="text-right">Issued</th>
                      <th className="text-center">Stock<br />Avail?</th>
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
                            <div className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{it.item.sku}</div>
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
                      <td colSpan={4} className="text-right font-semibold">Total</td>
                      <td className="text-right font-semibold">{ris.totalRequested}</td>
                      <td />
                      <td />
                      <td />
                      <td />
                      <td className="text-right font-semibold"><Money value={ris.totalCost} /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {ris.remarks && (
                <div className="mt-3 text-sm">
                  <span style={{ color: 'var(--muted)' }}>Remarks: </span>{ris.remarks}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8">
                <div className="text-center">
                  <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: '0.25rem' }}>
                    <div className="font-semibold">{ris.requestedBy?.fullName || 'Requested by'}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Requested By</div>
                  </div>
                </div>
                <div className="text-center">
                  <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: '0.25rem' }}>
                    <div className="font-semibold">{ris.approvedBy?.fullName || '—'}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Approved By</div>
                  </div>
                </div>
                <div className="text-center">
                  <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: '0.25rem' }}>
                    <div className="font-semibold">{ris.issuedBy?.fullName || '—'}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Issued By</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-8">
                <div className="text-center">
                  <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: '0.25rem' }}>
                    <div className="font-semibold">Received By</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Name / Signature over printed name</div>
                  </div>
                </div>
                <div className="text-center">
                  <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: '0.25rem' }}>
                    <div className="font-semibold">Checked by</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>Property Custodian</div>
                  </div>
                </div>
                <div className="text-center">
                  <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: '0.25rem' }}>
                    <div className="font-semibold">Date / Time</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>{fmtDate(ris.issuedAt) || ''}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer no-print">
            <button className="btn" onClick={onClose}>
              <X size={14} /> Close
            </button>
          </div>
      </FormModal>
    </Portal>
  );
}

function canOperate(ris, role, op) {
  if (op === 'approve') {
    return ['ADMIN', 'PROPERTY_CUSTODIAN', 'WAREHOUSE_STAFF'].includes(role) && ['PENDING', 'REJECTED'].includes(ris.status);
  }
  if (op === 'reject') {
    return ['ADMIN', 'PROPERTY_CUSTODIAN', 'WAREHOUSE_STAFF'].includes(role) && ['PENDING', 'APPROVED'].includes(ris.status);
  }
  if (op === 'certify') {
    return ['ADMIN', 'DEPARTMENT_HEAD'].includes(role) && ris.status === 'APPROVED';
  }
  if (op === 'issue') {
    return ['ADMIN', 'WAREHOUSE_STAFF'].includes(role) && ['CERTIFIED', 'PARTIALLY_ISSUED'].includes(ris.status);
  }
  if (op === 'cancel') {
    return role === 'ADMIN' && ['PENDING', 'APPROVED', 'CERTIFIED', 'ISSUED', 'PARTIALLY_ISSUED'].includes(ris.status);
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
    <Portal>
      <FormModal
        title="New requisition (RIS)"
        formNo="Form No. LGU-IMS-RIS-01"
        icon={FileText}
        tone="info"
        size="modal-lg"
        onClose={onClose}
      >
        <div className="modal-body">
          <form id="create-ris-form" onSubmit={submit} className="flex flex-col gap-4">
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
                  <Plus size={13} /> Add item
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
                      onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}><X size={15} /></button>
                  </div>
                ))}
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Remarks</legend>
                <textarea className="textarea" rows={2} value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional notes" />
              </fieldset>
            </form>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            <X size={14} /> Cancel
          </button>
          <button type="submit" form="create-ris-form" className="btn btn-primary" disabled={busy}>
            {busy && <span className="loading loading-spinner loading-xs" />}
            <Send size={14} /> Submit requisition
          </button>
        </div>
      </FormModal>
    </Portal>
  );
}

function BulkCreateModal({ onClose, onSaved }) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const isDeptHead = user.role === 'DEPARTMENT_HEAD';

  const [departments, setDepartments] = useState([]);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const emptyLine = { itemId: '', quantityRequested: '', unitCost: '' };
  const emptyRis = { departmentId: '', purpose: '', remarks: '', lines: [{ ...emptyLine }] };
  const [risList, setRisList] = useState([{ ...emptyRis }]);

  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data.data)).catch(() => {});
    api.get('/items?limit=200&isActive=true').then((r) => setItems(r.data.data)).catch(() => {});
    if (isDeptHead && user.departmentId) {
      setRisList([{ ...emptyRis, departmentId: user.departmentId }]);
    }
  }, []);

  const addRis = () => setRisList((prev) => [...prev, { ...emptyRis, departmentId: isDeptHead ? user.departmentId : '' }]);
  const removeRis = (idx) => setRisList((prev) => prev.filter((_, i) => i !== idx));

  const updateRisField = (idx, field, value) => {
    setRisList((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const updateLine = (risIdx, lineIdx, field, value) => {
    setRisList((prev) => prev.map((r, ri) => {
      if (ri !== risIdx) return r;
      const lines = r.lines.map((l, li) => li === lineIdx ? { ...l, [field]: value } : l);
      return { ...r, lines };
    }));
  };

  const addLine = (risIdx) => {
    setRisList((prev) => prev.map((r, i) => i === risIdx ? { ...r, lines: [...r.lines, { ...emptyLine }] } : r));
  };

  const removeLine = (risIdx, lineIdx) => {
    setRisList((prev) => prev.map((r, i) => {
      if (i !== risIdx) return r;
      return { ...r, lines: r.lines.filter((_, li) => li !== lineIdx) };
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      departmentId: isDeptHead ? user.departmentId : undefined,
      risList: risList.map((r) => ({
        departmentId: r.departmentId,
        purpose: r.purpose,
        remarks: r.remarks || undefined,
        items: r.lines.filter((l) => l.itemId && Number(l.quantityRequested) > 0)
          .map((l) => ({ itemId: l.itemId, quantityRequested: Number(l.quantityRequested), unitCost: Number(l.unitCost) || undefined })),
      })).filter((r) => r.purpose && r.items.length > 0),
    };
    if (payload.risList.length === 0) {
      toast.error('Add at least one complete RIS with a purpose and items.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/ris/bulk', payload);
      const result = res.data.data || {};
      const createdCount = result.created?.length ?? 0;
      const errors = result.errors ?? [];
      if (errors.length > 0) {
        if (createdCount > 0) toast.warning(`${createdCount} RIS created, ${errors.length} failed.`);
        else toast.error(`Bulk creation failed: ${errors.map((e) => e.message).join('; ')}`);
      } else {
        toast.success(`${createdCount} requisition(s) created.`);
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk creation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Portal>
      <div className="modal-backdrop">
        <div className="modal-box modal-2xl max-h-[90vh] overflow-y-auto">
          <div className="modal-header">
            <h3 className="modal-title mb-4">Bulk Create Requisitions</h3>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
          <div className="modal-body">
            <form id="bulk-create-form" onSubmit={submit} className="flex flex-col gap-6">
              {risList.map((ris, risIdx) => (
                <div key={risIdx} className="border border-border rounded-lg p-4 relative">
                  <div className="absolute top-2 right-2">
                    {risList.length > 1 && (
                      <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => removeRis(risIdx)}><Trash2 size={12} /> Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Department *</legend>
                      <select className="select select-sm" required disabled={isDeptHead} value={ris.departmentId}
                        onChange={(e) => updateRisField(risIdx, 'departmentId', e.target.value)}>
                        <option value="">Select...</option>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </fieldset>
                    <fieldset className="fieldset col-span-2">
                      <legend className="fieldset-legend">Purpose *</legend>
                      <input className="input input-sm" required value={ris.purpose}
                        onChange={(e) => updateRisField(risIdx, 'purpose', e.target.value)} placeholder="e.g. Office supplies" />
                    </fieldset>
                  </div>
                  <div className="text-xs font-semibold text-base-content/60 mb-2">Items</div>
                  {ris.lines.map((line, lineIdx) => (
                    <div key={lineIdx} className="grid grid-cols-[1fr_80px_80px_auto] gap-2 mb-2 items-end">
                      <select className="select select-sm" value={line.itemId}
                        onChange={(e) => updateLine(risIdx, lineIdx, 'itemId', e.target.value)}>
                        <option value="">Select item...</option>
                        {items.map((i) => <option key={i.id} value={i.id}>{i.name} · {i.sku}</option>)}
                      </select>
                      <input className="input input-sm" type="number" min="0" step="any" placeholder="Qty" value={line.quantityRequested}
                        onChange={(e) => updateLine(risIdx, lineIdx, 'quantityRequested', e.target.value)} />
                      <input className="input input-sm" type="number" min="0" step="0.01" placeholder="₱" value={line.unitCost}
                        onChange={(e) => updateLine(risIdx, lineIdx, 'unitCost', e.target.value)} />
                      <div className="flex gap-1">
                        {ris.lines.length > 1 && (
                          <button type="button" className="btn btn-ghost btn-xs btn-square text-error" onClick={() => removeLine(risIdx, lineIdx)}><X size={15} /></button>
                        )}
                        {lineIdx === ris.lines.length - 1 && (
                          <button type="button" className="btn btn-ghost btn-xs" onClick={() => addLine(risIdx)}><Plus size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                  <fieldset className="fieldset mt-2">
                    <legend className="fieldset-legend text-xs">Remarks (optional)</legend>
                    <input className="input input-sm" value={ris.remarks}
                      onChange={(e) => updateRisField(risIdx, 'remarks', e.target.value)} placeholder="Optional notes" />
                  </fieldset>
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline btn-sm" onClick={addRis}><CopyPlus size={13} /> Add another RIS</button>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" form="bulk-create-form" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              <Send size={14} /> Create {risList.length} requisition{risList.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </Portal>
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
    <Portal>
      <div className="modal-backdrop">
        <div className="modal-box modal-sm">
          <div className="modal-header">
            <h3 className="modal-title">Confirm action</h3>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
          <div className="modal-body">
            <form id="confirm-form" onSubmit={submit} className="flex flex-col gap-4">
              <div role="alert" className="alert alert-warning"><span>{message}</span></div>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">{placeholder}</legend>
                <textarea className="textarea" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </fieldset>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" form="confirm-form" className="btn btn-error" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              <CheckCircle2 size={14} /> Confirm
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function IssueModal({ ris, onClose, onIssue }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(
    ris.items
      .filter((it) => (it.quantityApproved || 0) > (it.quantityIssued || 0))
      .map((it) => ({
        risItemId: it.id,
        itemId: it.itemId,
        remaining: (it.quantityApproved || 0) - (it.quantityIssued || 0),
        stock: it.item?.currentStock ?? 0,
        quantity: '',
        name: it.item?.name || '—',
        sku: it.item?.sku || '—',
        unit: it.item?.unit || '',
      }))
  );

  const submit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.info('Nothing left to issue.');
      return;
    }
    setBusy(true);
    try {
      await onIssue(
        items.map((it) => ({ risItemId: it.risItemId, quantityIssued: it.quantity === '' ? it.remaining : Number(it.quantity) }))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to issue RIS.');
    } finally {
      setBusy(false);
    }
  };

  const setQty = (idx, value) => {
    const next = [...items];
    next[idx].quantity = value === '' ? '' : Math.min(Number(value) || 0, next[idx].remaining);
    setItems(next);
  };

  return (
    <Portal>
      <div className="modal-backdrop">
        <div className="modal-box modal-xl">
          <div className="modal-header">
            <h3 className="modal-title">Issue items</h3>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
          <div className="modal-body">
            <p className="text-sm text-base-content/60">{ris.risNumber} — leave blank to issue the full remaining quantity.</p>
            <form id="issue-form" onSubmit={submit} className="mt-4 flex flex-col gap-3">
              <div className="overflow-x-auto">
                <table className="table table-sm" aria-label="Issue items table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-right">Stock</th>
                      <th className="text-right">Remaining</th>
                      <th className="text-right">Issue qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={it.risItemId}>
                        <td>
                          <div className="font-medium">{it.name}</div>
                          <div className="text-xs opacity-60 font-mono">{it.sku} · {it.unit}</div>
                        </td>
                        <td className="text-right">{Number(it.stock).toLocaleString()}</td>
                        <td className="text-right">{Number(it.remaining).toLocaleString()}</td>
                        <td className="text-right">
                          <input
                            className="input input-sm w-24 text-right"
                            type="number"
                            min="0"
                            max={it.remaining}
                            step="any"
                            value={it.quantity}
                            placeholder={String(it.remaining)}
                            onChange={(e) => setQty(idx, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" form="issue-form" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              <PackageCheck size={14} /> Issue stock
            </button>
          </div>
        </div>
      </div>
    </Portal>
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
    <Portal>
      <div className="modal-backdrop">
        <div className="modal-box modal-xl">
          <div className="modal-header">
            <h3 className="modal-title">Return items to stock</h3>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
          <div className="modal-body">
            <p className="text-sm text-base-content/60">{ris.risNumber} — enter quantities to return.</p>
            <form id="return-form" onSubmit={submit} className="mt-4 flex flex-col gap-3">
              <div className="overflow-x-auto">
                <table className="table table-sm" aria-label="RIS list table">
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
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" form="return-form" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              <Undo2 size={14} /> Return to stock
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}