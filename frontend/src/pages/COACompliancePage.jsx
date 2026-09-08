import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ShieldCheck, X, XCircle } from 'lucide-react';
import api from '../api/client';
import PageHeader, { EmptyState, FormModal, Spinner } from '../components/ui';

function Portal({ children }) {
  return createPortal(children, document.body);
}

function domainStatus(checks = []) {
  if (checks.some((c) => c.status === 'FAIL')) return 'non_compliant';
  if (checks.some((c) => c.status === 'WARN')) return 'at_risk';
  return 'compliant';
}

const DOMAIN_META = {
  coa2020_001: { label: 'COA Circular 2020-001 — PPE Tracking', formNo: 'COA-2020-001' },
  coa2021_002: { label: 'COA Circular 2021-002 — Audit of Inventories', formNo: 'COA-2021-002' },
  auditTrail: { label: 'Audit Trail Requirements', formNo: 'COA-AUDIT-TRAIL' },
  procurement: { label: 'RA 9184 Procurement Compliance', formNo: 'RA-9184' },
  inventoryHealth: { label: 'Inventory Health Metrics', formNo: 'COA-INV-HEALTH' },
  workflow: { label: 'RIS Workflow', formNo: 'COA-RIS-WF' },
};

const DOMAIN_ORDER = ['coa2020_001', 'coa2021_002', 'auditTrail', 'procurement', 'inventoryHealth', 'workflow'];

function checkBadge(status) {
  if (status === 'PASS') return 'badge-success';
  if (status === 'FAIL') return 'badge-error';
  if (status === 'WARN') return 'badge-warning';
  return 'badge-ghost';
}

function domainBadge(status) {
  if (status === 'compliant') return 'badge-success';
  if (status === 'at_risk') return 'badge-warning';
  return 'badge-error';
}

function domainTone(status) {
  if (status === 'compliant') return 'success';
  if (status === 'non_compliant') return 'danger';
  return 'info';
}

function domainLabel(status) {
  if (status === 'compliant') return 'Compliant';
  if (status === 'at_risk') return 'At Risk';
  return 'Non-Compliant';
}

