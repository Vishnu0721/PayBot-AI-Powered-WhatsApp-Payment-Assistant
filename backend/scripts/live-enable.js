/**
 * Flip DEMO → LIVE only when required keys are present. Never invents secrets.
 * Free path: Razorpay test keys + WhatsApp Cloud API (OTP via WhatsApp).
 * Usage: node scripts/live-enable.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

if (!fs.existsSync(envPath)) {
  console.error('[paybot] backend/.env not found. Copy from .env.example first.');
  process.exit(1);
}

dotenv.config({ path: envPath });

function present(name) {
  const v = process.env[name];
  return Boolean(v && String(v).trim());
}

const pepperOk =
  (present('OTP_PEPPER') && String(process.env.OTP_PEPPER).length >= 16) ||
  (present('JWT_SECRET') && String(process.env.JWT_SECRET).length >= 16);

const msg91Ok = present('MSG91_AUTH_KEY') && present('MSG91_TEMPLATE_ID');
const whatsappOtpOk = present('WHATSAPP_ACCESS_TOKEN') && present('WHATSAPP_PHONE_NUMBER_ID');
const otpOk = msg91Ok || whatsappOtpOk;
// Prefer free WhatsApp OTP when MSG91 is not set.
const otpProviderValue = msg91Ok && !whatsappOtpOk ? 'msg91' : 'whatsapp';

const required = [
  ['MONGODB_URI', present('MONGODB_URI')],
  ['JWT_SECRET', present('JWT_SECRET') && String(process.env.JWT_SECRET).length >= 16],
  ['OTP_PEPPER (or JWT_SECRET fallback)', pepperOk],
  ['RAZORPAY_KEY_ID (use rzp_test_… free test keys)', present('RAZORPAY_KEY_ID')],
  ['RAZORPAY_KEY_SECRET', present('RAZORPAY_KEY_SECRET')],
  ['RAZORPAY_WEBHOOK_SECRET', present('RAZORPAY_WEBHOOK_SECRET')],
  ['WHATSAPP_ACCESS_TOKEN', present('WHATSAPP_ACCESS_TOKEN')],
  ['WHATSAPP_PHONE_NUMBER_ID', present('WHATSAPP_PHONE_NUMBER_ID')],
  ['WHATSAPP_VERIFY_TOKEN', present('WHATSAPP_VERIFY_TOKEN')],
  ['WHATSAPP_APP_SECRET', present('WHATSAPP_APP_SECRET')],
  ['OTP via WhatsApp (free) OR MSG91_AUTH_KEY+MSG91_TEMPLATE_ID', otpOk],
];

const missing = required.filter(([, ok]) => !ok).map(([name]) => name);
if (missing.length) {
  console.error('[paybot] Refusing to enable LIVE — missing or weak:');
  for (const name of missing) console.error(`  - ${name}`);
  console.error('[paybot] Free path: Razorpay TEST keys + Meta WhatsApp Cloud (no MSG91 needed).');
  console.error('[paybot] Fill backend/.env, then re-run: npm run live:enable');
  process.exit(1);
}

let text = fs.readFileSync(envPath, 'utf8');
if (!text.endsWith('\n')) text += '\n';

function upsert(key, value) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(text)) {
    text = text.replace(re, `${key}=${value}`);
  } else {
    text += `${key}=${value}\n`;
  }
}

upsert('DEMO_MODE', 'false');
upsert('OTP_DEMO_MODE', 'false');
upsert('OTP_PROVIDER', otpProviderValue);

if (!present('CREDENTIALS_ENCRYPTION_KEY')) {
  const crypto = await import('crypto');
  upsert('CREDENTIALS_ENCRYPTION_KEY', crypto.randomBytes(32).toString('hex'));
  console.log('[paybot] Generated CREDENTIALS_ENCRYPTION_KEY');
}

fs.writeFileSync(envPath, text, 'utf8');
console.log(
  `[paybot] LIVE flags written: DEMO_MODE=false, OTP_DEMO_MODE=false, OTP_PROVIDER=${otpProviderValue}`,
);
console.log('[paybot] Restart the API. Run: npm run live:check -- --require-live');
console.log('[paybot] Configure webhooks on your free tunnel (ngrok):');
console.log('  POST /api/razorpay/webhook');
console.log('  GET/POST /api/whatsapp/webhook');
