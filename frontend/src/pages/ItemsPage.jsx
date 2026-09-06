import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import useAuthStore, { useCan } from '../stores/authStore';
import { useToast } from '../components/Toast';
import { Badge, EmptyState, Money, Pagination, Spinner, PageHeader } from '../components/ui';
import ScanModal from '../components/ScanModal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  Package, Search, Plus, Download, Upload, QrCode, Camera,
  ArrowUpDown, X, AlertTriangle, CheckCircle,
} from 'lucide-react';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

export default function ItemsPage() {
  const [params] = useSearchParams();
  const toast = useToast();
  const canManage = useCan('ADMIN', 'WAREHOUSE_STAFF');
  const canAdjust = useCan('ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN');

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(params.get('lowStock') === '1');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
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

  const loadCategories = () => api.get('/categories').then(r => setCategories(r.data.data)).catch(() => {});

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams({ page, limit });
    if (query) q.set('search', query);
    if (categoryId) q.set('categoryId', categoryId);
    if (lowStockOnly) q.set('lowStock', 'true');
    api.get(`/items?${q}`)
      .then(r => setData(r.data))
      .catch(e => toast.error(e.response?.data?.message || 'Unable to load items.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { load(); }, [page, categoryId, lowStockOnly, query]);
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
  const lowCount = data?.data?.filter(i => i.lowStock).length || 0;

  return (
    <div>
      <PageHeader
        title="Items & Stock"
        subtitle={totalItems > 0 ? `${totalItems} items · ${lowCount} low stock` : 'Manage inventory items'}
        actions={
          <>
            <button className="btn btn-sm" onClick={() => setScanOpen(true)} style={{ gap: '0.375rem' }}><QrCode size={13} /> Scan</button>
            {canManage && (
              <button className="btn btn-sm" disabled={busyCsv} onClick={() => fileRef.current?.click()} style={{ gap: '0.375rem' }}>
                {busyCsv && <span className="loading loading-spinner loading-xs" />}
                <Upload size={13} /> Import
              </button>
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
      <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label className="input" style={{ flex: '1 1 14rem', gap: '0.5rem' }}>
          <Search size={14} style={{ color: 'color-mix(in oklab, var(--ink) 40%, transparent)', flexShrink: 0 }} />
          <input type="search" placeholder="Search name or SKU..." style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', minWidth: 0 }}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'color-mix(in oklab, var(--ink) 40%, transparent)', padding: '2px', display: 'grid', placeItems: 'center' }}>
              <X size={12} />
            </button>
          )}
        </label>
        <select className="select" style={{ width: '12rem' }} value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0 0.5rem', fontSize: '0.8125rem', color: lowStockOnly ? 'var(--ink)' : 'color-mix(in oklab, var(--ink) 55%, transparent)', fontWeight: lowStockOnly ? 600 : 400 }}>
          <input type="checkbox" className="checkbox checkbox-sm" checked={lowStockOnly}
            onChange={e => { setLowStockOnly(e.target.checked); setPage(1); }} />
          Low stock
        </label>
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
                  <th>Item</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>On hand</th>
                  <th style={{ textAlign: 'right' }}>Reorder</th>
                  <th style={{ textAlign: 'right' }}>Unit cost</th>
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
                        <div style={{ width: '2rem', height: '2rem', borderRadius: '4px', background: 'var(--surface2)', display: 'grid', placeItems: 'center' }}>
                          <Package size={14} style={{ color: 'color-mix(in oklab, var(--ink) 25%, transparent)' }} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{i.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'color-mix(in oklab, var(--ink) 40%, transparent)', letterSpacing: '0.04em', marginTop: '0.125rem' }}>{i.sku}</div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'color-mix(in oklab, var(--ink) 70%, transparent)' }}>{i.category?.name || '—'}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '0.875rem', color: i.lowStock ? 'var(--lgu-error)' : 'var(--ink)' }}>
                      {fmt(i.currentStock)}
                      <span style={{ fontSize: '0.6875rem', color: 'color-mix(in oklab, var(--ink) 40%, transparent)', fontWeight: 400, marginLeft: '0.25rem' }}>{i.unit}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.8125rem', color: 'color-mix(in oklab, var(--ink) 55%, transparent)', fontVariantNumeric: 'tabular-nums' }}>{fmt(i.reorderThreshold)}</td>
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
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 style={{ fontWeight: 600 }}>Upload image</h3>
            <p style={{ fontSize: '0.875rem', color: 'color-mix(in oklab, var(--ink) 55%, transparent)', marginTop: '0.25rem' }}>{selected?.name}</p>
            <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '16rem', objectFit: 'contain', marginTop: '0.75rem', borderRadius: '6px' }} />
            <div className="modal-action">
              <button className="btn" onClick={() => { setImagePreview(''); setImageFile(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={uploadImage}>Upload</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => { setImagePreview(''); setImageFile(null); }}>close</button></form>
        </dialog>
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
  const stockColor = stockPct === null ? 'var(--lgu-success)' : stockPct <= 20 ? 'var(--lgu-error)' : stockPct <= 50 ? 'var(--lgu-warning)' : 'var(--lgu-success)';

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in oklab, var(--ink) 30%, transparent)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
        <div style={{ position: 'relative', marginLeft: 'auto', width: '100%', maxWidth: '22rem', background: 'var(--surface)', borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column', height: '100dvh', boxShadow: 'var(--shadow-lg)', zIndex: 1 }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>Item detail</span>
            <button className="btn btn-ghost btn-sm btn-square" onClick={onClose} style={{ border: 'none' }}><X size={15} /></button>
          </div>

          {/* Image */}
          <div style={{ height: '10rem', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
            {item.imageUrl
              ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Package size={40} style={{ color: 'color-mix(in oklab, var(--ink) 15%, transparent)' }} />}
            {canManage && (
              <button onClick={onImageUpload} style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', width: '2rem', height: '2rem', borderRadius: '9999px', background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                <Camera size={13} />
              </button>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '1.0625rem', lineHeight: 1.2 }}>{item.name}</h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.08em', color: 'color-mix(in oklab, var(--ink) 45%, transparent)', marginTop: '0.25rem' }}>{item.sku}</p>
            </div>

            {/* Stock gauge */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 55%, transparent)' }}>On hand</span>
                <span style={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: item.lowStock ? 'var(--lgu-error)' : 'var(--ink)' }}>
                  {fmt(item.currentStock)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'color-mix(in oklab, var(--ink) 45%, transparent)' }}>{item.unit}</span>
                </span>
              </div>
              {stockPct !== null && (
                <div style={{ height: '5px', background: 'var(--line)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${stockPct}%`, background: stockColor, borderRadius: '9999px', transition: 'width 400ms ease' }} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'color-mix(in oklab, var(--ink) 40%, transparent)', letterSpacing: '0.04em' }}>
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
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-mini)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 45%, transparent)', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
              {item.expiryDate && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-mini)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 45%, transparent)', marginBottom: '0.2rem' }}>Expires</div>
                  <div style={{ fontSize: '0.8125rem' }}>{new Date(item.expiryDate).toLocaleDateString()}</div>
                </div>
              )}
              {item.warrantyExpiry && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-mini)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 45%, transparent)', marginBottom: '0.2rem' }}>Warranty</div>
                  <div style={{ fontSize: '0.8125rem' }}>{new Date(item.warrantyExpiry).toLocaleDateString()}</div>
                </div>
              )}
            </div>

            {item.description && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-mini)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 45%, transparent)', marginBottom: '0.375rem' }}>Description</div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{item.description}</p>
              </div>
            )}

            {/* Ledger history */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-mini)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 45%, transparent)' }}>Ledger activity</span>
                {ledgerLoading && <span className="loading loading-spinner loading-xs" />}
              </div>
              {ledger && ledger.entries.length > 0 ? (
                <div style={{ border: '1px solid var(--line)', borderRadius: '6px', overflow: 'hidden' }}>
                  {ledger.entries.slice(0, 8).map((e, idx) => (
                    <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', padding: '0.5rem 0.75rem', borderTop: idx === 0 ? 'none' : '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{TYPE_LABEL[e.referenceType] || e.referenceType}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>{new Date(e.date).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: e.inflow > 0 ? 'var(--lgu-success)' : e.outflow > 0 ? 'var(--lgu-error)' : 'color-mix(in oklab, var(--ink) 45%, transparent)' }}>
                          {e.inflow > 0 ? `+${fmt(e.inflow)}` : e.outflow > 0 ? `−${fmt(e.outflow)}` : '—'} {item.unit}
                        </span>
                        <span style={{ fontWeight: 600 }}>BL: {fmt(e.runningBalance)}</span>
                      </div>
                      {e.remarks && <div style={{ fontSize: '0.6875rem', color: 'color-mix(in oklab, var(--ink) 45%, transparent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.remarks}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                !ledgerLoading && <p style={{ fontSize: '0.75rem', color: 'color-mix(in oklab, var(--ink) 45%, transparent)' }}>No ledger activity yet.</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--line)', display: 'flex', gap: '0.5rem' }}>
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
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={onEdit}>Edit</button>
                <button className="btn btn-sm" style={{ color: 'var(--lgu-error)', borderColor: 'color-mix(in oklab, var(--lgu-error) 30%, transparent)' }} onClick={() => setArchiveOpen(true)}>Archive</button>
              </>
            )}
          </div>
        </div>
      </div>

      {archiveOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 style={{ fontWeight: 600 }}>Archive "{item.name}"?</h3>
            <p style={{ color: 'color-mix(in oklab, var(--ink) 60%, transparent)', fontSize: '0.875rem', marginTop: '0.5rem' }}>This item will be archived. An administrator can restore it.</p>
            <div className="modal-action">
              <button className="btn" onClick={() => setArchiveOpen(false)}>Cancel</button>
              <button className="btn btn-error" disabled={archiving} onClick={archive}>
                {archiving && <span className="loading loading-spinner loading-xs" />}Archive
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setArchiveOpen(false)}>close</button></form>
        </dialog>
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

  const Field = ({ label, children }) => (
    <div className="fieldset">
      <span className="fieldset-legend">{label}</span>
      {children}
    </div>
  );

  return (
    <dialog className="modal modal-open" onClose={onClose}>
      <div className="modal-box" style={{ maxWidth: '36rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{editing ? 'Edit item' : 'New item'}</h3>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onClose} style={{ border: 'none' }}><X size={15} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <Field label="SKU *"><input className="input" required value={form.sku} disabled={editing} onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })} /></Field>
            <Field label="Name *"><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Description"><textarea className="textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} /></Field>
            <Field label="Category *">
              <select className="select" required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Select...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Unit *"><input className="input" required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="ream, piece, box..." /></Field>
            <Field label="Reorder threshold"><input className="input" type="number" min="0" step="any" value={form.reorderThreshold} onChange={e => setForm({ ...form, reorderThreshold: e.target.value })} /></Field>
            <Field label="Max stock (0 = none)"><input className="input" type="number" min="0" step="any" value={form.maxStock || ''} onChange={e => setForm({ ...form, maxStock: e.target.value })} /></Field>
            <Field label="Unit cost (₱)"><input className="input" type="number" min="0" step="0.01" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} /></Field>
            <Field label="Stock No. (COA)"><input className="input" value={form.stockNumber || ''} onChange={e => setForm({ ...form, stockNumber: e.target.value })} /></Field>
            <Field label="Fund Cluster"><input className="input" value={form.fundCluster || ''} onChange={e => setForm({ ...form, fundCluster: e.target.value })} /></Field>
            <Field label="Condition">
              <select className="select" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                <option>SERVICEABLE</option><option>UNSERVICEABLE</option><option>CONDEMNED</option>
              </select>
            </Field>
            <Field label="Expiry date"><input type="date" className="input" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></Field>
            <Field label="Warranty expiry"><input type="date" className="input" value={form.warrantyExpiry} onChange={e => setForm({ ...form, warrantyExpiry: e.target.value })} /></Field>
            {!editing && <Field label="Opening stock"><input className="input" type="number" min="0" step="any" value={form.currentStock} onChange={e => setForm({ ...form, currentStock: e.target.value })} /></Field>}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', padding: '0.625rem 0.875rem', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '0.875rem' }}>
            <input type="checkbox" className="checkbox checkbox-sm" checked={form.isAccountable} onChange={e => setForm({ ...form, isAccountable: e.target.checked })} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 60%, transparent)' }}>Accountable item (PAR / PPE)</span>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.25rem', borderTop: '1px solid var(--line)' }}>
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

/* ── Adjust Modal ─────────────────────────────────────────────── */
function AdjustModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [operation, setOperation] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [busy, setBusy] = useState(false);

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
    <dialog className="modal modal-open" onClose={onClose}>
      <div className="modal-box" style={{ maxWidth: '26rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Adjust stock</h3>
        <p style={{ fontSize: '0.8125rem', color: 'color-mix(in oklab, var(--ink) 55%, transparent)', marginBottom: '1.25rem' }}>
          {item.name} · <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem' }}>{item.sku}</span>
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" className={`btn ${operation === 'IN' ? 'btn-primary' : ''}`} style={{ flex: 1, background: operation === 'IN' ? 'var(--ink)' : 'transparent', color: operation === 'IN' ? 'var(--on-ink)' : 'var(--ink)' }} onClick={() => { setOperation('IN'); setReferenceId(''); }}>Receive</button>
          <button type="button" className={`btn ${operation === 'OUT' ? 'btn-error' : ''}`} style={{ flex: 1, background: operation === 'OUT' ? 'var(--lgu-error)' : 'transparent', color: operation === 'OUT' ? '#fff' : 'var(--ink)', border: operation === 'OUT' ? '1px solid var(--lgu-error)' : '' }} onClick={() => { setOperation('OUT'); setReferenceId(''); }}>Issue</button>
        </div>

        <div style={{ padding: '0.75rem', background: 'var(--surface2)', borderRadius: '6px', marginBottom: '1rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>Current stock</div>
          <div style={{ fontWeight: 800, fontSize: '1.375rem', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{fmt(item.currentStock)} <span style={{ fontSize: '0.875rem', fontWeight: 400 }}>{item.unit}</span></div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="fieldset">
            <span className="fieldset-legend">Reference ID / Document No. {operation === 'OUT' && '*'}</span>
            <input className="input" value={referenceId} onChange={e => setReferenceId(e.target.value)} placeholder={operation === 'OUT' ? "Required for Issuance (e.g. RIS-001)" : "Optional for Receipt"} />
          </div>
          {operation === 'IN' && (
            <select className="select" value={referenceType} onChange={e => setReferenceType(e.target.value)}>
              <option value="">Receipt (default)</option><option value="ADJUSTMENT_IN">Adjustment IN</option>
            </select>
          )}
          {operation === 'OUT' && (
            <select className="select" value={referenceType} onChange={e => setReferenceType(e.target.value)}>
              <option value="">Issue (default)</option><option value="RETURN">Return to stock</option>
            </select>
          )}
          <div className="fieldset">
            <span className="fieldset-legend">Quantity ({item.unit})</span>
            <input className="input" type="number" min="0" step="any" required autoFocus value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          <div className="fieldset">
            <span className="fieldset-legend">Reason *</span>
            <textarea className="textarea" rows={2} required value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. PO-2026-001 delivery / Returned damaged unit" style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.25rem', borderTop: '1px solid var(--line)' }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}Save
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

/* ── QR Modal ─────────────────────────────────────────────────── */
function QRModal({ qr, onClose }) {
  return (
    <dialog className="modal modal-open">
      <div className="modal-box" style={{ maxWidth: '20rem' }}>
        <h3 style={{ fontWeight: 600, textAlign: 'center', marginBottom: '1rem' }}>QR code</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
          <img src={qr.dataUrl} alt={qr.sku} style={{ width: '12rem', height: '12rem', background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--line)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600 }}>{qr.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.06em', color: 'color-mix(in oklab, var(--ink) 50%, transparent)', marginTop: '0.2rem' }}>{qr.sku}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.25rem' }}>
          <button className="btn" onClick={() => window.print()}>Print label</button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
