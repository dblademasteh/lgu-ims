import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Spinner } from '../components/ui';
import { X } from 'lucide-react';

function Portal({ children }) {
  return createPortal(children, document.body);
}

function fmtMoney(v) {
  return `₱${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BudgetPage() {
  const toast = useToast();
  const isAdmin = useCan('ADMIN');
  const [budgets, setBudgets] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ departmentId: '', year: new Date().getFullYear(), amount: '' });

  const resetForm = () => setForm({ departmentId: '', year: new Date().getFullYear(), amount: '' });

  const load = () => {
    api.get('/budgets').then((r) => setBudgets(r.data.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load budgets.'));
  };

  useEffect(load, []);
  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data.data)).catch(() => {});
  }, []);

  const openEdit = (b) => {
    setEditTarget(b);
    setForm({ departmentId: b.departmentId, year: b.year, amount: String(b.amount) });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.departmentId || !form.year || !(Number(form.amount) >= 0)) {
      toast.error('Select a department, year and a valid budget amount.');
      return;
    }
    const payload = { departmentId: form.departmentId, year: Number(form.year), amount: Number(form.amount) };
    setBusy(true);
    try {
      if (editTarget) {
        await api.patch(`/budgets/${editTarget.id}`, { amount: payload.amount });
        toast.success('Budget updated.');
      } else {
        await api.post('/budgets', payload);
        toast.success('Budget created.');
      }
      setOpen(false);
      setEditTarget(null);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save budget.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api.delete(`/budgets/${deleteTarget.id}`);
      toast.success('Budget deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete budget.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Budgets"
        subtitle="Department budget allocations for RIS affordability checks."
        actions={isAdmin && <button className="btn btn-primary" onClick={() => { setEditTarget(null); resetForm(); setOpen(true); }}>New Budget</button>}
      />
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          {!budgets ? <Spinner label="Loading budgets..." /> : budgets.length === 0 ? <EmptyState message="No budgets configured. Set annual allocations so APPROVED requisitions are enforced against them." /> : (
            <div className="overflow-x-auto">
              <table className="table table-sm" aria-label="Budgets table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th className="text-right">Year</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Spent</th>
                    <th className="text-right">Remaining</th>
                    <th className="w-40">Usage</th>
                    {isAdmin && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((b) => {
                    const pct = b.amount > 0 ? Math.min(100, Math.round((b.spent / b.amount) * 100)) : 0;
                    const remaining = b.amount - b.spent;
                    return (
                      <tr key={b.id} className="hover">
                        <td>{b.department?.name}</td>
                        <td className="text-right font-mono">{b.year}</td>
                        <td className="text-right font-mono">{fmtMoney(b.amount)}</td>
                        <td className="text-right font-mono">{fmtMoney(b.spent)}</td>
                        <td className={`text-right font-mono ${remaining < 0 ? 'text-error' : ''}`}>{fmtMoney(remaining)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <progress className={`progress flex-1 ${pct >= 100 ? 'progress-error' : pct >= 80 ? 'progress-warning' : 'progress-primary'}`} value={pct} max="100" />
                            <span className="text-xs opacity-60">{pct}%</span>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="text-right">
                            <button className="btn btn-ghost btn-xs" onClick={() => openEdit(b)}>Edit</button>
                            <button className="btn btn-ghost btn-xs text-error" onClick={() => setDeleteTarget(b)}>Delete</button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {open && (
        <Portal>
          <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setEditTarget(null); } }}>
            <div className="modal-box modal-lg">
              <div className="modal-header">
                <h3 className="modal-title">{editTarget ? 'Edit Budget' : 'New Budget'}</h3>
                <button className="modal-close" onClick={() => { setOpen(false); setEditTarget(null); }}><X size={15} /></button>
              </div>
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="modal-form-grid">
                  <div className="fieldset" style={{ gridColumn: '1 / -1' }}>
                    <span className="fieldset-legend">Department *</span>
                    <select className="select" required disabled={!!editTarget} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                      <option value="">Select...</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="fieldset">
                    <span className="fieldset-legend">Year *</span>
                    <input className="input" type="number" min="2000" max="2100" required value={form.year} disabled={!!editTarget} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                  </div>
                  <div className="fieldset">
                    <span className="fieldset-legend">Allocated Amount (₱) *</span>
                    <input className="input" type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn" onClick={() => { setOpen(false); setEditTarget(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />}{editTarget ? 'Save Changes' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {deleteTarget && (
        <Portal>
          <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
            <div className="modal-box modal-sm">
              <div className="modal-header">
                <h3 className="modal-title">Delete budget</h3>
                <button className="modal-close" onClick={() => setDeleteTarget(null)}><X size={15} /></button>
              </div>
              <div className="modal-body">
                <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>Delete the {deleteTarget.year} budget for {deleteTarget.department?.name}? Existing requisition charges are not affected.</p>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn btn-error" disabled={busy} onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}