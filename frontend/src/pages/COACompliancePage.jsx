import { useEffect, useState } from 'react';
import api from '../api/client';
import { Spinner } from '../components/ui';

function StatusBadge({ status }) {
  const cls = {
    PASS: 'bg-success/10 text-success',
    WARN: 'bg-warning/10 text-warning',
    FAIL: 'bg-error/10 text-error',
  }[status] || 'bg-base-300 text-base-content/60';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function domainStatus(checks) {
  const hasFail = checks.some((c) => c.status === 'FAIL');
  const hasWarn = checks.some((c) => c.status === 'WARN');
  if (hasFail) return 'non_compliant';
  if (hasWarn) return 'at_risk';
  return 'compliant';
}

const DOMAIN_LABELS = {
  coa2020_001: 'COA Circular 2020-001 - PPE Tracking',
  coa2021_002: 'COA Circular 2021-002 - Audit of Inventories',
  auditTrail: 'Audit Trail Requirements',
  procurement: 'RA 9184 Procurement Compliance',
  inventoryHealth: 'Inventory Health Metrics',
  workflow: 'RIS Workflow',
};

export default function COACompliancePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/coa/compliance')
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Unable to load COA compliance.'));
  }, []);

  if (error) {
    return <div role="alert" className="alert alert-error"><span>{error}</span></div>;
  }
  if (!data) return <Spinner label="Loading COA compliance..." />;

  const domains = Object.entries(data).filter(
    ([, v]) => v && typeof v === 'object' && Array.isArray((v).checks)
  );

  const stats = {
    compliant: 0,
    nonCompliant: 0,
    atRisk: 0,
  };

  domains.forEach(([key, domain]) => {
    const status = domainStatus(domain.checks);
    if (status === 'compliant') stats.compliant++;
    else if (status === 'at_risk') stats.atRisk++;
    else stats.nonCompliant++;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">COA Compliance Dashboard</h1>
        <p className="mt-1 text-sm text-base-content/60">
          Compliance status per COA Circular 2020-001 / 2021-002 requirements. Period: {data.period}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="stat bg-base-200/50 rounded-box">
          <div className="stat-figure text-success text-2xl">?</div>
          <div className="stat-label">Compliant Domains</div>
          <div className="stat-value text-success">{stats.compliant}</div>
        </div>
        <div className="stat bg-base-200/50 rounded-box">
          <div className="stat-figure text-error text-2xl">?</div>
          <div className="stat-label">Non-Compliant</div>
          <div className="stat-value text-error">{stats.nonCompliant}</div>
        </div>
        <div className="stat bg-base-200/50 rounded-box">
          <div className="stat-figure text-warning text-2xl">?</div>
          <div className="stat-label">At Risk</div>
          <div className="stat-value text-warning">{stats.atRisk}</div>
        </div>
        <div className="stat bg-base-200/50 rounded-box">
          <div className="stat-figure text-primary text-2xl">%</div>
          <div className="stat-label">Overall Score</div>
          <div className="stat-value text-primary">{Math.round(data.overallScore ?? 0)}%</div>
        </div>
      </div>

      <div className="space-y-4">
        {domains.map(([key, domain]) => {
          const status = domainStatus(domain.checks);
          return (
            <div key={key} className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <h2 className="card-title">{DOMAIN_LABELS[key] ?? key}</h2>
                  <span className={`badge ${status === 'compliant' ? 'bg-success/10 text-success' : status === 'at_risk' ? 'bg-warning/10 text-warning' : 'bg-error/10 text-error'}`}>
                    {status === 'compliant' ? 'Compliant' : status === 'at_risk' ? 'At Risk' : 'Non-Compliant'}
                  </span>
                </div>
                <p className="text-sm text-base-content/70">{domain.description}</p>
                {domain.checks.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {domain.checks.map((check) => (
                      <div key={check.id} className="flex items-start gap-2">
                        <div className="mt-0.5">
                          <StatusBadge status={check.status} />
                        </div>
                        <div>
                          <div className="font-medium">{check.label}</div>
                          <div className="text-xs text-base-content/60">{check.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
