import { Outlet } from 'react-router-dom';
import PayBotLogo from '../components/PayBotLogo.jsx';

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="auth-glow relative hidden overflow-hidden lg:flex">
        <div className="auth-ring" />
        <div className="auth-ring-2" />
        <div className="absolute left-[12%] top-[18%] h-40 w-40 rounded-full border border-white/[0.04]" />
        <div className="absolute bottom-[14%] right-[10%] h-24 w-24 rotate-12 rounded-2xl border border-white/[0.05]" />
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="rounded-[40px] shadow-[0_0_80px_rgba(61,220,151,0.12)]">
            <PayBotLogo size="hero" iconOnly variant="light" />
          </div>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col bg-[#F7F6F2] px-6 py-8">
        <div className="mb-8 lg:hidden">
          <PayBotLogo size="md" iconOnly />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[380px]">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
