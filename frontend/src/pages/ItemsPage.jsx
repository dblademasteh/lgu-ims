import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import { Badge, EmptyState, FormModal, Money, Pagination, Spinner, PageHeader } from '../components/ui';
import ScanModal from '../components/ScanModal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  Package, Search, Plus, Download, Upload, QrCode, Camera,
  ArrowUpDown, X, AlertTriangle, CheckCircle, UploadCloud, Save, SquarePen, Archive, ArrowDownToLine, ArrowUpFromLine,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Landmark, ArrowRight, FileText, Hash, NotebookPen,
  Barcode, FolderTree, Ruler, Coins, CalendarClock, CalendarDays, Printer, Check,
} from 'lucide-react';
import { createPortal } from 'react-dom';

function Portal({ children }) {
  return createPortal(children, document.body);
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

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

export default function ItemsPage() {
  const [params] = useSearchParams();
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF');
  const canAdjust = useCan('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN');

  const [search, setSearch] = useState(params.get('search') || '');
  const [query, setQuery] = useState(params.get('search') || '');
  const [categoryId, setCategoryId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(params.get('lowStock') === '1');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
const [sortKey, setSortKey] = useState('name');
const [sortDir, setSortDir] = useState('asc');
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [scanOpen, setScanOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [qrs, setQrs] = useState(null);
  const [busyCsv, setBusyCsv] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const imageInputRef = useRef(null);
  const fileRef = useRef(null);

  const requestIdRef = useRef(0);
const loadCategories = () => api.get('/categories').then(r => setCategories(r.data.data)).catch(() => {});

  const load = () => {
    const rid = ++requestIdRef.current;
    setLoading(true);
    const q = new URLSearchParams({ page, limit, sortBy: sortKey, sortDir });
    if (query) q.set('search', query);
    if (categoryId) q.set('categoryId', categoryId);
    if (lowStockOnly) q.set('lowStock', 'true');
    api.get(`/items?${q}`)
      .then(r => {
        // Stale-response guard: ignore results from an earlier, superseded request
        if (rid !== requestIdRef.current) return;
        setData(r.data);
      })
      .catch(e => toast.error(e.response?.data?.message || 'Unable to load items.'))
      .finally(() => { if (rid === requestIdRef.current) setLoading(false); });
  };

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { load(); }, [page, limit, categoryId, lowStockOnly, query, sortKey, sortDir]);
  useEffect(() => { loadCategories(); }, []);

  useKeyboardShortcuts({
    'ctrl+n': () => { if (canManage) { setSelected(null); setEditOpen(true); } },
    'ctrl+f': () => document.querySelector('input[type="search"]')?.focus(),
    'escape': () => {
      if (editOpen) setEditOpen(false);
      if (adjustOpen) setAdjustOpen(false);
      if (scanOpen) setScanOpen(false);
      if (qrs) setQrs(null);
      if (detailOpen) setDetailOpen(false);
    },
  });

  const openDetail = (item) => { setSelected(item); setDetailOpen(true); };
  const openEdit = (item) => { setSelected(item); setEditOpen(true); };

  const onScan = async (code) => {
    setScanOpen(false);
    try {
      const res = await api.get(`/items/lookup/${encodeURIComponent(code)}`);
      setSelected(res.data.data);
      setDetailOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || `No item found for "${code}".`);
    }
  };

  const showQR = async (item) => {
    try {
      const res = await api.get(`/items/${item.id}/qr`);
      setQrs(res.data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Unable to generate QR code.'); }
  };

  const exportItems = () => api.get('/items/export', { responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = `items-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }).catch(e => toast.error(e.response?.data?.message || 'Unable to export.'));

  const itemsImportTemplate = 'sku,name,category,unit,description,reorderThreshold,maxStock,currentStock,unitCost,stockNumber,fundCluster\nITM-001,Office Chair,Furniture,pcs,Emergency chair,5,20,12,2500.00,SN-001,101\nITM-002,Printer Ink Toner,Supplies,box,HP Toner,2,10,3,1800.00,SN-002,101';

  const downloadItemsTemplate = () => {
    const blob = new Blob([itemsImportTemplate], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'items_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importItems = async (file) => {
    const text = await file.text();
    setBusyCsv(true);
    try {
      const res = await api.post('/items/import', { csv: text });
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to import CSV.');
    } finally {
      setBusyCsv(false);
    }
  };

  const triggerImageUpload = () => imageInputRef.current?.click();
  const onImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const uploadImage = async () => {
    if (!imageFile || !selected) return;
    const form = new FormData();
    form.append('image', imageFile);
    try {
      await api.post(`/items/${selected.id}/image`, form);
      toast.success('Image uploaded.');
      setImagePreview(''); setImageFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to upload image.');
    }
  };

  const totalItems = data?.meta?.total || 0;
  const lowCount = data?.meta?.lowStockCount || 0;
  const totalPages = data?.meta?.totalPages || 1;

  const onSort = (key, dir) => {
    if (sortKey === key) {
      setSortDir(dir);
    } else {
      setSortKey(key);
      setSortDir(dir);
    }
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Items & Stock"
        subtitle={totalItems > 0 ? `${totalItems} items · ${lowCount} low stock` : 'Manage inventory items'}
        actions={
          <>
            <button className="btn btn-sm" onClick={() => setScanOpen(true)} style={{ gap: '0.375rem' }}><QrCode size={13} /> Scan</button>
            {canManage && (
              <>
                <button className="btn btn-sm" onClick={downloadItemsTemplate} style={{ gap: '0.375rem' }}>
                  <Download size={13} /> Template
                </button>
                <button className="btn btn-sm" disabled={busyCsv} onClick={() => fileRef.current?.click()} style={{ gap: '0.375rem' }}>
                  {busyCsv && <span className="loading loading-spinner loading-xs" />}
                  <Upload size={13} /> Import
                </button>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) importItems(f); e.target.value = ''; }} />
            <button className="btn btn-sm" onClick={exportItems} style={{ gap: '0.375rem' }}><Download size={13} /> Export</button>
            {canManage && (
              <button className="btn btn-primary btn-sm" onClick={() => { setSelected(null); setEditOpen(true); }} style={{ gap: '0.375rem' }}>
                <Plus size={13} /> New Item
              </button>
            )}
          </>
        }
      />

      {/* ── Filters ── */}
      <div className="sp-toolbar" style={{ marginBottom: '1rem' }}>
        <div className="relative flex-1 md:max-w-md">
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
          <input type="search" className="input input-sm w-full pl-9" aria-label="Search items" placeholder="Search name or SKU…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {search && (
            <button type="button" className="btn btn-ghost btn-xs btn-square" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => setSearch('')} aria-label="Clear search"><X size={12} /></button>
          )}
        </div>
        <select className="select select-sm" style={{ width: '12rem' }} value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0 0.5rem', fontSize: '0.8125rem', color: lowStockOnly ? 'var(--text)' : 'color-mix(in oklab, var(--text) 55%, transparent)', fontWeight: lowStockOnly ? 600 : 400 }}>
          <input type="checkbox" className="checkbox checkbox-sm" checked={lowStockOnly}
            onChange={e => { setLowStockOnly(e.target.checked); setPage(1); }} />
          Low stock
        </label>
        <select className="select select-sm" style={{ width: '6rem' }} value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
          {[10, 20, 50, 100].map(l => <option key={l} value={l}>{l}/page</option>)}
        </select>
      </div>
      <div className="sp-result-chip" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'color-mix(in oklab, var(--text) 50%, transparent)', fontFamily: 'var(--font-mono)' }}>
          {totalItems > 0 ? `Showing ${((page - 1) * limit) + 1}–${Math.min(page * limit, totalItems)} of ${totalItems} items · ${lowCount} low stock` : 'No items to display'}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <Spinner label="Loading items..." />
        ) : !data?.data?.length ? (
          <EmptyState message="No items found." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" aria-label="Items table">
              <thead>
                <tr>
                  <th style={{ width: '2.5rem' }}></th>
                  <th><SortHeader sortKey="name" label="Item" activeKey={sortKey} activeDir={sortDir} onSort={onSort} /></th>
                  <th>Category</th>
                  <th><SortHeader sortKey="currentStock" label="On hand" activeKey={sortKey} activeDir={sortDir} onSort={onSort} right /></th>
                  <th><SortHeader sortKey="reorderThreshold" label="Reorder" activeKey={sortKey} activeDir={sortDir} onSort={onSort} right /></th>
                  <th><SortHeader sortKey="unitCost" label="Unit cost" activeKey={sortKey} activeDir={sortDir} onSort={onSort} right /></th>
                  <th>Status</th>
                  <th style={{ width: '5rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map(i => (
                  <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(i)}>
                    <td onClick={e => e.stopPropagation()}>
                      {i.imageUrl ? (
                        <img src={i.imageUrl} alt={i.name} style={{ width: '2rem', height: '2rem', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <div style={{ width: '2rem', height: '2rem', borderRadius: '4px', background: 'var(--surface-alt)', display: 'grid', placeItems: 'center' }}>
                          <Package size={14} style={{ color: 'color-mix(in oklab, var(--text) 25%, transparent)' }} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{i.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'color-mix(in oklab, var(--text) 40%, transparent)', letterSpacing: '0.04em', marginTop: '0.125rem' }}>{i.sku}</div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'color-mix(in oklab, var(--text) 70%, transparent)' }}>{i.category?.name || '—'}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '0.875rem', color: i.lowStock ? 'var(--error)' : 'var(--text)' }}>
                      {fmt(i.currentStock)}
                      <span style={{ fontSize: '0.6875rem', color: 'color-mix(in oklab, var(--text) 40%, transparent)', fontWeight: 400, marginLeft: '0.25rem' }}>{i.unit}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.8125rem', color: 'color-mix(in oklab, var(--text) 55%, transparent)', fontVariantNumeric: 'tabular-nums' }}>{fmt(i.reorderThreshold)}</td>
                    <td style={{ textAlign: 'right', fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}><Money value={i.unitCost} /></td>
                    <td>
                      {i.lowStock
                        ? <span className="badge badge-sm badge-error">Low</span>
                        : <span className="badge badge-sm badge-success">OK</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-square btn-xs" title="QR code" onClick={(e) => { e.stopPropagation(); showQR(i); }} style={{ border: 'none' }}>
                          <QrCode size={13} />
                        </button>
                        {canAdjust && (
                          <button className="btn btn-ghost btn-square btn-xs" title="Adjust stock" onClick={(e) => { e.stopPropagation(); setSelected(i); setAdjustOpen(true); }} style={{ border: 'none' }}>
                            <ArrowUpDown size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination meta={data?.meta} onPage={setPage} />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onImageSelected} />
      {scanOpen && <ScanModal onScan={onScan} onClose={() => setScanOpen(false)} />}
      {qrs && <QRModal qr={qrs} onClose={() => setQrs(null)} />}

      {imagePreview && (
        <Portal>
          <div className="modal-backdrop">
            <div className="modal-box modal-md">
              <div className="modal-header">
                <h3 className="modal-title">Upload image</h3>
                <button className="modal-close" onClick={() => { setImagePreview(''); setImageFile(null); }}><X size={15} /></button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: '0.75rem' }}>{selected?.name}</p>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '16rem', objectFit: 'contain', borderRadius: '6px' }} />
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => { setImagePreview(''); setImageFile(null); }}>
                  <X size={14} /> Cancel
                </button>
                <button className="btn btn-primary" onClick={uploadImage}>
                  <UploadCloud size={14} /> Upload
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {editOpen && (
        <ItemFormModal
          item={selected}
          categories={categories}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); }}
        />
      )}

      {adjustOpen && selected && (
        <AdjustModal
          item={selected}
          onClose={() => setAdjustOpen(false)}
          onSaved={() => { setAdjustOpen(false); load(); }}
        />
      )}

      {detailOpen && selected && (
        <ItemDetailPanel
          item={selected}
          onClose={() => setDetailOpen(false)}
          onEdit={() => { setDetailOpen(false); openEdit(selected); }}
          onAdjust={() => { setDetailOpen(false); setSelected(selected); setAdjustOpen(true); }}
          onQR={() => showQR(selected)}
          onImageUpload={triggerImageUpload}
          canManage={canManage}
          canAdjust={canAdjust}
        />
      )}
    </div>
  );
}

/* ── Item Detail Panel ──────────────────────────────────────────── */
function ItemDetailPanel({ item, onClose, onEdit, onAdjust, onQR, onImageUpload, canManage, canAdjust }) {
  const toast = useToast();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [ledger, setLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLedgerLoading(true);
    api.get(`/ledger/items/${item.id}/card`)
      .then((r) => { if (!cancelled) setLedger(r.data.data); })
      .catch(() => { if (!cancelled) setLedger(null); })
      .finally(() => { if (!cancelled) setLedgerLoading(false); });
    return () => { cancelled = true; };
  }, [item.id]);

  const archive = async () => {
    setArchiving(true);
    try {
      await api.delete(`/items/${item.id}`);
      toast.success('Item archived.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to archive.');
    } finally {
      setArchiving(false);
    }
  };

  const stockPct = item.maxStock > 0 ? Math.min((item.currentStock / item.maxStock) * 100, 100) : null;
  const stockColor = stockPct === null ? 'var(--success)' : stockPct <= 20 ? 'var(--error)' : stockPct <= 50 ? 'var(--warning)' : 'var(--success)';

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in oklab, var(--text) 30%, transparent)' }} />
        <div style={{ position: 'relative', width: '100%', maxWidth: '42rem', maxHeight: '85vh', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)', zIndex: 1 }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--text) 50%, transparent)' }}>Item detail</span>
            <button className="btn btn-ghost btn-sm btn-square" onClick={onClose} style={{ border: 'none' }}><X size={15} /></button>
          </div>

          {/* Image */}
          <div style={{ height: '10rem', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
            {item.imageUrl
              ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Package size={40} style={{ color: 'color-mix(in oklab, var(--text) 15%, transparent)' }} />}
            {canManage && (
              <button onClick={onImageUpload} style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', width: '2rem', height: '2rem', borderRadius: '9999px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                <Camera size={13} />
              </button>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '1.0625rem', lineHeight: 1.2 }}>{item.name}</h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.08em', color: 'color-mix(in oklab, var(--text) 45%, transparent)', marginTop: '0.25rem' }}>{item.sku}</p>
            </div>

            {/* Stock gauge */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--text) 55%, transparent)' }}>On hand</span>
                <span style={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: item.lowStock ? 'var(--error)' : 'var(--text)' }}>
                  {fmt(item.currentStock)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'color-mix(in oklab, var(--text) 45%, transparent)' }}>{item.unit}</span>
                </span>
              </div>
              {stockPct !== null && (
                <div style={{ height: '5px', background: 'var(--border)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${stockPct}%`, background: stockColor, borderRadius: '9999px', transition: 'width 400ms ease' }} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'color-mix(in oklab, var(--text) 40%, transparent)', letterSpacing: '0.04em' }}>
                <span>Reorder: {fmt(item.reorderThreshold)}</span>
                {item.maxStock > 0 && <span>Max: {fmt(item.maxStock)}</span>}
              </div>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              {[
                ['Category', item.category?.name || '—'],
                ['Unit cost', item.unitCost > 0 ? <Money key="mc" value={item.unitCost} /> : '—'],
                ['Stock No.', item.stockNumber || '—'],
                ['Fund', item.fundCluster || '—'],
                ['Condition', item.condition || 'SERVICEABLE'],
                ['PAR', item.isAccountable ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--text) 45%, transparent)', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
              {item.expiryDate && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--text) 45%, transparent)', marginBottom: '0.2rem' }}>Expires</div>
                  <div style={{ fontSize: '0.8125rem' }}>{new Date(item.expiryDate).toLocaleDateString()}</div>
                </div>
              )}
              {item.warrantyExpiry && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--text) 45%, transparent)', marginBottom: '0.2rem' }}>Warranty</div>
                  <div style={{ fontSize: '0.8125rem' }}>{new Date(item.warrantyExpiry).toLocaleDateString()}</div>
                </div>
              )}
            </div>

            {item.description && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--text) 45%, transparent)', marginBottom: '0.375rem' }}>Description</div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{item.description}</p>
              </div>
            )}

            {/* Ledger history */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--text) 45%, transparent)' }}>Ledger activity</span>
                {ledgerLoading && <span className="loading loading-spinner loading-xs" />}
              </div>
              {ledger && ledger.entries.length > 0 ? (
                <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                  {ledger.entries.slice(0, 8).map((e, idx) => (
                    <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', padding: '0.5rem 0.75rem', borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{TYPE_LABEL[e.referenceType] || e.referenceType}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'color-mix(in oklab, var(--text) 50%, transparent)' }}>{new Date(e.date).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: e.inflow > 0 ? 'var(--success)' : e.outflow > 0 ? 'var(--error)' : 'color-mix(in oklab, var(--text) 45%, transparent)' }}>
                          {e.inflow > 0 ? `+${fmt(e.inflow)}` : e.outflow > 0 ? `−${fmt(e.outflow)}` : '—'} {item.unit}
                        </span>
                        <span style={{ fontWeight: 600 }}>BL: {fmt(e.runningBalance)}</span>
                      </div>
                      {e.remarks && <div style={{ fontSize: '0.6875rem', color: 'color-mix(in oklab, var(--text) 45%, transparent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.remarks}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                !ledgerLoading && <p style={{ fontSize: '0.75rem', color: 'color-mix(in oklab, var(--text) 45%, transparent)' }}>No ledger activity yet.</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
            {canAdjust && (
              <button className="btn btn-sm" style={{ flex: 1, gap: '0.375rem' }} onClick={onAdjust}>
                <ArrowUpDown size={13} /> Adjust
              </button>
            )}
            <button className="btn btn-sm" style={{ flex: 1, gap: '0.375rem' }} onClick={onQR}>
              <QrCode size={13} /> QR
            </button>
            {canManage && (
              <>
                <button className="btn btn-primary btn-sm" style={{ flex: 1, gap: '0.375rem' }} onClick={onEdit}><SquarePen size={13} /> Edit</button>
                <button className="btn btn-sm" style={{ flex: 1, gap: '0.375rem', color: 'var(--error)', borderColor: 'color-mix(in oklab, var(--error) 30%, transparent)' }} onClick={() => setArchiveOpen(true)}><Archive size={13} /> Archive</button>
              </>
            )}
          </div>
        </div>
      </div>

      {archiveOpen && (
        <Portal>
          <div className="modal-backdrop">
            <div className="modal-box modal-sm">
              <div className="modal-header">
                <h3 className="modal-title">Archive "{item.name}"?</h3>
                <button className="modal-close" onClick={() => setArchiveOpen(false)}><X size={15} /></button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div className="modal-confirm-icon modal-confirm-icon--warn"><AlertTriangle size={18} /></div>
                  <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>This item will be archived. An administrator can restore it.</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setArchiveOpen(false)}>
                  <X size={14} /> Cancel
                </button>
                <button className="btn btn-error" disabled={archiving} onClick={archive}>
                  {archiving && <span className="loading loading-spinner loading-xs" />}<Archive size={14} /> Archive
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

const TYPE_LABEL = {
  OPENING_BALANCE: 'Opening balance',
  RECEIPT: 'Receipt',
  ISSUANCE: 'Issuance',
  ADJUSTMENT_IN: 'Adjustment (in)',
  ADJUSTMENT_OUT: 'Adjustment (out)',
  RETURN: 'Return',
};

/* ── Item Form Modal ─────────────────────────────────────────── */
function ItemFormModal({ item, categories, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const editing = Boolean(item);

  const [form, setForm] = useState({
    sku: '', name: '', description: '', categoryId: '', unit: '',
    reorderThreshold: 0, maxStock: 0, currentStock: 0, unitCost: 0,
    stockNumber: '', fundCluster: '', isAccountable: false,
    expiryDate: '', warrantyExpiry: '', condition: 'SERVICEABLE',
  });

  useEffect(() => {
    if (item) {
      setForm({
        sku: item.sku, name: item.name, description: item.description || '',
        categoryId: item.categoryId, unit: item.unit,
        reorderThreshold: item.reorderThreshold, maxStock: item.maxStock || 0,
        currentStock: item.currentStock, unitCost: item.unitCost,
        stockNumber: item.stockNumber || '', fundCluster: item.fundCluster || '',
        isAccountable: item.isAccountable || false,
        expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : '',
        warrantyExpiry: item.warrantyExpiry ? item.warrantyExpiry.slice(0, 10) : '',
        condition: item.condition || 'SERVICEABLE',
      });
    } else {
      setForm({ sku: '', name: '', description: '', categoryId: categories[0]?.id || '', unit: '', reorderThreshold: 0, maxStock: 0, currentStock: 0, unitCost: 0, stockNumber: '', fundCluster: '', isAccountable: false, expiryDate: '', warrantyExpiry: '', condition: 'SERVICEABLE' });
    }
  }, [item, categories]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      reorderThreshold: Number(form.reorderThreshold) || 0,
      maxStock: Number(form.maxStock) || 0,
      currentStock: Number(form.currentStock) || 0,
      unitCost: Number(form.unitCost) || 0,
    };
    try {
      if (editing) { await api.patch(`/items/${item.id}`, payload); toast.success('Item updated.'); }
      else { await api.post('/items', payload); toast.success('Item created.'); }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save.');
    } finally {
      setBusy(false);
    }
  };

  const categoryName = categories.find(c => c.id === form.categoryId)?.name || '';

  const Field = ({ label, hint, required, full, children }) => (
    <div className={`fieldset${full ? ' form-full' : ''}`}>
      <span className="fieldset-legend">{label}{required && <span className="adj-req"> *</span>}</span>
      {children}
      {hint && <span className="sp-hint">{hint}</span>}
    </div>
  );

  const IconInput = ({ icon: Icon, ...props }) => (
    <label className="input">
      {Icon && <Icon size={16} style={{ color: 'var(--faint)', flexShrink: 0 }} />}
      <input {...props} />
    </label>
  );

  return (
    <Portal>
      <FormModal
        title={editing ? 'Edit item' : 'New item'}
        formNo="Form No. LGU-IMS-ITM-01"
        icon={Package}
        tone="info"
        size="modal-lg"
        onClose={onClose}
      >
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="modal-body">
            {/* Identification */}
            <div className="divider">Identification</div>
            <div className="modal-form-grid">
              <Field label="SKU" required>
                <IconInput icon={Barcode} required value={form.sku} disabled={editing} onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="e.g. ITM-0001" />
              </Field>
              <Field label="Name" required>
                <IconInput icon={Package} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Item name" />
              </Field>
              <Field label="Description" full>
                <textarea className="textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </Field>
            </div>

            {/* Classification */}
            <div className="divider">Classification</div>
            <div className="modal-form-grid">
              <Field label="Category" required>
                <select className="select" required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Unit" required>
                <IconInput icon={Ruler} required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="ream, piece, box..." />
              </Field>
              <Field label="Condition">
                <select className="select" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                  <option>SERVICEABLE</option><option>UNSERVICEABLE</option><option>CONDEMNED</option>
                </select>
              </Field>
              <Field label="Stock No. (COA)">
                <IconInput icon={Hash} value={form.stockNumber || ''} onChange={e => setForm({ ...form, stockNumber: e.target.value })} placeholder="COA stock number" />
              </Field>
              <Field label="Fund Cluster">
                <IconInput icon={Landmark} value={form.fundCluster || ''} onChange={e => setForm({ ...form, fundCluster: e.target.value })} placeholder="e.g. GF, SEF" />
              </Field>
            </div>

            {/* Stock & Valuation */}
            <div className="divider">Stock &amp; Valuation</div>
            <div className="modal-form-grid">
              <Field label="Reorder threshold" hint="Low-stock alert level">
                <input className="input" type="number" min="0" step="any" value={form.reorderThreshold} onChange={e => setForm({ ...form, reorderThreshold: e.target.value })} />
              </Field>
              <Field label="Max stock" hint="0 = no ceiling">
                <input className="input" type="number" min="0" step="any" value={form.maxStock || ''} onChange={e => setForm({ ...form, maxStock: e.target.value })} />
              </Field>
              <Field label="Unit cost (₱)">
                <IconInput icon={Coins} type="number" min="0" step="0.01" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} />
              </Field>
              {!editing && (
                <Field label="Opening stock" hint="Initial quantity on hand">
                  <input className="input" type="number" min="0" step="any" value={form.currentStock} onChange={e => setForm({ ...form, currentStock: e.target.value })} />
                </Field>
              )}
            </div>

            {/* Warranty & Expiry */}
            <div className="divider">Warranty &amp; Expiry</div>
            <div className="modal-form-grid">
              <Field label="Expiry date">
                <IconInput icon={CalendarClock} type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
              </Field>
              <Field label="Warranty expiry">
                <IconInput icon={CalendarDays} type="date" value={form.warrantyExpiry} onChange={e => setForm({ ...form, warrantyExpiry: e.target.value })} />
              </Field>
            </div>

            {/* Accountability */}
            <div className="divider">Accountability</div>
            <label className="form-checkbox-row">
              <input type="checkbox" checked={form.isAccountable} onChange={e => setForm({ ...form, isAccountable: e.target.checked })} />
              <span className="form-checkbox-label">Accountable item (PAR / PPE)</span>
            </label>

            {/* Record summary */}
            <div className="adj-item-block" style={{ marginTop: '0.875rem' }}>
              <div className="adj-section-label">Record summary</div>
              <div className="adj-item-name">{form.name || 'Untitled item'}</div>
              <div className="adj-item-grid">
                <div className="adj-item-cell">
                  <span className="adj-cell-label">SKU</span>
                  <span className="adj-cell-value adj-cell-mono">{form.sku || '—'}</span>
                </div>
                <div className="adj-item-cell">
                  <span className="adj-cell-label">Category</span>
                  <span className="adj-cell-value">{categoryName || '—'}</span>
                </div>
                <div className="adj-item-cell">
                  <span className="adj-cell-label">Unit</span>
                  <span className="adj-cell-value">{form.unit || '—'}</span>
                </div>
                <div className="adj-item-cell">
                  <span className="adj-cell-label">Unit cost</span>
                  <span className="adj-cell-value adj-cell-mono">{form.unitCost ? `₱${Number(form.unitCost).toLocaleString('en-US')}` : '—'}</span>
                </div>
                <div className="adj-item-cell">
                  <span className="adj-cell-label">Condition</span>
                  <span className="adj-cell-value">{form.condition || '—'}</span>
                </div>
                <div className="adj-item-cell">
                  <span className="adj-cell-label">Accountable</span>
                  <span className="adj-cell-value">{form.isAccountable ? 'Yes (PAR / PPE)' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              <Save size={14} /> {editing ? 'Save changes' : 'Create item'}
            </button>
          </div>
        </form>
      </FormModal>
    </Portal>
  );
}

/* ── Adjust Modal (official stock adjustment form) ────────────── */
function AdjustModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [operation, setOperation] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [busy, setBusy] = useState(false);

  const isIn = operation === 'IN';
  const qty = Number(quantity) || 0;
  const after = isIn ? item.currentStock + qty : item.currentStock - qty;

  const submit = async (e) => {
    e.preventDefault();
    if (!Number(quantity) || Number(quantity) <= 0) { toast.error('Enter a positive quantity.'); return; }
    if (operation === 'OUT' && Number(quantity) > item.currentStock) { toast.error(`Only ${item.currentStock} ${item.unit} available.`); return; }
    if (!reason.trim()) { toast.error('Reason is required.'); return; }
    if (operation === 'OUT' && !referenceId.trim()) { toast.error('Reference ID is required for stock-out adjustments.'); return; }
    setBusy(true);
    try {
      await api.post(`/items/${item.id}/adjust`, { operation, quantity: Number(quantity), reason, referenceId, referenceType: referenceType || undefined });
      toast.success('Stock updated.');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to adjust.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Portal>
      <div className="modal-backdrop">
        <div className="modal-box modal-lg adj-modal">
          {/* Operation accent bar */}
          <div className={`adj-accent ${isIn ? 'adj-accent--in' : 'adj-accent--out'}`} />

          {/* Document header */}
          <div className="modal-header adj-header">
            <div className="adj-header-left">
              <div className={`adj-seal ${isIn ? 'adj-seal--in' : 'adj-seal--out'}`}>
                <Landmark size={18} />
              </div>
              <div>
                <h3 className="modal-title">Stock Adjustment</h3>
                <div className="modal-subtitle adj-form-no">Form No. LGU-IMS-ADJ-01</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`adj-op-badge ${isIn ? 'adj-op-badge--in' : 'adj-op-badge--out'}`}>
                {isIn ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />}
                {isIn ? 'RECEIVE' : 'ISSUE'}
              </span>
              <button className="modal-close" onClick={onClose}><X size={15} /></button>
            </div>
          </div>

          <div className="modal-body adj-body">
            {/* Item information — official form block */}
            <div className="adj-item-block">
              <div className="adj-section-label">Item information</div>
              <div className="adj-item-name">{item.name}</div>
              <div className="adj-item-grid">
                <div className="adj-item-cell">
                  <span className="adj-cell-label">Stock No.</span>
                  <span className="adj-cell-value">{item.stockNumber || '—'}</span>
                </div>
                <div className="adj-item-cell">
                  <span className="adj-cell-label">SKU</span>
                  <span className="adj-cell-value adj-cell-mono">{item.sku}</span>
                </div>
                <div className="adj-item-cell">
                  <span className="adj-cell-label">Category</span>
                  <span className="adj-cell-value">{item.category?.name || '—'}</span>
                </div>
                <div className="adj-item-cell">
                  <span className="adj-cell-label">Unit</span>
                  <span className="adj-cell-value">{item.unit}</span>
                </div>
              </div>
            </div>

            {/* Operation selector */}
            <div className="adj-op-toggle">
              <button type="button" className={`adj-op-btn ${isIn ? 'active-in' : ''}`} onClick={() => { setOperation('IN'); setReferenceId(''); }}>
                <ArrowDownToLine size={15} /> Receive
              </button>
              <button type="button" className={`adj-op-btn ${!isIn ? 'active-out' : ''}`} onClick={() => { setOperation('OUT'); setReferenceId(''); }}>
                <ArrowUpFromLine size={15} /> Issue
              </button>
            </div>

            {/* Stock projection */}
            <div className={`adj-projection ${isIn ? 'adj-projection--in' : 'adj-projection--out'}`}>
              <div className="adj-proj-col">
                <span className="adj-proj-label">Current on hand</span>
                <span className="adj-proj-value">{fmt(item.currentStock)} <span className="adj-proj-unit">{item.unit}</span></span>
              </div>
              <div className="adj-proj-arrow"><ArrowRight size={16} /></div>
              <div className="adj-proj-col adj-proj-col--after">
                <span className="adj-proj-label">After adjustment</span>
                <span className="adj-proj-value">{fmt(after)} <span className="adj-proj-unit">{item.unit}</span></span>
              </div>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="fieldset">
                <span className="fieldset-legend">Reference / Document No. {operation === 'OUT' && <span className="adj-req">*</span>}</span>
                <div className="adj-input-wrap">
                  <FileText size={15} className="adj-input-icon" />
                  <input className="input adj-input" value={referenceId} onChange={e => setReferenceId(e.target.value)} placeholder={operation === 'OUT' ? "Required for Issuance (e.g. RIS-001)" : "Optional for Receipt"} />
                </div>
              </div>
              <div className="fieldset">
                <span className="fieldset-legend">Reference type</span>
                {isIn ? (
                  <select className="select" value={referenceType} onChange={e => setReferenceType(e.target.value)}>
                    <option value="">Receipt (default)</option><option value="ADJUSTMENT_IN">Adjustment IN</option>
                  </select>
                ) : (
                  <select className="select" value={referenceType} onChange={e => setReferenceType(e.target.value)}>
                    <option value="">Issue (default)</option><option value="RETURN">Return to stock</option>
                  </select>
                )}
              </div>
              <div className="fieldset">
                <span className="fieldset-legend">Quantity ({item.unit}) <span className="adj-req">*</span></span>
                <div className="adj-input-wrap">
                  <Hash size={15} className="adj-input-icon" />
                  <input className="input adj-input" type="number" min="0" step="any" required autoFocus value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
              </div>
              <div className="fieldset">
                <span className="fieldset-legend">Reason <span className="adj-req">*</span></span>
                <div className="adj-input-wrap adj-input-wrap--area">
                  <NotebookPen size={15} className="adj-input-icon" />
                  <textarea className="textarea adj-textarea" rows={2} required value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. PO-2026-001 delivery / Returned damaged unit" style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div className="modal-footer adj-footer">
                <button type="button" className="btn" onClick={onClose}>
                  <X size={14} /> Cancel
                </button>
                <button type="submit" className={`btn ${isIn ? 'btn-primary' : 'btn-error'}`} disabled={busy}>
                  {busy && <span className="loading loading-spinner loading-xs" />}<Save size={14} /> {isIn ? 'Record receipt' : 'Record issuance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ── QR Modal ─────────────────────────────────────────────────── */
function QRModal({ qr, onClose }) {
  return (
    <Portal>
      <div className="modal-backdrop">
        <div className="modal-box modal-sm">
          <div className="modal-header">
            <h3 className="modal-title">QR code</h3>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
            <img src={qr.dataUrl} alt={qr.sku} className="modal-qr-img" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600 }}>{qr.name}</div>
              <div className="item-panel-sku">{qr.sku}</div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" onClick={() => window.print()}>
              <Printer size={14} /> Print label
            </button>
            <button className="btn btn-primary" onClick={onClose}>
              <Check size={14} /> Done
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
