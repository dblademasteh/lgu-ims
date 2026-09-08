import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Eye, SquarePen, Send, CheckCircle2, XCircle, Save, ClipboardList, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Badge, EmptyState, FormModal, Pagination, Spinner } from '../components/ui';

function Portal({ children }) { return createPortal(children, document.body); }

/**
 * Sortable header cell with chevron indicator.
 * sortKey — the sortBy value passed to the API; label — visible text.
 */
function SortHeader({ sortKey, label, activeKey, activeDir, onSort, right }) {
  const active = activeKey === sortKey;
  const Icon = active ? (activeDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <button
      type="button"
      className={`sort-header ${right ? 'sort-header--right' : ''}`}
      title={`Sort by ${label}`}
      onClick={() => onSort(sortKey, active && activeDir === 'asc' ? 'desc' : 'asc')}
    >
      <span>{label}</span>
      <Icon size={13} style={{ color: active ? 'var(--accent)' : 'var(--muted)' }} />
    </button>
  );
}

const COUNT_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function PhysicalCountsPage() {
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN');
  const canApprove = useCan('ADMIN', 'PROPERTY_CUSTODIAN');
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [sortKey, setSortKey] = useState('countDate');
  const [sortDir, setSortDir] = useState('desc');
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [items, setItems] = useState([]);
  const [itemCache, setItemCache] = useState({});
  const [itemSearch, setItemSearch] = useState('');
  const [form, setForm] = useState({ departmentId: '', countDate: todayLocal(), remarks: '', lines: [{ itemId: '', countedQuantity: 1 }] });
  const [busy, setBusy] = useState(false);
  const [editCount, setEditCount] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const resetForm = () => setForm({ departmentId: '', countDate: todayLocal(), remarks: '', lines: [{ itemId: '', countedQuantity: 1 }] });

  const cacheItems = (list) => {
    if (!Array.isArray(list) || list.length === 0) return;
    setItemCache((prev) => {
      const next = { ...prev };
      for (const it of list) {
        if (it && it.id && !next[it.id]) next[it.id] = it;
      }
      return next;
    });
  };

  const openEdit = async (pc) => {
    try {
      const res = await api.get(`/physical-counts/${pc.id}`);
      const c = res.data.data;
      cacheItems((c.items || []).map((it) => it.item).filter(Boolean));
      setEditCount(c);
      setForm({
        departmentId: c.departmentId,
        countDate: String(c.countDate).slice(0, 10),
        remarks: c.remarks || '',
        lines: (c.items || []).map((it) => ({ itemId: it.itemId, countedQuantity: Number(it.countedQuantity) || 0 })),
      });
      setOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load count for editing.');
    }
  };

  const openDetail = async (pc) => {
    setDetailBusy(true);
    setDetail(null);
    try {
      const res = await api.get(`/physical-counts/${pc.id}`);
      const c = res.data.data;
      cacheItems((c.items || []).map((it) => it.item).filter(Boolean));
      setDetail(c);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load count detail.');
    } finally {
      setDetailBusy(false);
    }
  };

  const load = () => {
    const q = new URLSearchParams({ page, sortBy: sortKey, sortDir });
    if (status) q.set('status', status);
    if (departmentId) q.set('departmentId', departmentId);
    api.get(`/physical-counts?${q}`).then((r) => setData(r.data)).catch((e) => toast.error(e.response?.data?.message || 'Unable to load physical counts.'));
  };

  const onSort = (key, dir) => { setSortKey(key); setSortDir(dir); };

  useEffect(load, [page, status, departmentId, sortKey, sortDir]);
  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data.data)).catch(() => {});
  }, []);

  // Item source for the count lines. The catalog can exceed any fixed limit,
  // so the picker searches server-side (name / SKU / description).
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      const q = new URLSearchParams({ limit: 200, isActive: 'true' });
      if (itemSearch.trim()) {
        q.set('limit', 50);
        q.set('search', itemSearch.trim());
      }
      api.get(`/items?${q}`).then((r) => {
        if (cancelled) return;
        const list = r.data.data || [];
        setItems(list);
        cacheItems(list);
      }).catch(() => {});
    }, itemSearch ? 300 : 0);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemSearch, open]);

  // Dropdown options for one line: fetched results plus the already-picked
  // item (from cache) so a selection never disappears from its own select.
  const optionsForRow = (pickedId) => {
    if (!pickedId || items.some((i) => i.id === pickedId)) return items;
    const cached = itemCache[pickedId];
    return cached ? [cached, ...items] : items;
  };
  const onHandOf = (id) => {
    const live = items.find((i) => i.id === id) || itemCache[id];
    return live ? Number(live.currentStock) || 0 : 0;
  };

  // Detail modal chrome: lock scroll + Escape to close.
  useEffect(() => {
    if (!detail && !detailBusy) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { setDetail(null); setDetailBusy(false); }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [detail, detailBusy]);

  // New/edit modal chrome: lock scroll + Escape to close (no backdrop-click dismiss).
  useEffect(() => {
    if (!open) return;
    setItemSearch('');
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); setEditCount(null); }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    // Zero is a legitimate count (stockout) — only drop rows with no item chosen.
    const chosen = form.lines.filter((l) => l.itemId);
    if (chosen.length === 0) {
      toast.error('Add at least one item to count.');
      return;
    }
    const seen = new Set();
    const dup = chosen.some((l) => {
      if (seen.has(l.itemId)) return true;
      seen.add(l.itemId);
      return false;
    });
    if (dup) {
      toast.error('Each item may only appear once per count.');
      return;
    }
    if (chosen.some((l) => l.countedQuantity === '' || Number(l.countedQuantity) < 0 || Number.isNaN(Number(l.countedQuantity)))) {
      toast.error('Counted quantities must be 0 or more.');
      return;
    }
    const itemsPayload = chosen
      .map((l) => {
        return { itemId: l.itemId, systemQuantity: onHandOf(l.itemId), countedQuantity: Number(l.countedQuantity) || 0 };
      });
    setBusy(true);
    try {
      if (editCount) {
        await api.patch(`/physical-counts/${editCount.id}`, { departmentId: form.departmentId, countDate: form.countDate, remarks: form.remarks, items: itemsPayload });
        toast.success('Physical count updated.');
      } else {
        await api.post('/physical-counts', { departmentId: form.departmentId, countDate: form.countDate, remarks: form.remarks, items: itemsPayload });
        toast.success('Physical count created.');
      }
      setOpen(false);
      setEditCount(null);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save physical count.');
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id, action) => {
    try {
      await api.post(`/physical-counts/${id}/${action}`);
      toast.success(`Physical count ${action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : 'rejected'}.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || `Unable to ${action} physical count.`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Physical Count"
        subtitle="COA inventory-taking worksheet with variance detection."
        actions={canManage && <button className="btn btn-primary" onClick={() => { setEditCount(null); resetForm(); setOpen(true); }}><Plus size={15} /> New Count</button>}
      />
      <div className="card bg-surface shadow-sm">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <select className="select select-sm" style={{ width: '10rem' }} aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {COUNT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="select select-sm" style={{ width: '12rem' }} aria-label="Filter by department" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}>
              <option value="">All departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {!data ? <Spinner label="Loading physical counts..." /> : data.data.length === 0 ? <EmptyState message="No physical counts found." /> : (
            <div className="overflow-x-auto">
              <table className="table table-sm" aria-label="Physical counts table">
                <thead><tr><th><SortHeader sortKey="countDate" label="Date" activeKey={sortKey} activeDir={sortDir} onSort={onSort} /></th><th><SortHeader sortKey="department" label="Department" activeKey={sortKey} activeDir={sortDir} onSort={onSort} /></th><th className="text-right"><SortHeader sortKey="lines" label="Lines" activeKey={sortKey} activeDir={sortDir} onSort={onSort} right /></th><th className="text-right"><SortHeader sortKey="variance" label="Variance" activeKey={sortKey} activeDir={sortDir} onSort={onSort} right /></th><th><SortHeader sortKey="status" label="Status" activeKey={sortKey} activeDir={sortDir} onSort={onSort} /></th><th>Remarks</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {data.data.map((pc) => (
                    <tr key={pc.id} className="hover">
                      <td className="whitespace-nowrap">{new Date(pc.countDate).toLocaleDateString()}</td>
                      <td>
                        <span className="font-medium">{pc.department?.name}</span>
                        <span className="text-xs opacity-60 block">{pc.createdBy?.fullName ? `Counted by ${pc.createdBy.fullName}` : `@${pc.createdBy?.username || '—'}`}</span>
                      </td>
                      <td className="text-right font-mono">{pc.itemCount ?? '—'}</td>
                      <td className="text-right">
                        {pc.varianceCount == null ? (
                          '—'
                        ) : pc.varianceCount === 0 ? (
                          <span className="badge badge-success">0 · balanced</span>
                        ) : (
                          <span className="badge badge-warning" title={`Net variance ${pc.netVariance ?? 0}`}>
                            {pc.varianceCount} line{pc.varianceCount === 1 ? '' : 's'} · {Number(pc.netVariance) > 0 ? '+' : ''}{Number(pc.netVariance ?? 0).toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td><Badge status={pc.status}>{pc.status}</Badge></td>
                      <td className="text-xs opacity-70">{pc.remarks || '—'}</td>
                      <td className="text-right">
                        <span style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.375rem' }}>
                          <button type="button" className="badge badge-ghost" style={{ cursor: 'pointer' }} onClick={() => openDetail(pc)} title="View count detail"><Eye size={11} /> View</button>
                          {canManage && pc.status === 'DRAFT' && (
                            <button type="button" className="badge badge-info" style={{ cursor: 'pointer' }} onClick={() => openEdit(pc)} title="Edit draft count"><SquarePen size={11} /> Edit</button>
                          )}
                          {canManage && ['DRAFT', 'REJECTED'].includes(pc.status) && (
                            <button type="button" className={`badge ${pc.status === 'REJECTED' ? 'badge-warning' : 'badge-primary'}`} style={{ cursor: 'pointer' }} onClick={() => updateStatus(pc.id, 'submit')} title={pc.status === 'REJECTED' ? 'Resubmit for approval' : 'Submit for approval'}><Send size={11} /> {pc.status === 'REJECTED' ? 'Resubmit' : 'Submit'}</button>
                          )}
                          {canApprove && pc.status === 'SUBMITTED' && (
                            <>
                              <button type="button" className="badge badge-success" style={{ cursor: 'pointer' }} onClick={() => updateStatus(pc.id, 'approve')} title="Approve and adjust stock"><CheckCircle2 size={11} /> Approve</button>
                              <button type="button" className="badge badge-error" style={{ cursor: 'pointer' }} onClick={() => updateStatus(pc.id, 'reject')} title="Reject back to draft"><XCircle size={11} /> Reject</button>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && <Pagination meta={data.meta} onPage={setPage} />}
        </div>
      </div>

      {open && (
        <Portal>
          <FormModal
            title={editCount ? 'Edit Physical Count' : 'New Physical Count'}
            formNo="Form No. LGU-IMS-PC-01"
            icon={ClipboardList}
            tone="info"
            size="modal-lg"
            onClose={() => { setOpen(false); setEditCount(null); }}
          >
            <div className="modal-body">
              <form id="pc-form" onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <fieldset className="fieldset"><legend className="fieldset-legend">Department *</legend>
                  <select className="select" required aria-label="Department" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                    <option value="">Select...</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </fieldset>
                <fieldset className="fieldset"><legend className="fieldset-legend">Count Date *</legend>
                  <input type="date" className="input" required aria-label="Count date" max={todayLocal()} value={form.countDate} onChange={(e) => setForm({ ...form, countDate: e.target.value })} />
                </fieldset>
                <fieldset className="fieldset sm:col-span-2"><legend className="fieldset-legend">Remarks</legend>
                  <input className="input" aria-label="Remarks" placeholder="Optional notes" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </fieldset>
                <div className="sm:col-span-2">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <div className="font-semibold text-sm">Items to count</div>
                    <div className="relative" style={{ minWidth: '12rem', flex: '1 1 12rem', maxWidth: '20rem' }}>
                      <input
                        type="search"
                        className="input input-sm w-full"
                        aria-label="Search catalog items"
                        placeholder="Search catalog: name or SKU…"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  {form.lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_7rem_2rem] gap-2 mb-2 items-end">
                      <select className="select" required aria-label={`Counted item ${idx + 1}`} value={line.itemId} onChange={(e) => { const next = [...form.lines]; next[idx].itemId = e.target.value; setForm({ ...form, lines: next }); }}>
                        <option value="">Select item...</option>
                        {optionsForRow(line.itemId).map((i) => (
                          <option key={i.id} value={i.id} disabled={form.lines.some((l, li) => li !== idx && l.itemId === i.id)}>
                            {i.name} ({i.sku}) — on hand: {Number(i.currentStock) || 0} {i.unit}
                          </option>
                        ))}
                      </select>
                      <input className="input" type="number" min="0" step="any" required aria-label={`Counted quantity ${idx + 1}`} placeholder="Counted qty" value={line.countedQuantity}
                        onChange={(e) => { const next = [...form.lines]; next[idx].countedQuantity = e.target.value; setForm({ ...form, lines: next }); }} />
                      {form.lines.length > 1 && (
                        <button type="button" aria-label={`Remove row ${idx + 1}`} className="btn btn-ghost btn-sm btn-square text-error" onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) })}><X size={14} /></button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, lines: [...form.lines, { itemId: '', countedQuantity: 1 }] })}><Plus size={13} /> Add item</button>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => { setOpen(false); setEditCount(null); }}>
                <X size={14} /> Cancel
              </button>
              <button type="submit" form="pc-form" className="btn btn-primary" disabled={busy}>{busy && <span className="loading loading-spinner loading-xs" />}<Save size={14} />{editCount ? 'Save Changes' : 'Create'}</button>
            </div>
          </FormModal>
        </Portal>
      )}

      {(detail || detailBusy) && (
        <Portal>
          <div className="modal-backdrop">
            <div className="modal-box modal-xl" role="dialog" aria-modal="true" aria-label="Physical count detail">
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Physical Count Detail</h3>
                  {detail && (
                    <p className="modal-subtitle">
                      {detail.department?.name} · {new Date(detail.countDate).toLocaleDateString()} · Counted by {detail.createdBy?.fullName || detail.createdBy?.username || '—'}
                    </p>
                  )}
                </div>
                <button className="modal-close" aria-label="Close dialog" onClick={() => { setDetail(null); setDetailBusy(false); }}><X size={15} /></button>
              </div>
              <div className="modal-body">
              {detailBusy && !detail ? <Spinner label="Loading count detail..." /> : detail && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div><span className="opacity-60">Department:</span> {detail.department?.name}</div>
                    <div><span className="opacity-60">Date:</span> {new Date(detail.countDate).toLocaleDateString()}</div>
                    <div><span className="opacity-60">Status:</span> <Badge status={detail.status}>{detail.status}</Badge></div>
                    <div><span className="opacity-60">Counted by:</span> {detail.createdBy?.fullName || '—'} <span className="text-xs opacity-60">@{detail.createdBy?.username || '—'}</span></div>
                    <div className="col-span-full"><span className="opacity-60">Remarks:</span> {detail.remarks || '—'}</div>
                  </div>
                  <div className="overflow-x-auto mt-4">
                    <table className="table table-sm" aria-label="Physical count items table">
                      <thead><tr><th>Item</th><th className="text-right">System</th><th className="text-right">Counted</th><th className="text-right">Variance</th>{(detail.items || []).some((it) => it.remarks) && <th>Remarks</th>}</tr></thead>
                      <tbody>
                        {detail.items?.map((it) => (
                          <tr key={it.id} className="hover">
                            <td>{it.item?.name} <span className="text-xs opacity-60">({it.item?.sku})</span></td>
                            <td className="text-right">{Number(it.systemQuantity).toLocaleString()}</td>
                            <td className="text-right">{Number(it.countedQuantity).toLocaleString()}</td>
                            <td className={`text-right ${Number(it.variance) > 0 ? 'text-success' : Number(it.variance) < 0 ? 'text-error' : 'opacity-40'}`}>
                              {Number(it.variance) > 0 ? '+' : ''}{Number(it.variance).toLocaleString()}
                            </td>
                            {(detail.items || []).some((x) => x.remarks) && <td className="text-xs opacity-70">{it.remarks || '—'}</td>}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td className="font-semibold">Total ({(detail.items || []).length} lines, {(detail.items || []).filter((it) => Number(it.variance) !== 0).length} with variance)</td>
                          <td className="text-right font-semibold">{(detail.items || []).reduce((s, it) => s + (Number(it.systemQuantity) || 0), 0).toLocaleString()}</td>
                          <td className="text-right font-semibold">{(detail.items || []).reduce((s, it) => s + (Number(it.countedQuantity) || 0), 0).toLocaleString()}</td>
                          <td className="text-right font-semibold">
                            {(() => {
                              const net = (detail.items || []).reduce((s, it) => s + (Number(it.variance) || 0), 0);
                              return `${net > 0 ? '+' : ''}${net.toLocaleString()}`;
                            })()}
                          </td>
                          {(detail.items || []).some((it) => it.remarks) && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => { setDetail(null); setDetailBusy(false); }}>
                  <X size={14} /> Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
