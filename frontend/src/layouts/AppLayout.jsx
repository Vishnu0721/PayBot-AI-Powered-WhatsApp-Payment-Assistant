import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  Settings2,
  Users,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import PayBotLogo from '../components/PayBotLogo.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useHealth } from '../hooks/useHealth.jsx';
import { initials } from '../lib/format.js';

const baseNav = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/payments', label: 'Payments', icon: Wallet },
  { to: '/app/recurring', label: 'Recurring', icon: RefreshCw },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/products', label: 'Products', icon: Package },
  { to: '/app/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { to: '/app/team', label: 'Team', icon: UserPlus, ownerOnly: true },
  { to: '/app/setup', label: 'Setup', icon: Settings2 },
  { to: '/app/help', label: 'Help', icon: CircleHelp },
];

export default function AppLayout() {
  const { seller, logout } = useAuth();
  const { health, connected } = useHealth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const demo = Boolean(health?.demoMode);
  const isOwner = !seller?.role || seller.role === 'owner';
  const nav = baseNav.filter((item) => !item.ownerOnly || isOwner);

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[232px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-line bg-paper transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-line px-5">
          <Link to="/app">
            <PayBotLogo size="sm" />
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${
                  isActive ? 'bg-cream font-medium text-forest' : 'text-muted hover:bg-cream hover:text-ink'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-forest text-[11px] font-semibold text-white">
              {initials(seller?.businessName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{seller?.businessName}</p>
              <p className="truncate text-[12px] text-muted">{seller?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted hover:bg-cream hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-ink/20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-cream/90 px-4 backdrop-blur-md">
          <button className="rounded-md p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/app" className="lg:hidden">
            <PayBotLogo size="sm" iconOnly />
          </Link>
          <div className="relative hidden min-w-0 flex-1 md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="h-9 w-full max-w-md rounded-md border border-line bg-paper pl-9 pr-3 text-sm outline-none focus:border-forest-mid"
              placeholder="Search payments, customers…"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              title={
                demo
                  ? 'DEMO_MODE=true: payments are simulated (no Razorpay webhook yet). WhatsApp OTP can still be real.'
                  : 'LIVE mode: real Razorpay + WhatsApp'
              }
              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                demo ? 'bg-[#F4EDE1] text-[#8A5A12]' : 'bg-[#E5F4EC] text-emerald'
              }`}
            >
              {demo ? 'DEMO PAY' : 'LIVE'}
            </span>
            {demo && health?.otp?.configured && !health?.otp?.demoMode && (
              <span
                title="OTP is sent via WhatsApp (not the on-screen development code, unless Meta blocks delivery)"
                className="hidden rounded px-1.5 py-0.5 text-[11px] font-semibold bg-[#E5F4EC] text-emerald sm:inline"
              >
                OTP WA
              </span>
            )}
            <span className="hidden text-[12px] text-muted sm:inline">
              {connected ? 'Backend connected' : 'Backend unavailable'}
            </span>
            <button className="rounded-md p-2 text-muted" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-forest text-[11px] font-semibold text-white">
              {initials(seller?.name || seller?.businessName)}
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {health?.mongodbMode === 'memory' && (
            <p className="mb-4 rounded-md border border-line bg-[var(--color-paper)] px-3 py-2 text-sm text-muted">
              Demo database is active (local MongoDB not running). For live mode run{' '}
              <code className="text-ink">npm run db:local</code> in backend/.
            </p>
          )}
          {!demo && health && !health.liveReady && (
            <p className="mb-4 rounded-md border border-line bg-[var(--color-paper)] px-3 py-2 text-sm text-[#B42318]">
              LIVE mode is incomplete. Check Setup or run <code className="text-ink">npm run live:check</code>.
            </p>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
