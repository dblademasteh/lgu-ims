import { useEffect, useState } from 'react';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Spinner, Pagination } from '../components/ui';

export default function ReceivingPage() {
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF');
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [receivings, setReceivings] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', phone: '', email: '', address: '' });
  const [form, setForm] = useState({ supplierId: '', receivingNo: '', receiptDate: new Date().toISOString().slice(0,10), poNumber: '', drNumber: '', remarks: '', lines: [{ itemId: '', quantity: 1, unitCost: 0, remarks: '' }] });

  const load = async () => {
    setLoading(true);
    try {
      const [sup, itm, rec] = await Promise.all([
        api.get('/inventory/suppliers'),
        api.get('/items?limit=200&isActive=true'),
        api.get(`/inventory/receivings?page=${page}&limit=20`),
      ]);
      setSuppliers(sup.data.data);
      setItems(itm.data.data);
      setReceivings(rec.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to load.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [page]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/receivings', {
        supplierId: form.supplierId,
        receivingNo: form.receivingNo,
        receiptDate: form.receiptDate,
        poNumber: form.poNumber,
        drNumber: form.drNumber,
        remarks: form.remarks,
        items: form.lines.filter(l => l.itemId).map(l => ({ itemId: l.itemId, quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0, remarks: l.remarks })),
      });
      toast.success('Receiving recorded.');
      setOpen(false);
      setPage(1);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save.');
    }
  };

  const createSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/inventory/suppliers', supplierForm);
      toast.success('Supplier created.');
      setSupplierOpen(false);
      setSupplierForm({ name: '', contact: '', phone: '', email: '', address: '' });
      await load();
      setForm(f => ({ ...f, supplierId: res.data.data.id }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to create supplier.');
    }
  };

  return (
    <div>
      <PageHeader title="Receiving / Purchases" subtitle="Record stock receipts from suppliers" actions={
        <>
          {canManage && <button className="btn btn-outline" onClick={() => setSupplierOpen(true)}>Add Supplier</button>}
          {canManage && <button className="btn btn-primary" onClick={() => setOpen(true)}>New Receiving</button>}
        </>
      } />
      {loading ? <Spinner /> : (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Receiving No.</th><th>Supplier</th><th>Date</th><th>PO No.</th><th>Items</th><th></th></tr></thead>
              <tbody>
                {receivings.data?.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono">{r.receivingNo}</td>
                    <td>{r.supplier?.name}</td>
                    <td>{new Date(r.receiptDate).toLocaleDateString()}</td>
                    <td>{r.poNumber || '—'}</td>
                    <td>{r.items?.length || 0}</td>
                    <td className="text-right"><button className="btn btn-ghost btn-xs" onClick={() => window.print()}>Print</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination meta={{ page, limit: 20, total: receivings.meta?.total || 0, totalPages: receivings.meta?.totalPages || receivings.meta?.pages || 1 }} onPage={setPage} />
          </div>
        </div>
      )}
      {open && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg">New Receiving</h3>
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
              <fieldset className="fieldset"><legend className="fieldset-legend">PO No.</legend>
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
                <button className="btn btn-primary">Save Receiving</button>
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
                <button className="btn btn-primary">Create Supplier</button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setSupplierOpen(false)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}