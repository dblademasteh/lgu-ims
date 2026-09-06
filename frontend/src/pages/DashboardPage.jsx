import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../api/client';
import useAuthStore from '../stores/authStore';
import { Spinner } from '../components/ui';
import {
  Package, ClipboardList, AlertTriangle, TrendingUp, CheckSquare,
  CalendarClock, FileText, Landmark, ArrowUpRight, ArrowDownRight, Clock,
} from 'lucide-react';

const CHART_TOOLTIP = {
  bg: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)',
  borderRadius: '6px', fontSize: 'var(--fs-sm)', boxShadow: 'var(--shadow-md)',
};

function KpiCard({ icon: Icon, label, value, accent, to }) {
  const content = (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: accent }}>{Icon && <Icon size={16} strokeWidth={2} style={{ color: 'var(--surface)' }} />}</div>
      <div>
        <div className="kpi-value">{value ?? '—'}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return content;
}

function Section({ title, action, children, style }) {
  return (
    <div className="chart-card" style={style}>
      {(title || action) && (
        <div className="chart-header">
          <div className="chart-title">{title}</div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function AlertRow({ item, type }) {
  const isExpiry = type === 'expiry';
  const daysLeft = isExpiry && item.expiryDate ? Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000) : null;
  return (
    <Link to="/items" className="alert-row" style={{ textDecoration: 'none' }}>
      <div className="alert-row-icon" style={{ background: isExpiry ? 'color-mix(in oklab, var(--lgu-warning) 12%, transparent)' : 'color-mix(in oklab, var(--lgu-error) 12%, transparent)' }}>
        <AlertTriangle size={14} style={{ color: isExpiry ? 'var(--lgu-warning)' : 'var(--lgu-error)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'color-mix(in oklab, var(--ink) 40%, transparent)', letterSpacing: '0.04em' }}>{item.sku}</div>
      </div>
      <div style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: isExpiry ? 'var(--lgu-warning)' : 'var(--lgu-error)', whiteSpace: 'nowrap' }}>
        {isExpiry ? (daysLeft > 0 ? `${daysLeft}d left` : 'expired') : `${item.currentStock} left`}
      </div>
    </Link>
  );
}

function LedgerRow({ entry }) {
  const isIn = entry.inflow > 0;
  return (
    <div className="alert-row" style={{ pointerEvents: 'none' }}>
      <div className="alert-row-icon" style={{ background: isIn ? 'color-mix(in oklab, var(--lgu-success) 12%, transparent)' : 'color-mix(in oklab, var(--lgu-error) 12%, transparent)' }}>
        {isIn ? <ArrowUpRight size={12} style={{ color: 'var(--lgu-success)' }} /> : <ArrowDownRight size={12} style={{ color: 'var(--lgu-error)' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.item?.name}</div>
        <div style={{ fontSize: '0.5625rem', fontFamily: 'var(--font-mono)', color: 'color-mix(in oklab, var(--ink) 40%, transparent)', letterSpacing: '0.04em' }}>
          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {entry.referenceType?.replace(/_/g, ' ')}
        </div>
      </div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: isIn ? 'var(--lgu-success)' : 'var(--lgu-error)', whiteSpace: 'nowrap' }}>
        {isIn ? `+${entry.inflow}` : `-${entry.outflow}`}
      </div>
    </div>
  );
}

function BudgetCard({ budget }) {
  const pct = budget.utilizationPct;
  const color = pct >= 90 ? 'var(--lgu-error)' : pct >= 70 ? 'var(--lgu-warning)' : 'var(--lgu-success)';
  return (
    <div style={{ padding: '0.875rem', border: '1px solid var(--line)', borderRadius: '7px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '0.5rem' }}>
          {budget.department?.name || 'General'}
        </span>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color }}>{pct}%</span>
      </div>
      <div style={{ height: '8px', background: 'var(--line)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '0.5rem' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '9999px', transition: 'width 400ms ease' }} />
      </div>
      <div style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'color-mix(in oklab, var(--ink) 40%, transparent)', letterSpacing: '0.04em' }}>
        ₱{(budget.spent / 1).toLocaleString('en-US', { minimumFractionDigits: 2 })} of ₱{(budget.budget / 1).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      const r = await api.get('/users/stats/dashboard');
      setData(r.data);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to load.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = () => { setRefreshing(true); setLoading(true); fetchData(); };

  if (error) return <div className="alert alert-error" style={{ margin: '1.5rem' }}><span>{error}</span></div>;
  if (loading || !data) return <Spinner label="Loading dashboard..." />;

  const { stats, lowStock, recentLedger, expiringItems } = data;
  const monthLabels = stats?.monthLabels || [];

  const isAdmin = user?.role === 'ADMIN';
  const isAuditor = user?.role === 'AUDITOR';
  const isDeptHead = user?.role === 'DEPARTMENT_HEAD';
  const isWarehouse = ['WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN'].includes(user?.role);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = (user?.fullName || user?.username || '').trim().split(' ')[0] || '';

  const movementData = monthLabels.map((label, i) => ({
    month: label,
    In: stats.monthlyMovements?.inflow?.[i] || 0,
    Out: stats.monthlyMovements?.outflow?.[i] || 0,
  }));

  const risData = monthLabels.map((label, i) => ({
    month: label,
    RIS: stats.monthlyRis?.[i] || 0,
  }));

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const tenantName = user?.tenantId
    ? (user.tenantId === 'default' ? 'Default Tenant' : user.tenantId)
    : null;

  return (
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {greeting}{firstName ? `, ${firstName}` : ''}.
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'color-mix(in oklab, var(--ink) 50%, transparent)', marginTop: '0.25rem' }}>{today}</p>
          {tenantName && (
            <p style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'color-mix(in oklab, var(--ink) 35%, transparent)', marginTop: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tenant: {tenantName}
            </p>
          )}
          {lastUpdated && (
            <p style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'color-mix(in oklab, var(--ink) 35%, transparent)', marginTop: '0.125rem' }}>
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handleRefresh} disabled={refreshing} className="btn btn-sm" style={{ gap: '0.375rem', opacity: refreshing ? 0.6 : 1 }} title="Refresh dashboard">
            <Clock size={13} /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link to="/ris" className="btn btn-primary btn-sm" style={{ gap: '0.375rem' }}>
            <ClipboardList size={13} /> New RIS
          </Link>
          {['ADMIN', 'WAREHOUSE_STAFF'].includes(user?.role) && (
            <Link to="/receiving" className="btn btn-sm" style={{ gap: '0.375rem' }}>
              <Landmark size={13} /> Record Receiving
            </Link>
          )}
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 14rem), 1fr))', gap: '0.625rem' }}>
        <KpiCard icon={Package} label="Active items" value={stats.totalItems} accent="color-mix(in oklab, var(--lgu-info) 15%, transparent)" to="/items" />
        <KpiCard icon={AlertTriangle} label="Low stock" value={stats.lowStockItems} accent="color-mix(in oklab, var(--lgu-error) 15%, transparent)" to="/items?lowStock=1" />
        <KpiCard icon={ClipboardList} label="Pending RIS" value={stats.pendingRisApprovals ?? stats.pendingRis} accent="color-mix(in oklab, var(--lgu-warning) 15%, transparent)" to="/ris" />
        <KpiCard icon={FileText} label="Open POs" value={stats.openPurchaseOrders ?? 0} accent="color-mix(in oklab, var(--lgu-info) 15%, transparent)" to="/purchase-orders" />
        {(isAdmin || isAuditor) && (
          <KpiCard icon={CheckSquare} label="Pending counts" value={stats.pendingPhysicalCountsReview ?? 0} accent="color-mix(in oklab, var(--lgu-success) 15%, transparent)" to="/physical-counts" />
        )}
        {isAdmin && (
          <KpiCard icon={CalendarClock} label="Expiring 30d" value={expiringItems?.length || 0} accent="color-mix(in oklab, var(--lgu-warning) 15%, transparent)" to="/items" />
        )}
        {isAdmin && (
          <KpiCard icon={TrendingUp} label="Issued / month" value={stats.issuedThisMonth} accent="color-mix(in oklab, var(--lgu-success) 15%, transparent)" to="/reports" />
        )}
        {isAdmin && (
          <KpiCard icon={Landmark} label="Suppliers" value={stats.totalSuppliers ?? 0} accent="color-mix(in oklab, var(--lgu-info) 15%, transparent)" to="/suppliers" />
        )}
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 26rem), 1fr))', gap: '0.875rem' }}>
        <Section title="Stock movement — 12 months">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={movementData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="inG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--lgu-success)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--lgu-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--lgu-error)" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="var(--lgu-error)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'color-mix(in oklab, var(--ink) 45%, transparent)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'color-mix(in oklab, var(--ink) 45%, transparent)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP} />
              <Area type="monotone" dataKey="In" stroke="var(--lgu-success)" fill="url(#inG)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Out" stroke="var(--lgu-error)" fill="url(#outG)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        <Section title="RIS — 12 months">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={risData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'color-mix(in oklab, var(--ink) 45%, transparent)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'color-mix(in oklab, var(--ink) 45%, transparent)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP} />
              <Bar dataKey="RIS" fill="var(--ink)" radius={[3, 3, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 15rem), 1fr))', gap: '0.875rem' }}>
        {/* Low stock */}
        <Section title="Low stock" action={<Link to="/items?lowStock=1" style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 50%, transparent)', textDecoration: 'none' }}>All</Link>}>
          {lowStock.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1.5rem 0', color: 'var(--lgu-success)', fontSize: '0.8125rem' }}>
              <CheckSquare size={16} /> All items above reorder point.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {lowStock.slice(0, 4).map(i => <AlertRow key={i.id} item={i} type="low" />)}
            </div>
          )}
        </Section>

        {/* Expiring */}
        <Section title="Expiring within 30 days">
          {(!expiringItems || expiringItems.length === 0) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1.5rem 0', color: 'color-mix(in oklab, var(--ink) 40%, transparent)', fontSize: '0.8125rem' }}>
              <Clock size={16} /> No items expiring soon.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {expiringItems.slice(0, 4).map(i => <AlertRow key={i.id} item={i} type="expiry" />)}
            </div>
          )}
        </Section>

        {/* Recent ledger */}
        <Section title="Recent ledger" action={<Link to="/ledger" style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 50%, transparent)', textDecoration: 'none' }}>Ledger</Link>}>
          {recentLedger.length === 0 ? (
            <div style={{ padding: '1.5rem 0', color: 'color-mix(in oklab, var(--ink) 40%, transparent)', fontSize: '0.8125rem' }}>No movement recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {recentLedger.slice(0, 4).map(e => <LedgerRow key={e.id} entry={e} />)}
            </div>
          )}
        </Section>
      </div>

      {/* ── Budget ── */}
      {stats.budgetUtilization?.length > 0 && (isAdmin || isDeptHead || isAuditor) && (
        <Section title={`Budget — ${new Date().getFullYear()}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 11rem), 1fr))', gap: '0.625rem' }}>
            {stats.budgetUtilization.map(b => <BudgetCard key={b.department?.id} budget={b} />)}
          </div>
        </Section>
      )}
    </div>
  );
}
