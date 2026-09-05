import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Badge, EmptyState, Spinner } from '../components/ui';

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body flex-row items-center gap-4 p-5">
        <div className={`rounded-lg p-3 ${accent}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={icon} />
          </svg>
        </div>
        <div>
          <div className="text-3xl font-bold tabular-nums">{Number(value ?? 0).toLocaleString()}</div>
          <div className="text-sm text-base-content/60">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/stats/dashboard')
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Unable to load dashboard.'));
  }, []);

  if (error) {
    return <div role="alert" className="alert alert-error"><span>{error}</span></div>;
  }
  if (!data) return <Spinner label="Loading dashboard..." />;

  const { stats, lowStock, recentLedger } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-base-content/60">Overview of stock, requisitions and alerts.</p>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <StatCard icon="M20 13V7a2 2 0 00-2-2H4a2 2 0 00-2 2v6m0 4h20M4 17a1 1 0 011 1v2h14v-2a1 1 0 011-1" label="Active Items" value={stats.totalItems} accent="bg-primary/10 text-primary" />
        <StatCard icon="M3 7l6-4 6 4 6-4v14l-6 4-6-4-6 4V7z" label="Categories" value={stats.totalCategories} accent="bg-secondary/10 text-secondary" />
        <StatCard icon="M9 12h6m-6 4h6M5 21h14a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v16a1 1 0 001 1z" label="Pending RIS" value={stats.pendingRis} accent="bg-info/10 text-info" />
        <StatCard icon="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" label="Low Stock Items" value={stats.lowStockItems} accent="bg-warning/10 text-warning" />
        <StatCard icon="M8 7h12m0 0l-4-4m4 4l-4 4M12 17H4m0 0l4 4m-4-4l4-4" label="Issued this Month" value={stats.issuedThisMonth} accent="bg-success/10 text-success" />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="card-body">
            <div className="no-print flex items-center justify-between">
              <h2 className="card-title text-base">Low stock alerts</h2>
              <Link to="/items?lowStock=1" className="btn btn-ghost btn-sm">View all</Link>
            </div>
            {lowStock.length === 0 ? (
              <EmptyState message="No low-stock items. Stock levels are healthy." />
            ) : (
              <div className="overflow-x-auto lg:max-h-105 lg:overflow-y-auto">
                <table className="table table-sm">
                  <thead>
                    <tr><th>Item</th><th>On hand</th><th>Reorder</th><th>Unit</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {lowStock.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <div className="font-medium">{i.name}</div>
                          <div className="truncate font-mono text-xs opacity-60">{i.sku}</div>
                        </td>
                        <td className="font-semibold text-warning">{i.currentStock}</td>
                        <td>{i.reorderThreshold}</td>
                        <td>{i.unit}</td>
                        <td><Badge status="Low">Low</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="card-body">
            <div className="no-print flex items-center justify-between">
              <h2 className="card-title text-base">Recent stock movement</h2>
              <Link to="/ledger" className="btn btn-ghost btn-sm">Ledger</Link>
            </div>
            {recentLedger.length === 0 ? (
              <EmptyState message="No stock movement recorded yet." />
            ) : (
              <div className="overflow-x-auto lg:max-h-105 lg:overflow-y-auto">
                <table className="table table-sm">
                  <thead>
                    <tr><th>Date</th><th>Item</th><th>Type</th><th>In</th><th>Out</th><th>Balance</th></tr>
                  </thead>
                  <tbody>
                    {recentLedger.map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                        <td>
                          <span className="block font-medium">{e.item.name}</span>
                          <span className="block truncate font-mono text-xs opacity-60">{e.item.sku}</span>
                        </td>
                        <td><Badge status={e.referenceType}>{e.referenceType.replace(/_/g, ' ')}</Badge></td>
                        <td className="text-success">{e.inflow > 0 ? e.inflow : '—'}</td>
                        <td className="text-error">{e.outflow > 0 ? e.outflow : '—'}</td>
                        <td className="font-semibold">{e.runningBalance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}