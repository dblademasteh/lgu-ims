import { useEffect, useState } from 'react';
import api from '../api/client';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Pagination, Spinner } from '../components/ui';

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

const emptyForm = { username: '', email: '', password: '', fullName: '', role: 'WAREHOUSE_STAFF', departmentId: '' };

export default function UsersPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => {
    const q = new URLSearchParams({ page });
    if (search) q.set('search', search);
    api.get(`/users?${q}`).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load users.'));
  };

  useEffect(load, [page]);
  useEffect(() => { api.get('/departments').then((r) => setDepartments(r.data.data)).catch(() => {}); }, []);

  return (
    <div>
      <PageHeader
        title="User Accounts"
        subtitle="Create and manage system users and their roles (RBAC)."
        actions={
          <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true); }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New user
          </button>
        }
      />

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <label className="input max-w-xs mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="search" className="flex-1" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </label>

          {!data ? (
            <Spinner label="Loading users..." />
          ) : data.data.length === 0 ? (
            <EmptyState message="No users found." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table table-sm">
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
                          <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(u); setOpen(true); }}>Edit</button>
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
        fullName: user.fullName, role: user.role, departmentId: user.departmentId || '',
      });
    }
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        const payload = { fullName: form.fullName, email: form.email, role: form.role, departmentId: form.departmentId || null };
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
    <dialog className="modal modal-open">
      <div className="modal-box max-w-xl">
        <h3 className="font-bold text-lg">{editing ? `Edit user — ${form.username}` : 'New user'}</h3>
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
          <div className="modal-action col-span-full">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              {editing ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}