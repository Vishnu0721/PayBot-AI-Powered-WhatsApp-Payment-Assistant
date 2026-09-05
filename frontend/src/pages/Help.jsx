import PayBotLogo from '../components/PayBotLogo.jsx';
import PageHeader from '../components/PageHeader.jsx';

const sections = [
  {
    title: 'How PayBot works',
    body: 'You tell PayBot who owes you, how much, and why. PayBot creates a Razorpay payment request, delivers it, and notifies you when Razorpay confirms the payment.',
  },
  {
    title: 'How to create a payment',
    body: 'From the dashboard, open Payments → New payment. Enter a customer number, amount, and description. Or send a WhatsApp message such as “₹500 for groceries from 9876543210”.',
  },
  {
    title: 'How WhatsApp collection works',
    body: 'In live mode, merchants message the PayBot WhatsApp number. PayBot parses the request, creates the payment, and messages the customer. In demo mode, use the WhatsApp simulator.',
  },
  {
    title: 'How Razorpay works',
    body: 'PayBot is not a payment processor. Each request becomes a Razorpay Payment Link. The customer pays on Razorpay. Secrets never leave the server.',
  },
  {
    title: 'How payment confirmation works',
    body: 'Live payments become PAID only after a verified Razorpay webhook. Redirects, buttons, and query parameters cannot mark a live payment as paid.',
  },
  {
    title: 'Demo mode',
    body: 'Set OTP_DEMO_MODE=true to skip the OTP provider. The verify screen shows the Development OTP to enter. DEMO_MODE controls payment simulation separately. Production will not start if DEMO_MODE is still true. Live mode also refuses OTP_DEMO_MODE.',
  },
  {
    title: 'Live mode',
    body: 'Keep DEMO_MODE=true until keys are filled. Then run npm run live:enable in backend/ (requires Razorpay test keys + webhook secret, WhatsApp Cloud + app secret, and MSG91 OTP). Live boot refuses incomplete config. Simulator and demo-pay are disabled. Prefer MSG91 for OTP accuracy in India.',
  },
  {
    title: 'Local live webhooks',
    body: 'Expose the API with ngrok or cloudflared. Razorpay: POST /api/razorpay/webhook. WhatsApp: GET/POST /api/whatsapp/webhook with the same WHATSAPP_VERIFY_TOKEN. Only verified Razorpay webhooks mark payments PAID.',
  },
  {
    title: 'Your own Razorpay account',
    body: 'In Setup you can connect your Razorpay Key ID, Key Secret, and webhook secret. PayBot encrypts secrets at rest and never shows them again. New payment links then settle to your merchant account instead of the platform account.',
  },
  {
    title: 'Smarter collection',
    body: 'Parsing uses rules by default. Optional PARSER_PROVIDER=llm can understand freer wording, then falls back to rules if the model fails. Name-only requests ask for a WhatsApp number before sending. Pending payments can be reminded manually, or automatically when REMINDERS_ENABLED=true.',
  },
  {
    title: 'Recurring, team, and analytics',
    body: 'Use Recurring to schedule weekly or monthly collections. Invite staff under Team (owner only). The overview dashboard shows 7-day totals, average ticket, and a simple paid series. Every payment gets an invoice number like PB-20260305-A1B2C3.',
  },
];

export default function Help() {
  return (
    <div className="max-w-2xl">
      <PayBotLogo size="sm" />
      <div className="mt-4">
        <PageHeader title="Help" description="How collection, WhatsApp, and Razorpay fit together." />
      </div>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {sections.map((section) => (
          <div key={section.title} className="py-5">
            <h2 className="text-sm font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
