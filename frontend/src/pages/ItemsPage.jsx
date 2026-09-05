import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Badge, EmptyState, Money, Pagination, Spinner } from '../components/ui';
import ScanModal from '../components/ScanModal';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

export default function ItemsPage() {
  const [params] = useSearchParams();
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF');
  const canAdjust = useCan('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN');

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(params.get('lowStock') === '1');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [qrs, setQrs] = useState(null);
  const [busyCsv, setBusyCsv] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const imageInputRef = useRef(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const loadCategories = () => {
    api.get('/categories').then((r) => setCategories(r.data.data)).catch(() => {});
  };

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams({ page, limit });
    if (search) q.set('search', search);
    if (categoryId) q.set('categoryId', categoryId);
    if (lowStockOnly) q.set('lowStock', 'true');
    api.get(`/items?${q}`)
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e.response?.data?.message || 'Unable to load items.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, categoryId, lowStockOnly]);

  useEffect(() => { loadCategories(); }, []);

  const filtered = useMemo(() => data?.data || [], [data]);

  const onScan = async (code) => {
    setScanOpen(false);
    try {
      const res = await api.get(`/items/lookup/${encodeURIComponent(code)}`);
      setScanResult(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || `No item found for "${code}".`);
    }
  };

  const openEdit = (item) => {
    setEditing(item);
    setEditOpen(true);
  };

  const showQR = async (item) => {
    try {
      const res = await api.get(`/items/${item.id}/qr`);
      setQrs(res.data.data);
    } catch (err) {
      toast.error('Unable to generate QR code.');
    }
  };

  const fileRef = useRef(null);
  const exportItems = () => api.get('/items/export', { responseType: 'blob' }).then((r) => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `items-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }).catch((e) => toast.error(e.response?.data?.message || 'Unable to export items.'));

  const importItems = async (file) => {
    const text = await file.text();
    setBusyCsv(true);
    try {
      const res = await api.post('/items/import', { csv: text });
      toast.success(res.data.message);
      setPage(1);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to import CSV.');
    } finally {
      setBusyCsv(false);
    }
  };

  const archive = async (item) => {
    if (!window.confirm(`Archive "${item.name}"? It can be restored by an administrator.`)) return;
    try {
      await api.delete(`/items/${item.id}`);
      toast.success('Item archived.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to archive item.');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const bulkArchive = async () => {
    if (!window.confirm(`Archive ${selectedIds.size} selected item(s)?`)) return;
    setBusyCsv(true);
    try {
      await Promise.all([...selectedIds].map((id) => api.delete(`/items/${id}`)));
      toast.success(`${selectedIds.size} item(s) archived.`);
      setSelectedIds(new Set());
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to archive some items.');
    } finally {
      setBusyCsv(false);
    }
  };

  const triggerImageUpload = (item) => {
    setSelected(item);
    setImageFile(null);
    setImagePreview('');
    imageInputRef.current?.click();
  };

  const onImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!imageFile || !selected) return;
    const form = new FormData();
    form.append('image', imageFile);
    try {
      await api.post(`/items/${selected.id}/image`, form);
      toast.success('Image uploaded.');
      setImageFile(null);
      setImagePreview('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to upload image.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Items & Stock"
        subtitle="Manage stock items, issue labels and scan barcodes / QR codes."
        actions={
          <>
            {canManage && (
              <button className="btn btn-primary" onClick={() => { setEditing(null); setEditOpen(true); }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                New Item
              </button>
            )}
            <button className="btn btn-outline" disabled={busyCsv} onClick={exportItems}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
              Export CSV
            </button>
            {canManage && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importItems(f);
                    e.target.value = '';
                  }}
                />
                <button className="btn btn-outline" disabled={busyCsv} onClick={() => fileRef.current?.click()}>
                  {busyCsv && <span className="loading loading-spinner loading-xs" />}
                  Import CSV
                </button>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => setScanOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 0 0114 0z" /></svg>
              Scan code
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onImageSelected} />
          </>
        }
      />

      {scanResult && (
        <div role="alert" className="alert alert-success mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <span className="font-medium">{scanResult.name}</span>
            <span className="text-sm opacity-70 font-mono">{scanResult.sku}</span>
            <span className="badge badge-lg">Stock: {scanResult.currentStock} {scanResult.unit}</span>
            {canAdjust && (
              <button
                className="btn btn-primary btn-sm ml-auto"
                onClick={() => { setSelected(scanResult); setAdjustOpen(true); setScanResult(null); }}
              >
                Record movement
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setScanResult(null)}>✕</button>
          </div>
        </div>
      )}

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <label className="input md:max-w-xs flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="search"
                placeholder="Search name or SKU..."
                className="flex-1"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </label>
            <select className="select md:w-56" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label className="flex items-center gap-2 cursor-pointer px-2">
              <input type="checkbox" className="checkbox checkbox-sm" checked={lowStockOnly} onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }} />
              <span className="text-sm">Low stock only</span>
            </label>
          </div>

          {loading ? (
            <Spinner label="Loading items..." />
          ) : filtered.length === 0 ? (
            <EmptyState message="No items found. Adjust filters or add a new item." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>
                      {canManage && (
                        <input type="checkbox" className="checkbox checkbox-sm" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
                      )}
                    </th>
                    <th>Image</th>
                    <th>SKU</th>
                    <th>Item / Description</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th className="text-right">On Hand</th>
                    <th className="text-right">Reorder</th>
                    <th className="text-right">Unit Cost</th>
                    <th>Stock No.</th>
                    <th>Fund</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={i.id} className="hover">
                      <td>
                        {canManage && (
                          <input type="checkbox" className="checkbox checkbox-sm" checked={selectedIds.has(i.id)} onChange={() => toggleSelect(i.id)} />
                        )}
                      </td>
                      <td>
                        {i.imageUrl ? (
                          <img src={i.imageUrl} alt={i.name} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <span className="text-xs opacity-40">—</span>
                        )}
                      </td>
                      <td className="font-mono text-xs">{i.sku}</td>
                      <td>
                        <div className="font-medium">{i.name}</div>
                        {i.description && <div className="text-xs opacity-60">{i.description}</div>}
                      </td>
                      <td>{i.category?.name}</td>
                      <td>{i.unit}</td>
                      <td className="text-right font-semibold">{fmt(i.currentStock)}</td>
                      <td className="text-right">{fmt(i.reorderThreshold)}</td>
                      <td className="text-right"><Money value={i.unitCost} /></td>
                      <td className="font-mono text-xs">{i.stockNumber || '—'}</td>
                      <td className="font-mono text-xs">{i.fundCluster || '—'}</td>
                       <td>{i.lowStock ? <Badge status="Low">Low</Badge> : <Badge status="OK">OK</Badge>}</td>
                       <td>{i.isAccountable ? <Badge status="info">PAR</Badge> : <span className="text-xs opacity-40">—</span>}</td>
                       <td>
                        <div className="flex justify-end gap-1">
                          {canManage && (
                            <button className="btn btn-ghost btn-xs" title="Upload image" onClick={() => triggerImageUpload(i)}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.5-4.5a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 12m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" /></svg>
                            </button>
                          )}
                          <button className="btn btn-ghost btn-xs" title="QR code" onClick={() => showQR(i)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M18 10h-2V7m-7-3H4m0 0h4m-4 0v4m12 0v4M4 20h4m-4-4v4" /></svg>
                          </button>
                          {canAdjust && (
                            <button className="btn btn-ghost btn-xs" title="Record movement" onClick={() => { setSelected(i); setAdjustOpen(true); }}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" /></svg>
                            </button>
                          )}
                          {canAdjust && (
                            <button className="btn btn-ghost btn-xs" title="View" onClick={() => openEdit(i)}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 112.8 2.8L11 15l-4 1 1-4 8.6-8.6z" /></svg>
                            </button>
                          )}
                          {canAdjust && (
                            <button className="btn btn-ghost btn-xs text-error" title="Archive" onClick={() => archive(i)}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.9 12.1a1 1 0 01-1 .9H6.9a1 1 0 01-1-.9L5 7m5 4v6m4-6v6M4 7h16M7 7l1-3h8l1 3" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedIds.size > 0 && (
                <div className="flex items-center justify-between mt-3 p-2 bg-base-200 rounded">
                  <span className="text-sm">{selectedIds.size} selected</span>
                  <button className="btn btn-error btn-sm" disabled={busyCsv} onClick={bulkArchive}>
                    {busyCsv && <span className="loading loading-spinner loading-xs" />}
                    Archive selected
                  </button>
                </div>
              )}
              <Pagination meta={data?.meta} onPage={setPage} />
            </div>
          )}
        </div>
      </div>

      {canManage && (
        <ItemFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          item={editing}
          categories={categories}
          onSaved={() => { setEditOpen(false); load(); }}
          isView={false}
        />
      )}

      {canAdjust && selected && (
        <AdjustModal
          item={selected}
          onClose={() => setAdjustOpen(false)}
          onSaved={() => { setAdjustOpen(false); setSelected(null); load(); }}
        />
      )}

      {qrs && <QRModal qr={qrs} onClose={() => setQrs(null)} />}

      {imagePreview && (
        <dialog className={`modal ${imagePreview ? 'modal-open' : ''}`}>
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg">Upload image</h3>
            <p className="text-sm text-base-content/60 mt-1">{selected?.name}</p>
            <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-contain mt-3 rounded" />
            <div className="modal-action">
              <button className="btn" onClick={() => { setImagePreview(''); setImageFile(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={uploadImage}>Upload</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => { setImagePreview(''); setImageFile(null); }}>close</button></form>
        </dialog>
      )}

      {scanOpen && <ScanModal onScan={onScan} onClose={() => setScanOpen(false)} />}
    </div>
  );
}

function ItemFormModal({ open, onClose, item, categories, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const editing = Boolean(item);

  const [form, setForm] = useState({
    sku: '', name: '', description: '', categoryId: '', unit: '',
    reorderThreshold: 0, currentStock: 0, unitCost: 0, stockNumber: '', fundCluster: '', isAccountable: false,
  });

  useEffect(() => {
    if (open) {
      setForm(item ? {
        sku: item.sku, name: item.name, description: item.description || '',
        categoryId: item.categoryId, unit: item.unit,
        reorderThreshold: item.reorderThreshold, currentStock: item.currentStock, unitCost: item.unitCost,
        stockNumber: item.stockNumber || '', fundCluster: item.fundCluster || '', isAccountable: item.isAccountable || false,
      } : { sku: '', name: '', description: '', categoryId: categories[0]?.id || '', unit: '', reorderThreshold: 0, currentStock: 0, unitCost: 0, stockNumber: '', fundCluster: '', isAccountable: false });
    }
  }, [open, item]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await api.patch(`/items/${item.id}`, form);
        toast.success('Item updated.');
      } else {
        await api.post('/items', form);
        toast.success('Item created.');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save item.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog className={`modal ${open ? 'modal-open' : ''}`}>
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">{editing ? 'Edit item' : 'New item'}</h3>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <fieldset className="fieldset sm:col-span-1">
            <legend className="fieldset-legend">SKU / barcode value *</legend>
            <input className="input" required value={form.sku} disabled={editing}
              onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="OS-Bond-70" />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Name *</legend>
            <input className="input" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bond Paper, short (70gsm)" />
          </fieldset>
          <fieldset className="fieldset sm:col-span-2">
            <legend className="fieldset-legend">Description</legend>
            <textarea className="textarea" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Category *</legend>
            <select className="select" required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Select...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Unit of measure *</legend>
            <input className="input" required value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="ream, piece, box..." />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Reorder threshold</legend>
            <input className="input" type="number" min="0" step="any" value={form.reorderThreshold}
              onChange={(e) => setForm({ ...form, reorderThreshold: e.target.value })} />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Unit cost (₱)</legend>
            <input className="input" type="number" min="0" step="0.01" value={form.unitCost}
              onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Stock No. (COA)</legend>
            <input className="input" value={form.stockNumber || ''}
              onChange={(e) => setForm({ ...form, stockNumber: e.target.value })} placeholder="e.g. 01-01-01000-000" />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Fund Cluster</legend>
            <input className="input" value={form.fundCluster || ''}
              onChange={(e) => setForm({ ...form, fundCluster: e.target.value })} placeholder="e.g. 101, 104" />
          </fieldset>
          <label className="fieldset sm:col-span-2 cursor-pointer">
            <input type="checkbox" className="checkbox" checked={form.isAccountable} onChange={(e) => setForm({ ...form, isAccountable: e.target.checked })} />
            <span className="fieldset-legend">Accountable item (PAR / PPE)</span>
          </label>
          {!editing && (
            <fieldset className="fieldset sm:col-span-2">
              <legend className="fieldset-legend">Opening stock</legend>
              <input className="input" type="number" min="0" step="any" value={form.currentStock}
                onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
            </fieldset>
          )}
          <div className="modal-action col-span-full">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              {editing ? 'Save changes' : 'Create item'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function AdjustModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [operation, setOperation] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!Number(quantity) || Number(quantity) <= 0) {
      toast.error('Enter a positive quantity.');
      return;
    }
    if (operation === 'OUT' && Number(quantity) > item.currentStock) {
      toast.error(`Only ${item.currentStock} ${item.unit} available.`);
      return;
    }
    if (!reason.trim()) {
      toast.error('A reason is required for the audit trail.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/items/${item.id}/adjust`, { operation, quantity: Number(quantity), reason, referenceType: referenceType || undefined });
      toast.success('Stock movement recorded.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to adjust stock.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Record stock movement</h3>
        <p className="text-sm text-base-content/60 mt-1">
          {item.name} · <span className="font-mono">{item.sku}</span>
        </p>
        <div className="badge badge-lg badge-ghost mt-2">Current: {fmt(item.currentStock)} {item.unit}</div>

        <form onSubmit={submit} className="flex flex-col gap-4 mt-4">
          <div className="join join-horizontal w-full">
            <button type="button" className={`btn join-item flex-1 ${operation === 'IN' ? 'btn-success' : ''}`} onClick={() => { setOperation('IN'); setReferenceType(''); }}>Receive (in)</button>
            <button type="button" className={`btn join-item flex-1 ${operation === 'OUT' ? 'btn-error' : ''}`} onClick={() => { setOperation('OUT'); setReferenceType(''); }}>Issue (out)</button>
          </div>
          {operation === 'IN' && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Reference type (optional)</legend>
              <select className="select" value={referenceType} onChange={(e) => setReferenceType(e.target.value)}>
                <option value="">Receipt (default)</option>
                <option value="ADJUSTMENT_IN">Adjustment IN</option>
              </select>
            </fieldset>
          )}
          {operation === 'OUT' && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Reference type (optional)</legend>
              <select className="select" value={referenceType} onChange={(e) => setReferenceType(e.target.value)}>
                <option value="">Issue / Adjustment OUT (default)</option>
                <option value="RETURN">Return to stock</option>
              </select>
            </fieldset>
          )}
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Quantity ({item.unit})</legend>
            <input className="input" type="number" min="0" step="any" required autoFocus value={quantity}
              onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Reason / remarks *</legend>
            <textarea className="textarea" rows={2} required value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Received delivery PO-2026-0101 / Returned defective units" />
          </fieldset>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              Save movement
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function QRModal({ qr, onClose }) {
  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-sm">
        <h3 className="font-bold text-lg text-center">Item QR code</h3>
        <div className="print-area flex flex-col items-center gap-3 mt-2">
          <img src={qr.dataUrl} alt={`QR for ${qr.sku}`} className="w-56 h-56 mx-auto bg-white p-2" />
          <div className="text-center">
            <div className="font-semibold">{qr.name}</div>
            <div className="font-mono text-sm opacity-70">{qr.sku}</div>
          </div>
        </div>
        <div className="modal-action no-print">
          <button className="btn" onClick={() => window.print()}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" /></svg>
            Print label
          </button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop no-print"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}