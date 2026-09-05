import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import PayBotLogo from '../components/PayBotLogo.jsx';
import Button from '../components/Button.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { getPublicPaymentApi, simulatePayApi } from '../services/api.js';
import { formatINR } from '../lib/format.js';

export default function PublicPay() {
  const { paymentId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await getPublicPaymentApi(paymentId);
    setData(res);
    return res;
  }

  useEffect(() => {
    load().catch((err) => setError(err.message || 'This payment request was not found.'));
  }, [paymentId]);

  useEffect(() => {
    if (!data || data.payment?.status === 'PAID') return undefined;
    const id = setInterval(() => {
      load().catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [data?.payment?.status, paymentId]);

  if (error) {
    return (
      <Shell>
        <p className="text-sm text-[#B42318]">{error}</p>
      </Shell>
    );
  }

  if (!data?.payment) {
    return (
      <Shell>
        <p className="text-sm text-muted">Loading payment...</p>
      </Shell>
    );
  }

  const payment = data.payment;
  const paid = payment.status === 'PAID';
  const qrValue = payment.paymentUrl || window.location.href;

  async function pay() {
    if (data.demoMode && (!payment.paymentUrl || payment.paymentUrl.includes('/pay/'))) {
      setLoading(true);
      try {
        const res = await simulatePayApi(payment.id);
        setData({ ...data, payment: res.payment });
      } catch (err) {
        setError(err.message || 'Payment could not be completed.');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (payment.paymentUrl) {
      window.location.href = payment.paymentUrl;
    }
  }

  return (
    <Shell>
      <p className="text-sm text-muted">{payment.merchantName}</p>
      <p className="mt-1 text-sm">{payment.description}</p>
      <p className="mt-4 text-[40px] font-semibold tracking-tight">{formatINR(payment.amount)}</p>
      <div className="mt-3">
        <StatusBadge status={payment.status} />
      </div>
      {data.demoMode && (
        <p className="mt-4 rounded-md bg-[#F4EDE1] px-3 py-2 text-[13px] text-[#8A5A12]">
          DEMO MODE — this is not a live Razorpay charge unless test keys are configured.
        </p>
      )}
      {paid ? (
        <div className="mt-8">
          <p className="text-sm font-medium text-emerald">Payment successful ✓</p>
          <p className="mt-1 text-sm text-muted">{formatINR(payment.amount)} paid</p>
        </div>
      ) : (
        <>
          <Button className="mt-6 w-full" loading={loading} onClick={pay}>
            {loading ? 'Processing...' : `Pay ${formatINR(payment.amount)}`}
          </Button>
          {data.demoMode && payment.paymentUrl && !payment.paymentUrl.includes('/pay/') && (
            <button
              className="mt-3 w-full text-center text-[12px] text-muted"
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await simulatePayApi(payment.id);
                  setData({ ...data, payment: res.payment });
                } catch (err) {
                  setError(err.message || 'Payment could not be completed.');
                } finally {
                  setLoading(false);
                }
              }}
            >
              Simulate confirmation (demo)
            </button>
          )}
          <div className="mt-8 flex flex-col items-center">
            <p className="text-[12px] font-medium text-muted">Scan to pay</p>
            <div className="mt-3 rounded-md border border-line bg-white p-3">
              <QRCodeSVG value={qrValue} size={148} />
            </div>
          </div>
        </>
      )}
      <p className="mt-8 text-center text-[12px] text-muted">Powered securely by Razorpay</p>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5 py-10">
      <div className="w-full max-w-md pb-card px-6 py-8">
        <PayBotLogo size="md" />
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
