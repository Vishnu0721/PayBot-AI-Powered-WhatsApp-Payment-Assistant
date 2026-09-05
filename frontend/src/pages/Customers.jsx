import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { listCustomersApi } from '../services/api.js';
import { formatDate, formatINR, formatPhoneDisplay } from '../lib/format.js';
import { useRealtime } from '../hooks/useRealtime.js';

export default function Customers() {
  const tick = useRealtime(true);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listCustomersApi()
      .then((res) => setCustomers(res.customers || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tick]);

  return (
    <div>
      <PageHeader title="Customers" description="People you have requested payments from." />
      {error && <p className="mt-4 text-sm text-[#B42318]">{error}</p>}
      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading customers...</p>
      ) : !customers.length ? (
        <div className="mt-6">
          <EmptyState title="No customers yet." description="Customers appear when you create a payment request." />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden pb-card">
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="border-b border-line text-[12px] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Customer name</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">Total collected</th>
                <th className="px-4 py-3 font-medium">Payment count</th>
                <th className="px-4 py-3 font-medium">Last payment</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">{c.name || '—'}</td>
                  <td className="px-4 py-3">{c.phoneNumber ? formatPhoneDisplay(c.phoneNumber) : '—'}</td>
                  <td className="px-4 py-3 font-medium">{formatINR(c.totalCollected)}</td>
                  <td className="px-4 py-3">{c.paymentCount}</td>
                  <td className="px-4 py-3 text-muted">{c.lastPayment ? formatDate(c.lastPayment) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="divide-y divide-line md:hidden">
            {customers.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <p className="text-sm font-medium">{c.name || formatPhoneDisplay(c.phoneNumber)}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatINR(c.totalCollected)} · {c.paymentCount} payments
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