export default function COACompliancePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeKey, setActiveKey] = useState(null);

  const years = useMemo(() => {
    const list = [];
    for (let y = currentYear + 1; y >= 2020; y--) list.push(y);
    return list;
  }, [currentYear]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get(`/coa/compliance?year=${year}`)
      .then((r) => {
        // Backend wraps payload as { data: compliance }
        setData(r.data?.data ?? r.data);
      })
      .catch((e) => setError(e.response?.data?.message || 'Unable to load COA compliance.'))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(load, [load]);

  // Modal chrome: lock scroll + Escape to close (no backdrop-click dismiss).
  useEffect(() => {
    if (!activeKey) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setActiveKey(null);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [activeKey]);

  const domains = useMemo(() => {
    if (!data) return [];
    return DOMAIN_ORDER.filter((key) => data[key] && Array.isArray(data[key].checks)).map((key) => ({
      key,
      ...data[key],
    }));
  }, [data]);

  const stats = useMemo(() => {
    const s = { compliant: 0, nonCompliant: 0, atRisk: 0 };
    domains.forEach((d) => {
      const st = domainStatus(d.checks);
      if (st === 'compliant') s.compliant += 1;
      else if (st === 'at_risk') s.atRisk += 1;
      else s.nonCompliant += 1;
    });
    return s;
  }, [domains]);

  const active = activeKey ? domains.find((d) => d.key === activeKey) : null;
  const activeStatus = active ? domainStatus(active.checks) : null;
  const score = Math.round(data?.overallScore ?? 0);
  const scoreClass = score >= 80 ? 'progress-success' : score >= 50 ? 'progress-warning' : 'progress-error';

  return (
    <div>
      <PageHeader
        title="COA Compliance Dashboard"
        subtitle={`Compliance status per COA Circular 2020-001 / 2021-002 requirements. Period: ${data?.period ?? year}`}
        actions={
          <>
            <select
              className="select select-sm"
              style={{ width: '10rem' }}
              aria-label="Compliance period year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  FY {y}
                </option>
              ))}
            </select>
            <Link to="/audit-logs" className="btn btn-outline btn-sm">
              <ShieldCheck size={14} /> Audit Trail
            </Link>
          </>
        }
      />

      {loading ? (
        <Spinner label="Loading COA compliance..." />
      ) : error ? (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm" onClick={load}>
            Retry
          </button>
        </div>
      ) : !data ? (
        <EmptyState message="No compliance data available." />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div className="stat">
              <div className="stat-title">Compliant domains</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {stats.compliant}
              </div>
              <div className="stat-desc">of {domains.length} domains</div>
            </div>
            <div className="stat">
              <div className="stat-title">Non-compliant</div>
              <div className="stat-value" style={{ color: 'var(--error)' }}>
                {stats.nonCompliant}
              </div>
              <div className="stat-desc">require action</div>
            </div>
            <div className="stat">
              <div className="stat-title">At risk</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>
                {stats.atRisk}
              </div>
              <div className="stat-desc">warnings to review</div>
            </div>
            <div className="stat">
              <div className="stat-title">Overall score</div>
              <div className="stat-value" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                {score}%
              </div>
              <div className={`progress ${scoreClass}`} style={{ marginTop: '0.5rem' }} aria-label={`Overall score ${score} percent`}>
                <div className="progress-bar" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
              </div>
            </div>
          </div>

          {data.summary && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body" style={{ padding: '1rem 1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem 1.5rem',
                    fontSize: '0.8125rem',
                    color: 'var(--muted)',
                  }}
                >
                  <span>
                    Accountable items: <strong style={{ color: 'var(--text)' }}>{data.summary.totalAccountableItems ?? 0}</strong>
                  </span>
                  <span>
                    RIS issued: <strong style={{ color: 'var(--text)' }}>{data.summary.totalRisIssued ?? 0}</strong>
                  </span>
                  <span>
                    Ledger entries: <strong style={{ color: 'var(--text)' }}>{data.summary.totalLedgerEntries ?? 0}</strong>
                  </span>
                  <span>
                    Audit logs: <strong style={{ color: 'var(--text)' }}>{data.summary.totalAuditLogs ?? 0}</strong>
                  </span>
                  <span>
                    Pending RIS: <strong style={{ color: 'var(--text)' }}>{data.pendingRisCount ?? 0}</strong>
                  </span>
                  <span>
                    Cancelled RIS: <strong style={{ color: 'var(--text)' }}>{data.cancelledRisCount ?? 0}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {domains.map((domain) => {
              const status = domainStatus(domain.checks);
              const pass = domain.checks.filter((c) => c.status === 'PASS').length;
              return (
                <div key={domain.key} className="card">
                  <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h2 className="card-title">{DOMAIN_META[domain.key]?.label ?? domain.key}</h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{domain.description}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                          {pass} of {domain.checks.length} checks passing
                        </p>
                      </div>
                      <span className={`badge ${domainBadge(status)}`}>{domainLabel(status)}</span>
                    </div>
                    {domain.checks.length > 0 && (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table table-sm" aria-label={`${DOMAIN_META[domain.key]?.label ?? domain.key} checks`}>
                          <thead>
                            <tr>
                              <th>Status</th>
                              <th>Requirement</th>
                              <th>Evidence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {domain.checks.slice(0, 4).map((check) => (
                              <tr key={check.id}>
                                <td>
                                  <span className={`badge ${checkBadge(check.status)}`}>{check.status}</span>
                                </td>
                                <td style={{ fontWeight: 600 }}>{check.label}</td>
                                <td style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>{check.detail}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setActiveKey(domain.key)}>
                        View all {domain.checks.length} checks
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {active && (
        <Portal>
          <FormModal
            title={DOMAIN_META[active.key]?.label ?? active.key}
              formNo={`${DOMAIN_META[active.key]?.formNo ?? 'COA'} · FY ${data?.period ?? year}`}
              icon={ShieldCheck}
              tone={domainTone(activeStatus)}
              badge={<span className={`badge ${domainBadge(activeStatus)}`}>{domainLabel(activeStatus)}</span>}
              size="modal-lg"
              onClose={() => setActiveKey(null)}
            >
              <div className="modal-body">
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>{active.description}</p>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table table-sm" aria-label={`${active.key} full checklist`}>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Requirement</th>
                        <th>Evidence / detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.checks.map((check) => (
                        <tr key={check.id}>
                          <td>
                            <span className={`badge ${checkBadge(check.status)}`}>
                              {check.status === 'PASS' ? (
                                <CheckCircle2 size={12} />
                              ) : check.status === 'FAIL' ? (
                                <XCircle size={12} />
                              ) : (
                                <AlertTriangle size={12} />
                              )}
                              {check.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{check.label}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>{check.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActiveKey(null)}>
                  <X size={14} /> Close
                </button>
              </div>
          </FormModal>
        </Portal>
      )}
    </div>
  );
}
