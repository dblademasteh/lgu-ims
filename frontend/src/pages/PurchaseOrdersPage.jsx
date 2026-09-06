import { useEffect, useState } from 'react';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Badge, EmptyState, Pagination, Spinner } from '../components/ui';

const PO_STATUSES = ['PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'];

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
        <button role="tab" aria-selected={tab === 'list'} className={`tab ${tab === 'list' ? 'tab-active' : ''}`} onClick={() => setTab('list')}>Purchase Orders</button>
        <button role="tab" aria-selected={tab === 'match'} className={`tab ${tab === 'match' ? 'tab-active' : ''}`} onClick={() => setTab('match')}>3-Way Match</button>
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

  return (
    <div>
      <div className="flex justify-end mb-2">
        {canManage && <button className="btn btn-primary btn-sm" onClick={() => { setEditPo(null); resetForm(); setOpen(true); }}>New Purchase Order</button>}
      </div>
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <label className="input flex-1 md:max-w-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
              <input type="search" className="flex-1" placeholder="Search PO number..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </label>
            <select className="select md:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {PO_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {!data ? <Spinner label="Loading purchase orders..." /> : data.data.length === 0 ? <EmptyState message="No purchase orders found." /> : (
            <div className="overflow-x-auto">
              <table className="table table-sm" aria-label="Purchase orders table">
                <thead><tr><th>PO No.</th><th>Date</th><th>Department</th><th>Supplier</th><th>Amount</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {data.data.map((po) => (
                    <tr key={po.id} className="hover">
                      <td className="font-mono text-xs font-semibold">{po.poNumber}</td>
                      <td className="whitespace-nowrap">{new Date(po.date).toLocaleDateString()}</td>
                      <td>{po.department?.name}</td>
                      <td>{po.supplier?.name}</td>
                      <td className="font-mono text-xs">₱{Number(po.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td><Badge status={po.status}>{po.status}</Badge></td>
                      <td className="text-right">
                        {canApprove && po.status === 'PENDING' && <button className="btn btn-ghost btn-xs" onClick={() => approve(po.id)}>Approve</button>}
                        {canManage && po.status === 'PENDING' && <button className="btn btn-ghost btn-xs" onClick={() => openEdit(po)}>Edit</button>}
                        {canManage && ['PENDING', 'APPROVED'].includes(po.status) && <button className="btn btn-ghost btn-xs text-error" onClick={() => setCancelTarget(po.id)}>Cancel</button>}
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
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg">{editPo ? `Edit ${editPo.poNumber}` : 'New Purchase Order'}</h3>
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <fieldset className="fieldset"><legend className="fieldset-legend">Department *</legend>
                <select className="select" required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">Select...</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </fieldset>
              <fieldset className="fieldset"><legend className="fieldset-legend">Supplier *</legend>
                <select className="select" required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">Select...</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </fieldset>
              <fieldset className="fieldset"><legend className="fieldset-legend">Date</legend>
                <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </fieldset>
              <fieldset className="fieldset"><legend className="fieldset-legend">Remarks</legend>
                <input className="input" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </fieldset>
              <div className="col-span-full">
                <div className="font-semibold text-sm mb-2">Items</div>
                {form.lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
                    <select className="select" required value={line.itemId} onChange={(e) => { const l = [...form.lines]; l[idx].itemId = e.target.value; setForm({ ...form, lines: l }); }}>
                      <option value="">Select item...</option>
                      {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                    </select>
                    <input type="number" className="input" placeholder="Qty" required min="0.01" step="0.01" value={line.quantity} onChange={(e) => { const l = [...form.lines]; l[idx].quantity = Number(e.target.value); setForm({ ...form, lines: l }); }} />
                    <input type="number" className="input" placeholder="Unit Cost" required min="0" step="0.01" value={line.unitCost} onChange={(e) => { const l = [...form.lines]; l[idx].unitCost = Number(e.target.value); setForm({ ...form, lines: l }); }} />
                    {form.lines.length > 1 && <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) })}>Remove</button>}
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, lines: [...form.lines, { itemId: '', quantity: 1, unitCost: 0 }] })}>Add line</button>
              </div>
              <div className="col-span-full modal-action">
                <button type="button" className="btn" onClick={() => { setOpen(false); setEditPo(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />}{editPo ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => { setOpen(false); setEditPo(null); }}>close</button></form>
        </dialog>
      )}

      {cancelTarget && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Cancel purchase order</h3>
            <p className="mt-2">Cancel this purchase order? This cannot be undone.</p>
            <div className="modal-action">
              <button className="btn" onClick={() => setCancelTarget(null)}>Cancel</button>
              <button className="btn btn-error" onClick={cancel}>Confirm cancel</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setCancelTarget(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}

function ThreeWayMatch() {
  const toast = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poDetail, setPODetail] = useState(null);
  const [receivings, setReceivings] = useState([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/purchase-orders?limit=100').then((r) => setPurchaseOrders(r.data.data)).catch(() => {});
  }, []);

  const selectPO = async (po) => {
    setSelectedPO(po);
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

  const poLines = poDetail?.items || [];
  const recLines = receivings.flatMap((r) => r.items || []);

  const matchedLines = poLines.map((poLine) => {
    const recQty = recLines.filter((r) => r.itemId === poLine.itemId).reduce((sum, r) => sum + r.quantity, 0);
    const poQty = poLine.quantity;
    const match = Math.min(recQty, poQty);
    return {
      item: poLine.item?.name || poLine.itemId,
      sku: poLine.item?.sku || '—',
      poQty,
      recQty,
      match,
      matched: recQty >= poQty,
      partial: recQty > 0 && recQty < poQty,
    };
  });

  const invoiceAmt = Number(invoiceAmount) || 0;
  const poAmt = Number(poDetail?.totalAmount) || 0;
  const totalMatch = matchedLines.every((l) => l.matched);
  const invoiceMatch = invoiceAmt > 0 ? Math.abs(invoiceAmt - poAmt) < 0.01 : null;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="w-full lg:w-72 shrink-0">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-0">
            <div className="p-3 font-semibold text-sm border-b border-base-200">Select Purchase Order</div>
            <div className="overflow-y-auto max-h-96">
              {purchaseOrders.filter((po) => po.status !== 'CANCELLED').length === 0 ? (
                <div className="p-4 text-sm text-center text-base-content/40">No purchase orders found.</div>
              ) : purchaseOrders.filter((po) => po.status !== 'CANCELLED').map((po) => (
                <button
                  key={po.id}
                  className={`w-full text-left px-3 py-2 border-b border-base-200 hover:bg-base-200 ${selectedPO?.id === po.id ? 'bg-primary/10' : ''}`}
                  onClick={() => selectPO(po)}
                >
                  <div className="font-mono text-xs font-semibold">{po.poNumber}</div>
                  <div className="text-xs text-base-content/60">{po.supplier?.name} · {po.department?.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`badge badge-xs ${po.status === 'RECEIVED' ? 'badge-success' : po.status === 'APPROVED' ? 'badge-info' : 'badge-warning'}`}>{po.status}</span>
                    <span className="text-xs">₱{Number(po.totalAmount || 0).toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1">
        {!selectedPO ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body text-center py-12 text-base-content/40">
              Select a purchase order to review 3-way matching.
            </div>
          </div>
        ) : loading ? (
          <Spinner label="Loading PO details..." />
        ) : (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold">{poDetail.poNumber}</h3>
                  <p className="text-sm text-base-content/60">{poDetail.supplier?.name} · {poDetail.department?.name}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold">₱{Number(poDetail.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  <div className="text-xs text-base-content/60">{receivings.length} receiving(s)</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table table-sm" aria-label="Purchase orders table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="text-right">PO Qty</th>
                      <th className="text-right">Received</th>
                      <th className="text-center">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedLines.map((line, idx) => (
                      <tr key={idx} className={line.matched ? '' : line.partial ? 'bg-warning/10' : 'bg-error/10'}>
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

              <div className="mt-4 p-3 rounded-lg bg-base-200">
                <div className="font-semibold text-sm mb-2">Match Summary</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-base-content/60">Items</div>
                    <div>{matchedLines.filter((l) => l.matched).length}/{matchedLines.length} matched</div>
                  </div>
                  <div>
                    <div className="text-xs text-base-content/60">Quantity</div>
                    <div className={totalMatch ? 'text-success' : 'text-error'}>{totalMatch ? 'All lines fulfilled' : 'Short on some items'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-base-content/60">Invoice</div>
                    <div className={invoiceMatch === true ? 'text-success' : invoiceMatch === null ? 'text-base-content/40' : 'text-error'}>
                      {invoiceMatch === true ? 'Matches PO amount' : invoiceMatch === null ? 'Not entered' : 'Amount mismatch'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
