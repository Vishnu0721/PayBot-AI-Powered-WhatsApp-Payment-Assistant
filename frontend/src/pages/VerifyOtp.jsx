import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PayBotLogo from '../components/PayBotLogo.jsx';
import Button from '../components/Button.jsx';
import { sendOtpApi, verifyOtpApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useHealth } from '../hooks/useHealth.jsx';
import { authErrorMessage } from '../lib/authErrors.js';

function readPhoneSession() {
  try {
    return JSON.parse(sessionStorage.getItem('paybot_phone') || 'null');
  } catch {
    return null;
  }
}

export default function VerifyOtp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { health } = useHealth();
  const [stored, setStored] = useState(() => readPhoneSession());
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(42);
  const inputs = useRef([]);

  useEffect(() => {
    if (!stored?.phoneNumber) navigate('/login');
  }, [stored, navigate]);

  useEffect(() => {
    const id = setInterval(() => setResendIn((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  function setAt(index, value) {
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    return next;
  }

  function onChange(index, value) {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = setAt(index, char);
    if (char && index < 5) inputs.current[index + 1]?.focus();
    if (next.every(Boolean)) submit(next.join(''));
  }

  function onKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      setAt(index - 1, '');
      inputs.current[index - 1]?.focus();
    }
  }

  function onPaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length < 6) return;
    e.preventDefault();
    const next = text.split('');
    setDigits(next);
    inputs.current[5]?.focus();
    submit(text);
  }

  async function submit(code) {
    if (!stored?.phoneNumber || loading) return;
    setError('');
    setLoading(true);
    try {
      const data = await verifyOtpApi(stored.phoneNumber, code);
      login(data.token, data.seller);
      navigate(data.seller.onboarded ? '/app' : '/onboarding', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err, 'Incorrect OTP. Please check the code and try again.'));
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (resendIn > 0) return;
    setError('');
    try {
      const data = await sendOtpApi(stored.phoneNumber);
      const next = {
        phoneNumber: data.phoneNumber,
        phoneDisplay: data.phoneDisplay,
        developmentMode: data.developmentMode,
        developmentOtp: data.developmentOtp || '',
        whatsappFallback: Boolean(data.whatsappFallback),
      };
      sessionStorage.setItem('paybot_phone', JSON.stringify(next));
      setStored(next);
      setResendIn(42);
    } catch (err) {
      setError(authErrorMessage(err, "We couldn't send the OTP. Please try again."));
    }
  }

  const showDevOtp = Boolean(
    (stored?.developmentMode || health?.otp?.demoMode) && stored?.developmentOtp,
  );

  return (
    <div className="hero-in">
      <PayBotLogo size="md" iconOnly />
      <h1 className="mt-8 text-[32px] font-semibold tracking-tight">Verify your number</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Enter the 6-digit code sent to your WhatsApp.
      </p>
      {stored?.phoneDisplay && (
        <p className="mt-1 text-sm font-medium text-ink">{stored.phoneDisplay}</p>
      )}
      {showDevOtp && (
        <p className="mt-4 rounded-md border border-line bg-[var(--color-paper)] px-3 py-2 text-sm text-ink">
          {stored?.whatsappFallback
            ? 'WhatsApp delivery failed — use this code: '
            : 'Development OTP: '}
          <span className="font-semibold tracking-widest">{stored.developmentOtp}</span>
        </p>
      )}
      {stored?.whatsappFallback && (
        <p className="mt-2 text-sm text-muted">
          Meta sandbox only sends to allowlisted numbers (max 5). Add this number in WhatsApp → API
          Setup → <span className="font-medium text-ink">To</span>, then Resend.
        </p>
      )}
      {!showDevOtp && (
        <p className="mt-4 text-sm text-muted">
          Tip: open the Meta test WhatsApp chat, send <span className="font-medium text-ink">hi</span>, then
          tap Resend OTP. Free-text OTP only works inside that chat window until you add an Auth template.
        </p>
      )}

      <form
        className="mt-9"
        onSubmit={(e) => {
          e.preventDefault();
          submit(digits.join(''));
        }}
      >
        <div className="flex gap-2.5" onPaste={onPaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              className="w-full border-b-2 border-line-strong bg-transparent pb-2 text-center text-xl font-medium outline-none transition-colors focus:border-forest"
              style={{ height: 52 }}
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              autoFocus={i === 0}
            />
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-[#B42318]">{error}</p>}
        {error?.toLowerCase().includes('resend') && (
          <p className="mt-2 text-sm text-muted">
            Tip: click <span className="font-medium text-ink">Resend OTP</span>, then enter the new
            Development OTP shown above.
          </p>
        )}
        <Button type="submit" className="mt-8 w-full" loading={loading} disabled={digits.some((d) => !d)}>
          {loading ? 'Verifying...' : 'Verify'} <ArrowRight className="btn-arrow h-4 w-4" />
        </Button>
      </form>

      <div className="mt-8 space-y-3 text-sm">
        <p className="text-muted">Didn&apos;t receive the code?</p>
        <div className="flex items-center justify-between">
          <button
            className={`font-medium transition-colors hover:text-ink disabled:opacity-40 ${
              error?.toLowerCase().includes('resend') ? 'text-forest' : 'text-muted'
            }`}
            disabled={resendIn > 0}
            onClick={resend}
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
          </button>
          <Link to="/login" className="font-medium text-forest">
            ← Change number
          </Link>
        </div>
      </div>
      {(stored?.developmentMode || health?.otp?.demoMode) && (
        <p className="mt-6 text-[11px] tracking-wide text-[#B0ADA6]">Development mode</p>
      )}
    </div>
  );
}
