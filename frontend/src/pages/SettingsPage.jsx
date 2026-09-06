import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Spinner } from '../components/ui';

function CategoryTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const formRef = useRef();
  const [form, setForm] = useState({ name: '', description: '' });

  const load = () => {
    api.get('/categories').then((r) => setData(r.data.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load categories.'));
  };
  useEffect(load, []);

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

  const remove = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      toast.success('Category deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete category.');
    }
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <p className="text-sm text-base-content/60">Item categories used for grouping and reporting.</p>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setOpen(true); }}>Add category</button>
        </div>
        {!data ? <Spinner /> : data.length === 0 ? <EmptyState message="No categories yet." /> : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Name</th><th>Description</th><th>Items</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} className="hover">
                    <td className="font-medium">{c.name}</td>
                    <td className="text-sm opacity-70">{c.description || '—'}</td>
                    <td><span className="badge badge-ghost">{c._count.items}</span></td>
                    <td className="text-right">
                      <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(c); setForm({ name: c.name, description: c.description || '' }); setOpen(true); }}>Edit</button>
                      <button className="btn btn-ghost btn-xs text-error" onClick={() => remove(c)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && (
        <dialog className="modal modal-open" ref={formRef}>
          <div className="modal-box">
            <h3 className="font-bold text-lg">{editing ? 'Edit category' : 'Add category'}</h3>
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
          </div>
        </dialog>
      )}
    </div>
  );
}

function DepartmentTab() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', headName: '' });

  const load = () => {
    api.get('/departments').then((r) => setData(r.data.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load departments.'));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/departments/${editing.id}`, form);
        toast.success('Department updated.');
      } else {
        await api.post('/departments', form);
        toast.success('Department created.');
      }
      setOpen(false);
      setForm({ name: '', code: '', headName: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save department.');
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete department "${d.name}"?`)) return;
    try {
      await api.delete(`/departments/${d.id}`);
      toast.success('Department deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete department.');
    }
  };

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <p className="text-sm text-base-content/60">Office / departments that file requisitions.</p>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ name: '', code: '', headName: '' }); setOpen(true); }}>Add department</button>
        </div>
        {!data ? <Spinner /> : data.length === 0 ? <EmptyState message="No departments yet." /> : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead><tr><th>Name</th><th>Code</th><th>Head</th><th>Users</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id} className="hover">
                    <td className="font-medium">{d.name}</td>
                    <td><span className="badge badge-ghost font-mono">{d.code}</span></td>
                    <td className="text-sm opacity-70">{d.headName || '—'}</td>
                    <td><span className="badge badge-ghost">{d._count.users}</span></td>
                    <td className="text-right">
                      <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(d); setForm({ name: d.name, code: d.code, headName: d.headName || '' }); setOpen(true); }}>Edit</button>
                      <button className="btn btn-ghost btn-xs text-error" onClick={() => remove(d)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {open && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{editing ? 'Edit department' : 'Add department'}</h3>
            <form onSubmit={submit} className="flex flex-col gap-4 mt-4">
              <div className="grid grid-cols-3 gap-3">
                <fieldset className="fieldset col-span-2">
                  <legend className="fieldset-legend">Name *</legend>
                  <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="General Services Office" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Code *</legend>
                  <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="GSO" />
                </fieldset>
              </div>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Head of office</legend>
                <input className="input" value={form.headName} onChange={(e) => setForm({ ...form, headName: e.target.value })} placeholder="Optional" />
              </fieldset>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Save changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState(user.role === 'WAREHOUSE_STAFF' ? 'categories' : 'departments');

  return (
    <div>
      <PageHeader title="Reference Data" subtitle="Manage categories and departments used across the system." />
      <div role="tablist" className="tabs tabs-box w-fit mb-6">
        <button role="tab" className={`tab ${tab === 'categories' ? 'tab-active' : ''}`} onClick={() => setTab('categories')}>Categories</button>
        <button role="tab" className={`tab ${tab === 'departments' ? 'tab-active' : ''}`} onClick={() => setTab('departments')}>Departments</button>
        <button role="tab" className={`tab ${tab === 'security' ? 'tab-active' : ''}`} onClick={() => setTab('security')}>Security</button>
        <button role="tab" className={`tab ${tab === 'backup' ? 'tab-active' : ''}`} onClick={() => setTab('backup')}>Backup</button>
      </div>
      {tab === 'categories' ? <CategoryTab /> : tab === 'departments' ? <DepartmentTab /> : tab === 'security' ? <SecurityTab /> : <BackupTab />}
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

  const loadProfile = async () => {
    try {
      const res = await api.get('/users/me');
      setTwoFaEnabled(res.data.user.twoFactorEnabled || false);
    } catch (e) { /* ignore */ }
  };

  const loadKeys = async () => {
    try {
      const res = await api.get('/api-keys');
      setKeys(res.data.data);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    loadProfile();
    loadKeys();
  }, []);

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

  const disable2FA = async () => {
    if (!window.confirm('Disable two-factor authentication?')) return;
    setBusy(true);
    try {
      await api.post('/auth/2fa/disable', { code: prompt('Enter current 2FA code to disable:') || '' });
      setTwoFaEnabled(false);
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

  const revokeKey = async (id) => {
    if (!window.confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await api.delete(`/api-keys/${id}`);
      loadKeys();
      toast.success('API key revoked.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to revoke API key.');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">Two-factor authentication</h2>
          <p className="text-sm text-base-content/60 mt-1">Use an authenticator app to secure your account.</p>
          {twoFaEnabled ? (
            <div className="mt-4">
              <span className="badge badge-success">Enabled</span>
              <button className="btn btn-error btn-sm mt-3" disabled={busy} onClick={disable2FA}>Disable 2FA</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm mt-3" disabled={busy} onClick={startSetup}>Enable 2FA</button>
          )}
        </div>
      </div>
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">API keys</h2>
          <p className="text-sm text-base-content/60 mt-1">Create keys for programmatic access to the API.</p>
          <form onSubmit={createKey} className="mt-4 flex flex-col gap-3">
            <input className="input input-sm" placeholder="Key name" required value={keyName} onChange={(e) => setKeyName(e.target.value)} />
            <input className="input input-sm" type="number" placeholder="Expires in days (optional)" value={keyExpiry} onChange={(e) => setKeyExpiry(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={busy} type="submit">Generate key</button>
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
                          <button className="btn btn-ghost btn-xs text-error" onClick={() => revokeKey(k.id)}>Revoke</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      {setupOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg">Set up two-factor authentication</h3>
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
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setSetupOpen(false)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}

function BackupTab() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const downloadBackup = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/backup', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error((await res.json()).message || 'Backup failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
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
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title text-base">Database Backup</h2>
        <p className="text-sm text-base-content/60 mt-1">Download a full PostgreSQL dump of the system database. Run regularly for disaster recovery.</p>
        <div className="mt-4">
          <button className="btn btn-primary" disabled={busy} onClick={downloadBackup}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
            Download Backup
          </button>
        </div>
      </div>
    </div>
  );
}