import { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Spinner } from '../components/ui';
import {
  FolderOpen, Building2, ShieldCheck, Download, Flag,
  Plus, Pencil, Trash2, ChevronRight, Search, Users,
  KeyRound, Clock, HardDrive, Server, X,
} from 'lucide-react';

const TABS = [
  { key: 'categories', label: 'Categories', icon: FolderOpen, desc: 'Item categories for grouping and reporting.', group: 'reference' },
  { key: 'departments', label: 'Departments', icon: Building2, desc: 'Offices and departments that file requisitions.', group: 'reference' },
  { key: 'tenants', label: 'Tenants', icon: Server, desc: 'Multi-tenant management (super-admin only).', group: 'reference' },
  { key: 'security', label: 'Security', icon: ShieldCheck, desc: 'Two-factor authentication and API keys.', group: 'system' },
  { key: 'backup', label: 'Backup', icon: Download, desc: 'Database export and disaster recovery.', group: 'system' },
  { key: 'flags', label: 'Feature Flags', icon: Flag, desc: 'Runtime feature toggles.', group: 'system' },
];

const GROUP_META = {
  reference: { label: 'Reference Data', color: 'var(--lgu-accent)' },
  system: { label: 'System', color: 'var(--lgu-info)' },
};

function FadeIn({ children, delay = 0 }) {
  return (
    <div style={{ animation: `fadeSlideIn 200ms ease ${delay}ms both` }}>
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mt-2 text-sm text-base-content/70">{message}</p>
      <div className="modal-action">
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-error" onClick={onConfirm} disabled={busy}>
          {busy && <span className="loading loading-spinner loading-xs" />}
          {busy ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
      <input
        className="input pl-8"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SectionCard({ title, subtitle, action, children, accent }) {
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div className="flex-1">
          {title && <h2 className="settings-card-title">{title}</h2>}
          {subtitle && <p className="settings-card-subtitle">{subtitle}</p>}
        </div>
        {action && <div className="settings-card-action">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function DataTable({ columns, rows, rowKey, onEdit, onDelete, emptyMessage, loading }) {
  if (loading) return <div className="table-skeleton"><Spinner /></div>;
  if (!rows || rows.length === 0) return <EmptyState message={emptyMessage || 'No records found.'} />;
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {(onEdit || onDelete) && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover">
              {columns.map((col) => (
                <td key={col.key} className={col.className || ''}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="text-right">
                  {onEdit && (
                    <button className="btn btn-ghost btn-xs" onClick={() => onEdit(row)}>
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                  {onDelete && (
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => onDelete(row)}>
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => api.get('/categories').then((r) => setData(r.data.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load categories.'));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/categories/${editing.id}`, form);
        toast.success('Category updated.');
      } else {
        await api.post('/categories', form);
        toast.success('Category created.');
      }
      setOpen(false);
      setEditing(null);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save category.');
    }
  };

  const remove = async () => {
    if (!confirmTarget) return;
    try {
      await api.delete(`/categories/${confirmTarget.id}`);
      toast.success('Category deleted.');
      setConfirmTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete category.');
    }
  };

  const filtered = data?.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())) || [];

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'description', label: 'Description', render: (r) => <span className="text-base-content/60">{r.description || '—'}</span> },
    { key: 'items', label: 'Items', render: (r) => <span className="badge badge-ghost">{r._count?.items ?? 0}</span> },
  ];

  return (
    <FadeIn>
      <SectionCard
        subtitle="Item categories used for grouping and reporting."
        action={
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setOpen(true); }}>
            <Plus size={14} /> Add category
          </button>
        }
      >
        <div className="mt-4">
          <div className="mb-4" style={{ maxWidth: 320 }}>
            <SearchBar value={search} onChange={setSearch} placeholder="Search categories..." />
          </div>
          <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} onEdit={(r) => { setEditing(r); setForm({ name: r.name, description: r.description || '' }); setOpen(true); }} onDelete={(r) => setConfirmTarget(r)} emptyMessage={search ? 'No categories match your search.' : 'No categories yet. Add your first category to get started.'} />
        </div>
      </SectionCard>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit category' : 'Add category'}>
        <form onSubmit={submit} className="flex flex-col gap-4 mt-4">
          <div className="form-field">
            <label className="form-label">Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office Supplies" />
          </div>
          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea className="textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." />
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Save changes' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={remove} title="Delete category" message={`Delete category "${confirmTarget?.name}"? This cannot be undone.`} />
    </FadeIn>
  );
}

function DepartmentTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', headName: '', parentId: '' });
  const [view, setView] = useState('table');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => api.get('/departments').then((r) => setData(r.data.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load departments.'));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, parentId: form.parentId || null };
      if (editing) {
        await api.patch(`/departments/${editing.id}`, payload);
        toast.success('Department updated.');
      } else {
        await api.post('/departments', payload);
        toast.success('Department created.');
      }
      setOpen(false);
      setEditing(null);
      setForm({ name: '', code: '', headName: '', parentId: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save department.');
    }
  };

  const remove = async () => {
    if (!confirmTarget) return;
    try {
      await api.delete(`/departments/${confirmTarget.id}`);
      toast.success('Department deleted.');
      setConfirmTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete department.');
    }
  };

  const buildTree = (depts, parentId = null, level = 0) => {
    return depts.filter((d) => d.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name)).flatMap((d) => [{ ...d, level }, ...buildTree(depts, d.id, level + 1)]);
  };

  const tree = buildTree(data || []);
  const filtered = search ? tree.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase())) : tree;

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'code', label: 'Code', render: (r) => <span className="badge badge-ghost font-mono">{r.code}</span> },
    { key: 'headName', label: 'Head', render: (r) => <span className="text-base-content/60">{r.headName || '—'}</span> },
    { key: 'parent', label: 'Parent', render: (r) => <span className="text-base-content/60">{r.parent?.name || '—'}</span> },
    { key: 'users', label: 'Users', render: (r) => <span className="badge badge-ghost">{r._count?.users ?? 0}</span> },
  ];

  return (
    <FadeIn>
      <SectionCard
        subtitle="Offices and departments that file requisitions."
        action={
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ name: '', code: '', headName: '', parentId: '' }); setOpen(true); }}>
            <Plus size={14} /> Add department
          </button>
        }
      >
        <div className="mt-4">
          <div className="flex gap-2 mb-4 flex-wrap">
            <div style={{ maxWidth: 240 }}>
              <SearchBar value={search} onChange={setSearch} placeholder="Search..." />
            </div>
            <div className="flex gap-1 ml-auto">
              <button className={`btn btn-sm ${view === 'tree' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('tree')}>
                <FolderOpen size={13} /> Tree
              </button>
              <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('table')}>
                Table
              </button>
            </div>
          </div>

          {!data ? <Spinner /> : filtered.length === 0 ? (
            <EmptyState message={search ? 'No departments match your search.' : 'No departments yet. Add your first department.'} />
          ) : view === 'tree' ? (
            <div className="tree-list">
              {filtered.map((d) => (
                <div key={d.id} className="tree-row" style={{ paddingLeft: `${d.level * 28 + 12}px` }}>
                  <ChevronRight size={13} className="tree-chevron" style={{ transform: d.level > 0 ? 'rotate(90deg)' : 'none' }} />
                  <span className="tree-name">{d.name}</span>
                  <span className="badge badge-ghost font-mono text-xs">{d.code}</span>
                  {d.headName && <span className="tree-meta">· {d.headName}</span>}
                  <span className="tree-actions">
                    <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(d); setForm({ name: d.name, code: d.code, headName: d.headName || '', parentId: d.parentId || '' }); setOpen(true); }}>
                      <Pencil size={11} />
                    </button>
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => setConfirmTarget(d)}>
                      <Trash2 size={11} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} onEdit={(r) => { setEditing(r); setForm({ name: r.name, code: r.code, headName: r.headName || '', parentId: r.parentId || '' }); setOpen(true); }} onDelete={(r) => setConfirmTarget(r)} />
          )}
        </div>
      </SectionCard>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit department' : 'Add department'}>
        <form onSubmit={submit} className="flex flex-col gap-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-field col-span-2 md:col-span-1">
              <label className="form-label">Name *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="General Services Office" />
            </div>
            <div className="form-field">
              <label className="form-label">Code *</label>
              <input className="input font-mono" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="GSO" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-field">
              <label className="form-label">Head of office</label>
              <input className="input" value={form.headName} onChange={(e) => setForm({ ...form, headName: e.target.value })} placeholder="Optional" />
            </div>
            <div className="form-field">
              <label className="form-label">Parent department</label>
              <select className="select" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                <option value="">None (top-level)</option>
                {data?.filter((d) => d.id !== editing?.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Save changes' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={remove} title="Delete department" message={`Delete department "${confirmTarget?.name}"? This cannot be undone.`} />
    </FadeIn>
  );
}

function TenantTab() {
  const toast = useToast();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/tenants').then((r) => setTenants(r.data.data || [])).catch(() => toast.error('Unable to load tenants.')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/tenants', form);
      toast.success('Tenant created.');
      setOpen(false);
      setForm({ name: '', code: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to create tenant.');
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'code', label: 'Code', render: (r) => <span className="badge badge-ghost font-mono">{r.code}</span> },
    { key: 'status', label: 'Status', render: (r) => <span className={`badge ${r.isActive ? 'badge-success' : 'badge-error'}`}>{r.isActive ? 'Active' : 'Inactive'}</span> },
    { key: 'createdAt', label: 'Created', render: (r) => <span className="text-base-content/60 text-sm">{new Date(r.createdAt).toLocaleDateString()}</span> },
  ];

  return (
    <FadeIn>
      <SectionCard
        subtitle="Organizations sharing this installation. Each tenant has isolated data."
        action={
          <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
            <Plus size={14} /> New tenant
          </button>
        }
      >
        {loading ? <Spinner /> : tenants.length === 0 ? (
          <EmptyState message="No tenants yet. Create your first tenant organization." />
        ) : (
          <div className="mt-4">
            <DataTable columns={columns} rows={tenants} rowKey={(r) => r.id} />
          </div>
        )}
      </SectionCard>

      <Modal open={open} onClose={() => setOpen(false)} title="Create tenant">
        <form onSubmit={submit} className="flex flex-col gap-4 mt-4">
          <div className="form-field">
            <label className="form-label">Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Quezon City" />
          </div>
          <div className="form-field">
            <label className="form-label">Code *</label>
            <input className="input font-mono" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} placeholder="quezon-city" />
            <p className="form-hint">Unique slug used in API headers and URLs.</p>
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating...' : 'Create tenant'}</button>
          </div>
        </form>
      </Modal>
    </FadeIn>
  );
}

function SecurityTab() {
  const toast = useToast();
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [keys, setKeys] = useState([]);
  const [keyName, setKeyName] = useState('');
  const [keyExpiry, setKeyExpiry] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [disable2FaOpen, setDisable2FaOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [revokeKeyTarget, setRevokeKeyTarget] = useState(null);

  const loadProfile = async () => {
    try {
      const res = await api.get('/users/me');
      setTwoFaEnabled(res.data.data.twoFactorEnabled || false);
    } catch (e) { /* ignore */ }
  };
  const loadKeys = async () => {
    try {
      const res = await api.get('/api-keys');
      setKeys(res.data.data);
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { loadProfile(); loadKeys(); }, []);

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      setSecret(res.data.secret);
      setQr(res.data.dataUrl);
      setSetupOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to start 2FA setup.');
    } finally {
      setBusy(false);
    }
  };

  const enable2FA = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/2fa/enable', { code: verifyCode });
      setTwoFaEnabled(true);
      setSetupOpen(false);
      setVerifyCode('');
      toast.success('Two-factor authentication enabled.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code.');
    } finally {
      setBusy(false);
    }
  };

  const disable2FA = async (e) => {
    e.preventDefault();
    if (!disableCode || disableCode.length < 6) return;
    setBusy(true);
    try {
      await api.post('/auth/2fa/disable', { code: disableCode });
      setTwoFaEnabled(false);
      setDisable2FaOpen(false);
      setDisableCode('');
      toast.success('Two-factor authentication disabled.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to disable 2FA.');
    } finally {
      setBusy(false);
    }
  };

  const createKey = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNewKey(null);
    try {
      const res = await api.post('/api-keys', { name: keyName, expiresInDays: keyExpiry ? Number(keyExpiry) : undefined });
      setNewKey(res.data.data);
      setKeyName('');
      setKeyExpiry('');
      loadKeys();
      toast.success('API key created.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to create API key.');
    } finally {
      setBusy(false);
    }
  };

  const revokeKey = async () => {
    if (!revokeKeyTarget) return;
    try {
      await api.delete(`/api-keys/${revokeKeyTarget}`);
      setRevokeKeyTarget(null);
      loadKeys();
      toast.success('API key revoked.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to revoke API key.');
    }
  };

  const keyColumns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'prefix', label: 'Prefix', render: (r) => <span className="font-mono text-xs text-base-content/60">{r.keyPrefix}...</span> },
    { key: 'expires', label: 'Expires', render: (r) => <span className="text-sm">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : 'Never'}</span> },
  ];

  return (
    <FadeIn>
      <div className="settings-grid-2">
        <SectionCard
          title="Two-factor authentication"
          subtitle="Use an authenticator app to secure your account."
          action={
            twoFaEnabled ? (
              <button className="btn btn-error btn-sm" disabled={busy} onClick={() => setDisable2FaOpen(true)}>Disable 2FA</button>
            ) : (
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={startSetup}>Enable 2FA</button>
            )
          }
        >
          <div className="mt-3">
            <span className={`badge ${twoFaEnabled ? 'badge-success' : 'badge-ghost'}`}>{twoFaEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </SectionCard>

        <SectionCard title="API keys" subtitle="Create keys for programmatic access to the API.">
          <form onSubmit={createKey} className="mt-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Key name" required value={keyName} onChange={(e) => setKeyName(e.target.value)} />
              <input className="input" style={{ width: 120 }} type="number" placeholder="Days" value={keyExpiry} onChange={(e) => setKeyExpiry(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm" disabled={busy} type="submit">
              <KeyRound size={13} /> Generate key
            </button>
          </form>
          {newKey && (
            <div className="alert alert-success mt-3">
              <div>
                <div className="font-semibold text-sm">Save this key now</div>
                <div className="font-mono text-xs break-all">{newKey.key}</div>
                <div className="opacity-70 mt-1 text-xs">It will not be shown again.</div>
              </div>
            </div>
          )}
          <div className="mt-4">
            {keys.length === 0 ? <EmptyState message="No API keys yet." /> : (
              <DataTable columns={keyColumns} rows={keys} rowKey={(r) => r.id} onDelete={(r) => setRevokeKeyTarget(r.id)} />
            )}
          </div>
        </SectionCard>
      </div>

      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title="Set up two-factor authentication">
        <p className="text-sm text-base-content/60 mt-1">Scan this QR code with your authenticator app.</p>
        {qr && <img src={qr} alt="2FA QR" className="w-48 h-48 mx-auto mt-4 bg-white p-2 rounded-lg" />}
        <div className="mt-3 text-center">
          <div className="text-xs text-base-content/60">Or enter this secret manually:</div>
          <div className="font-mono text-sm mt-1">{secret}</div>
        </div>
        <form onSubmit={enable2FA} className="mt-4 flex flex-col gap-3">
          <div className="form-field">
            <label className="form-label">Verification code</label>
            <input className="input font-mono text-center" style={{ fontSize: '1.25rem', letterSpacing: '0.2em' }} required maxLength={6} inputMode="numeric" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="000000" autoFocus />
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setSetupOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>Enable 2FA</button>
          </div>
        </form>
      </Modal>

      <Modal open={disable2FaOpen} onClose={() => { setDisable2FaOpen(false); setDisableCode(''); }} title="Disable two-factor authentication">
        <p className="text-sm text-base-content/60 mt-1">Enter the 6-digit code from your authenticator app to confirm.</p>
        <form onSubmit={disable2FA} className="mt-4 flex flex-col gap-4">
          <div className="form-field">
            <label className="form-label">Verification code</label>
            <input className="input font-mono text-center" style={{ fontSize: '1.25rem', letterSpacing: '0.2em' }} required maxLength={6} inputMode="numeric" value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="000000" autoFocus />
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => { setDisable2FaOpen(false); setDisableCode(''); }}>Cancel</button>
            <button type="submit" className="btn btn-error" disabled={busy || disableCode.length < 6}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              Disable 2FA
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!revokeKeyTarget} onClose={() => setRevokeKeyTarget(null)} onConfirm={revokeKey} title="Revoke API key" message="Revoke this API key? This cannot be undone." />
    </FadeIn>
  );
}

function BackupTab() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const downloadBackup = async () => {
    setBusy(true);
    try {
      const res = await api.get('/backup', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lgu_ims_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded.');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Backup failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FadeIn>
      <SectionCard
        title="Database Backup"
        subtitle="Download a full PostgreSQL dump of the system database. Run regularly for disaster recovery."
      >
        <div className="mt-4 flex items-center gap-4">
          <button className="btn btn-primary" disabled={busy} onClick={downloadBackup}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : <Download size={16} />}
            Download Backup
          </button>
          <span className="text-sm text-base-content/60">File format: SQL dump</span>
        </div>
      </SectionCard>
    </FadeIn>
  );
}

function FlagsTab() {
  const toast = useToast();
  const [flags, setFlags] = useState([]);

  useEffect(() => {
    api.get('/flags').then((r) => setFlags(r.data.data)).catch(() => {});
  }, []);

  const toggle = async (f) => {
    const newVal = !f.currentValue;
    try {
      await api.patch(`/flags/${f.key}`, { value: newVal });
      setFlags((prev) => prev.map((fl) => fl.key === f.key ? { ...fl, currentValue: newVal, overridden: true } : fl));
      toast.success(`"${f.key}" ${newVal ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      toast.error('Failed to update flag.');
    }
  };

  return (
    <FadeIn>
      <SectionCard title="Feature Flags" subtitle="Toggle system features. Overrides are runtime-only and reset on server restart.">
        {flags.length === 0 ? <EmptyState message="Loading flags..." /> : (
          <div className="mt-4 space-y-2">
            {flags.map((f) => (
              <div key={f.key} className="flag-row">
                <div className="flag-info">
                  <div className="flag-key">{f.key}</div>
                  <div className="flag-meta">Default: {String(f.defaultValue)} {f.overridden ? '· Runtime override' : ''}</div>
                </div>
                <button
                  className={`toggle toggle-primary ${f.currentValue ? 'toggle-active' : ''}`}
                  onClick={() => toggle(f)}
                  role="switch"
                  aria-checked={f.currentValue}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </FadeIn>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState(user.role === 'WAREHOUSE_STAFF' ? 'categories' : 'departments');
  const isAdmin = user?.role === 'ADMIN';
  const prevTab = useRef(tab);

  const visibleTabs = TABS.filter((t) => t.key === 'tenants' ? isAdmin : t.key !== 'flags' || isAdmin);

  const groups = visibleTabs.reduce((acc, t) => {
    if (!acc[t.group]) acc[t.group] = [];
    acc[t.group].push(t);
    return acc;
  }, {});

  useEffect(() => {
    prevTab.current = tab;
  });

  const renderTab = (key) => {
    switch (key) {
      case 'categories': return <CategoryTab />;
      case 'departments': return <DepartmentTab />;
      case 'tenants': return <TenantTab />;
      case 'security': return <SecurityTab />;
      case 'backup': return <BackupTab />;
      case 'flags': return <FlagsTab />;
      default: return null;
    }
  };

  return (
    <div className="settings-page">
      <PageHeader
        title="Reference Data"
        subtitle="Manage categories, departments, tenants, and system settings."
      />

      <div className="settings-tabs">
        {Object.entries(groups).map(([groupKey, tabs]) => (
          <div key={groupKey} className="settings-tab-group" style={{ '--group-color': GROUP_META[groupKey]?.color }}>
            <div className="settings-tab-group-label">{GROUP_META[groupKey]?.label}</div>
            <div className="settings-tab-list">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`settings-tab ${active ? 'active' : ''}`}
                    title={t.desc}
                  >
                    <Icon size={15} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="settings-content">
        {renderTab(tab)}
      </div>
    </div>
  );
}
