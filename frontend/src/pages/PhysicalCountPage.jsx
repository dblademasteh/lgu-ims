import { useEffect, useState } from 'react';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Badge, EmptyState, Pagination, Spinner } from '../components/ui';

const COUNT_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function PhysicalCountsPage() {
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN');
  const canApprove = useCan('ADMIN', 'PROPERTY_CUSTODIAN');
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ departmentId: '', countDate: todayLocal(), remarks: '', lines: [{ itemId: '', countedQuantity: 1 }] });
  const [busy, setBusy] = useState(false);
  const [editCount, setEditCount] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const resetForm = () => setForm({ departmentId: '', countDate: todayLocal(), remarks: '', lines: [{ itemId: '', countedQuantity: 1 }] });

  const openEdit = async (pc) => {
    try {
      const res = await api.get(`/physical-counts/${pc.id}`);
      const c = res.data.data;
      setEditCount(c);
      setForm({
        departmentId: c.departmentId,
        countDate: String(c.countDate).slice(0, 10),
        remarks: c.remarks || '',
        lines: (c.items || []).map((it) => ({ itemId: it.itemId, countedQuantity: Number(it.countedQuantity) || 0 })),
      });
      setOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load count for editing.');
    }
  };

  const openDetail = async (pc) => {
    setDetailBusy(true);
    try {
      const res = await api.get(`/physical-counts/${pc.id}`);
      setDetail(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load count detail.');
    } finally {
      setDetailBusy(false);
    }
  };

  const load = () => {
    const q = new URLSearchParams({ page });
    if (status) q.set('status', status);
    api.get(`/physical-counts?${q}`).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load physical counts.'));
  };

  useEffect(load, [page, status]);
  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data.data)).catch(() => {});
    api.get('/items?limit=200&isActive=true').then((r) => setItems(r.data.data)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const itemsPayload = form.lines
      .filter((l) => l.itemId && Number(l.countedQuantity) > 0)
      .map((l) => {
        const it = items.find((i) => i.id === l.itemId);
        return { itemId: l.itemId, systemQuantity: it ? Number(it.currentStock) || 0 : 0, countedQuantity: Number(l.countedQuantity) || 0 };
      });
    if (itemsPayload.length === 0) {
      toast.error('Add at least one item to count.');
      return;
    }
    setBusy(true);
    try {
      if (editCount) {
        await api.patch(`/physical-counts/${editCount.id}`, { departmentId: form.departmentId, countDate: form.countDate, remarks: form.remarks, items: itemsPayload });
        toast.success('Physical count updated.');
      } else {
        await api.post('/physical-counts', { departmentId: form.departmentId, countDate: form.countDate, remarks: form.remarks, items: itemsPayload });
        toast.success('Physical count created.');
      }
      setOpen(false);
      setEditCount(null);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save physical count.');
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id, action) => {
    try {
      await api.post(`/physical-counts/${id}/${action}`);
      toast.success(`Physical count ${action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : 'rejected'}.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || `Unable to ${action} physical count.`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Physical Count"
        subtitle="COA inventory-taking worksheet with variance detection."
        actions={canManage && <button className="btn btn-primary" onClick={() => { setEditCount(null); resetForm(); setOpen(true); }}>New Count</button>}
      />
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <select className="select md:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {COUNT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {!data ? <Spinner label="Loading physical counts..." /> : data.data.length === 0 ? <EmptyState message="No physical counts found." /> : (
            <div className="overflow-x-auto">
              <table className="table table-sm" aria-label="Physical counts table">
                <thead><tr><th>Date</th><th>Department</th><th>Status</th><th>Remarks</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {data.data.map((pc) => (
                    <tr key={pc.id} className="hover">
                      <td className="whitespace-nowrap">{new Date(pc.countDate).toLocaleDateString()}</td>
                      <td>{pc.department?.name}</td>
                      <td><Badge status={pc.status}>{pc.status}</Badge></td>
                      <td className="text-xs opacity-70">{pc.remarks || '—'}</td>
                      <td className="text-right">
                        <button className="btn btn-ghost btn-xs" onClick={() => openDetail(pc)}>View</button>
                        {canManage && pc.status === 'DRAFT' && (
                          <button className="btn btn-ghost btn-xs" onClick={() => openEdit(pc)}>Edit</button>
                        )}
                        {canManage && ['DRAFT', 'REJECTED'].includes(pc.status) && (
                          <button className="btn btn-ghost btn-xs" onClick={() => updateStatus(pc.id, 'submit')}>{pc.status === 'REJECTED' ? 'Resubmit' : 'Submit'}</button>
                        )}
                        {canApprove && pc.status === 'SUBMITTED' && (
                          <>
                            <button className="btn btn-ghost btn-xs" onClick={() => updateStatus(pc.id, 'approve')}>Approve</button>
                            <button className="btn btn-ghost btn-xs text-error" onClick={() => updateStatus(pc.id, 'reject')}>Reject</button>
                          </>
                        )}
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
            <h3 className="font-bold text-lg">{editCount ? 'Edit Physical Count' : 'New Physical Count'}</h3>
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <fieldset className="fieldset"><legend className="fieldset-legend">Department *</legend>
                <select className="select" required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">Select...</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </fieldset>
              <fieldset className="fieldset"><legend className="fieldset-legend">Count Date</legend>
                <input type="date" className="input" value={form.countDate} onChange={(e) => setForm({ ...form, countDate: e.target.value })} />
              </fieldset>
              <fieldset className="fieldset sm:col-span-2"><legend className="fieldset-legend">Remarks</legend>
                <input className="input" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </fieldset>
              <div className="sm:col-span-2">
                <div className="font-semibold text-sm mb-2">Items to count</div>
                {form.lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_7rem_2rem] gap-2 mb-2 items-end">
                    <select className="select" required value={line.itemId} onChange={(e) => { const next = [...form.lines]; next[idx].itemId = e.target.value; setForm({ ...form, lines: next }); }}>
                      <option value="">Select item...</option>
                      {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.sku}) — on hand: {Number(i.currentStock) || 0} {i.unit}</option>)}
                    </select>
                    <input className="input" type="number" min="0" step="any" required placeholder="Counted qty" value={line.countedQuantity}
                      onChange={(e) => { const next = [...form.lines]; next[idx].countedQuantity = e.target.value; setForm({ ...form, lines: next }); }} />
                    {form.lines.length > 1 && (
                      <button type="button" className="btn btn-ghost btn-sm btn-square text-error" onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) })}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, lines: [...form.lines, { itemId: '', countedQuantity: 1 }] })}>Add item</button>
              </div>
              <div className="col-span-full modal-action">
                <button type="button" className="btn" onClick={() => { setOpen(false); setEditCount(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />}{editCount ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => { setOpen(false); setEditCount(null); }}>close</button></form>
        </dialog>
      )}

      {detail && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-lg">Physical Count Detail</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>✕</button>
            </div>
            {detailBusy ? <Spinner /> : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mt-4">
                  <div><span className="opacity-60">Department:</span> {detail.department?.name}</div>
                  <div><span className="opacity-60">Date:</span> {new Date(detail.countDate).toLocaleDateString()}</div>
                  <div><span className="opacity-60">Status:</span> <Badge status={detail.status}>{detail.status}</Badge></div>
                  <div className="col-span-full"><span className="opacity-60">Remarks:</span> {detail.remarks || '—'}</div>
                </div>
                <div className="overflow-x-auto mt-4">
                  <table className="table table-sm" aria-label="Physical count items table">
                    <thead><tr><th>Item</th><th className="text-right">System</th><th className="text-right">Counted</th><th className="text-right">Variance</th></tr></thead>
                    <tbody>
                      {detail.items?.map((it) => (
                        <tr key={it.id} className="hover">
                          <td>{it.item?.name} <span className="text-xs opacity-60">({it.item?.sku})</span></td>
                          <td className="text-right">{Number(it.systemQuantity).toLocaleString()}</td>
                          <td className="text-right">{Number(it.countedQuantity).toLocaleString()}</td>
                          <td className={`text-right ${Number(it.variance) > 0 ? 'text-success' : Number(it.variance) < 0 ? 'text-error' : 'opacity-40'}`}>
                            {Number(it.variance) > 0 ? '+' : ''}{Number(it.variance).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="modal-action">
              <button className="btn" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setDetail(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
