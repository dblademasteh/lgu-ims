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

const TOOLTIP = {
  bg: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: '6px', fontSize: '0.8125rem', boxShadow: 'var(--shadow-md)',
};

function KpiCard({ icon: Icon, label, value, color, to }) {
  return (
    <Link to={to || '#'} className="kpi-card">
      <div className="kpi-icon" style={{ background: `color-mix(in oklab, ${color} 12%, transparent)` }}>
        {Icon && <Icon size={16} strokeWidth={2} style={{ color }} />}
      </div>
      <div>
        <div className="kpi-value">{value ?? '—'}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </Link>
  );
}

function ChartSection({ title, action, children }) {
  return (
    <div className="chart-card">
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
  const daysLeft = isExpiry && item.expiryDate
    ? Math.ceil((new Date(item.expiryDate) - new Date()) / 86400000)
    : null;
  const color = isExpiry ? 'var(--warning)' : 'var(--error)';
  return (
    <Link to="/items" className="alert-row">
      <div className="alert-row-icon" style={{ background: `color-mix(in oklab, ${color} 12%, transparent)` }}>
        <AlertTriangle size={14} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="alert-row-name">{item.name}</div>
        <div className="alert-row-meta">{item.sku}</div>
      </div>
      <div className="alert-row-badge" style={{ color }}>
        {isExpiry ? (daysLeft > 0 ? `${daysLeft}d left` : 'expired') : `${item.currentStock} left`}
      </div>
    </Link>
  );
}

function LedgerRow({ entry }) {
  const isIn = entry.inflow > 0;
  const color = isIn ? 'var(--success)' : 'var(--error)';
  return (
    <div className="alert-row" style={{ pointerEvents: 'none' }}>
      <div className="alert-row-icon" style={{ background: `color-mix(in oklab, ${color} 12%, transparent)` }}>
        {isIn
          ? <ArrowUpRight size={12} style={{ color }} />
          : <ArrowDownRight size={12} style={{ color }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="alert-row-name">{entry.item?.name}</div>
        <div className="alert-row-meta">
          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' · '}
          {entry.referenceType?.replace(/_/g, ' ')}
        </div>
      </div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color, whiteSpace: 'nowrap' }}>
        {isIn ? `+${entry.inflow}` : `-${entry.outflow}`}
      </div>
    </div>
  );
}

