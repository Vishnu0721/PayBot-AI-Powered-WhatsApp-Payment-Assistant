import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PayBotLogo from '../components/PayBotLogo.jsx';
import Button from '../components/Button.jsx';
import BackendStatus from '../components/BackendStatus.jsx';
import { useHealth } from '../hooks/useHealth.jsx';
import { sendOtpApi } from '../services/api.js';
import { authErrorMessage } from '../lib/authErrors.js';

export default function Login() {
  const navigate = useNavigate();
  const { connected, loading: healthLoading, health } = useHealth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const digits = phone.replace(/\D/g, '').slice(0, 10);
    if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const data = await sendOtpApi(`+91${digits}`);
      sessionStorage.setItem(
        'paybot_phone',
        JSON.stringify({
          phoneNumber: data.phoneNumber,
          phoneDisplay: data.phoneDisplay,
          developmentMode: data.developmentMode,
          developmentOtp: data.developmentOtp || '',
          whatsappFallback: Boolean(data.whatsappFallback),
        }),
      );
      navigate('/verify');
    } catch (err) {
      setError(authErrorMessage(err, "We couldn't send the OTP. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  const ready = connected && Boolean(health?.mongodb);

  return (
    <div className="hero-in">
      <PayBotLogo size="md" iconOnly />
      <h1 className="mt-8 text-[32px] font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Sign in with your WhatsApp number to continue.
      </p>

      <form onSubmit={onSubmit} className="mt-9">
        <div className="flex border-b border-line-strong transition-colors focus-within:border-forest">
          <span className="flex h-12 items-center pr-4 text-sm text-muted">+91</span>
          <span className="my-3 w-px bg-line-strong" />
          <input
            className="h-12 flex-1 bg-transparent pl-4 text-[15px] outline-none"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />
        </div>
        {error && <p className="mt-3 text-sm text-[#B42318]">{error}</p>}
        <Button type="submit" className="mt-8 w-full" loading={loading} disabled={!ready}>
          {loading ? 'Sending OTP...' : 'Continue'} <ArrowRight className="btn-arrow h-4 w-4" />
        </Button>
      </form>

      <div className="mt-8 space-y-2">
        <BackendStatus connected={ready} loading={healthLoading} />
        {health?.otp?.demoMode && <p className="text-[11px] tracking-wide text-[#B0ADA6]">Development mode</p>}
      </div>
    </div>
  );
}
