import { Package, ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * FormModal — official "government form" modal shell.
 * Renders a colored accent bar, a seal/emblem icon, a title with an optional
 * mono "Form No." caption, an optional status badge, and a close button.
 * Children are rendered raw after the header so callers keep their own
 * body/footer structure.
 *
 * tone: 'neutral' | 'info' | 'success' | 'danger'
 */
export function FormModal({ title, formNo, icon: Icon, tone = 'neutral', badge, size = 'modal-md', onClose, children }) {
  return (
    <div className="modal-backdrop">
      <div className={`modal-box ${size} fm-modal`} role="dialog" aria-modal="true" aria-label={title}>
        <div className={`fm-accent fm-accent--${tone}`} />
        <div className="modal-header fm-header">
          <div className="fm-header-left">
            <div className={`fm-seal fm-seal--${tone}`}>{Icon && <Icon size={18} />}</div>
            <div>
              <h3 className="modal-title">{title}</h3>
              {formNo && <div className="modal-subtitle fm-form-no">{formNo}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {badge}
            <button className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={15} /></button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 'var(--text-base)', color: 'color-mix(in oklab, var(--text) 50%, transparent)', marginTop: '0.2rem' }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '4rem 0' }}>
      <span className="spinner" />
      <span style={{ color: 'color-mix(in oklab, var(--text) 55%, transparent)', fontSize: '0.875rem' }}>{label || 'Loading...'}</span>
    </div>
  );
}

export function EmptyState({ message, icon }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '4rem 2rem', color: 'color-mix(in oklab, var(--text) 40%, transparent)' }}>
      {icon || <Package size={40} strokeWidth={1.4} />}
      <p style={{ fontSize: '0.875rem', textAlign: 'center' }}>{message || 'No records found.'}</p>
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total } = meta;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="pagination">
      <span className="pagination-info">Page {page} of {totalPages} · {total} record{total === 1 ? '' : 's'}</span>
      <div className="pagination-controls">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={14} /> Prev
        </button>
        {pages.map(p => (
          <button key={p} className={`btn btn-sm${p === page ? ' btn-active' : ''}`} onClick={() => onPage(p)}>{p}</button>
        ))}
        <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function Money({ value, className = '' }) {
  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      ₱{Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

export function Badge({ status, children, className = '' }) {
  const map = {
    PENDING: 'badge-warning',
    APPROVED: 'badge-info',
    PARTIALLY_ISSUED: 'badge-warning',
    ISSUED: 'badge-success',
    REJECTED: 'badge-error',
    CANCELLED: 'badge-ghost',
    CERTIFIED: 'badge-info',
    RECEIVED: 'badge-success',
    DRAFT: 'badge-ghost',
    SUBMITTED: 'badge-warning',
    Low: 'badge-error',
    OK: 'badge-success',
    LOW_STOCK: 'badge-error',
    RIS: 'badge-info',
    SYSTEM: 'badge-ghost',
  };
  const cls = map[status] || 'badge-ghost';
  return <span className={`badge badge-sm ${cls} ${className}`}>{children || status}</span>;
}
export default PageHeader;
