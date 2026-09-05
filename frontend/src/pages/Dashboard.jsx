import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import { getDashboardApi } from '../services/api.js';
import { formatDateTime, formatINR, greetingForNow } from '../lib/format.js';
import StatusBadge from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Button from '../components/Button.jsx';

export default function Dashboard() {
  const { seller } = useAuth();
  const tick = useRealtime(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDashboardApi()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const stats = data?.stats || {
    collectedToday: 0,
    collectedLast7Days: 0,
    averageTicketLast7Days: 0,
    transactions: 0,
    pending: 0,
    successfulPayments: 0,
    failedPayments: 0,
  };

  return (
    <div>
      <p className="text-sm text-muted">{greetingForNow()}</p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
        {seller?.businessName || 'PayBot'}
      </h1>
      <p className="mt-1 text-sm text-muted">
        Here&apos;s what&apos;s happening with your collections
        {seller?.role && seller.role !== 'owner' ? ` · signed in as ${seller.role}` : ''}.
      </p>

      {error && <p className="mt-4 text-sm text-[#B42318]">{error}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected today" value={loading ? '—' : formatINR(stats.collectedToday)} />
        <Stat label="Last 7 days" value={loading ? '—' : formatINR(stats.collectedLast7Days)} />
        <Stat label="Avg ticket (7d)" value={loading ? '—' : formatINR(stats.averageTicketLast7Days)} />
        <Stat label="Pending" value={loading ? '—' : stats.pending} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Today's requests" value={loading ? '—' : stats.transactions} />
        <Stat label="Successful (all time)" value={loading ? '—' : stats.successfulPayments} />
        <Stat label="Failed (all time)" value={loading ? '—' : stats.failedPayments} />
      </div>

      {Boolean(data?.series?.paidLast7Days?.length) && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold">Paid last 7 days</h2>
          <div className="mt-3 flex items-end gap-2">
            {data.series.paidLast7Days.map((row) => {
              const max = Math.max(...data.series.paidLast7Days.map((r) => r.total), 1);
              const height = Math.max(8, Math.round((row.total / max) * 72));
              return (
                <div key={row.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full max-w-[36px] rounded-sm bg-forest/80"
                    style={{ height }}
                    title={`${row.date}: ${formatINR(row.total)}`}
                  />
                  <span className="text-[10px] text-muted">{row.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent payments</h2>
        <Link to="/app/payments" className="text-sm font-medium text-forest">
          View all
        </Link>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading payments...</p>
      ) : !data?.recentPayments?.length ? (
        <div className="mt-4">
          <EmptyState
            title="No payments yet."
            description="Create your first payment request from WhatsApp or the dashboard."
            action={
              <Link to="/app/payments/new">
                <Button size="sm">
                  New payment <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden pb-card">
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="border-b border-line text-[12px] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">{p.customer?.name || p.customer?.phoneNumber || 'Customer'}</td>
                  <td className="px-4 py-3 text-muted">{p.invoiceNumber || '—'}</td>
                  <td className="px-4 py-3 text-muted">{p.description}</td>
                  <td className="px-4 py-3 font-medium">{formatINR(p.amount)}</td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="divide-y divide-line md:hidden">
            {data.recentPayments.map((p) => (
              <div key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {p.customer?.name || p.customer?.phoneNumber || 'Customer'}
                  </p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {p.description} · {formatINR(p.amount)}
                  {p.invoiceNumber ? ` · ${p.invoiceNumber}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="pb-card px-4 py-4">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-2 text-[22px] font-semibold tracking-tight">{value}</p>
    </div>
  );
}
