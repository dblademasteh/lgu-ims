import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, FormModal, Spinner } from '../components/ui';
import {
  FolderOpen, Building2, ShieldCheck, Download, Flag,
  Plus, Pencil, Trash2, Search, Users,
  KeyRound, Server, X, ChevronRight, Save, ShieldOff,
  Palette, Sun, Moon, Type, RotateCcw,
} from 'lucide-react';
import { useThemeStore, ACCENT_PRESETS, FONT_OPTIONS, SCALE_MIN, SCALE_MAX, SCALE_DEFAULT } from '../stores/themeStore';

const TABS = [
  { key: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme, text size, fonts, and accent color.' },
  { key: 'categories', label: 'Categories', icon: FolderOpen, desc: 'Item categories for grouping and reporting.' },
  { key: 'departments', label: 'Departments', icon: Building2, desc: 'Offices and departments that file requisitions.' },
  { key: 'tenants', label: 'Tenants', icon: Server, desc: 'Multi-tenant management (super-admin only).' },
  { key: 'security', label: 'Security', icon: ShieldCheck, desc: 'Two-factor authentication and API keys.' },
  { key: 'backup', label: 'Backup', icon: Download, desc: 'Database export and disaster recovery.' },
  { key: 'flags', label: 'Feature Flags', icon: Flag, desc: 'Runtime feature toggles.' },
];

function Portal({ children }) {
  return createPortal(children, document.body);
}

function Modal({ open, onClose, title, size = 'modal-md', icon: Icon, tone = 'neutral', formNo, children }) {
  if (!open) return null;
  return (
    <Portal>
      <FormModal title={title} formNo={formNo} icon={Icon} tone={tone} size={size} onClose={onClose}>
        <div className="modal-body">
          {children}
        </div>
      </FormModal>
    </Portal>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="modal-sm">
      <p className="modal-message">{message}</p>
      <div className="modal-footer">
        <button className="btn" onClick={onClose} disabled={busy}>
          <X size={14} /> Cancel
        </button>
        <button className="btn btn-error" onClick={onConfirm} disabled={busy}>
          {busy && <span className="loading loading-spinner loading-xs" />}
          <Trash2 size={14} /> {busy ? 'Deleting...' : 'Delete'}
        </button>
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

  const load = useCallback(() => {
    api.get('/categories').then((r) => setData(r.data.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load categories.'));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="sp-animate-in">
      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">Categories</div>
            <div className="sp-card-sub">Item categories used for grouping and reporting.</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setOpen(true); }}>
            <Plus size={14} /> Add category
          </button>
        </div>

        <div className="sp-toolbar">
          <div className="relative flex-1 md:max-w-md">
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
            <input type="search" className="input input-sm w-full pl-9" aria-label="Search categories" placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button type="button" className="btn btn-ghost btn-xs btn-square" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => setSearch('')} aria-label="Clear search"><X size={12} /></button>
            )}
          </div>
        </div>

        {!data ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState message={search ? 'No categories match your search.' : 'No categories yet. Add your first category to get started.'} />
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr><th>Name</th><th>Description</th><th>Items</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="hover">
                    <td className="font-medium">{c.name}</td>
                    <td className="subtext">{c.description || '—'}</td>
                    <td><span className="sp-badge">{c._count?.items ?? 0}</span></td>
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit category' : 'Add category'} icon={FolderOpen} tone="info" formNo="Form No. LGU-IMS-REF-01">
        <form onSubmit={submit} className="sp-form">
          <div className="sp-field">
            <label className="sp-label">Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office Supplies" autoFocus />
          </div>
          <div className="sp-field">
            <label className="sp-label">Description</label>
            <textarea className="textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={14} /> {editing ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={remove} title="Delete category" message={`Delete "${confirmTarget?.name}"? This action cannot be undone.`} />
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

  const load = useCallback(() => {
    api.get('/departments').then((r) => setData(r.data.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load departments.'));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="sp-animate-in">
      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">Departments</div>
            <div className="sp-card-sub">Offices and departments that file requisitions.</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ name: '', code: '', headName: '', parentId: '' }); setOpen(true); }}>
            <Plus size={14} /> Add department
          </button>
        </div>

        <div className="sp-toolbar">
          <div className="relative flex-1 md:max-w-md">
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
            <input type="search" className="input input-sm w-full pl-9" aria-label="Search departments" placeholder="Search departments…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button type="button" className="btn btn-ghost btn-xs btn-square" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => setSearch('')} aria-label="Clear search"><X size={12} /></button>
            )}
          </div>
          <div className="sp-view-toggle">
            <button className={`btn btn-sm ${view === 'tree' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('tree')}><FolderOpen size={13} /> Tree</button>
            <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('table')}>Table</button>
          </div>
        </div>

        {!data ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState message={search ? 'No departments match your search.' : 'No departments yet.'} />
        ) : view === 'tree' ? (
          <div className="sp-tree-wrap">
            {filtered.map((d) => (
              <div key={d.id} className="sp-tree-row" style={{ paddingLeft: `${d.level * 28 + 12}px` }}>
                <ChevronRight size={13} className="sp-tree-chevron" style={{ transform: d.level > 0 ? 'rotate(90deg)' : 'none' }} />
                <span className="sp-tree-name">{d.name}</span>
                <span className="sp-badge">{d.code}</span>
                {d.headName && <span className="sp-tree-meta">· {d.headName}</span>}
                <span className="sp-tree-actions">
                  <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(d); setForm({ name: d.name, code: d.code, headName: d.headName || '', parentId: d.parentId || '' }); setOpen(true); }}><Pencil size={11} /></button>
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => setConfirmTarget(d)}><Trash2 size={11} /></button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead><tr><th>Name</th><th>Code</th><th>Head</th><th>Parent</th><th>Users</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="hover">
                    <td className="font-medium">{d.name}</td>
                    <td><span className="sp-badge">{d.code}</span></td>
                    <td className="subtext">{d.headName || '—'}</td>
                    <td className="subtext">{d.parent?.name || '—'}</td>
                    <td><span className="sp-badge">{d._count?.users ?? 0}</span></td>
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
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit department' : 'Add department'} icon={Building2} tone="info" formNo="Form No. LGU-IMS-REF-02">
        <form onSubmit={submit} className="sp-form">
          <div className="sp-form-row">
            <div className="sp-field flex-2">
              <label className="sp-label">Name *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="General Services Office" autoFocus />
            </div>
            <div className="sp-field flex-1">
              <label className="sp-label">Code *</label>
              <input className="input font-mono" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="GSO" />
            </div>
          </div>
          <div className="sp-form-row">
            <div className="sp-field">
              <label className="sp-label">Head of office</label>
              <input className="input" value={form.headName} onChange={(e) => setForm({ ...form, headName: e.target.value })} placeholder="Optional" />
            </div>
            <div className="sp-field">
              <label className="sp-label">Parent department</label>
              <select className="select" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                <option value="">None (top-level)</option>
                {data?.filter((d) => d.id !== editing?.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={14} /> {editing ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={remove} title="Delete department" message={`Delete "${confirmTarget?.name}"? This action cannot be undone.`} />
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

  const load = useCallback(() => {
    setLoading(true);
    api.get('/tenants').then((r) => setTenants(r.data.data || [])).catch(() => toast.error('Unable to load tenants.')).finally(() => setLoading(false));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

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
    <div className="sp-animate-in">
      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">Tenants</div>
            <div className="sp-card-sub">Organizations sharing this installation. Each tenant has isolated data.</div>
          </div>
          <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> New tenant</button>
        </div>

        {loading ? <Spinner /> : tenants.length === 0 ? (
          <EmptyState message="No tenants yet. Create your first tenant organization." />
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead><tr><th>Name</th><th>Code</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="hover">
                    <td className="font-medium">{t.name}</td>
                    <td><span className="sp-badge">{t.code}</span></td>
                    <td><span className={`sp-badge ${t.isActive ? 'badge-on' : 'badge-off'}`}>{t.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="subtext">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create tenant" icon={Server} tone="info" formNo="Form No. LGU-IMS-REF-03">
        <form onSubmit={submit} className="sp-form">
          <div className="sp-field">
            <label className="sp-label">Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Quezon City" autoFocus />
          </div>
          <div className="sp-field">
            <label className="sp-label">Code *</label>
            <input className="input font-mono" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} placeholder="quezon-city" />
            <span className="sp-hint">Unique slug used in API headers and URLs.</span>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creating...' : (<><Save size={14} /> Create tenant</>)}
            </button>
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
    } catch (e) { /* silent */ }
  };
  const loadKeys = async () => {
    try {
      const res = await api.get('/api-keys');
      setKeys(res.data.data);
    } catch (e) { /* silent */ }
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
    <div className="sp-animate-in">
      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">Two-factor authentication</div>
            <div className="sp-card-sub">Use an authenticator app to secure your account.</div>
          </div>
          <button
            className={`btn ${twoFaEnabled ? 'btn-error' : 'btn-primary'}`}
            disabled={busy}
            onClick={() => setDisable2FaOpen(true)}
          >
            {twoFaEnabled ? (<><ShieldOff size={14} /> Disable 2FA</>) : (<><ShieldCheck size={14} /> Enable 2FA</>)}
          </button>
        </div>
        <div className="sp-status-row">
          <span className={`sp-status-badge ${twoFaEnabled ? 'badge-on' : 'badge-off'}`}>
            {twoFaEnabled ? 'Enabled' : 'Disabled'}
          </span>
          {!twoFaEnabled && (
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={startSetup}>
              <ShieldCheck size={13} /> Set up 2FA
            </button>
          )}
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">API Keys</div>
            <div className="sp-card-sub">Create keys for programmatic access to the API.</div>
          </div>
        </div>
        <form onSubmit={createKey} className="sp-key-form">
          <input className="input flex-1" placeholder="Key name" required value={keyName} onChange={(e) => setKeyName(e.target.value)} />
          <input className="input" style={{ width: 120 }} type="number" placeholder="Days" value={keyExpiry} onChange={(e) => setKeyExpiry(e.target.value)} />
          <button className="btn btn-primary" disabled={busy} type="submit"><KeyRound size={13} /> Generate</button>
        </form>
        {newKey && (
          <div className="sp-key-banner">
            <div className="sp-key-banner-label">Save this key now — it will not be shown again.</div>
            <div className="sp-key-banner-key">{newKey.key}</div>
          </div>
        )}
        {keys.length > 0 && (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead><tr><th>Name</th><th>Prefix</th><th>Expires</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className="font-medium">{k.name}</td>
                    <td><span className="sp-badge font-mono">{k.keyPrefix}...</span></td>
                    <td className="subtext">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never'}</td>
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

      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title="Set up two-factor authentication" icon={ShieldCheck} tone="success" formNo="Form No. LGU-IMS-SEC-01">
        <p className="modal-hint">Scan this QR code with your authenticator app.</p>
        {qr && <img src={qr} alt="2FA QR" className="sp-qr" />}
        <p className="modal-hint" style={{ marginTop: '0.75rem' }}>Or enter this secret manually:</p>
        <p className="sp-secret">{secret}</p>
        <form onSubmit={enable2FA} className="sp-form">
          <div className="sp-field">
            <label className="sp-label">Verification code</label>
            <input className="input font-mono" style={{ fontSize: '1.25rem', letterSpacing: '0.2em', textAlign: 'center' }} required maxLength={6} inputMode="numeric" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="000000" autoFocus />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={() => setSetupOpen(false)}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <ShieldCheck size={14} /> Enable 2FA
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={disable2FaOpen} onClose={() => { setDisable2FaOpen(false); setDisableCode(''); }} title="Disable two-factor authentication" icon={ShieldOff} tone="danger" formNo="Form No. LGU-IMS-SEC-02">
        <p className="modal-hint">Enter the 6-digit code from your authenticator app to confirm.</p>
        <form onSubmit={disable2FA} className="sp-form">
          <div className="sp-field">
            <label className="sp-label">Verification code</label>
            <input className="input font-mono" style={{ fontSize: '1.25rem', letterSpacing: '0.2em', textAlign: 'center' }} required maxLength={6} inputMode="numeric" value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="000000" autoFocus />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={() => { setDisable2FaOpen(false); setDisableCode(''); }}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" className="btn btn-error" disabled={busy || disableCode.length < 6}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              <ShieldOff size={14} /> Disable 2FA
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!revokeKeyTarget} onClose={() => setRevokeKeyTarget(null)} onConfirm={revokeKey} title="Revoke API key" message="Revoke this API key? This action cannot be undone." />
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
      toast.error(err.response?.data?.message || err.message || 'Backup failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sp-animate-in">
      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">Database Backup</div>
            <div className="sp-card-sub">Download a full PostgreSQL dump of the system database. Run regularly for disaster recovery.</div>
          </div>
        </div>
        <div className="sp-backup-action">
          <button className="btn btn-primary" disabled={busy} onClick={downloadBackup}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : <Download size={16} />}
            Download Backup
          </button>
          <span className="subtext">Format: SQL dump</span>
        </div>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const uiScale = useThemeStore((s) => s.uiScale);
  const setUiScale = useThemeStore((s) => s.setUiScale);
  const font = useThemeStore((s) => s.font);
  const setFont = useThemeStore((s) => s.setFont);
  const accent = useThemeStore((s) => s.accent);
  const setAccent = useThemeStore((s) => s.setAccent);
  const resetAppearance = useThemeStore((s) => s.resetAppearance);

  const isCustomAccent = typeof accent === 'string' && accent.startsWith('#');
  const scalePct = Math.round((uiScale / 16) * 100);

  return (
    <div className="sp-animate-in">
      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">Theme mode</div>
            <div className="sp-card-sub">Light slate or deep-navy dark. Follows your OS on first visit.</div>
          </div>
          <div className="sp-seg" role="radiogroup" aria-label="Theme mode">
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              className={`sp-seg-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={14} /> Light
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              className={`sp-seg-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={14} /> Dark
            </button>
          </div>
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">Interface scale</div>
            <div className="sp-card-sub">Scales text and spacing across the whole app. Applies instantly.</div>
          </div>
          <span className="sp-badge font-mono">{uiScale}px · {scalePct}%</span>
        </div>
        <div className="sp-card-body">
          <input
            type="range"
            className="sp-range"
            aria-label="Interface scale"
            min={SCALE_MIN}
            max={SCALE_MAX}
            step={0.5}
            value={uiScale}
            onChange={(e) => setUiScale(Number(e.target.value))}
          />
          <div className="sp-range-labels">
            <span>Compact</span>
            <span>Default ({SCALE_DEFAULT}px)</span>
            <span>Comfortable</span>
          </div>
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">Font</div>
            <div className="sp-card-sub">Interface typeface. Uses fonts already bundled with the app.</div>
          </div>
          <Type size={16} style={{ color: 'var(--faint)' }} />
        </div>
        <div className="sp-card-body">
          <div className="sp-font-grid" role="radiogroup" aria-label="Interface font">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={font === f.key}
                className={`sp-font-option ${font === f.key ? 'active' : ''}`}
                onClick={() => setFont(f.key)}
              >
                <span className="sp-font-preview" style={f.body ? { fontFamily: f.body } : undefined}>Ag</span>
                <span className="sp-font-name">{f.label}</span>
                <span className="sp-font-desc">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">Accent color</div>
            <div className="sp-card-sub">Primary actions, links, and highlights. Applies instantly.</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetAppearance} title="Reset scale, font, and accent to defaults">
            <RotateCcw size={13} /> Reset all
          </button>
        </div>
        <div className="sp-card-body">
          <div className="sp-swatch-grid" role="radiogroup" aria-label="Accent color">
            {ACCENT_PRESETS.map((a) => (
              <button
                key={a.key}
                type="button"
                role="radio"
                aria-checked={accent === a.key}
                title={a.label}
                aria-label={`Accent: ${a.label}`}
                className={`sp-swatch ${accent === a.key ? 'active' : ''}`}
                onClick={() => setAccent(a.key)}
              >
                <span className="sp-swatch-dot" style={{ background: a.swatch }} />
                <span className="sp-swatch-label">{a.label}</span>
              </button>
            ))}
            <label className={`sp-swatch ${isCustomAccent ? 'active' : ''}`} title="Custom color">
              <input
                type="color"
                className="sp-color"
                aria-label="Custom accent color"
                value={isCustomAccent ? accent : '#1d4ed8'}
                onChange={(e) => setAccent(e.target.value)}
              />
              <span className="sp-swatch-label">{isCustomAccent ? accent.toUpperCase() : 'Custom…'}</span>
            </label>
          </div>
        </div>
      </div>

      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">Preview</div>
            <div className="sp-card-sub">Live preview of your appearance settings.</div>
          </div>
        </div>
        <div className="sp-card-body">
          <div className="sp-preview">
            <h3 className="sp-preview-title">Requisition and Issue Slip</h3>
            <p className="sp-preview-text">
              The quick brown fox jumps over the lazy dog — 0123456789. Accent <a href="#preview" onClick={(e) => e.preventDefault()}>links</a> and
              money <span className="mono">₱12,500.00</span> follow your settings.
            </p>
            <div className="sp-preview-row">
              <button type="button" className="btn btn-primary btn-sm">Primary action</button>
              <button type="button" className="btn btn-outline btn-sm">Outline</button>
              <span className="badge badge-success">PASS</span>
              <span className="badge badge-warning">WARN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
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
    <div className="sp-animate-in">
      <div className="sp-card">
        <div className="sp-card-head">
          <div>
            <div className="sp-card-title">Feature Flags</div>
            <div className="sp-card-sub">Toggle system features. Overrides are runtime-only and reset on server restart.</div>
          </div>
        </div>
        {flags.length === 0 ? <Spinner /> : (
          <div className="sp-flags">
            {flags.map((f) => (
              <div key={f.key} className="sp-flag-row">
                <div className="sp-flag-info">
                  <span className="sp-flag-key">{f.key}</span>
                  <span className="sp-flag-meta">Default: {String(f.defaultValue)} {f.overridden ? '· Runtime override' : ''}</span>
                </div>
                <button
                  className={`sp-toggle ${f.currentValue ? 'on' : ''}`}
                  onClick={() => toggle(f)}
                  role="switch"
                  aria-checked={f.currentValue}
                >
                  <span className="sp-toggle-thumb" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState(user.role === 'WAREHOUSE_STAFF' ? 'categories' : 'departments');
  const isAdmin = user?.role === 'ADMIN';
  const visibleTabs = TABS.filter((t) => t.key === 'tenants' ? isAdmin : t.key !== 'flags' || isAdmin);

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <h1 className="sp-page-title">Settings</h1>
        <p className="sp-page-sub">Manage appearance, categories, departments, tenants, and system settings.</p>
      </div>

      <div className="sp-tab-bar">
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`sp-tab ${active ? 'active' : ''}`}
              title={t.desc}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="sp-content">
        {tab === 'appearance' && <AppearanceTab />}
        {tab === 'categories' && <CategoryTab />}
        {tab === 'departments' && <DepartmentTab />}
        {tab === 'tenants' && <TenantTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'backup' && <BackupTab />}
        {tab === 'flags' && <FlagsTab />}
      </div>
    </div>
  );
}
