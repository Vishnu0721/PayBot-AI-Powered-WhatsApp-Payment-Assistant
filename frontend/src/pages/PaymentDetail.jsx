import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Button from '../components/Button.jsx';
import { getPaymentApi, notifyPaymentApi, remindPaymentApi } from '../services/api.js';
import { formatDateTime, formatINR, formatPhoneDisplay } from '../lib/format.js';
import { useRealtime } from '../hooks/useRealtime.js';

export default function PaymentDetail() {
  const { id } = useParams();
  const tick = useRealtime(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPaymentApi(id)
      .then((res) => setPayment(res.payment))
      .catch((err) => setError(err.message));
  }, [id, tick]);

  if (error && !payment) return <p className="text-sm text-[#B42318]">{error}</p>;
  if (!payment) return <p className="text-sm text-muted">Loading payments...</p>;

  const payUrl = payment.paymentUrl || `${window.location.origin}/pay/${payment.id}`;
  const pending = payment.status === 'PENDING';
  const hasPhone = Boolean(payment.customer?.phoneNumber);

  async function copy() {
    await navigator.clipboard.writeText(payUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onNotify(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await notifyPaymentApi(id, { customerPhone: phone ? `+91${phone}` : undefined });
      setPayment(res.payment);
      setPhone('');
      setMessage('Payment request sent to the customer.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onRemind() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await remindPaymentApi(id);
      setPayment(res.payment);
      setMessage(res.sent ? 'Reminder sent.' : 'Reminder recorded (delivery skipped in demo).');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Payment request"
        description={payment.description}
        action={
          <Link to="/app/payments" className="text-sm font-medium text-forest">
            Back to payments
          </Link>
        }
      />
      {error && <p className="mt-4 text-sm text-[#B42318]">{error}</p>}
      {message && <p className="mt-4 text-sm text-emerald">{message}</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px]">
        <div className="pb-card px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] text-muted">Amount</p>
              <p className="mt-1 text-[32px] font-semibold tracking-tight">{formatINR(payment.amount)}</p>
            </div>
            <StatusBadge status={payment.status} />
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <Row label="Customer" value={payment.customer?.name || '—'} />
            <Row
              label="WhatsApp"
              value={payment.customer?.phoneNumber ? formatPhoneDisplay(payment.customer.phoneNumber) : '—'}
            />
            <Row label="Created" value={formatDateTime(payment.createdAt)} />
            <Row label="Invoice" value={payment.invoiceNumber || '—'} />
            <Row label="Paid at" value={payment.paidAt ? formatDateTime(payment.paidAt) : '—'} />
            <Row label="Reminders" value={String(payment.reminderCount || 0)} />
          </dl>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button size="sm" onClick={copy}>
              {copied ? 'Copied' : 'Copy payment link'}
            </Button>
            <a href={`/pay/${payment.id}`} target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary">
                Open customer page
              </Button>
            </a>
            {pending && hasPhone && (
              <Button size="sm" variant="secondary" loading={busy} onClick={onRemind}>
                Send reminder
              </Button>
            )}
          </div>

          {pending && !hasPhone && (
            <form className="mt-6 border-t border-line pt-5" onSubmit={onNotify}>
              <p className="text-sm text-muted">
                This payment has no customer phone yet. Add a number to send the WhatsApp request.
              </p>
              <div className="mt-3 flex border-b border-line-strong focus-within:border-forest">
                <span className="flex h-11 items-center pr-3 text-sm text-muted">+91</span>
                <input
                  className="h-11 flex-1 bg-transparent text-sm outline-none"
                  inputMode="numeric"
                  placeholder="Customer mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
              <Button type="submit" size="sm" className="mt-4" loading={busy} disabled={phone.length !== 10}>
                Save phone &amp; send
              </Button>
            </form>
          )}
        </div>
        <div className="pb-card flex flex-col items-center px-4 py-5 text-center">
          <p className="text-[12px] font-medium text-muted">Scan to pay</p>
          <div className="mt-3 rounded-md border border-line bg-white p-2">
            <QRCodeSVG value={payUrl} size={140} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">QR encodes this payment URL.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
