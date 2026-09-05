export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-base-content/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16">
      <span className="loading loading-spinner loading-lg text-primary" />
      <span className="text-base-content/60">{label || 'Loading...'}</span>
    </div>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-base-content/50">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7l6-4 6 4 6-4v14l-6 4-6-4-6 4V7z" />
      </svg>
      <p>{message || 'No records found.'}</p>
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
      <p className="text-sm text-base-content/60">
        Showing page {page} of {totalPages} · {total} record{total === 1 ? '' : 's'}
      </p>
      <div className="join">
        <button className="btn btn-sm join-item" disabled={page <= 1} onClick={() => onPage(page - 1)}>« Prev</button>
        {pages.map((p) => (
          <button
            key={p}
            className={`btn btn-sm join-item ${p === page ? 'btn-active' : ''}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ))}
        <button className="btn btn-sm join-item" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next »</button>
      </div>
    </div>
  );
}

export function Money({ value, className = '' }) {
  return (
    <span className={className}>
      ₱{Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

export function Badge({ status, children }) {
  const map = {
    PENDING: 'badge-warning',
    APPROVED: 'badge-info',
    PARTIALLY_ISSUED: 'badge-warning',
    ISSUED: 'badge-success',
    REJECTED: 'badge-error',
    CANCELLED: 'badge-neutral badge-outline',
    Low: 'badge-error',
    OK: 'badge-success',
    LOW_STOCK: 'badge-error',
    RIS: 'badge-info',
    SYSTEM: 'badge-neutral',
  };
  const cls = map[status] || 'badge-neutral';
  return <span className={`badge ${cls} badge-sm`}>{children || status}</span>;
}