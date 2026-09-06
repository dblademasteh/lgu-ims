import { useEffect, useState } from 'react';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Spinner, Pagination } from '../components/ui';

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ReceivingPage() {
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF');
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [receivings, setReceivings] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poId, setPoId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', phone: '', email: '', address: '' });
  const [form, setForm] = useState({ supplierId: '', receivingNo: '', receiptDate: todayLocal(), poNumber: '', drNumber: '', remarks: '', purchaseOrderId: '', lines: [{ itemId: '', quantity: 1, unitCost: 0, remarks: '' }] });
  const [printRec, setPrintRec] = useState(null);
  const [editRec, setEditRec] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [detailRec, setDetailRec] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [supplierBusy, setSupplierBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) q.set('search', search);
      const [sup, itm, rec, po] = await Promise.all([
        api.get('/inventory/suppliers'),
        api.get('/items?limit=200&isActive=true'),
        api.get(`/inventory/receivings?${q}`),
        api.get('/purchase-orders?limit=200'),
      ]);
      setSuppliers(sup.data.data);
      setItems(itm.data.data);
      setReceivings(rec.data);
      setPurchaseOrders(po.data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to load.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [page, search]);

  useEffect(() => {
    if (printRec) {
      window.print();
    }
  }, [printRec]);

  const submit = async (e) => {
    e.preventDefault();
    const valid = form.lines.filter(l => l.itemId && Number(l.quantity) > 0);
    if (!form.supplierId) { toast.error('Select a supplier.'); return; }
    if (valid.length === 0) { toast.error('Add at least one line with a quantity greater than zero.'); return; }
    setBusy(true);
    try {
      await api.post('/inventory/receivings', {
        supplierId: form.supplierId,
        receivingNo: form.receivingNo,
        receiptDate: form.receiptDate,
        poNumber: form.poNumber,
        drNumber: form.drNumber,
        remarks: form.remarks,
        purchaseOrderId: form.purchaseOrderId || undefined,
        items: valid.map(l => ({ itemId: l.itemId, quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0, remarks: l.remarks })),
      });
      toast.success('Receiving recorded.');
      setOpen(false);
      setPoId('');
      setPage(1);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save.');
    } finally {
      setBusy(false);
    }
  };

  const createSupplier = async (e) => {
    e.preventDefault();
    setSupplierBusy(true);
    try {
      const res = await api.post('/inventory/suppliers', supplierForm);
      toast.success('Supplier created.');
      setSupplierOpen(false);
      setSupplierForm({ name: '', contact: '', phone: '', email: '', address: '' });
      await load();
      setForm(f => ({ ...f, supplierId: res.data.data.id }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to create supplier.');
    } finally {
      setSupplierBusy(false);
    }
  };

  const selectPo = (id) => {
    const po = purchaseOrders.find((p) => p.id === id);
    if (!po) {
      setPoId('');
      return;
    }
    const remainingLines = (po.items || [])
      .filter((pi) => pi.item && pi.quantity > (pi.receivedQuantity || 0))
      .map((pi) => ({
        itemId: pi.itemId,
        quantity: Number((pi.quantity - (pi.receivedQuantity || 0)).toFixed(2)),
        unitCost: Number(pi.unitCost) || 0,
        remarks: `PO ${po.poNumber}`,
      }));
    setPoId(po.id);
    setForm((f) => ({
      ...f,
      purchaseOrderId: po.id,
      supplierId: f.supplierId || po.supplierId,
      poNumber: po.poNumber,
      lines: remainingLines.length > 0 ? remainingLines : f.lines,
    }));
  };

  const openEdit = async (r) => {
    const res = await api.get(`/inventory/receivings/${r.id}`);
    const rec = res.data.data;
    setEditRec(rec);
    setPoId(rec.purchaseOrderId || '');
    setForm({
      supplierId: rec.supplierId,
      receivingNo: rec.receivingNo,
      receiptDate: String(rec.receiptDate).slice(0,10),
      poNumber: rec.poNumber || '',
      drNumber: rec.drNumber || '',
      remarks: rec.remarks || '',
      purchaseOrderId: rec.purchaseOrderId || '',
      lines: rec.items.map(ri => ({ itemId: ri.itemId, quantity: Number(ri.quantity), unitCost: Number(ri.unitCost) || 0, remarks: ri.remarks || '' })),
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editRec) return;
    setBusy(true);
    try {
      await api.patch(`/inventory/receivings/${editRec.id}`, {
        supplierId: form.supplierId,
        receivingNo: form.receivingNo,
        receiptDate: form.receiptDate,
        poNumber: form.poNumber,
        drNumber: form.drNumber,
        remarks: form.remarks,
        purchaseOrderId: form.purchaseOrderId || undefined,
        items: form.lines.filter(l => l.itemId).map(l => ({ itemId: l.itemId, quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0, remarks: l.remarks })),
      });
      toast.success('Receiving updated.');
      setEditRec(null);
      setOpen(false);
      setPoId('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to update receiving.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/inventory/receivings/${deleteId}`);
      toast.success('Receiving deleted and stock reversed.');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete receiving.');
    }
  };

  return (
    <div>
      <PageHeader title="Receiving / Purchases" subtitle="Record stock receipts from suppliers" actions={
        <>
          {canManage && (
            <button className="btn btn-outline btn-sm gap-2" onClick={() => setSupplierOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Add Supplier
            </button>
          )}
          {canManage && (
            <button className="btn btn-primary btn-sm gap-2" onClick={() => { setEditRec(null); setPoId(''); setForm({ supplierId: '', receivingNo: '', receiptDate: todayLocal(), poNumber: '', drNumber: '', remarks: '', purchaseOrderId: '', lines: [{ itemId: '', quantity: 1, unitCost: 0, remarks: '' }] }); setOpen(true); }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              New Receiving
            </button>
          )}
        </>
      } />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat bg-base-100 shadow-sm border border-base-200">
          <div className="stat-title">Total Receipts</div>
          <div className="stat-value text-primary">{receivings.data?.length || 0}</div>
          <div className="stat-desc">Current page</div>
        </div>
        <div className="stat bg-base-100 shadow-sm border border-base-200">
          <div className="stat-title">Total Items Received</div>
          <div className="stat-value text-secondary">
            {receivings.data?.reduce((acc, r) => acc + (r.items?.length || 0), 0)}
          </div>
          <div className="stat-desc">Sum of items across receipts</div>
        </div>
        <div className="stat bg-base-100 shadow-sm border border-base-200">
          <div className="stat-title">Active Suppliers</div>
          <div className="stat-value text-accent">{suppliers.length}</div>
          <div className="stat-desc">Registered vendors</div>
        </div>
        <div className="stat bg-base-100 shadow-sm border border-base-200">
          <div className="stat-title">Pending POs</div>
          <div className="stat-value text-warning">
            {purchaseOrders.filter(p => ['PENDING', 'APPROVED'].includes(p.status)).length}
          </div>
          <div className="stat-desc">Awaiting receipt</div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-4">
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1 md:max-w-xs">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-base-content/40">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <input 
                type="search" 
                className="input input-bordered w-full pl-10" 
                placeholder="Search receiving no, PO, supplier..." 
                value={search} 
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
              />
            </div>
          </div>

          {loading ? <Spinner /> : (
            <div className="overflow-x-auto">
              <table className="table table-zebra table-sm" aria-label="Receiving records table">
                <thead>
                  <tr className="bg-base-200/50">
                    <th className="font-semibold">Receiving No.</th>
                    <th className="font-semibold">Supplier</th>
                    <th className="font-semibold">Date</th>
                    <th className="font-semibold">PO No.</th>
                    <th className="font-semibold text-center">Items</th>
                    <th className="font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {receivings.data?.map(r => (
                    <tr key={r.id} className="hover:bg-base-200/30 transition-colors">
                      <td className="font-mono font-medium">{r.receivingNo}</td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium">{r.supplier?.name}</span>
                        </div>
                      </td>
                      <td className="opacity-80">{new Date(r.receiptDate).toLocaleDateString()}</td>
                      <td>
                        {r.poNumber ? (
                          <span className="badge badge-ghost badge-sm font-mono">{r.poNumber}</span>
                        ) : '—'}
                      </td>
                      <td className="text-center">
                        <span className="badge badge-outline badge-sm">{r.items?.length || 0}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button className="btn btn-ghost btn-xs gap-1" onClick={async () => { const res = await api.get(`/inventory/receivings/${r.id}`); setDetailRec(res.data.data); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                          </button>
                          <button className="btn btn-ghost btn-xs gap-1" onClick={async () => { const res = await api.get(`/inventory/receivings/${r.id}`); setPrintRec(res.data.data); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                            Print
                          </button>
                          {canManage && (
                            <button className="btn btn-ghost btn-xs text-error gap-1" onClick={() => setDeleteId(r.id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4">
                <Pagination meta={{ page, limit: 20, total: receivings.meta?.total || 0, totalPages: receivings.meta?.totalPages || receivings.meta?.pages || 1 }} onPage={setPage} />
              </div>
            </div>
          )}
        </div>
      </div>
      {open && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg">{editRec ? 'Edit Receiving' : 'New Receiving'}</h3>
            <form onSubmit={editRec ? submitEdit : submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <fieldset className="fieldset"><legend className="fieldset-legend">Supplier *</legend>
                <select className="select" required value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})}>
                  <option value="">Select...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </fieldset>
              <fieldset className="fieldset"><legend className="fieldset-legend">Receiving No. *</legend>
                <input className="input" required value={form.receivingNo} onChange={e => setForm({...form, receivingNo: e.target.value})} />
              </fieldset>
              <fieldset className="fieldset"><legend className="fieldset-legend">Receipt Date *</legend>
                <input className="input" type="date" required value={form.receiptDate} onChange={e => setForm({...form, receiptDate: e.target.value})} />
              </fieldset>
              <fieldset className="fieldset"><legend className="fieldset-legend">Purchase Order (optional link)</legend>
                <select className="select" value={poId} onChange={(e) => selectPo(e.target.value)}>
                  <option value="">Standalone (no PO link)</option>
                  {purchaseOrders.filter(p => ['PENDING', 'APPROVED'].includes(p.status) && (p.items || []).some(pi => pi.quantity > (pi.receivedQuantity || 0))).map(p => {
                    const remaining = (p.items || []).reduce((s, pi) => s + (pi.quantity - (pi.receivedQuantity || 0)), 0);
                    return <option key={p.id} value={p.id}>{p.poNumber} — {p.supplier?.name} (remaining {Number(remaining.toFixed(2))})</option>;
                  })}
                </select>
              </fieldset>
              <fieldset className="fieldset"><legend className="fieldset-legend">PO No. (manual)</legend>
                <input className="input" value={form.poNumber} onChange={e => setForm({...form, poNumber: e.target.value})} />
              </fieldset>
              <fieldset className="fieldset sm:col-span-2"><legend className="fieldset-legend">DR No.</legend>
                <input className="input" value={form.drNumber} onChange={e => setForm({...form, drNumber: e.target.value})} />
              </fieldset>
              <fieldset className="fieldset sm:col-span-2"><legend className="fieldset-legend">Remarks</legend>
                <textarea className="textarea" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
              </fieldset>
              <div className="sm:col-span-2">
                <div className="font-semibold mb-2">Items</div>
                {form.lines.map((ln, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                    <select className="select col-span-6" value={ln.itemId} onChange={e => { const next = [...form.lines]; next[idx].itemId = e.target.value; setForm({...form, lines: next}); }}>
                      <option value="">Select item</option>
                      {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.sku})</option>)}
                    </select>
                    <input className="input col-span-2" type="number" min="0" step="any" value={ln.quantity} onChange={e => { const next = [...form.lines]; next[idx].quantity = e.target.value; setForm({...form, lines: next}); }} />
                    <input className="input col-span-2" type="number" min="0" step="0.01" value={ln.unitCost} onChange={e => { const next = [...form.lines]; next[idx].unitCost = e.target.value; setForm({...form, lines: next}); }} placeholder="Unit cost" />
                    <button type="button" className="btn btn-ghost btn-sm col-span-2" onClick={() => { const next = form.lines.filter((_, i) => i !== idx); setForm({...form, lines: next}); }}>Remove</button>
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({...form, lines: [...form.lines, { itemId: '', quantity: 1, unitCost: 0, remarks: '' }]})}>Add line</button>
              </div>
              <div className="modal-action col-span-full">
                <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />}Save Receiving</button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setOpen(false)}>close</button></form>
        </dialog>
      )}
      {supplierOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg">New Supplier</h3>
            <form onSubmit={createSupplier} className="grid grid-cols-1 gap-4 mt-4">
              <fieldset className="fieldset"><legend className="fieldset-legend">Name *</legend>
                <input className="input" required value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} />
              </fieldset>
              <fieldset className="fieldset"><legend className="fieldset-legend">Contact person</legend>
                <input className="input" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} />
              </fieldset>
              <div className="grid grid-cols-2 gap-4">
                <fieldset className="fieldset"><legend className="fieldset-legend">Phone</legend>
                  <input className="input" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} />
                </fieldset>
                <fieldset className="fieldset"><legend className="fieldset-legend">Email</legend>
                  <input className="input" type="email" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} />
                </fieldset>
              </div>
              <fieldset className="fieldset"><legend className="fieldset-legend">Address</legend>
                <textarea className="textarea" value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} />
              </fieldset>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setSupplierOpen(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={supplierBusy}>{supplierBusy && <span className="loading loading-spinner loading-xs" />}Create Supplier</button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setSupplierOpen(false)}>close</button></form>
        </dialog>
      )}

      {printRec && (
        <div className="print-area">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-lg font-bold uppercase tracking-wide">Receiving / Purchase Record</div>
              <div className="text-sm text-base-content/60">Property &amp; Supply Office · On-premises</div>
            </div>
            <div className="text-right text-sm">
              <div className="font-mono text-xs uppercase tracking-wider opacity-70">Receiving No.</div>
              <div className="font-bold font-mono">{printRec.receivingNo}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div><span className="opacity-60">Supplier:</span> <span className="font-semibold">{printRec.supplier?.name}</span></div>
            <div><span className="opacity-60">Date:</span> {new Date(printRec.receiptDate).toLocaleDateString()}</div>
            <div><span className="opacity-60">PO No.:</span> {printRec.poNumber || '—'}</div>
            <div><span className="opacity-60">DR No.:</span> {printRec.drNumber || '—'}</div>
          </div>

          {printRec.remarks && <p className="text-sm mb-4"><span className="opacity-60">Remarks:</span> {printRec.remarks}</p>}

          <table className="table table-sm mb-6" aria-label="Receiving record items table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>SKU</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit Cost</th>
                <th className="text-right">Amount</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {printRec.items?.map((ri, idx) => (
                <tr key={ri.id}>
                  <td>{idx + 1}</td>
                  <td>{ri.item?.name}</td>
                  <td className="font-mono text-xs">{ri.item?.sku}</td>
                  <td className="text-right">{Number(ri.quantity).toLocaleString()}</td>
                  <td className="text-right">₱{Number(ri.unitCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="text-right">₱{(Number(ri.quantity) * Number(ri.unitCost || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="text-xs opacity-70">{ri.remarks || ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan="5" className="text-right">Total</th>
                <th className="text-right">
                  ₱{printRec.items?.reduce((s, ri) => s + Number(ri.quantity) * Number(ri.unitCost || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </th>
                <th />
              </tr>
            </tfoot>
          </table>

          <div className="grid grid-cols-2 gap-8 mt-8">
            <div className="border-t border-base-300 pt-2 text-xs text-center opacity-70">Received by / Warehouse Staff</div>
            <div className="border-t border-base-300 pt-2 text-xs text-center opacity-70">Noted by / Property Custodian</div>
          </div>

          <div className="mt-8 text-center">
            <button className="btn btn-primary no-print" onClick={() => setPrintRec(null)}>Close</button>
          </div>
        </div>
      )}

      {detailRec && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-lg">Receiving Detail</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetailRec(null)}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mt-4">
              <div><span className="opacity-60">Receiving No.:</span> <span className="font-mono font-semibold">{detailRec.receivingNo}</span></div>
              <div><span className="opacity-60">Supplier:</span> {detailRec.supplier?.name}</div>
              <div><span className="opacity-60">Date:</span> {new Date(detailRec.receiptDate).toLocaleDateString()}</div>
              <div><span className="opacity-60">PO No.:</span> {detailRec.poNumber || '—'}</div>
              <div><span className="opacity-60">DR No.:</span> {detailRec.drNumber || '—'}</div>
              <div><span className="opacity-60">Remarks:</span> {detailRec.remarks || '—'}</div>
            </div>
            <div className="mt-4">
              <table className="table table-sm" aria-label="Receiving records table">
                <thead><tr><th>Item</th><th>SKU</th><th className="text-right">Qty</th><th className="text-right">Unit Cost</th></tr></thead>
                <tbody>
                  {detailRec.items?.map(ri => (
                    <tr key={ri.id}>
                      <td>{ri.item?.name}</td>
                      <td className="font-mono text-xs">{ri.item?.sku}</td>
                      <td className="text-right">{Number(ri.quantity).toLocaleString()}</td>
                      <td className="text-right">₱{Number(ri.unitCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setDetailRec(null)}>Close</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setDetailRec(null)}>close</button></form>
        </dialog>
      )}

      {deleteId && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Delete receiving</h3>
            <p className="text-sm text-base-content/60 mt-1">This will reverse all stock movements. This cannot be undone.</p>
            <div className="modal-action">
              <button className="btn" onClick={() => setDeleteId(null)}>Cancel</button>
               <button className="btn btn-error" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setDeleteId(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}