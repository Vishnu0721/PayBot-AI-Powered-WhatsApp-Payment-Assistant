import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { listPaymentsApi } from '../services/api.js';
import { formatDateTime, formatINR } from '../lib/format.js';
import { useRealtime } from '../hooks/useRealtime.js';

const filters = ['ALL', 'PENDING', 'PAID', 'FAILED', 'EXPIRED'];

export default function Payments() {
  const tick = useRealtime(true);
  const [status, setStatus] = useState('ALL');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    listPaymentsApi(status)
      .then((res) => {
        setPayments(res.payments || []);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, tick]);

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Track every payment request."
        action={
          <Link to="/app/payments/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> New payment
            </Button>
          </Link>
        }
      />
      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setStatus(item)}
            className={`rounded-md px-3 py-1.5 text-[13px] ${
              status === item ? 'bg-forest text-white' : 'border border-line bg-paper text-muted'
            }`}
          >
            {item === 'ALL' ? 'All' : item[0] + item.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-[#B42318]">{error}</p>}
      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading payments...</p>
      ) : !payments.length ? (
        <div className="mt-6">
          <EmptyState
            title="No payments yet."
            description="Create your first payment request from WhatsApp or the dashboard."
            action={
              <Link to="/app/payments/new">
                <Button size="sm">New payment</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-5 overflow-hidden pb-card">
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="border-b border-line text-[12px] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    {p.customer?.name || p.customer?.phoneNumber || 'Customer'}
                  </td>
                  <td className="px-4 py-3 text-muted">{p.description}</td>
                  <td className="px-4 py-3 font-medium">{formatINR(p.amount)}</td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/app/payments/${p.id}`} className="font-medium text-forest">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="divide-y divide-line md:hidden">
            {payments.map((p) => (
              <Link key={p.id} to={`/app/payments/${p.id}`} className="block px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    {p.customer?.name || p.customer?.phoneNumber || 'Customer'}
                  </p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {p.description} · {formatINR(p.amount)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
