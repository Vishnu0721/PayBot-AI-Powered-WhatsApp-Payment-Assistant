/**
 * Local free-live helper: prints exact webhook URLs once a public tunnel is up.
 * Does not invent Razorpay/Meta secrets — those must be pasted into .env by you.
 *
 * Usage:
 *   1) Start API: npm run dev
 *   2) Start tunnel in another terminal, e.g.:
 *        cloudflared tunnel --url http://127.0.0.1:3000
 *      or: ngrok http 3000
 *   3) node scripts/live-setup.js https://xxxx.trycloudflare.com
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const base = String(process.argv[2] || '')
  .trim()
  .replace(/\/$/, '');

function present(name) {
  return Boolean(process.env[name] && String(process.env[name]).trim());
}

if (!base || !/^https:\/\//i.test(base)) {
  console.error(`
Usage:
  node scripts/live-setup.js https://YOUR-REAL-TUNNEL-HOST

Example after cloudflared starts:
  node scripts/live-setup.js https://random-words.trycloudflare.com
`);
  process.exit(1);
}

const razorpayWebhook = `${base}/api/razorpay/webhook`;
const whatsappWebhook = `${base}/api/whatsapp/webhook`;

console.log(`
=== Free live setup (PayBot) ===

1) Razorpay Dashboard (TEST mode)
   https://dashboard.razorpay.com/app/website-app-settings/api-keys
   Copy Key ID + Key Secret into backend/.env:
     RAZORPAY_KEY_ID=rzp_test_...
     RAZORPAY_KEY_SECRET=...

   Webhooks:
   https://dashboard.razorpay.com/app/webhooks
   URL (paste EXACTLY):
     ${razorpayWebhook}
   Events: payment_link.paid, payment.captured
   Then copy Signing secret → RAZORPAY_WEBHOOK_SECRET=...

2) WhatsApp Cloud API (NOT dev.meta.ai)
   https://developers.facebook.com/apps/
   Create Business app → Add WhatsApp → API Setup
   Copy into backend/.env:
     WHATSAPP_ACCESS_TOKEN=...
     WHATSAPP_PHONE_NUMBER_ID=...
     WHATSAPP_APP_SECRET=...   (App settings → Basic)
     WHATSAPP_VERIFY_TOKEN=paybot_verify_123
     OTP_PROVIDER=whatsapp

   Meta webhook callback URL:
     ${whatsappWebhook}
   Verify token: same as WHATSAPP_VERIFY_TOKEN
   Add your phone under "To" allowlist.

3) After .env is filled:
   npm run live:enable
   restart API (npm run dev)
   npm run live:check -- --require-live

Current key status (no secrets printed):
  RAZORPAY_KEY_ID: ${present('RAZORPAY_KEY_ID') ? 'set' : 'MISSING'}
  RAZORPAY_KEY_SECRET: ${present('RAZORPAY_KEY_SECRET') ? 'set' : 'MISSING'}
  RAZORPAY_WEBHOOK_SECRET: ${present('RAZORPAY_WEBHOOK_SECRET') ? 'set' : 'MISSING'}
  WHATSAPP_ACCESS_TOKEN: ${present('WHATSAPP_ACCESS_TOKEN') ? 'set' : 'MISSING'}
  WHATSAPP_PHONE_NUMBER_ID: ${present('WHATSAPP_PHONE_NUMBER_ID') ? 'set' : 'MISSING'}
  WHATSAPP_VERIFY_TOKEN: ${present('WHATSAPP_VERIFY_TOKEN') ? 'set' : 'MISSING'}
  WHATSAPP_APP_SECRET: ${present('WHATSAPP_APP_SECRET') ? 'set' : 'MISSING'}
`);

const out = path.resolve(__dirname, '../../.data/live-tunnel.txt');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(
  out,
  `base=${base}\nrazorpay=${razorpayWebhook}\nwhatsapp=${whatsappWebhook}\n`,
  'utf8',
);
console.log(`Saved webhook URLs to ${out}`);
