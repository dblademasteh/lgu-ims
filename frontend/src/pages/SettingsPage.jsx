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
      </div>
      {tab === 'categories' ? <CategoryTab /> : <DepartmentTab />}
    </div>
  );
}