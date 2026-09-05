import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import { createPaymentApi } from '../services/api.js';

export default function NewPayment() {
  const navigate = useNavigate();
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await createPaymentApi({
        customerPhone,
        amount: Number(amount),
        description,
      });
      navigate(`/app/payments/${data.payment.id}`);
    } catch (err) {
      setError(err.message || 'Unable to create payment request.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="New payment" description="Create a free-form collection request. No product catalog required." />
      <form onSubmit={onSubmit} className="mt-6 space-y-4 pb-card px-5 py-5">
        <div>
          <label className="pb-label">Customer phone</label>
          <div className="flex overflow-hidden rounded-md border border-line-strong bg-white">
            <span className="flex items-center border-r border-line px-3 text-sm text-muted">+91</span>
            <input
              className="h-11 flex-1 px-3 text-sm outline-none"
              inputMode="numeric"
              placeholder="98765 43210"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
        </div>
        <div>
          <label className="pb-label">Amount</label>
          <input
            className="pb-input"
            inputMode="numeric"
            placeholder="500"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        <div>
          <label className="pb-label">Description</label>
          <input
            className="pb-input"
            placeholder="Groceries"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-[#B42318]">{error}</p>}
        <Button type="submit" loading={loading}>
          {loading ? 'Creating payment...' : 'Create payment request'}
        </Button>
      </form>
    </div>
  );
}
