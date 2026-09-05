import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight } from 'lucide-react';
import Button from '../components/Button.jsx';
import ProductVisual from '../components/ProductVisual.jsx';
import DashboardShowcase from '../components/DashboardShowcase.jsx';
import Reveal from '../components/Reveal.jsx';

const steps = [
  {
    n: '01',
    title: 'Message',
    text: 'Tell PayBot who owes you, how much, and why.',
  },
  {
    n: '02',
    title: 'Payment',
    text: 'PayBot creates and sends a secure payment request.',
  },
  {
    n: '03',
    title: 'Confirmation',
    text: 'Track the payment until it is completed.',
  },
];

const businesses = [
  ['Retail', 'Collect for everyday orders without a catalog.'],
  ['Freelancers', 'Send a request the moment a project is delivered.'],
  ['Home businesses', 'Get paid from the same chat you already use.'],
  ['Service providers', 'Turn a quote into a payment in one message.'],
  ['Local shops', 'Ask, send, and confirm — without another app.'],
];

const features = [
  ['WhatsApp-first', 'Collect from the conversation you already live in.'],
  ['Payment automation', 'One message becomes a complete payment request.'],
  ['Real-time payment tracking', 'See pending and paid as they happen.'],
  ['Secure payment links', 'Every request gets its own Razorpay checkout.'],
  ['Customer reminders', 'Follow up without leaving your workflow.'],
  ['Transaction history', 'A clean record of every collection.'],
  ['Business dashboard', 'Amounts, customers, and status in one place.'],
  ['Payment notifications', 'Know the moment a payment is confirmed.'],
];

const faqs = [
  ['Do customers need an app?', 'No. They open a secure payment link or scan a QR.'],
  ['Is PayBot a UPI app?', 'No. PayBot automates collection. Razorpay processes the payment.'],
  ['Do I need a product catalog?', 'No. Send free-form requests for anything you sell.'],
  ['How is payment confirmed?', 'Only a verified Razorpay webhook can mark a live payment as paid.'],
];

export default function Landing() {
  return (
    <div>
      <section className="mx-auto max-w-[1180px] px-6 pb-24 pt-16 lg:pb-32 lg:pt-24">
        <div className="grid items-center gap-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <p className="eyebrow hero-in">WhatsApp payment automation</p>
            <h1 className="hero-in-2 mt-5 max-w-[16ch] text-[44px] font-semibold leading-[1.05] tracking-tight sm:text-[64px]">
              Get paid without leaving WhatsApp.
            </h1>
            <p className="hero-in-3 mt-6 max-w-md text-[17px] leading-relaxed text-muted">
              Turn WhatsApp conversations into simple, trackable payment requests for your business.
            </p>
            <div className="hero-in-3 mt-9 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg">
                  Start collecting <ArrowRight className="btn-arrow h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="secondary">
                  See how it works <ArrowDown className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
          <div className="hero-in-3">
            <ProductVisual />
          </div>
        </div>
        <div className="hero-in-3 mt-16 flex flex-wrap gap-x-10 gap-y-3 text-[13px] text-muted">
          <span>No customer app</span>
          <span>Secure payment links</span>
          <span>Built for small businesses</span>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-line/70">
        <div className="mx-auto max-w-[1180px] px-6 py-24 lg:py-32">
          <Reveal>
            <h2 className="max-w-[12ch] text-[40px] font-semibold leading-[1.1] tracking-tight sm:text-[52px]">
              From conversation to payment.
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-12 lg:grid-cols-3 lg:gap-16">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 80}>
                <p className="text-[13px] text-muted">{step.n}</p>
                <h3 className="mt-4 text-[22px] font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted">{step.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-[1180px] px-6 py-24 lg:py-32">
        <Reveal>
          <h2 className="max-w-[14ch] text-[40px] font-semibold leading-[1.1] tracking-tight sm:text-[52px]">
            Everything you need to collect payments.
          </h2>
        </Reveal>
        <Reveal delay={80} className="mt-14">
          <DashboardShowcase />
        </Reveal>
      </section>

      <section id="businesses" className="border-y border-line/70">
        <div className="mx-auto max-w-[1180px] px-6 py-24 lg:py-32">
          <Reveal>
            <p className="eyebrow">For small businesses</p>
            <h2 className="mt-5 max-w-[16ch] text-[40px] font-semibold leading-[1.1] tracking-tight sm:text-[52px]">
              Built for businesses that live in WhatsApp.
            </h2>
          </Reveal>
          <div className="mt-16 divide-y divide-line">
            {businesses.map(([title, text], i) => (
              <Reveal key={title} delay={i * 40}>
                <div className="grid gap-2 py-6 md:grid-cols-[220px_1fr] md:items-baseline">
                  <h3 className="text-[18px] font-semibold tracking-tight">{title}</h3>
                  <p className="text-[15px] text-muted">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1180px] px-6 py-24 lg:py-32">
        <Reveal>
          <h2 className="max-w-[12ch] text-[40px] font-semibold leading-[1.1] tracking-tight sm:text-[52px]">
            Quietly powerful.
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-x-16 gap-y-12 sm:grid-cols-2">
          {features.map(([title, text], i) => (
            <Reveal key={title} delay={(i % 2) * 60}>
              <article className="group/feature border-t border-line pt-5 transition-transform duration-300 hover:-translate-y-0.5">
                <h3 className="text-[18px] font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted">{text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="border-y border-line/70">
        <div className="mx-auto max-w-[1180px] px-6 py-24 lg:py-32">
          <Reveal>
            <h2 className="text-[40px] font-semibold tracking-tight sm:text-[52px]">FAQ</h2>
          </Reveal>
          <div className="mt-12 divide-y divide-line">
            {faqs.map(([q, a]) => (
              <Reveal key={q}>
                <div className="grid gap-3 py-7 md:grid-cols-[320px_1fr]">
                  <h3 className="text-[17px] font-semibold tracking-tight">{q}</h3>
                  <p className="text-[15px] leading-relaxed text-muted">{a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-6 py-24 text-center lg:py-32">
        <div id="privacy" className="sr-only">Privacy</div>
        <div id="terms" className="sr-only">Terms</div>
        <Reveal>
          <h2 className="text-[44px] font-semibold tracking-tight sm:text-[56px]">Ready to get paid?</h2>
          <p className="mx-auto mt-4 max-w-md text-[17px] text-muted">
            Start collecting payments through WhatsApp.
          </p>
          <Link to="/login" className="mt-8 inline-flex">
            <Button size="lg">
              Get started <ArrowRight className="btn-arrow h-4 w-4" />
            </Button>
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
