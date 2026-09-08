import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, GitCompareArrows, Plus, CheckCircle2, SquarePen, XCircle, Trash2, Save, Search, Building2, User, CalendarDays } from 'lucide-react';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Badge, EmptyState, FormModal, Money, Pagination, Spinner } from '../components/ui';

function Portal({ children }) { return createPortal(children, document.body); }

const PO_STATUSES = ['PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'];
const PO_MATCH_FILTERS = ['ALL', 'MATCHED', 'PARTIAL', 'SHORT'];

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function PurchaseOrdersPage() {
  const [tab, setTab] = useState('list');

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Create and manage purchase orders for procurement."
      />
      <div role="tablist" className="tabs tabs-box w-fit mb-4">
        <button role="tab" aria-selected={tab === 'list'} className={`tab ${tab === 'list' ? 'tab-active' : ''}`} onClick={() => setTab('list')}><FileText size={14} /> Purchase Orders</button>
        <button role="tab" aria-selected={tab === 'match'} className={`tab ${tab === 'match' ? 'tab-active' : ''}`} onClick={() => setTab('match')}><GitCompareArrows size={14} /> 3-Way Match</button>
      </div>
      {tab === 'list' ? <POList /> : <ThreeWayMatch />}
    </div>
  );
}

function POList() {
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF');
  const canApprove = useCan('ADMIN', 'PROPERTY_CUSTODIAN');
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ departmentId: '', supplierId: '', date: todayLocal(), remarks: '', lines: [{ itemId: '', quantity: 1, unitCost: 0 }] });
  const [busy, setBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [editPo, setEditPo] = useState(null);

  const resetForm = () => setForm({ departmentId: '', supplierId: '', date: todayLocal(), remarks: '', lines: [{ itemId: '', quantity: 1, unitCost: 0 }] });

  const openEdit = (po) => {
    setEditPo(po);
    setForm({
      departmentId: po.departmentId,
      supplierId: po.supplierId,
      date: String(po.date).slice(0, 10),
      remarks: po.remarks || '',
      lines: (po.items || []).map((it) => ({ itemId: it.itemId, quantity: Number(it.quantity), unitCost: Number(it.unitCost) || 0 })),
    });
    setOpen(true);
  };

  const load = () => {
    const q = new URLSearchParams({ page });
    if (status) q.set('status', status);
    if (search) q.set('search', search);
    api.get(`/purchase-orders?${q}`).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load purchase orders.'));
  };

  useEffect(load, [page, status, search]);

  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data.data)).catch(() => {});
    api.get('/inventory/suppliers').then((r) => setSuppliers(r.data.data)).catch(() => {});
    api.get('/items?limit=200&isActive=true').then((r) => setItems(r.data.data)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.departmentId || !form.supplierId) {
      toast.error('Select a department and supplier.');
      return;
    }
    const items = form.lines
      .filter((l) => l.itemId && Number(l.quantity) > 0)
      .map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0 }));
    if (items.length === 0) {
      toast.error('Add at least one line with a quantity.');
      return;
    }
    setBusy(true);
    try {
      if (editPo) {
        await api.patch(`/purchase-orders/${editPo.id}`, {
          departmentId: form.departmentId,
          supplierId: form.supplierId,
          date: form.date,
          remarks: form.remarks,
          items,
        });
        toast.success('Purchase order updated.');
      } else {
        await api.post('/purchase-orders', {
          departmentId: form.departmentId,
          supplierId: form.supplierId,
          date: form.date,
          remarks: form.remarks,
          items,
        });
        toast.success('Purchase order created.');
      }
      setOpen(false);
      setEditPo(null);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save purchase order.');
    } finally {
      setBusy(false);
    }
  };

  const approve = async (id) => {
    try {
      await api.patch(`/purchase-orders/${id}/approve`);
      toast.success('Purchase order approved.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to approve purchase order.');
    }
  };

  const cancel = async () => {
    if (!cancelTarget) return;
    try {
      await api.patch(`/purchase-orders/${cancelTarget}/cancel`);
      toast.success('Purchase order cancelled.');
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to cancel purchase order.');
    }
  };

  const Field = ({ label, hint, required, full, children }) => (
    <div className={`fieldset${full ? ' form-full' : ''}`}>
      <span className="fieldset-legend">{label}{required && <span className="adj-req"> *</span>}</span>
      {children}
      {hint && <span className="sp-hint">{hint}</span>}
    </div>
  );

  const IconInput = ({ icon: Icon, ...props }) => (
    <label className="input">
      {Icon && <Icon size={16} style={{ color: 'var(--faint)', flexShrink: 0 }} />}
      <input {...props} />
    </label>
  );

  return (
    <div>
      <div className="flex justify-end mb-2">
        {canManage && <button className="btn btn-primary btn-sm" onClick={() => { setEditPo(null); resetForm(); setOpen(true); }}><Plus size={14} /> New Purchase Order</button>}
      </div>
      <div className="card bg-surface shadow-sm border border-border">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1 md:max-w-md">
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
              <input type="search" className="input input-sm w-full pl-9" aria-label="Search purchase orders" placeholder="Search PO number…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              {search && (
                <button type="button" className="btn btn-ghost btn-xs btn-square" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => { setSearch(''); setPage(1); }} aria-label="Clear search"><X size={12} /></button>
              )}
            </div>
            <select className="select select-sm" style={{ width: '10rem' }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {PO_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          {!data ? <Spinner label="Loading purchase orders..." /> : data.data.length === 0 ? <EmptyState message="No purchase orders found." /> : (
            <div className="overflow-x-auto">
              <table className="table table-sm" aria-label="Purchase orders table">
                <thead>
                  <tr>
                    <th className="font-mono text-xs uppercase tracking-wider">PO No.</th>
                    <th className="font-mono text-xs uppercase tracking-wider">Date</th>
                    <th className="font-mono text-xs uppercase tracking-wider">Department</th>
                    <th className="font-mono text-xs uppercase tracking-wider">Supplier</th>
                    <th className="font-mono text-xs uppercase tracking-wider text-right">Amount</th>
                    <th className="font-mono text-xs uppercase tracking-wider">Status</th>
                    <th className="font-mono text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((po) => (
                    <tr key={po.id} className="hover">
                      <td className="font-mono text-xs font-semibold">{po.poNumber}</td>
                      <td className="font-mono text-xs opacity-80">{new Date(po.date).toLocaleDateString()}</td>
                      <td>{po.department?.name || '-'}</td>
                      <td>{po.supplier?.name || '-'}</td>
                      <td className="font-mono text-xs text-right"><Money value={po.totalAmount} /></td>
                      <td><Badge status={po.status}>{po.status}</Badge></td>
                      <td className="text-right">
                        {canApprove && po.status === 'PENDING' && <button className="btn btn-ghost btn-xs" onClick={() => approve(po.id)}><CheckCircle2 size={12} /> Approve</button>}
                        {canManage && po.status === 'PENDING' && <button className="btn btn-ghost btn-xs" onClick={() => openEdit(po)}><SquarePen size={12} /> Edit</button>}
                        {canManage && ['PENDING', 'APPROVED'].includes(po.status) && <button className="btn btn-ghost btn-xs text-error" onClick={() => setCancelTarget(po.id)}><XCircle size={12} /> Cancel</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && <Pagination meta={data.meta} onPage={setPage} />}
        </div>
      </div>

      {open && (
        <Portal>
          <FormModal
            title={editPo ? `Edit ${editPo.poNumber}` : 'New Purchase Order'}
            formNo="Form No. LGU-IMS-PO-01"
            icon={FileText}
            tone="info"
            size="modal-lg"
            onClose={() => { setOpen(false); setEditPo(null); }}
          >
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="modal-body">
                <div className="divider">Details</div>
                <div className="modal-form-grid">
                  <Field label="Department" required full hint="Cost center / unit requesting">
                    <select className="select select-sm" required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                      <option value="">Select...</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Supplier" required hint="Vendor to bill">
                    <select className="select select-sm" required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                      <option value="">Select...</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Date" hint="PO issue date">
                    <IconInput icon={CalendarDays} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </Field>
                  <Field label="Remarks" hint="Terms, conditions">
                    <textarea className="textarea" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Special instructions..." />
                  </Field>
                </div>

                <div className="divider">Items</div>
                {form.lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_72px_96px_auto] gap-2 mb-1.5 items-end">
                    <select className="select select-sm" required value={line.itemId} onChange={(e) => { const l = [...form.lines]; l[idx].itemId = e.target.value; setForm({ ...form, lines: l }); }}>
                      <option value="">Select item...</option>
                      {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                    </select>
                    <input type="number" className="input input-sm" placeholder="Qty" required min="0.01" step="0.01" value={line.quantity} onChange={(e) => { const l = [...form.lines]; l[idx].quantity = Number(e.target.value); setForm({ ...form, lines: l }); }} />
                    <input type="number" className="input input-sm" placeholder="" required min="0" step="0.01" value={line.unitCost} onChange={(e) => { const l = [...form.lines]; l[idx].unitCost = Number(e.target.value); setForm({ ...form, lines: l }); }} />
                    {form.lines.length > 1 && <button type="button" className="btn btn-ghost btn-sm btn-square text-error" onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) })}><Trash2 size={13} /></button>}
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, lines: [...form.lines, { itemId: '', quantity: 1, unitCost: 0 }] })}><Plus size={13} /> Add line</button>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => { setOpen(false); setEditPo(null); }}>
                  <X size={14} /> Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />}<Save size={14} />{editPo ? 'Save changes' : 'Create'} </button>
              </div>
            </form>
          </FormModal>
        </Portal>
      )}

      {cancelTarget && (
        <Portal>
          <FormModal
            title="Cancel purchase order"
            icon={XCircle}
            tone="danger"
            size="modal-sm"
            onClose={() => setCancelTarget(null)}
          >
            <div className="modal-body">
              <p className="text-sm text-muted">Cancel this purchase order? This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setCancelTarget(null)}>
                <X size={14} /> Cancel
              </button>
              <button className="btn btn-error" onClick={cancel}>
                <XCircle size={14} /> Confirm cancel
                </button>
            </div>
          </FormModal>
        </Portal>
      )}
    </div>
  );
}

