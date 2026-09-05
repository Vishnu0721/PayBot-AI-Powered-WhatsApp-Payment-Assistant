import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import PayBotLogo from '../components/PayBotLogo.jsx';
import Button from '../components/Button.jsx';
import {
  connectRazorpayApi,
  disconnectRazorpayApi,
  getSetupApi,
} from '../services/api.js';
import { formatPhoneDisplay } from '../lib/format.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useHealth } from '../hooks/useHealth.jsx';

export default function Setup() {
  const { seller: authSeller } = useAuth();
  const { connected, health } = useHealth();
  const [setup, setSetup] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  async function refresh() {
    const data = await getSetupApi();
    setSetup(data);
    setError('');
    return data;
  }

  useEffect(() => {
    refresh().catch((err) => {
      setError(
        err.code === 'NETWORK'
          ? 'Backend unreachable. Keep `npm run dev` running in backend/.'
          : err.message || 'Could not load setup.',
      );
    });
  }, []);

  const seller = setup?.seller;
  const connections = setup?.connections || {};
  const independent = Boolean(connections.razorpayIndependentMerchant);
  const live = health && !health.demoMode;
  const isOwner = !authSeller?.role || authSeller.role === 'owner';
  const demo = Boolean(health?.demoMode);
  const liveInfo = health?.live || setup?.live;
  const missing = liveInfo?.missing || [];

  async function onConnect(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const data = await connectRazorpayApi({ keyId, keySecret, webhookSecret });
      setMessage(data.message || 'Razorpay connected.');
      setKeyId('');
      setKeySecret('');
      setWebhookSecret('');
      await refresh();
    } catch (err) {
      setError(
        err.code === 'NETWORK'
          ? 'Backend restarted or unreachable. Wait a second and try Connect again.'
          : err.message || 'Could not connect Razorpay. Check Key ID and Key Secret.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function onDisconnect() {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const data = await disconnectRazorpayApi();
      setMessage(data.message || 'Disconnected.');
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not disconnect Razorpay.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-2">
        <PayBotLogo size="sm" />
      </div>
      <PageHeader title="Setup" description="Business profile and live service connections." />
      {error && <p className="mt-4 text-sm text-[#B42318]">{error}</p>}
      {message && <p className="mt-4 text-sm text-emerald">{message}</p>}

      {demo && (
        <p className="mt-4 rounded-md border border-line bg-[var(--color-paper)] px-3 py-2 text-sm text-muted">
          DEMO mode is on. Backend can work without Razorpay or WhatsApp Cloud keys — use the
          WhatsApp simulator and demo pay buttons. When keys are ready, run{' '}
          <code className="text-ink">npm run live:enable</code> in backend/ (never commit{' '}
          <code className="text-ink">.env</code>).
        </p>
      )}

      {live && (
        <p className="mt-4 rounded-md border border-line bg-[var(--color-paper)] px-3 py-2 text-sm text-muted">
          LIVE mode — payments use Razorpay Payment Links; PAID only via verified webhooks.
          Simulator and demo pay are disabled.
          {missing.length > 0 ? ` Missing: ${missing.join(', ')}.` : ' All required connections look set.'}
        </p>
      )}

      <div className="mt-6 space-y-3">
        <Row label="Business profile" value={seller?.businessName || '—'} />
        <Row label="Owner" value={seller?.name || '—'} />
        <Row label="WhatsApp" value={seller?.phoneNumber ? formatPhoneDisplay(seller.phoneNumber) : '—'} />
        <Row
          label="Payment settlement"
          value={
            independent
              ? `Your Razorpay · ${seller?.razorpayKeyIdMasked || seller?.razorpayKeyId || 'connected'}`
              : 'Platform Razorpay (shared / test account)'
          }
        />
        <StatusRow label="Backend" on={connected} />
        <StatusRow
          label="Database"
          on={Boolean(health?.mongodb)}
          note={
            health?.mongodbMode === 'memory'
              ? 'Demo DB (run npm run db:local)'
              : health?.mongodb
                ? 'MongoDB'
                : ''
          }
        />
        <StatusRow
          label="Razorpay"
          on={Boolean(connections.razorpay || health?.razorpay?.configured)}
          note={
            demo && !(connections.razorpay || health?.razorpay?.configured)
              ? 'Optional in DEMO — add keys in .env or Connect below'
              : health?.razorpay?.webhookConfigured || connections.razorpayWebhook
                ? 'Webhook secret set'
                : live
                  ? 'Webhook secret required'
                  : ''
          }
        />
        <StatusRow
          label="WhatsApp Cloud API"
          on={Boolean(connections.whatsapp)}
          note={
            demo
              ? 'Optional in DEMO — use in-app simulator'
              : health?.whatsapp?.webhookReady
                ? 'Webhook signature ready'
                : 'Needs app secret for live webhooks'
          }
        />
        <StatusRow
          label="OTP"
          on={Boolean(health?.otp?.configured) || health?.otp?.provider === 'demo'}
          note={
            health?.otp?.provider
              ? `Provider: ${health.otp.provider}`
              : live
                ? 'MSG91 required'
                : 'Demo OTP'
          }
        />
        <StatusRow label="Demo mode" on={Boolean(health?.demoMode)} invert />
      </div>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="text-sm font-semibold">Your Razorpay account</h2>
        {!isOwner ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Only the business owner can connect or change Razorpay credentials.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Local live uses platform test keys in <code className="text-ink">backend/.env</code> by
              default. Optionally connect your own Key ID and Key Secret so settlements use your
              merchant account. Secrets are encrypted and never shown again after you save.
              {live
                ? ' Live mode also requires your webhook secret for payment confirmation.'
                : ' Optional in DEMO — leave empty to keep using simulated payment links.'}
            </p>

            {independent ? (
              <div className="mt-5 space-y-4">
                <Row label="Connected key" value={seller?.razorpayKeyIdMasked || '••••'} />
                <Row
                  label="Webhook secret"
                  value={seller?.hasMerchantWebhookSecret ? 'Saved' : 'Not set'}
                />
                <Button variant="secondary" loading={loading} onClick={onDisconnect}>
                  Use platform credentials instead
                </Button>
              </div>
            ) : (
              <form className="mt-5 space-y-4" onSubmit={onConnect}>
                <Field
                  label="Key ID"
                  value={keyId}
                  onChange={setKeyId}
                  placeholder="rzp_test_…"
                  autoComplete="off"
                />
                <Field
                  label="Key Secret"
                  value={keySecret}
                  onChange={setKeySecret}
                  placeholder="••••••••"
                  type="password"
                  autoComplete="new-password"
                />
                <Field
                  label={live ? 'Webhook secret (required)' : 'Webhook secret (optional)'}
                  value={webhookSecret}
                  onChange={setWebhookSecret}
                  placeholder="from Razorpay Dashboard → Webhooks"
                  type="password"
                  autoComplete="new-password"
                />
                <Button type="submit" loading={loading} disabled={!keyId || !keySecret}>
                  Connect Razorpay
                </Button>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, autoComplete }) {
  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <input
        className="mt-1.5 h-11 w-full border-b border-line-strong bg-transparent text-sm outline-none transition-colors focus:border-forest"
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Row({ label, value }) {
  return (
    <div className="pb-card flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function StatusRow({ label, on, note, invert }) {
  return (
    <div className="pb-card flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">{label}</p>
      <p className={`text-sm font-medium ${on ? 'text-emerald' : 'text-muted'}`}>
        {on ? (invert ? 'On' : 'Connected') : invert ? 'Off' : 'Keys not set'}
        {note ? ` · ${note}` : ''}
      </p>
    </div>
  );
}
