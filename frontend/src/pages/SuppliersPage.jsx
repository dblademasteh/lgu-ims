import { useEffect, useState } from 'react';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Spinner } from '../components/ui';

export default function SuppliersPage() {
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/inventory/suppliers').then((r) => setData(r.data.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load suppliers.')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!confirm) return;
    const s = confirm;
    setConfirm(null);
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
      <PageHeader title="Suppliers" subtitle="Manage supplier records for receiving and procurement."       actions={
        canManage && (
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={() => setImportOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Import CSV
            </button>
            <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', contact: '', phone: '', email: '', address: '' }); setOpen(true); }}>Add Supplier</button>
          </div>
        )
      } />
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          {loading ? <Spinner /> : data.length === 0 ? <EmptyState message="No suppliers yet." /> : (
            <div className="overflow-x-auto">
              <table className="table table-sm" aria-label="Suppliers table">
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
                        {canManage && <button className="btn btn-ghost btn-xs text-error" onClick={() => setConfirm(s)}>Deactivate</button>}
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
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />}{editing ? 'Save changes' : 'Create'}</button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => { setOpen(false); setEditing(null); }}>close</button></form>
        </dialog>
      )}
      {importOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg">Import Suppliers from CSV</h3>
            <p className="text-sm text-base-content/60 mt-1">Upload a CSV with columns: name, contact, phone, email, address, isActive. Existing suppliers (by name or email) will be updated.</p>
            <ImportSuppliersForm onClose={() => setImportOpen(false)} onImported={load} />
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setImportOpen(false)}>close</button></form>
        </dialog>
      )}

      {confirm && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg">Deactivate supplier</h3>
            <p className="text-sm text-base-content/60 mt-2">Deactivate "{confirm.name}"? The supplier will no longer appear in lists but existing records are preserved.</p>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className="btn btn-error" onClick={deactivate}>Deactivate</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setConfirm(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}

function ImportSuppliersForm({ onClose, onImported }) {
  const toast = useToast();
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!csv.trim()) { toast.error('CSV content is required.'); return; }
    setBusy(true);
    try {
      const res = await api.post('/inventory/suppliers/import', { csv });
      toast.success(res.data.message);
      onImported();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const sampleCSV = 'name,contact,phone,email,address,isActive\nABC Supplies Corp.,Juan Dela Cruz,0917-123-4567,abc@supplies.ph,123 Manila St, true\nXYZ Trading,Maria Santos,0918-765-4321,xyz@trading.ph,456 QC Ave,true';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
      <fieldset className="fieldset">
        <legend className="fieldset-legend">CSV content</legend>
        <textarea className="textarea font-mono text-xs" rows={10} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={sampleCSV} />
      </fieldset>
      <div className="modal-action">
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && <span className="loading loading-spinner loading-xs" />}
          Import
        </button>
      </div>
    </form>
  );
}