function ThreeWayMatch() {
  const toast = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poMeta, setPoMeta] = useState({ page: 1, total: 1, totalPages: 1 });
  const [poPage, setPoPage] = useState(1);
  const [poSearch, setPoSearch] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('ALL');
  const [selectedPO, setSelectedPO] = useState(null);
  const [poDetail, setPODetail] = useState(null);
  const [receivings, setReceivings] = useState([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPOs = useCallback((page = 1) => {
    const q = new URLSearchParams({ page });
    api.get(`/purchase-orders?${q}`).then((r) => {
      setPurchaseOrders(r.data.data || []);
      setPoMeta(r.data.meta || { page: 1, totalPages: 1, total: 0 });
    }).catch(() => {});
  }, []);

  useEffect(() => { loadPOs(poPage); }, [poPage, loadPOs]);

  const openModal = async (po) => {
    setSelectedPO(po);
    setInvoiceNo('');
    setInvoiceAmount('');
    setLoading(true);
    try {
      const [poRes, recRes] = await Promise.all([
        api.get(`/purchase-orders/${po.id}`),
        api.get(`/inventory/receivings?purchaseOrderId=${po.id}`),
      ]);
      setPODetail(poRes.data.data);
      setReceivings(recRes.data.data || []);
    } catch (err) {
      toast.error('Unable to load PO details.');
    } finally {
      setLoading(false);
    }
  };

  const recByItem = useMemo(() => {
    const map = new Map();
    receivings.forEach((r) =>
      (r.items || []).forEach((it) => {
        map.set(it.itemId, (map.get(it.itemId) || 0) + Number(it.quantity || 0));
      })
    );
    return map;
  }, [receivings]);

  const poLines = poDetail?.items || [];

  const matchedLines = useMemo(() =>
    poLines.map((poLine) => {
      const recQty = recByItem.get(poLine.itemId) || 0;
      const poQty = Number(poLine.quantity) || 0;
      return {
        item: poLine.item?.name || poLine.itemId,
        sku: poLine.item?.sku || '—',
        poQty,
        recQty,
        matched: recQty >= poQty && poQty > 0,
        partial: recQty > 0 && recQty < poQty,
      };
    }),
    [poLines, recByItem]
  );

  const invoiceAmt = Number(invoiceAmount) || 0;
  const poAmt = Number(poDetail?.totalAmount) || 0;
  const totalMatch = matchedLines.every((l) => l.matched);
  const invoiceMatch = invoiceAmt > 0 ? Math.abs(invoiceAmt - poAmt) < 0.01 : null;

  const getMatchState = (po) => {
    if (po.status === 'CANCELLED') return 'cancelled';
    if (po.status === 'RECEIVED') return 'matched';
    if (po.status === 'APPROVED') return 'partial';
    return 'pending';
  };

  const filteredPOs = useMemo(() => {
    let rows = purchaseOrders.filter((po) => po.status !== 'CANCELLED');
    if (poStatusFilter !== 'ALL') {
      rows = rows.filter((po) => {
        const m = getMatchState(po);
        if (poStatusFilter === 'MATCHED') return m === 'matched';
        if (poStatusFilter === 'PARTIAL') return m === 'partial';
        if (poStatusFilter === 'SHORT') return m === 'pending';
        return true;
      });
    }
    if (poSearch) {
      const q = poSearch.toLowerCase();
      rows = rows.filter((po) =>
        po.poNumber?.toLowerCase().includes(q) ||
        po.supplier?.name?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [purchaseOrders, poStatusFilter, poSearch]);

  return (
    <div>
      {/* Filter Bar */}
      <div className="card bg-surface shadow-sm border border-border mb-4">
        <div className="card-body py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
              <input
                type="search"
                className="input input-sm w-full pl-9"
                aria-label="Search purchase orders"
                placeholder="Search PO number…"
                value={poSearch}
                onChange={(e) => { setPoSearch(e.target.value); setPoPage(1); }}
              />
              {poSearch && (
                <button type="button" className="btn btn-ghost btn-xs btn-square" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => { setPoSearch(''); setPoPage(1); }} aria-label="Clear search"><X size={12} /></button>
              )}
            </div>
            <select className="select select-sm" style={{ width: '10rem' }} value={poStatusFilter} onChange={(e) => { setPoStatusFilter(e.target.value); setPoPage(1); }}>
              {PO_MATCH_FILTERS.map((f) => <option key={f} value={f}>{f === 'ALL' ? 'All statuses' : f.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* PO Table */}
      <div className="card bg-surface shadow-sm border border-border">
        <div className="card-body">
          {!purchaseOrders ? <Spinner label="Loading purchase orders…" /> : filteredPOs.length === 0 ? (
            <EmptyState message="No purchase orders found." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table table-sm" aria-label="Purchase orders for 3-way match">
                  <thead>
                    <tr>
                      <th className="font-mono text-xs uppercase tracking-wider">PO No.</th>
                      <th className="font-mono text-xs uppercase tracking-wider">Date</th>
                      <th className="font-mono text-xs uppercase tracking-wider">Supplier</th>
                      <th className="font-mono text-xs uppercase tracking-wider">Department</th>
                      <th className="font-mono text-xs uppercase tracking-wider text-right">Amount</th>
                      <th className="font-mono text-xs uppercase tracking-wider">Status</th>
                      <th className="font-mono text-xs uppercase tracking-wider text-center">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPOs.map((po) => {
                      const matchState = getMatchState(po);
                      return (
                        <tr
                          key={po.id}
                          className="cursor-pointer hover:bg-surface-alt"
                          onClick={() => openModal(po)}
                        >
                          <td className="font-mono text-xs font-semibold">{po.poNumber}</td>
                          <td className="font-mono text-xs opacity-80">{new Date(po.date).toLocaleDateString()}</td>
                          <td>{po.supplier?.name || '—'}</td>
                          <td>{po.department?.name || '—'}</td>
                          <td className="font-mono text-xs text-right"><Money value={po.totalAmount} /></td>
                          <td><Badge status={po.status}>{po.status}</Badge></td>
                          <td className="text-center">
                            {matchState === 'matched' ? (
                              <span className="badge badge-success badge-sm">✓ Matched</span>
                            ) : matchState === 'partial' ? (
                              <span className="badge badge-warning badge-sm">Partial</span>
                            ) : matchState === 'pending' ? (
                              <span className="badge badge-ghost badge-sm">Pending</span>
                            ) : (
                              <span className="badge badge-error badge-sm">Short</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {poMeta.totalPages > 1 && <Pagination meta={poMeta} onPage={setPoPage} />}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPO && (
        <Portal>
          <FormModal
            title={poDetail ? poDetail.poNumber : selectedPO.poNumber}
            formNo="Form No. LGU-IMS-PO-01"
            icon={FileText}
            tone="info"
            size="modal-xl"
            onClose={() => { setSelectedPO(null); setPODetail(null); setReceivings([]); }}
          >
            {loading ? (
              <div className="modal-body">
                <Spinner label="Loading PO details…" />
              </div>
            ) : (
              <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div className="modal-body">
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold font-mono">{poDetail.poNumber}</h3>
                      <p className="text-sm text-muted truncate">{poDetail.supplier?.name} · {poDetail.department?.name}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="font-mono font-semibold"><Money value={poDetail.totalAmount} /></div>
                      <div className="text-xs text-muted">{receivings.length} receiving(s)</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table table-sm" aria-label="3-way match table">
                      <thead>
                        <tr className="bg-surface-alt">
                          <th className="font-mono text-xs uppercase tracking-wider">Item / SKU</th>
                          <th className="font-mono text-xs uppercase tracking-wider text-right">PO Qty</th>
                          <th className="font-mono text-xs uppercase tracking-wider text-right">Received</th>
                          <th className="font-mono text-xs uppercase tracking-wider text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchedLines.length === 0 ? (
                          <tr><td colSpan="4" className="text-center text-sm text-muted py-6">No line items found.</td></tr>
                        ) : matchedLines.map((line, idx) => (
                          <tr key={idx} className={!line.matched && line.partial ? 'bg-warning/10' : !line.matched ? 'bg-error/10' : ''}>
                            <td>
                              <div className="font-medium">{line.item}</div>
                              <div className="text-xs opacity-60 font-mono">{line.sku}</div>
                            </td>
                            <td className="text-right font-mono">{line.poQty}</td>
                            <td className="text-right font-mono">{line.recQty}</td>
                            <td className="text-center">
                              {line.matched ? (
                                <span className="badge badge-success badge-sm">Matched</span>
                              ) : line.partial ? (
                                <span className="badge badge-warning badge-sm">Partial</span>
                              ) : (
                                <span className="badge badge-error badge-sm">Short</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divider">Invoice Verification</div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Invoice Number</legend>
                      <input className="input input-sm" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-0000" />
                    </fieldset>
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Invoice Amount (₱)</legend>
                      <input className="input input-sm" type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="0.00" />
                    </fieldset>
                    <div className="flex flex-col justify-end">
                      {invoiceAmt > 0 && (
                        invoiceMatch === true ? (
                          <div className="badge badge-success">Invoice matches PO amount</div>
                        ) : (
                          <div className="badge badge-error">
                            {invoiceAmt > poAmt ? 'Over' : 'Under'} by ₱{Math.abs(invoiceAmt - poAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="font-mono text-xs uppercase tracking-wider text-muted mb-2">Match Summary</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div className="p-3 rounded-lg bg-surface-alt">
                        <div className="text-xs text-muted">Items Matched</div>
                        <div className="font-mono font-semibold">{matchedLines.filter((l) => l.matched).length}/{matchedLines.length}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-alt">
                        <div className="text-xs text-muted">Quantity</div>
                        <div className={totalMatch ? 'text-success font-mono font-semibold' : 'text-error font-mono font-semibold'}>
                          {totalMatch ? 'All fulfilled' : 'Short on items'}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-alt">
                        <div className="text-xs text-muted">Invoice</div>
                        <div className={invoiceMatch === true ? 'text-success font-mono font-semibold' : invoiceMatch === null ? 'text-muted font-mono' : 'text-error font-mono font-semibold'}>
                          {invoiceMatch === true ? 'Matches PO amount' : invoiceMatch === null ? 'Not entered' : 'Amount mismatch'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn" onClick={() => setSelectedPO(null)}>
                    <X size={14} /> Close
                  </button>
                </div>
              </form>
            )}
          </FormModal>
        </Portal>
      )}
    </div>
  );
}

