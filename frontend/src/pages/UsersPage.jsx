import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UploadCloud, UserPlus, SquarePen, Save, UserRound } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, FormModal, Pagination, Spinner } from '../components/ui';

function Portal({ children }) { return createPortal(children, document.body); }

const ROLES = ['ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR', 'DEPARTMENT_HEAD'];

const ROLE_LABEL = {
  ADMIN: 'Admin',
  WAREHOUSE_STAFF: 'Warehouse Staff',
  PROPERTY_CUSTODIAN: 'Property Custodian',
  AUDITOR: 'Auditor',
  DEPARTMENT_HEAD: 'Department Head',
};

const ROLE_STYLE = {
  ADMIN: 'bg-neutral/15 text-neutral',
  WAREHOUSE_STAFF: 'bg-info/15 text-info',
  PROPERTY_CUSTODIAN: 'bg-primary/15 text-primary',
  AUDITOR: 'bg-success/15 text-success',
  DEPARTMENT_HEAD: 'bg-warning/15 text-warning',
};

const emptyForm = { username: '', email: '', password: '', fullName: '', role: 'WAREHOUSE_STAFF', departmentId: '', isActive: true };

export default function UsersPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = () => {
    const q = new URLSearchParams({ page });
    if (search) q.set('search', search);
    if (roleFilter) q.set('role', roleFilter);
    if (statusFilter) q.set('isActive', statusFilter);
    api.get(`/users?${q}`).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load users.'));
  };

  useEffect(load, [page, search, roleFilter, statusFilter]);
  useEffect(() => { api.get('/departments').then((r) => setDepartments(r.data.data)).catch(() => {}); }, []);

  return (
    <div>
      <PageHeader
        title="User Accounts"
        subtitle="Create and manage system users and their roles (RBAC)."
        actions={
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={() => setImportOpen(true)}>
              <UploadCloud size={15} />
              Import CSV
            </button>
            <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true); }}>
              <UserPlus size={15} />
              New user
            </button>
          </div>
        }
      />

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <label className="input flex-1 md:max-w-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
              <input type="search" className="flex-1" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </label>
            <select className="select md:w-48" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">All roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            <select className="select md:w-40" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {!data ? (
            <Spinner label="Loading users..." />
          ) : data.data.length === 0 ? (
            <EmptyState message="No users found." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table table-sm" aria-label="User accounts table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((u) => (
                      <tr key={u.id} className="hover">
                        <td>
                          <div className="font-medium">{u.fullName}</div>
                          <div className="text-xs opacity-60">@{u.username} · {u.email}</div>
                        </td>
                        <td><span className={`badge ${ROLE_STYLE[u.role] || 'badge-ghost'}`}>{ROLE_LABEL[u.role] || u.role}</span></td>
                        <td>{u.department?.name || <span className="opacity-40">—</span>}</td>
                        <td>{u.isActive ? <span className="badge badge-success">Active</span> : <span className="badge badge-error">Inactive</span>}</td>
                        <td className="text-right">
                          <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(u); setOpen(true); }}><SquarePen size={12} /> Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination meta={data.meta} onPage={setPage} />
            </>
          )}
        </div>
      </div>

      {open && (
        <UserFormModal
          user={editing}
          departments={departments}
          roles={ROLES.map((r) => ({ code: r, label: ROLE_LABEL[r] }))}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); load(); }}
        />
      )}

      {importOpen && (
        <ImportUsersModal onClose={() => setImportOpen(false)} onImported={load} />
      )}
    </div>
  );
}

function UserFormModal({ user, departments, roles, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(user);
  const [form, setForm] = useState(emptyForm);
  const [passwordReset, setPasswordReset] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username, email: user.email, password: '',
        fullName: user.fullName, role: user.role, departmentId: user.departmentId || '', isActive: user.isActive,
      });
    }
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        const payload = { fullName: form.fullName, email: form.email, role: form.role, departmentId: form.departmentId || null, isActive: form.isActive };
        if (passwordReset) payload.password = passwordReset;
        await api.patch(`/users/${user.id}`, payload);
        toast.success('User updated.');
      } else {
        await api.post('/users', { ...form, departmentId: form.departmentId || null });
        toast.success('User created.');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save user.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Portal>
      <FormModal
        title={editing ? `Edit user — ${form.username}` : 'New user'}
        formNo="Form No. LGU-IMS-USR-01"
        icon={UserRound}
        tone="info"
        size="modal-lg"
        onClose={onClose}
      >
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {!editing && (
              <>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Username *</legend>
                  <input className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="juan.dc" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Email *</legend>
                  <input className="input" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@lgu.local" />
                </fieldset>
                <fieldset className="fieldset sm:col-span-2">
                  <legend className="fieldset-legend">Temporary password *</legend>
                  <input className="input" required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" />
                </fieldset>
              </>
            )}
            <fieldset className="fieldset sm:col-span-2">
              <legend className="fieldset-legend">Full name *</legend>
              <input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Role *</legend>
              <select className="select" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roles.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Department</legend>
              <select className="select" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </fieldset>
            {editing && (
              <fieldset className="fieldset sm:col-span-2">
                <legend className="fieldset-legend">Reset password (optional)</legend>
                <input className="input" type="password" value={passwordReset} onChange={(e) => setPasswordReset(e.target.value)} placeholder="Leave blank to keep current password" />
              </fieldset>
            )}
            {editing && (
              <fieldset className="fieldset sm:col-span-2">
                <legend className="fieldset-legend">Account status</legend>
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" className="toggle toggle-primary" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  <span>{form.isActive ? 'Active' : 'Inactive'}</span>
                </label>
              </fieldset>
            )}
            <div className="modal-footer col-span-full">
              <button type="button" className="btn" onClick={onClose}>
                <X size={14} /> Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <span className="loading loading-spinner loading-xs" />}
                <Save size={14} /> {editing ? 'Save changes' : 'Create user'}
              </button>
            </div>
          </form>
      </FormModal>
    </Portal>
  );
}

function ImportUsersModal({ onClose, onImported }) {
  const toast = useToast();
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!csv.trim()) { toast.error('CSV content is required.'); return; }
    setBusy(true);
    try {
      const res = await api.post('/users/import', { csv });
      toast.success(res.data.message);
      onImported();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const sampleCSV = 'username,email,fullname,role,department,isActive\njuan.delacruz,lgu.juan@lgu.local,Juan M. Dela Cruz,WAREHOUSE_STAFF,Engineering,true\nmaria.santos,lgu.maria@lgu.local,Maria F. Santos,PROPERTY_CUSTODIAN,Administration,true';

  return (
    <Portal>
      <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal-box modal-md">
          <div className="modal-header">
            <h3 className="modal-title">Import Users from CSV</h3>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
          <p className="text-sm text-base-content/60 mt-1">Upload a CSV with columns: username, email, fullname, role, department, isActive. Existing users (by username or email) will be updated. Default password for new users: <strong>LguIms2026!</strong></p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">CSV content</legend>
              <textarea className="textarea font-mono text-xs" rows={10} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={sampleCSV} />
            </fieldset>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={onClose}>
                <X size={14} /> Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <span className="loading loading-spinner loading-xs" />}
                <UploadCloud size={14} /> Import
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
