import { useEffect, useRef, useState } from 'react';
import PayBotLogo from '../components/PayBotLogo.jsx';
import Button from '../components/Button.jsx';
import { getWhatsAppApi, simulateWhatsAppApi } from '../services/api.js';
import { formatINR } from '../lib/format.js';
import { useHealth } from '../hooks/useHealth.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useRealtime } from '../hooks/useRealtime.js';

export default function WhatsApp() {
  const { seller } = useAuth();
  const { health } = useHealth();
  const tick = useRealtime(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef(null);

  const demo = Boolean(health?.demoMode);
  const liveConfigured = !demo && Boolean(health?.whatsapp?.configured);
  const livePartial = !demo && !liveConfigured;

  async function load() {
    const res = await getWhatsAppApi();
    setMessages(res.messages || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [tick]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!demo || !text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await simulateWhatsAppApi(text.trim());
      setMessages(res.messages || []);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const lastPayment = [...messages].reverse().find((m) => m.payment)?.payment;

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">WhatsApp</h1>
          <p className="mt-1 text-sm text-muted">
            {liveConfigured
              ? 'Live WhatsApp Cloud API — message your Business number to collect.'
              : livePartial
                ? 'LIVE mode — WhatsApp Cloud API keys are not fully configured yet.'
                : 'DEMO MODE — messages stay in this simulator. No WhatsApp delivery.'}
          </p>
        </div>
        <PayBotLogo size="sm" />
      </div>

      {!demo && (
        <p className="mt-4 rounded-md border border-line bg-[var(--color-paper)] px-3 py-2 text-sm text-muted">
          {liveConfigured
            ? 'Send from your seller WhatsApp: ₹500 for groceries from 9876543210. The in-app simulator is disabled for reliability.'
            : 'Add WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, and WHATSAPP_APP_SECRET in backend/.env, then point Meta webhooks at your tunnel.'}
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex h-[560px] flex-col overflow-hidden pb-card">
          <div className="flex items-center gap-2 border-b border-line bg-[#075E54] px-4 py-3 text-white">
            <PayBotLogo size="sm" variant="light" iconOnly />
            <div>
              <p className="text-sm font-medium">PayBot</p>
              <p className="text-[11px] text-white/70">{seller?.businessName}</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#ECE5DD] px-4 py-4">
            {messages.length === 0 && (
              <p className="rounded-md bg-white/80 px-3 py-2 text-sm text-muted">
                {demo
                  ? 'Try: ₹500 for groceries from 9876543210'
                  : 'Conversation appears when your Business WhatsApp receives messages.'}
              </p>
            )}
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} />
            ))}
            <div ref={bottom} />
          </div>
          {demo ? (
            <form onSubmit={send} className="flex gap-2 border-t border-line bg-paper p-3">
              <input
                className="pb-input"
                placeholder="₹500 for groceries from 9876543210"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <Button type="submit" loading={loading}>
                {loading ? 'Sending...' : 'Send'}
              </Button>
            </form>
          ) : (
            <div className="border-t border-line bg-paper px-3 py-3 text-sm text-muted">
              Simulator locked in live mode.
            </div>
          )}
        </div>

        <div className="pb-card px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Customer view</p>
          {lastPayment ? (
            <div className="mt-4">
              <p className="text-sm">
                {seller?.businessName} requested {formatINR(lastPayment.amount)}
              </p>
              <p className="mt-1 text-sm text-muted">{lastPayment.description}</p>
              <a href={`/pay/${lastPayment.id}`}>
                <Button className="mt-4 w-full">Pay {formatINR(lastPayment.amount)}</Button>
              </a>
              {lastPayment.status === 'PAID' && (
                <p className="mt-4 text-sm font-medium text-emerald">
                  Payment successful ✓ {formatINR(lastPayment.amount)} received
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">A customer preview appears after PayBot creates a request.</p>
          )}
          {error && <p className="mt-4 text-sm text-[#B42318]">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }) {
  const mine = message.role === 'merchant';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-md px-3 py-2 text-sm leading-relaxed shadow-sm ${
          mine ? 'bg-[#D9FDD3] text-[#111B21]' : 'bg-white text-[#111B21]'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
        {message.payment && (
          <p className="mt-2 text-[12px] text-[#667781]">
            {formatINR(message.payment.amount)} · {message.payment.description}
          </p>
        )}
      </div>
    </div>
  );
}