function BudgetCard({ budget }) {
  const pct = budget.utilizationPct;
  const color = pct >= 90 ? 'var(--error)' : pct >= 70 ? 'var(--warning)' : 'var(--success)';
  return (
    <div className="budget-card">
      <div className="budget-card-header">
        <span className="budget-card-name">{budget.department?.name || 'General'}</span>
        <span className="budget-card-pct" style={{ color }}>{pct}%</span>
      </div>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <div className="budget-card-amount">
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
      setError(e.response?.data?.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = () => { setRefreshing(true); setLoading(true); fetchData(); };

  if (error) return <div className="alert alert-error"><span>{error}</span></div>;
  if (loading || !data) return <Spinner label="Loading dashboard..." />;

  const { stats, lowStock, recentLedger, expiringItems } = data;
  const monthLabels = stats?.monthLabels || [];

  const isAdmin = user?.role === 'ADMIN';
  const isAuditor = user?.role === 'AUDITOR';
  const isDeptHead = user?.role === 'DEPARTMENT_HEAD';
  const isWarehouse = ['WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN'].includes(user?.role);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
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

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-greeting">{greeting}{firstName ? `, ${firstName}` : ''}.</h1>
          <p className="dash-date">{today}</p>
          {lastUpdated && (
            <p className="dash-updated">Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          )}
        </div>
        <div className="dash-actions">
          <button onClick={handleRefresh} disabled={refreshing} className="btn btn-sm" title="Refresh dashboard">
            <Clock size={13} /> {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link to="/ris" className="btn btn-primary btn-sm">
            <ClipboardList size={13} /> New RIS
          </Link>
          {['ADMIN', 'WAREHOUSE_STAFF'].includes(user?.role) && (
            <Link to="/receiving" className="btn btn-sm">
              <Landmark size={13} /> Record Receiving
            </Link>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KpiCard icon={Package} label="Active items" value={stats.totalItems} color="var(--accent)" to="/items" />
        <KpiCard icon={AlertTriangle} label="Low stock" value={stats.lowStockItems} color="var(--error)" to="/items?lowStock=1" />
        <KpiCard icon={ClipboardList} label="Pending RIS" value={stats.pendingRisApprovals ?? stats.pendingRis} color="var(--warning)" to="/ris" />
        <KpiCard icon={FileText} label="Open POs" value={stats.openPurchaseOrders ?? 0} color="var(--accent)" to="/purchase-orders" />
        {(isAdmin || isAuditor) && (
          <KpiCard icon={CheckSquare} label="Pending counts" value={stats.pendingPhysicalCountsReview ?? 0} color="var(--success)" to="/physical-counts" />
        )}
        {isAdmin && (
          <KpiCard icon={CalendarClock} label="Expiring 30d" value={expiringItems?.length || 0} color="var(--warning)" to="/items" />
        )}
        {isAdmin && (
          <KpiCard icon={TrendingUp} label="Issued / month" value={stats.issuedThisMonth} color="var(--success)" to="/reports" />
        )}
        {isAdmin && (
          <KpiCard icon={Landmark} label="Suppliers" value={stats.totalSuppliers ?? 0} color="var(--accent)" to="/suppliers" />
        )}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <ChartSection title="Stock movement — 12 months">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={movementData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="inG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--success)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--error)" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="var(--error)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP} />
              <Area type="monotone" dataKey="In" stroke="var(--success)" fill="url(#inG)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="Out" stroke="var(--error)" fill="url(#outG)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartSection>

        <ChartSection title="RIS — 12 months">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={risData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP} />
              <Bar dataKey="RIS" fill="var(--text)" radius={[3, 3, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>
      </div>

      {/* Alert rows */}
      <div className="alerts-grid">
        <ChartSection
          title="Low stock"
          action={<Link to="/items?lowStock=1" className="dash-link">View all</Link>}
        >
          {lowStock.length === 0 ? (
            <div className="dash-empty"><CheckSquare size={15} style={{ color: 'var(--success)' }} /> All items above reorder point.</div>
          ) : (
            <div className="dash-list">
              {lowStock.slice(0, 4).map(i => <AlertRow key={i.id} item={i} type="low" />)}
            </div>
          )}
        </ChartSection>

        <ChartSection title="Expiring within 30 days">
          {(!expiringItems || expiringItems.length === 0) ? (
            <div className="dash-empty"><Clock size={15} /> No items expiring soon.</div>
          ) : (
            <div className="dash-list">
              {expiringItems.slice(0, 4).map(i => <AlertRow key={i.id} item={i} type="expiry" />)}
            </div>
          )}
        </ChartSection>

        <ChartSection
          title="Recent ledger"
          action={<Link to="/ledger" className="dash-link">Ledger</Link>}
        >
          {recentLedger.length === 0 ? (
            <div className="dash-empty">No movement recorded yet.</div>
          ) : (
            <div className="dash-list">
              {recentLedger.slice(0, 4).map(e => <LedgerRow key={e.id} entry={e} />)}
            </div>
          )}
        </ChartSection>
      </div>

      {/* Budget */}
      {stats.budgetUtilization?.length > 0 && (isAdmin || isDeptHead || isAuditor) && (
        <ChartSection title={`Budget — ${new Date().getFullYear()}`}>
          <div className="budget-grid">
            {stats.budgetUtilization.map(b => <BudgetCard key={b.department?.id} budget={b} />)}
          </div>
        </ChartSection>
      )}
    </div>
  );
}
