import { useEffect, useState } from 'react';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Badge, EmptyState, Pagination, Spinner } from '../components/ui';

const STATUS_BADGE = {
  DRAFT: 'neutral',
  SUBMITTED: 'warning',
  APPROVED: 'success',
};

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
  const [form, setForm] = useState({ departmentId: '', countDate: new Date().toISOString().slice(0, 10), remarks: '', lines: [] });
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    try {
      await api.post('/physical-counts', form);
      toast.success('Physical count created.');
      setOpen(false);
      setForm({ departmentId: '', countDate: new Date().toISOString().slice(0, 10), remarks: '', lines: [] });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to create physical count.');
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id, action) => {
    try {
      await api.post(`/physical-counts/${id}/${action}`);
      toast.success(`Physical count ${action}d.`);
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
        actions={canManage && <button className="btn btn-primary" onClick={() => setOpen(true)}>New Count</button>}
      />
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <select className="select md:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {Object.keys(STATUS_BADGE).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {!data ? <Spinner label="Loading physical counts..." /> : data.data.length === 0 ? <EmptyState message="No physical counts found." /> : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>Date</th><th>Department</th><th>Status</th><th>Remarks</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {data.data.map((pc) => (
                    <tr key={pc.id} className="hover">
                      <td className="whitespace-nowrap">{new Date(pc.countDate).toLocaleDateString()}</td>
                      <td>{pc.department?.name}</td>
                      <td><Badge status={STATUS_BADGE[pc.status] || 'neutral'}>{pc.status}</Badge></td>
                      <td className="text-xs opacity-70">{pc.remarks || '—'}</td>
                      <td className="text-right">
                        {canApprove && pc.status === 'SUBMITTED' && <button className="btn btn-ghost btn-xs" onClick={() => updateStatus(pc.id, 'approve')}>Approve</button>}
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
            <h3 className="font-bold text-lg">New Physical Count</h3>
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
