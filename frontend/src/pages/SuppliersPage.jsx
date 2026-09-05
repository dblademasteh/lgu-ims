import { useEffect, useState } from 'react';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Spinner } from '../components/ui';

export default function SuppliersPage() {
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', address: '' });

  const load = () => {
    setLoading(true);
    api.get('/inventory/suppliers').then((r) => setData(r.data.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load suppliers.')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/inventory/suppliers/${editing.id}`, form);
        toast.success('Supplier updated.');
      } else {
        await api.post('/inventory/suppliers', form);
        toast.success('Supplier created.');
      }
      setOpen(false);
      setEditing(null);
      setForm({ name: '', contact: '', phone: '', email: '', address: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save supplier.');
    }
  };

  const deactivate = async (s) => {
    if (!window.confirm(`Deactivate supplier "${s.name}"?`)) return;
    try {
      await api.patch(`/inventory/suppliers/${s.id}/deactivate`);
      toast.success('Supplier deactivated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to deactivate supplier.');
    }
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, contact: s.contact || '', phone: s.phone || '', email: s.email || '', address: s.address || '' });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Manage supplier records for receiving and procurement." actions={
        canManage && <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', contact: '', phone: '', email: '', address: '' }); setOpen(true); }}>Add Supplier</button>
      } />
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          {loading ? <Spinner /> : data.length === 0 ? <EmptyState message="No suppliers yet." /> : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {data.map((s) => (
                    <tr key={s.id} className="hover">
                      <td className="font-medium">{s.name}</td>
                      <td>{s.contact || '—'}</td>
                      <td>{s.phone || '—'}</td>
                      <td>{s.email || '—'}</td>
                      <td className="max-w-64 truncate">{s.address || '—'}</td>
                      <td className="text-right">
                        {canManage && <button className="btn btn-ghost btn-xs" onClick={() => openEdit(s)}>Edit</button>}
                        {canManage && <button className="btn btn-ghost btn-xs text-error" onClick={() => deactivate(s)}>Deactivate</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {open && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg">{editing ? 'Edit supplier' : 'Add supplier'}</h3>
            <form onSubmit={submit} className="grid grid-cols-1 gap-4 mt-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Name *</legend>
                <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Contact person</legend>
                <input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
              </fieldset>
              <div className="grid grid-cols-2 gap-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Phone</legend>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Email</legend>
                  <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </fieldset>
              </div>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Address</legend>
                <textarea className="textarea" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </fieldset>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Save changes' : 'Create'}</button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => { setOpen(false); setEditing(null); }}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
