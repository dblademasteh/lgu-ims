import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, UploadCloud, UserPlus, SquarePen, Ban, Save, Building2, User, Phone, Mail, MapPin, Search, Download } from 'lucide-react';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Badge, EmptyState, FormModal, Money, Pagination, Spinner } from '../components/ui';

function Portal({ children }) { return createPortal(children, document.body); }

export default function SuppliersPage() {
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF');
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(true);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const importFileRef = useRef(null);

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams({ page });
    if (search) q.set('search', search);
    if (!activeFilter) q.set('isActive', 'false');
    api.get(`/inventory/suppliers?${q}`).then((r) => {
      setData(r.data.data);
      setMeta(r.data.meta || { page: 1, totalPages: 1 });
    }).catch((e) => toast.error(e.response?.data?.message || 'Unable to load suppliers.')).finally(() => setLoading(false));
  };
  useEffect(load, [page, search, activeFilter]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!csv.trim()) { toast.error('CSV content is required.'); return; }
    setImportBusy(true);
    try {
      const res = await api.post('/inventory/suppliers/import', { csv });
      toast.success(res.data.message);
      load();
      setImportOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    } finally {
      setImportBusy(false);
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
              <UploadCloud size={15} />
              Import CSV
            </button>
            <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', contact: '', phone: '', email: '', address: '' }); setOpen(true); }}><UserPlus size={15} /> Add Supplier</button>
          </div>
        )
      } />
      <div className="card bg-surface shadow-sm border border-border mb-4">
        <div className="card-body py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 md:max-w-md">
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
              <input
                type="search"
                className="input input-sm w-full pl-9"
                aria-label="Search suppliers"
                placeholder="Search supplier…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button type="button" className="btn btn-ghost btn-xs btn-square" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => { setSearch(''); setPage(1); }} aria-label="Clear search"><X size={12} /></button>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={activeFilter}
                onChange={(e) => { setActiveFilter(e.target.checked); setPage(1); }}
              />
              <span className="text-muted">Active only</span>
            </label>
          </div>
        </div>
      </div>

      <div className="card bg-surface shadow-sm border border-border">
        <div className="card-body">
          {loading ? <Spinner label="Loading suppliers…" /> : data.length === 0 ? <EmptyState message="No suppliers found." /> : (
            <div className="overflow-x-auto">
              <table className="table table-sm" aria-label="Suppliers table">
                <thead>
                  <tr>
                    <th className="font-mono text-xs uppercase tracking-wider">Name</th>
                    <th className="font-mono text-xs uppercase tracking-wider">Contact</th>
                    <th className="font-mono text-xs uppercase tracking-wider">Phone</th>
                    <th className="font-mono text-xs uppercase tracking-wider">Email</th>
                    <th className="font-mono text-xs uppercase tracking-wider">Address</th>
                    <th className="font-mono text-xs uppercase tracking-wider">Status</th>
                    <th className="font-mono text-xs uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((s) => (
                    <tr key={s.id} className="hover">
                      <td className="font-medium">{s.name}</td>
                      <td>{s.contact || '—'}</td>
                      <td>{s.phone || '—'}</td>
                      <td>{s.email || '—'}</td>
                      <td className="max-w-64 truncate">{s.address || '—'}</td>
                      <td><Badge status={s.isActive === false ? 'CANCELLED' : 'APPROVED'}>{s.isActive === false ? 'Inactive' : 'Active'}</Badge></td>
                      <td className="text-right">
                        {canManage && <button className="btn btn-ghost btn-xs" onClick={() => openEdit(s)}><SquarePen size={12} /> Edit</button>}
                        {canManage && s.isActive !== false && <button className="btn btn-ghost btn-xs text-error" onClick={() => setConfirm(s)}><Ban size={12} /> Deactivate</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {meta.totalPages > 1 && <Pagination meta={meta} onPage={setPage} />}
            </div>
          )}
        </div>
      </div>
      {open && (
        <Portal>
          <FormModal
            title={editing ? 'Edit supplier' : 'Add supplier'}
            formNo="Form No. LGU-IMS-SUP-01"
            icon={Building2}
            tone="info"
            size="modal-md"
            onClose={() => { setOpen(false); setEditing(null); }}
          >
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="modal-body">
                <div className="divider">Supplier details</div>
                <div className="modal-form-grid">
                  <Field label="Supplier name" required>
                    <IconInput icon={Building2} required value={form.name} disabled={editing} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Corporation / business name" />
                  </Field>
                  <Field label="Contact person" hint="Primary contact for deliveries">
                    <IconInput icon={User} value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Full name" />
                  </Field>
                  <Field label="Phone" required>
                    <IconInput icon={Phone} required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0917-123-4567" />
                  </Field>
                  <Field label="Email" hint="For order confirmations">
                    <IconInput icon={Mail} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
                  </Field>
                  <Field label="Address" hint="Full billing / delivery address" full>
                    <IconInput icon={MapPin} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street, city, province" />
                  </Field>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => { setOpen(false); setEditing(null); }}>
                  <X size={14} /> Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />}<Save size={14} />{editing ? 'Save changes' : 'Create supplier'}</button>
              </div>
            </form>
          </FormModal>
        </Portal>
      )}

      {importOpen && (
        <Portal>
          <FormModal
            title="Import Suppliers from CSV"
            formNo="Form No. LGU-IMS-SUP-02"
            icon={UploadCloud}
            tone="info"
            size="modal-md"
            onClose={() => setImportOpen(false)}
          >
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              <div className="modal-body">
                <p className="text-sm text-muted mb-3">Upload a CSV with columns: name, contact, phone, email, address, isActive. Existing suppliers (by name or email) will be updated.</p>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <button type="button" className="btn btn-outline btn-sm gap-2" onClick={() => {
                    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'suppliers_import_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <Download size={14} /> Download template
                  </button>
                  <button type="button" className="btn btn-outline btn-sm gap-2" onClick={() => importFileRef.current?.click()}>
                    <UploadCloud size={14} /> Choose file
                  </button>
                  <input ref={importFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const text = await f.text();
                    setCsv(text);
                    e.target.value = '';
                  }} />
                  <span className="text-xs text-muted">or paste CSV below</span>
                </div>
                <fieldset className="fieldset mt-1">
                  <legend className="fieldset-legend">CSV content</legend>
                  <textarea className="textarea font-mono text-xs" rows={10} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={sampleCSV} required />
                </fieldset>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setImportOpen(false)}>
                  <X size={14} /> Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={importBusy}>
                  {importBusy && <span className="loading loading-spinner loading-xs" />}
                  <UploadCloud size={14} /> Import
                </button>
              </div>
            </form>
          </FormModal>
        </Portal>
      )}

      {confirm && (
        <Portal>
          <FormModal
            title="Deactivate supplier"
            icon={Ban}
            tone="danger"
            size="modal-sm"
            onClose={() => setConfirm(null)}
          >
            <div className="modal-body">
              <p className="text-sm text-muted">Deactivate "{confirm.name}"? The supplier will no longer appear in lists but existing records are preserved.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setConfirm(null)}>
                <X size={14} /> Cancel
              </button>
              <button type="button" className="btn btn-error" onClick={deactivate}>
                <Ban size={14} /> Deactivate
              </button>
            </div>
          </FormModal>
        </Portal>
      )}
    </div>
  );
}

const sampleCSV = 'name,contact,phone,email,address,isActive\nABC Supplies Corp.,Juan Dela Cruz,0917-123-4567,abc@supplies.ph,123 Manila St, true\nXYZ Trading,Maria Santos,0918-765-4321,xyz@trading.ph,456 QC Ave,true';

function Field({ label, hint, required, full, children }) {
  return (
    <div className={`fieldset${full ? ' form-full' : ''}`}>
      <span className="fieldset-legend">{label}{required && <span className="adj-req"> *</span>}</span>
      {children}
      {hint && <span className="sp-hint">{hint}</span>}
    </div>
  );
}

function IconInput({ icon: Icon, ...props }) {
  return (
    <label className="input">
      {Icon && <Icon size={16} style={{ color: 'var(--faint)', flexShrink: 0 }} />}
      <input {...props} />
    </label>
  );
}
