import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import PayBotLogo from '../components/PayBotLogo.jsx';
import Button from '../components/Button.jsx';

const links = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#businesses', label: 'For businesses' },
  { href: '/#features', label: 'Features' },
  { href: '/#faq', label: 'FAQ' },
];

const footerLinks = [
  { href: '/#how-it-works', label: 'Product' },
  { href: '/#features', label: 'Features' },
  { href: '/#businesses', label: 'For businesses' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/#privacy', label: 'Privacy' },
  { href: '/#terms', label: 'Terms' },
];

export default function MarketingLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-ink">
      <header className="sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4 backdrop-blur-xl bg-[#F6F4EF]/75">
          <Link to="/" onClick={() => setOpen(false)}>
            <PayBotLogo size="sm" />
          </Link>
          <nav className="hidden items-center gap-10 text-[14px] text-muted md:flex">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-ink">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-6 md:flex">
            <NavLink to="/login" className="text-[14px] font-medium text-ink">
              Login
            </NavLink>
            <Link to="/login">
              <Button size="sm">
                Get started <ArrowRight className="btn-arrow h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <button className="rounded-md p-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Open menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-line/70 bg-[#F6F4EF] px-6 py-5 md:hidden">
            <div className="flex flex-col gap-4 text-sm">
              {links.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              ))}
              <Link to="/login" onClick={() => setOpen(false)} className="font-medium">
                Login
              </Link>
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button className="w-full">
                  Get started <ArrowRight className="btn-arrow h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      <Outlet />

      <footer className="border-t border-line/80">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <PayBotLogo size="sm" />
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
            {footerLinks.map((link) => (
              <a key={link.label} href={link.href} className="transition-colors hover:text-ink">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
