import { useEffect, useState } from 'react';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Badge, EmptyState, Pagination, Spinner } from '../components/ui';

const STATUS_BADGE = {
  PENDING: 'warning',
  APPROVED: 'info',
  RECEIVED: 'success',
  CANCELLED: 'error',
};

export default function PurchaseOrdersPage() {
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF');
  const canApprove = useCan('ADMIN', 'PROPERTY_CUSTODIAN', 'WAREHOUSE_STAFF');
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ departmentId: '', supplierId: '', date: new Date().toISOString().slice(0, 10), remarks: '', lines: [{ itemId: '', quantity: 1, unitCost: 0 }] });
  const [busy, setBusy] = useState(false);

  const load = () => {
    const q = new URLSearchParams({ page });
    if (status) q.set('status', status);
    if (search) q.set('search', search);
    api.get(`/purchase-orders?${q}`).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load purchase orders.'));
  };

  useEffect(load, [page, status]);
  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data.data)).catch(() => {});
    api.get('/inventory/suppliers').then((r) => setSuppliers(r.data.data)).catch(() => {});
    api.get('/items?limit=200&isActive=true').then((r) => setItems(r.data.data)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/purchase-orders', form);
      toast.success('Purchase order created.');
      setOpen(false);
      setForm({ departmentId: '', supplierId: '', date: new Date().toISOString().slice(0, 10), remarks: '', lines: [{ itemId: '', quantity: 1, unitCost: 0 }] });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to create purchase order.');
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

  const cancel = async (id) => {
    if (!window.confirm('Cancel this purchase order? This cannot be undone.')) return;
    try {
      await api.patch(`/purchase-orders/${id}/cancel`);
      toast.success('Purchase order cancelled.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to cancel purchase order.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Create and manage purchase orders for procurement."
        actions={canManage && <button className="btn btn-primary" onClick={() => setOpen(true)}>New Purchase Order</button>}
      />
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <label className="input flex-1 md:max-w-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="search" className="flex-1" placeholder="Search PO number..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </label>
            <select className="select md:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {Object.keys(STATUS_BADGE).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {!data ? <Spinner label="Loading purchase orders..." /> : data.data.length === 0 ? <EmptyState message="No purchase orders found." /> : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>PO No.</th><th>Date</th><th>Department</th><th>Supplier</th><th>Amount</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {data.data.map((po) => (
                    <tr key={po.id} className="hover">
                      <td className="font-mono text-xs font-semibold">{po.poNumber}</td>
                      <td className="whitespace-nowrap">{new Date(po.date).toLocaleDateString()}</td>
                      <td>{po.department?.name}</td>
                      <td>{po.supplier?.name}</td>
                      <td className="font-mono text-xs">₱{Number(po.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td><Badge status={STATUS_BADGE[po.status] || 'neutral'}>{po.status}</Badge></td>
                      <td className="text-right">
                        {canApprove && po.status === 'PENDING' && <button className="btn btn-ghost btn-xs" onClick={() => approve(po.id)}>Approve</button>}
                        {canManage && ['PENDING', 'APPROVED'].includes(po.status) && <button className="btn btn-ghost btn-xs text-error" onClick={() => cancel(po.id)}>Cancel</button>}
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
            <h3 className="font-bold text-lg">New Purchase Order</h3>
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
                <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />}Create</button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setOpen(false)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
