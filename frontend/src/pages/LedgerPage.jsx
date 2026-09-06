import { useEffect, useState } from 'react';
import api, { openReport } from '../api/client';
import { useToast } from '../components/Toast';
import PageHeader, { EmptyState, Spinner } from '../components/ui';

const TYPE_BADGE = {
  OPENING_BALANCE: 'badge-ghost',
  RECEIPT: 'badge-success',
  ISSUANCE: 'badge-error',
  ADJUSTMENT_IN: 'badge-success',
  ADJUSTMENT_OUT: 'badge-error',
  RETURN: 'badge-info',
};

const TYPE_LABEL = {
  OPENING_BALANCE: 'Opening balance',
  RECEIPT: 'Receipt',
  ISSUANCE: 'Issuance',
  ADJUSTMENT_IN: 'Adjustment (in)',
  ADJUSTMENT_OUT: 'Adjustment (out)',
  RETURN: 'Return',
};

export default function LedgerPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [itemId, setItemId] = useState('');
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/items?limit=200').then((r) => setItems(r.data.data)).catch(() => {});
  }, []);

  const loadCard = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await api.get(`/ledger/items/${id}/card`);
      setCard(r.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to load ledger card.');
    } finally {
      setLoading(false);
    }
  };

  const onSelect = (id) => {
    setItemId(id);
    if (id) loadCard(id);
  };

  return (
    <div>
      <PageHeader
        title="Supply Ledger Cards"
        subtitle="Auto-generated stock movement card per item. Every issuance, receipt and adjustment is tracked."
        actions={
          <>
            <button className="btn btn-outline" disabled={!itemId} onClick={() => openReport(`/reports/ledger-card/${itemId}`)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M4 19V5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1z" /></svg>
              Ledger Card (PDF)
            </button>
            <button className="btn btn-outline" disabled={!itemId} onClick={() => openReport(`/reports/ledger-card/${itemId}?format=excel`, true)}>
              Ledger Card (Excel)
            </button>
            <button className="btn btn-outline" disabled={!itemId} onClick={() => openReport(`/reports/movements?itemId=${itemId}&format=excel`, true)}>
              Movements (Excel)
            </button>
          </>
        }
      />

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select className="select sm:max-w-lg flex-1" value={itemId} onChange={(e) => onSelect(e.target.value)}>
              <option value="">Select an item...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name} · {i.sku}</option>
              ))}
            </select>
          </div>

          {loading && <Spinner label="Loading ledger card..." />}

          {!loading && card && (
            <div className="print-area">
              <div className="text-center mb-4">
                <div className="text-lg font-bold uppercase tracking-wide">Supply Ledger Card</div>
                <div>{card.item.name} <span className="font-mono">({card.item.sku})</span></div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                <div><div className="text-xs opacity-60">Category</div><div>{card.item.category?.name}</div></div>
                <div><div className="text-xs opacity-60">Unit</div><div>{card.item.unit}</div></div>
                <div><div className="text-xs opacity-60">Reorder level</div><div>{card.item.reorderThreshold}</div></div>
                <div>
                  <div className="text-xs opacity-60">On hand</div>
                  <div className="font-bold text-lg">{card.item.currentStock} <span className="text-sm font-normal opacity-60">{card.item.unit}</span></div>
                </div>
              </div>

              {card.entries.length === 0 ? (
                <EmptyState message="No ledger entries for this item yet." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm" aria-label={`Ledger entries for ${card?.item?.name || 'selected item'}`}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Reference</th>
                        <th>Transaction</th>
                        <th className="text-right">Received (in)</th>
                        <th className="text-right">Issued (out)</th>
                        <th className="text-right">Balance</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {card.entries.map((e) => (
                        <tr key={e.id}>
                          <td className="whitespace-nowrap">{new Date(e.date).toLocaleString()}</td>
                          <td className="text-xs">{e.referenceId || '—'}</td>
                          <td>
                            <span className={`badge ${TYPE_BADGE[e.referenceType] || ''}`}>{TYPE_LABEL[e.referenceType] || e.referenceType}</span>
                          </td>
                          <td className="text-right text-success font-medium">{e.inflow > 0 ? e.inflow : '—'}</td>
                          <td className="text-right text-error font-medium">{e.outflow > 0 ? e.outflow : '—'}</td>
                          <td className="text-right font-semibold">{e.runningBalance}</td>
                          <td className="text-xs opacity-70 max-w-72 truncate">{e.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan="3" className="text-right">Totals</th>
                        <th className="text-right text-success">{card.totals.in}</th>
                        <th className="text-right text-error">{card.totals.out}</th>
                        <th className="text-right">{card.totals.balance}</th>
                        <th />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {!loading && !card && (
            <EmptyState message="Select an item to view its supply ledger card." />
          )}
        </div>
      </div>
    </div>
  );
}