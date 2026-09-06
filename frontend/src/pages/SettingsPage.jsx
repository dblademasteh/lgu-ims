import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Spinner } from '../components/ui';
import {
  FolderOpen, Building2, ShieldCheck, Download, Flag,
  Plus, Pencil, Trash2, ChevronRight, Search, Users,
  KeyRound, Clock, HardDrive, Server,
} from 'lucide-react';

const TABS = [
  { key: 'categories', label: 'Categories', icon: FolderOpen, desc: 'Item categories for grouping and reporting.' },
  { key: 'departments', label: 'Departments', icon: Building2, desc: 'Offices and departments that file requisitions.' },
  { key: 'tenants', label: 'Tenants', icon: Server, desc: 'Multi-tenant management (super-admin only).' },
  { key: 'security', label: 'Security', icon: ShieldCheck, desc: 'Two-factor authentication and API keys.' },
  { key: 'backup', label: 'Backup', icon: Download, desc: 'Database export and disaster recovery.' },
  { key: 'flags', label: 'Feature Flags', icon: Flag, desc: 'Runtime feature toggles.' },
];

function SectionCard({ title, subtitle, action, children }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {title && <h2 className="card-title text-base">{title}</h2>}
            {subtitle && <p className="text-sm text-base-content/60 mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        {children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mt-2 text-sm">{message}</p>
      <div className="modal-action">
        <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-error" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting...' : 'Delete'}</button>
      </div>
    </Modal>
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

  return (
    <div className="space-y-4">
      <SectionCard
        subtitle="Item categories used for grouping and reporting."
        action={
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setOpen(true); }}>
            <Plus size={14} /> Add category
          </button>
        }
      >
        <div className="mt-4">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              className="input input-sm pl-8"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!data ? <Spinner /> : filtered.length === 0 ? (
            <EmptyState message={search ? 'No categories match your search.' : 'No categories yet.'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>Name</th><th>Description</th><th>Items</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover">
                      <td className="font-medium">{c.name}</td>
                      <td className="text-sm opacity-70">{c.description || '—'}</td>
                      <td><span className="badge badge-ghost">{c._count.items}</span></td>
                      <td className="text-right">
                        <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(c); setForm({ name: c.name, description: c.description || '' }); setOpen(true); }}><Pencil size={12} /> Edit</button>
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => setConfirmTarget(c)}><Trash2 size={12} /> Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit category' : 'Add category'}>
        <form onSubmit={submit} className="flex flex-col gap-4 mt-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Name *</legend>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Description</legend>
            <textarea className="textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </fieldset>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Save changes' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={remove} title="Delete category" message={`Delete category "${confirmTarget?.name}"? This cannot be undone.`} />
    </div>
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
    return depts
      .filter((d) => d.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((d) => [{ ...d, level }, ...buildTree(depts, d.id, level + 1)]);
  };

  const tree = buildTree(data || []);
  const filtered = search ? tree.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase())) : tree;

  return (
    <div className="space-y-4">
      <SectionCard
        subtitle="Office / departments that file requisitions."
        action={
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input className="input input-sm pl-8" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className={`btn btn-sm ${view === 'tree' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('tree')}>
              <FolderOpen size={14} /> Tree
            </button>
            <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('table')}>
              Table
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ name: '', code: '', headName: '', parentId: '' }); setOpen(true); }}>
              <Plus size={14} /> Add department
            </button>
          </div>
        }
      >
        {!data ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState message={search ? 'No departments match your search.' : 'No departments yet.'} />
        ) : view === 'tree' ? (
          <div className="space-y-1 mt-2">
            {filtered.map((d) => (
              <div key={d.id} className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-base-200 transition-colors" style={{ paddingLeft: `${d.level * 28 + 12}px` }}>
                <ChevronRight size={14} className="text-base-content/30" style={{ transform: d.level > 0 ? 'rotate(90deg)' : 'none' }} />
                <span className="font-medium">{d.name}</span>
                <span className="badge badge-ghost font-mono text-xs">{d.code}</span>
                {d.headName && <span className="text-xs text-base-content/60 hidden md:inline">· {d.headName}</span>}
                <span className="ml-auto flex gap-1">
                  <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(d); setForm({ name: d.name, code: d.code, headName: d.headName || '', parentId: d.parentId || '' }); setOpen(true); }}><Pencil size={12} /></button>
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => setConfirmTarget(d)}><Trash2 size={12} /></button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Name</th><th>Code</th><th>Head</th><th>Parent</th><th>Users</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="hover">
                    <td className="font-medium">{d.name}</td>
                    <td><span className="badge badge-ghost font-mono">{d.code}</span></td>
                    <td className="text-sm opacity-70">{d.headName || '—'}</td>
                    <td className="text-sm text-base-content/60">{d.parent?.name || '—'}</td>
                    <td><span className="badge badge-ghost">{d._count.users}</span></td>
                    <td className="text-right">
                      <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(d); setForm({ name: d.name, code: d.code, headName: d.headName || '', parentId: d.parentId || '' }); setOpen(true); }}><Pencil size={12} /> Edit</button>
                      <button className="btn btn-ghost btn-xs text-error" onClick={() => setConfirmTarget(d)}><Trash2 size={12} /> Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit department' : 'Add department'}>
        <form onSubmit={submit} className="flex flex-col gap-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <fieldset className="fieldset md:col-span-2">
              <legend className="fieldset-legend">Name *</legend>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="General Services Office" />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Code *</legend>
              <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="GSO" />
            </fieldset>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Head of office</legend>
              <input className="input" value={form.headName} onChange={(e) => setForm({ ...form, headName: e.target.value })} placeholder="Optional" />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Parent department</legend>
              <select className="select" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                <option value="">None (top-level)</option>
                {data?.filter((d) => d.id !== editing?.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </fieldset>
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{editing ? 'Save changes' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={remove} title="Delete department" message={`Delete department "${confirmTarget?.name}"? This cannot be undone.`} />
    </div>
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

  return (
    <div className="space-y-4">
      <SectionCard
        subtitle="Organizations sharing this installation. Each tenant has isolated data."
        action={
          <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
            <Plus size={14} /> New tenant
          </button>
        }
      >
        {loading ? <Spinner /> : tenants.length === 0 ? (
          <EmptyState message="No tenants yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Name</th><th>Code</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="hover">
                    <td className="font-medium">{t.name}</td>
                    <td><span className="badge badge-ghost font-mono">{t.code}</span></td>
                    <td><span className={`badge ${t.isActive ? 'badge-success' : 'badge-error'}`}>{t.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="text-sm opacity-70">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Modal open={open} onClose={() => setOpen(false)} title="Create tenant">
        <form onSubmit={submit} className="flex flex-col gap-4 mt-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Name *</legend>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Quezon City" />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Code *</legend>
            <input className="input font-mono" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} placeholder="quezon-city" />
            <p className="text-xs text-base-content/50 mt-1">Unique slug used in API headers and URLs.</p>
          </fieldset>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating...' : 'Create tenant'}</button>
          </div>
        </form>
      </Modal>
    </div>
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

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
        <div className="mt-2">
          <span className={`badge ${twoFaEnabled ? 'badge-success' : 'badge-ghost'}`}>{twoFaEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </SectionCard>

      <SectionCard title="API keys" subtitle="Create keys for programmatic access to the API.">
        <form onSubmit={createKey} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className="input input-sm md:col-span-2" placeholder="Key name" required value={keyName} onChange={(e) => setKeyName(e.target.value)} />
            <input className="input input-sm" type="number" placeholder="Expires in days" value={keyExpiry} onChange={(e) => setKeyExpiry(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" disabled={busy} type="submit"><KeyRound size={14} /> Generate key</button>
        </form>
        {newKey && (
          <div className="alert alert-success mt-3 text-xs">
            <div>
              <div className="font-semibold">Save this key now</div>
              <div className="font-mono break-all">{newKey.key}</div>
              <div className="opacity-70 mt-1">It will not be shown again.</div>
            </div>
          </div>
        )}
        <div className="mt-4">
          {keys.length === 0 ? <EmptyState message="No API keys yet." /> : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead><tr><th>Name</th><th>Prefix</th><th>Expires</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id}>
                      <td>{k.name}</td>
                      <td className="font-mono text-xs">{k.keyPrefix}...</td>
                      <td className="text-xs">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never'}</td>
                      <td className="text-right">
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => setRevokeKeyTarget(k.id)}><Trash2 size={12} /> Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>

      {setupOpen && (
        <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title="Set up two-factor authentication">
          <p className="text-sm text-base-content/60 mt-1">Scan this QR code with your authenticator app.</p>
          {qr && <img src={qr} alt="2FA QR" className="w-48 h-48 mx-auto mt-4 bg-white p-2 rounded" />}
          <div className="mt-3 text-center">
            <div className="text-xs text-base-content/60">Or enter this secret manually:</div>
            <div className="font-mono text-sm mt-1">{secret}</div>
          </div>
          <form onSubmit={enable2FA} className="mt-4 flex flex-col gap-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-base-content/60">Verification code</span>
              <input className="input" required maxLength={6} inputMode="numeric" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="000000" />
            </label>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setSetupOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>Enable 2FA</button>
            </div>
          </form>
        </Modal>
      )}

      {disable2FaOpen && (
        <Modal open={disable2FaOpen} onClose={() => { setDisable2FaOpen(false); setDisableCode(''); }} title="Disable two-factor authentication">
          <p className="text-sm text-base-content/60 mt-1">Enter the 6-digit code from your authenticator app to confirm.</p>
          <form onSubmit={disable2FA} className="mt-4 flex flex-col gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Verification code</legend>
              <input className="input font-mono text-center text-lg tracking-widest" required maxLength={6} inputMode="numeric" value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="000000" autoFocus />
            </fieldset>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => { setDisable2FaOpen(false); setDisableCode(''); }}>Cancel</button>
              <button type="submit" className="btn btn-error" disabled={busy || disableCode.length < 6}>
                {busy && <span className="loading loading-spinner loading-xs" />}
                Disable 2FA
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog open={!!revokeKeyTarget} onClose={() => setRevokeKeyTarget(null)} onConfirm={revokeKey} title="Revoke API key" message="Revoke this API key? This cannot be undone." />
    </div>
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
      toast.error(err.message || 'Backup failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Database Backup" subtitle="Download a full PostgreSQL dump of the system database. Run regularly for disaster recovery.">
      <div className="mt-4 flex items-center gap-4">
        <button className="btn btn-primary" disabled={busy} onClick={downloadBackup}>
          {busy ? <span className="loading loading-spinner loading-xs" /> : <Download size={16} />}
          Download Backup
        </button>
        <span className="text-sm text-base-content/60">File format: SQL dump</span>
      </div>
    </SectionCard>
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
    } catch (err) {
      toast.error('Failed to update flag.');
    }
  };

  return (
    <SectionCard title="Feature Flags" subtitle="Toggle system features. Overrides are runtime-only and reset on server restart.">
      {flags.length === 0 ? <EmptyState message="Loading..." /> : (
        <div className="mt-4 space-y-2">
          {flags.map((f) => (
            <div key={f.key} className="flex items-center justify-between py-3 px-4 rounded-lg bg-base-200">
              <div>
                <div className="font-mono text-sm font-medium">{f.key}</div>
                <div className="text-xs text-base-content/60">Default: {String(f.defaultValue)} {f.overridden ? '(runtime override)' : ''}</div>
              </div>
              <input type="checkbox" className="toggle toggle-primary" checked={f.currentValue} onChange={() => toggle(f)} />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState(user.role === 'WAREHOUSE_STAFF' ? 'categories' : 'departments');
  const isAdmin = user?.role === 'ADMIN';

  const visibleTabs = TABS.filter((t) => t.key === 'tenants' ? isAdmin : t.key !== 'flags' || isAdmin);

  return (
    <div>
      <PageHeader title="Reference Data" subtitle="Manage categories, departments, tenants, and system settings." />
      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-6">
        {/* Sidebar nav */}
        <nav className="space-y-1">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-base-200 text-base-content' : 'text-base-content/70 hover:bg-base-200/60'}`}
              >
                <Icon size={16} className={active ? 'text-base-content' : 'text-base-content/50'} />
                <div className="text-left">
                  <div>{t.label}</div>
                  <div className="text-[11px] text-base-content/50 mt-0.5 leading-tight hidden xl:block">{t.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div>
          {tab === 'categories' && <CategoryTab />}
          {tab === 'departments' && <DepartmentTab />}
          {tab === 'tenants' && <TenantTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'backup' && <BackupTab />}
          {tab === 'flags' && <FlagsTab />}
        </div>
      </div>
    </div>
  );
}
