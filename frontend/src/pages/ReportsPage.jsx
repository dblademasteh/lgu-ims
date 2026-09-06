import { useEffect, useState } from 'react';
import api, { openReport } from '../api/client';
import { useToast } from '../components/Toast';
import PageHeader, { Spinner } from '../components/ui';

function ReportCard({ title, description, children }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title text-base">{title}</h2>
        <p className="text-sm text-base-content/60">{description}</p>
        {children}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingRef, setLoadingRef] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [rsmi, setRsmi] = useState({ from: monthStart, to: today, departmentId: '' });
  const [inventory, setInventory] = useState({ categoryId: '' });
  const [movement, setMovement] = useState({ itemId: '', from: '', to: '', useRange: false });
  const [ledgerItemId, setLedgerItemId] = useState('');
  const [ics, setIcs] = useState({ from: monthStart, to: today });
  const [appYear, setAppYear] = useState(new Date().getFullYear());

  useEffect(() => {
    api.get('/items?limit=200').then((r) => setItems(r.data.data)).catch(() => {});
    api.get('/departments').then((r) => setDepartments(r.data.data)).catch(() => {});
    api.get('/categories').then((r) => setCategories(r.data.data)).catch(() => {});
  }, []);

  const run = (path, download) => {
    setLoadingRef(true);
    openReport(path, download);
    setTimeout(() => setLoadingRef(false), 1500);
  };

  const movementsPath = (format) => {
    const q = new URLSearchParams();
    if (movement.itemId) q.set('itemId', movement.itemId);
    if (movement.useRange) {
      if (movement.from) q.set('from', movement.from);
      if (movement.to) q.set('to', movement.to);
    }
    if (format) q.set('format', format);
    return `/reports/movements${q.toString() ? `?${q}` : ''}`;
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate COA-format reports and inventory documents (PDF / Excel export)." />
      {loadingRef && <div className="mb-4"><Spinner label="Preparing report..." /></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportCard title="Report of Supplies and Materials Issued (RSMI)" description="COA-compliant summary of all items issued within a date range.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">From</legend>
              <input className="input" type="date" value={rsmi.from} onChange={(e) => setRsmi({ ...rsmi, from: e.target.value })} />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">To</legend>
              <input className="input" type="date" value={rsmi.to} onChange={(e) => setRsmi({ ...rsmi, to: e.target.value })} />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Department</legend>
              <select className="select" value={rsmi.departmentId} onChange={(e) => setRsmi({ ...rsmi, departmentId: e.target.value })}>
                <option value="">All departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </fieldset>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary flex-1" onClick={() => {
              if (!rsmi.from || !rsmi.to) return toast.error('Select a date range.');
              run(`/reports/rsmi?from=${rsmi.from}&to=${rsmi.to}${rsmi.departmentId ? `&departmentId=${rsmi.departmentId}` : ''}`);
            }}>PDF</button>
            <button className="btn btn-outline flex-1" onClick={() => {
              if (!rsmi.from || !rsmi.to) return toast.error('Select a date range.');
              run(`/reports/rsmi?from=${rsmi.from}&to=${rsmi.to}${rsmi.departmentId ? `&departmentId=${rsmi.departmentId}` : ''}&format=excel`, true);
            }}>Excel</button>
          </div>
        </ReportCard>

        <ReportCard title="Inventory Summary" description="Current stock levels with reorder status and stock valuation.">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Category</legend>
            <select className="select" value={inventory.categoryId} onChange={(e) => setInventory({ ...inventory, categoryId: e.target.value })}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </fieldset>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary flex-1" onClick={() => run(`/reports/inventory${inventory.categoryId ? `?categoryId=${inventory.categoryId}` : ''}`)}>PDF</button>
            <button className="btn btn-outline flex-1" onClick={() => run(`/reports/inventory${inventory.categoryId ? `?categoryId=${inventory.categoryId}` : ''}&format=excel`, true)}>Excel</button>
          </div>
        </ReportCard>

        <ReportCard title="Stock Movement History" description="Every inflow and outflow with running balance — for auditing and reconciliation.">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Item</legend>
            <select className="select" value={movement.itemId} onChange={(e) => setMovement({ ...movement, itemId: e.target.value })}>
              <option value="">All items</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name} · {i.sku}</option>)}
            </select>
          </fieldset>
          <label className="flex items-center gap-2 text-sm mt-3 px-1 cursor-pointer">
            <input type="checkbox" className="checkbox checkbox-sm" checked={movement.useRange} onChange={(e) => setMovement({ ...movement, useRange: e.target.checked })} />
            Filter by date range
          </label>
          {movement.useRange && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <input className="input" type="date" value={movement.from} onChange={(e) => setMovement({ ...movement, from: e.target.value })} />
              <input className="input" type="date" value={movement.to} onChange={(e) => setMovement({ ...movement, to: e.target.value })} />
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary flex-1" onClick={() => run(movementsPath(''))}>PDF</button>
            <button className="btn btn-outline flex-1" onClick={() => run(movementsPath('excel'), true)}>Excel</button>
          </div>
        </ReportCard>

        <ReportCard title="Supply Ledger Cards" description="Printable COA-format ledger card per item. Also available from the Ledger Cards page.">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Item</legend>
            <select className="select" value={ledgerItemId} onChange={(e) => setLedgerItemId(e.target.value)}>
              <option value="">Select an item...</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name} · {i.sku}</option>)}
            </select>
          </fieldset>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary flex-1" onClick={() => {
              if (!ledgerItemId) return toast.error('Select an item first.');
              run(`/reports/ledger-card/${ledgerItemId}`);
            }}>Print / PDF</button>
            <button className="btn btn-outline flex-1" onClick={() => {
              if (!ledgerItemId) return toast.error('Select an item first.');
              run(`/reports/ledger-card/${ledgerItemId}?format=excel`, true);
            }}>Excel</button>
          </div>
</ReportCard>

        <ReportCard title="Inventory Custodian Slip (ICS)" description="Records all items transferred to custodians within a date range.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">From</legend>
              <input className="input" type="date" value={ics.from} onChange={(e) => setIcs({ ...ics, from: e.target.value })} />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">To</legend>
              <input className="input" type="date" value={ics.to} onChange={(e) => setIcs({ ...ics, to: e.target.value })} />
            </fieldset>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary flex-1" onClick={() => {
              if (!ics.from || !ics.to) return toast.error('Select a date range.');
              run('/reports/icing?from=' + ics.from + '&to=' + ics.to);
            }}>PDF</button>
            <button className="btn btn-outline flex-1" onClick={() => {
              if (!ics.from || !ics.to) return toast.error('Select a date range.');
              run('/reports/icing?from=' + ics.from + '&to=' + ics.to + '&format=excel', true);
            }}>Excel</button>
          </div>
        </ReportCard>

        <ReportCard title="Annual Property, Plant & Equipment (APP)" description="Year-end inventory of all accountable property with depreciation.">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Year</legend>
            <input className="input" type="number" value={appYear} onChange={(e) => setAppYear(Number(e.target.value) || new Date().getFullYear())} />
          </fieldset>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary flex-1" onClick={() => run('/reports/app?year=' + appYear)}>PDF</button>
            <button className="btn btn-outline flex-1" onClick={() => run('/reports/app?year=' + appYear + '&format=excel', true)}>Excel</button>
          </div>
        </ReportCard>
      </div>
    </div>
  );
}