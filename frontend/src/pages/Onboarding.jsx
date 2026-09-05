import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PayBotLogo from '../components/PayBotLogo.jsx';
import Button from '../components/Button.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { updateSellerApi } from '../services/api.js';

export default function Onboarding() {
  const { setSeller } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!businessName.trim() || !name.trim()) {
      setError('Enter your business name and owner name.');
      return;
    }
    setLoading(true);
    try {
      const data = await updateSellerApi({ businessName, name });
      setSeller(data.seller);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to save your business.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hero-in">
      <PayBotLogo size="md" iconOnly />
      <h1 className="mt-8 text-[32px] font-semibold tracking-tight">Set up your business</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        This is how customers will see you on payment requests.
      </p>
      <form onSubmit={onSubmit} className="mt-9 space-y-6">
        <div>
          <label className="pb-label">Business name</label>
          <input
            className="h-12 w-full border-b border-line-strong bg-transparent text-[15px] outline-none transition-colors focus:border-forest"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
        <div>
          <label className="pb-label">Owner name</label>
          <input
            className="h-12 w-full border-b border-line-strong bg-transparent text-[15px] outline-none transition-colors focus:border-forest"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-[#B42318]">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Continue <ArrowRight className="btn-arrow h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
