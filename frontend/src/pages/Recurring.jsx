import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import {
  createRecurringApi,
  deleteRecurringApi,
  listCustomersApi,
  listRecurringApi,
  pauseRecurringApi,
  resumeRecurringApi,
} from '../services/api.js';
import { formatDateTime, formatINR, formatPhoneDisplay } from '../lib/format.js';

export default function Recurring() {
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    amount: '',
    description: 'Monthly collection',
    cadence: 'monthly',
  });

  async function refresh() {
    const [planRes, customerRes] = await Promise.all([listRecurringApi(), listCustomersApi()]);
    setPlans(planRes.plans || []);
    setCustomers(customerRes.customers || []);
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await createRecurringApi({
        customerId: form.customerId,
        amount: Number(form.amount),
        description: form.description,
        cadence: form.cadence,
      });
      setMessage('Recurring plan created. PayBot will generate payment requests on schedule.');
      setForm((f) => ({ ...f, amount: '', description: 'Monthly collection' }));
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(plan) {
    setBusy(true);
    setError('');
    try {
      if (plan.active) await pauseRecurringApi(plan.id);
      else await resumeRecurringApi(plan.id);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(plan) {
    setBusy(true);
    setError('');
    try {
      await deleteRecurringApi(plan.id);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const phoneCustomers = customers.filter((c) => c.phoneNumber);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Recurring"
        description="Schedule weekly or monthly collections for customers with a WhatsApp number."
      />
      {error && <p className="mt-4 text-sm text-[#B42318]">{error}</p>}
      {message && <p className="mt-4 text-sm text-emerald">{message}</p>}

      <form className="mt-6 space-y-4 border-b border-line pb-8" onSubmit={onCreate}>
        <label className="block text-sm">
          <span className="text-muted">Customer</span>
          <select
            className="mt-1.5 h-11 w-full border-b border-line-strong bg-transparent outline-none focus:border-forest"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            required
          >
            <option value="">Select customer</option>
            {phoneCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.name || 'Customer') + ' · ' + formatPhoneDisplay(c.phoneNumber)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Amount (₹)</span>
          <input
            className="mt-1.5 h-11 w-full border-b border-line-strong bg-transparent outline-none focus:border-forest"
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d]/g, '') })}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Description</span>
          <input
            className="mt-1.5 h-11 w-full border-b border-line-strong bg-transparent outline-none focus:border-forest"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Cadence</span>
          <select
            className="mt-1.5 h-11 w-full border-b border-line-strong bg-transparent outline-none focus:border-forest"
            value={form.cadence}
            onChange={(e) => setForm({ ...form, cadence: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        <Button type="submit" loading={busy} disabled={!form.customerId || !form.amount}>
          Create plan
        </Button>
      </form>

      <h2 className="mt-8 text-sm font-semibold">Plans</h2>
      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : !plans.length ? (
        <div className="mt-4">
          <EmptyState
            title="No recurring plans yet."
            description="Create a customer with a phone number, then schedule collections here."
          />
        </div>
      ) : (
        <div className="mt-4 divide-y divide-line border-y border-line">
          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {formatINR(plan.amount)} · {plan.cadence}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {plan.customer?.name || formatPhoneDisplay(plan.customer?.phoneNumber) || 'Customer'} ·{' '}
                  {plan.description}
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  {plan.active ? 'Active' : 'Paused'} · Next {formatDateTime(plan.nextRunAt)} · Runs{' '}
                  {plan.runCount || 0}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" loading={busy} onClick={() => toggle(plan)}>
                  {plan.active ? 'Pause' : 'Resume'}
                </Button>
                <Button size="sm" variant="ghost" loading={busy} onClick={() => remove(plan)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
