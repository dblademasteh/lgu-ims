import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, FormModal, Spinner } from '../components/ui';
import { X, Plus, SquarePen, Trash2, Save, Wallet, Building2, Info, AlertTriangle } from 'lucide-react';

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
        actions={isAdmin && <button className="btn btn-primary" onClick={() => { setEditTarget(null); resetForm(); setOpen(true); }}><Plus size={15} /> New Budget</button>}
      />
      <div className="card bg-surface shadow-sm">
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
                            <button className="btn btn-ghost btn-xs" onClick={() => openEdit(b)}><SquarePen size={12} /> Edit</button>
                            <button className="btn btn-ghost btn-xs text-error" onClick={() => setDeleteTarget(b)}><Trash2 size={12} /> Delete</button>
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
          <FormModal
            title={editTarget ? 'Edit Budget Allocation' : 'New Budget Allocation'}
            formNo="Form No. LGU-IMS-BUD-01"
            icon={Wallet}
            tone={editTarget ? 'warning' : 'info'}
            size="modal-md"
            badge={
              editTarget ? (
                <span className="badge badge-sm badge-warning">FY {editTarget.year}</span>
              ) : (
                <span className="badge badge-sm badge-info">Allocation</span>
              )
            }
            onClose={() => { setOpen(false); setEditTarget(null); }}
          >
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {editTarget ? (
                  /* ── Edit mode: Department & Spent context card ── */
                  <div className="budget-dept-card">
                    <div className="budget-dept-card-header">
                      <div className="budget-dept-title">
                        <Building2 size={16} className="text-accent" />
                        <span>{editTarget.department?.name || 'Department'}</span>
                      </div>
                      <span className="badge badge-ghost text-xs font-mono font-semibold">
                        FY {editTarget.year}
                      </span>
                    </div>

                    <div className="budget-stats-grid">
                      <div className="budget-stat-item">
                        <span className="budget-stat-label">Current Budget</span>
                        <span className="budget-stat-value">{fmtMoney(editTarget.amount)}</span>
                      </div>
                      <div className="budget-stat-item">
                        <span className="budget-stat-label">Disbursed</span>
                        <span className="budget-stat-value" style={{ color: 'var(--warning)' }}>
                          {fmtMoney(editTarget.spent)}
                        </span>
                      </div>
                      <div className="budget-stat-item">
                        <span className="budget-stat-label">Remaining</span>
                        <span
                          className="budget-stat-value"
                          style={{ color: editTarget.amount - editTarget.spent < 0 ? 'var(--error)' : 'var(--success)' }}
                        >
                          {fmtMoney(editTarget.amount - editTarget.spent)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--muted)' }}>
                        <span>Utilization</span>
                        <span className="font-mono font-semibold">
                          {editTarget.amount > 0 ? Math.min(100, Math.round((editTarget.spent / editTarget.amount) * 100)) : 0}%
                        </span>
                      </div>
                      <div className="progress">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${editTarget.amount > 0 ? Math.min(100, (editTarget.spent / editTarget.amount) * 100) : 0}%`,
                            background: editTarget.amount > 0 && (editTarget.spent / editTarget.amount) >= 1 ? 'var(--error)' : (editTarget.spent / editTarget.amount) >= 0.8 ? 'var(--warning)' : 'var(--accent)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── New mode: Advisory notice ── */
                  <div className="modal-alert modal-alert--info" style={{ gap: '0.625rem', alignItems: 'center' }}>
                    <Info size={16} className="shrink-0" />
                    <span style={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
                      Set the annual spending ceiling for department RIS requisition approvals.
                    </span>
                  </div>
                )}

                {!editTarget && (
                  <div className="modal-form-grid">
                    <div className="fieldset form-full">
                      <span className="fieldset-legend">Department *</span>
                      <select
                        className="select"
                        required
                        value={form.departmentId}
                        onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                      >
                        <option value="">Select department...</option>
                        {departments.map((d) => {
                          const hasBudget = budgets?.some((b) => b.departmentId === d.id && b.year === Number(form.year));
                          return (
                            <option key={d.id} value={d.id} disabled={hasBudget}>
                              {d.name} {hasBudget ? `(Already allocated for ${form.year})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="fieldset form-full">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="fieldset-legend">Fiscal Year *</span>
                        <div className="budget-quick-pills">
                          {[new Date().getFullYear(), new Date().getFullYear() + 1].map((yr) => (
                            <button
                              key={yr}
                              type="button"
                              className={`budget-pill${Number(form.year) === yr ? ' budget-pill--active' : ''}`}
                              onClick={() => setForm({ ...form, year: yr })}
                            >
                              FY {yr}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        className="input"
                        type="number"
                        min="2000"
                        max="2100"
                        required
                        value={form.year}
                        onChange={(e) => setForm({ ...form, year: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* ── Allocated Amount input ── */}
                <div className="fieldset">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="fieldset-legend">
                      {editTarget ? 'Revised Budget Allocation *' : 'Annual Budget Allocation *'}
                    </span>
                    {Number(form.amount) > 0 && (
                      <span className="text-xs font-mono font-bold text-accent" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoney(form.amount)}
                      </span>
                    )}
                  </div>

                  <div className="budget-currency-input-wrap">
                    <span className="budget-currency-symbol">₱</span>
                    <input
                      className="input budget-currency-input"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      autoFocus={!!editTarget}
                    />
                  </div>

                  {/* Quick increment presets */}
                  <div className="budget-quick-pills" style={{ alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--muted)', marginRight: '0.25rem' }}>Quick add:</span>
                    {[50000, 100000, 500000, 1000000].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        className="budget-pill"
                        onClick={() => {
                          const current = Number(form.amount || 0);
                          setForm({ ...form, amount: String(current + inc) });
                        }}
                      >
                        +{inc >= 1000000 ? `₱${inc / 1000000}M` : `₱${inc / 1000}k`}
                      </button>
                    ))}
                    {Number(form.amount) > 0 && (
                      <button
                        type="button"
                        className="budget-pill"
                        style={{ color: 'var(--error)' }}
                        onClick={() => setForm({ ...form, amount: '' })}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Edit Mode: Live Projection card & warnings ── */}
                {editTarget && Number(form.amount) >= 0 && (
                  <div>
                    {(() => {
                      const newAlloc = Number(form.amount || 0);
                      const spent = Number(editTarget.spent || 0);
                      const currentAlloc = Number(editTarget.amount || 0);
                      const newRemaining = newAlloc - spent;
                      const diff = newAlloc - currentAlloc;
                      const isDeficit = newRemaining < 0;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                          <div className="budget-projection-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Projected Remaining Balance:</span>
                              <span
                                className="font-mono font-bold"
                                style={{ color: isDeficit ? 'var(--error)' : 'var(--success)', fontSize: '0.9375rem' }}
                              >
                                {fmtMoney(newRemaining)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                              <span style={{ color: 'var(--muted)' }}>Net Allocation Adjustment:</span>
                              <span
                                className="font-mono font-semibold"
                                style={{ color: diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--warning)' : 'var(--muted)' }}
                              >
                                {diff > 0 ? `+${fmtMoney(diff)}` : diff < 0 ? `-${fmtMoney(Math.abs(diff))}` : 'No change'}
                              </span>
                            </div>
                          </div>

                          {isDeficit && (
                            <div className="modal-alert modal-alert--error" style={{ gap: '0.625rem', alignItems: 'flex-start' }}>
                              <AlertTriangle size={16} className="shrink-0" style={{ marginTop: '2px' }} />
                              <div style={{ fontSize: '0.8125rem', lineHeight: 1.45 }}>
                                <strong>Deficit Warning:</strong> The revised budget is less than the{' '}
                                <strong>{fmtMoney(spent)}</strong> already disbursed. This will result in an immediate deficit of{' '}
                                <strong>{fmtMoney(Math.abs(newRemaining))}</strong>.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn"
                  onClick={() => { setOpen(false); setEditTarget(null); }}
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy || !form.amount || Number(form.amount) < 0 || (!editTarget && !form.departmentId)}
                >
                  {busy ? <span className="loading loading-spinner loading-xs" /> : editTarget ? <Save size={14} /> : <Plus size={14} />}
                  {editTarget ? 'Save Changes' : 'Create Allocation'}
                </button>
              </div>
            </form>
          </FormModal>
        </Portal>
      )}

      {deleteTarget && (
        <Portal>
          <div
            className="modal-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
          >
            <div className="modal-box modal-sm">
              <div className="modal-header">
                <h3 className="modal-title">Delete Budget</h3>
                <button
                  className="modal-close"
                  onClick={() => setDeleteTarget(null)}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                  Are you sure you want to delete the <strong>FY {deleteTarget.year}</strong> budget allocation for{' '}
                  <strong>{deleteTarget.department?.name}</strong> ({fmtMoney(deleteTarget.amount)})?
                </p>
                {deleteTarget.spent > 0 && (
                  <div className="modal-alert modal-alert--warning" style={{ fontSize: '0.8125rem' }}>
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>
                      <strong>{fmtMoney(deleteTarget.spent)}</strong> has already been disbursed against this budget.
                    </span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setDeleteTarget(null)}>
                  <X size={14} /> Cancel
                </button>
                <button className="btn btn-error" disabled={busy} onClick={confirmDelete}>
                  {busy ? <span className="loading loading-spinner loading-xs" /> : <Trash2 size={14} />}
                  Delete Budget
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}