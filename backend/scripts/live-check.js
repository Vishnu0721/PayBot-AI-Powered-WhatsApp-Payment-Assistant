/**
 * Live readiness report (L1–L5). Never prints secret values.
 * Exit 0 when live-ready (or DEMO still on but L0 mongo OK for demo).
 * Use --require-live to fail unless DEMO_MODE=false and all live checks pass.
 */
import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const requireLive = process.argv.includes('--require-live');

function present(name) {
  const v = process.env[name];
  return Boolean(v && String(v).trim());
}

function probePort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

function bool(name, fallback = false) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return String(v).toLowerCase() === 'true' || v === '1';
}

const mongoPort = Number(process.env.PAYBOT_MONGO_PORT || 27017);
const mongoOpen = await probePort('127.0.0.1', mongoPort);
const demoMode = bool('DEMO_MODE', true);
const otpDemo = bool('OTP_DEMO_MODE', false);

const msg91 = present('MSG91_AUTH_KEY') && present('MSG91_TEMPLATE_ID');
const twilio =
  present('TWILIO_ACCOUNT_SID') && present('TWILIO_AUTH_TOKEN') && present('TWILIO_FROM_NUMBER');
const waOtp = present('WHATSAPP_ACCESS_TOKEN') && present('WHATSAPP_PHONE_NUMBER_ID');
const otpProvider = (process.env.OTP_PROVIDER || '').toLowerCase().trim();
const otpConfigured =
  (otpProvider === 'msg91' && msg91) ||
  (otpProvider === 'twilio' && twilio) ||
  (otpProvider === 'whatsapp' && waOtp) ||
  (!otpProvider && (msg91 || twilio || waOtp));

const otpPepperRaw = process.env.OTP_PEPPER || '';
const otpPepperValue =
  otpPepperRaw.length >= 16 ? otpPepperRaw : process.env.JWT_SECRET || otpPepperRaw || '';
const checks = {
  mongoListening: mongoOpen,
  mongodbUri: present('MONGODB_URI'),
  jwtSecret: present('JWT_SECRET') && String(process.env.JWT_SECRET).length >= 16,
  otpPepper: String(otpPepperValue).length >= 16,
  demoModeOff: !demoMode,
  otpDemoOff: !otpDemo,
  razorpayKeys: present('RAZORPAY_KEY_ID') && present('RAZORPAY_KEY_SECRET'),
  razorpayWebhook: present('RAZORPAY_WEBHOOK_SECRET'),
  whatsapp: present('WHATSAPP_ACCESS_TOKEN') && present('WHATSAPP_PHONE_NUMBER_ID') && present('WHATSAPP_VERIFY_TOKEN'),
  whatsappAppSecret: present('WHATSAPP_APP_SECRET'),
  otpProvider: otpConfigured,
  otpProviderMsg91: msg91 && (otpProvider === 'msg91' || !otpProvider),
  paymentTemplate: present('WHATSAPP_PAYMENT_TEMPLATE_NAME'),
  durableMongoDir: fs.existsSync(path.resolve(__dirname, '../../.data/mongo')),
};

const requiredForLive = [
  'demoModeOff',
  'otpDemoOff',
  'mongodbUri',
  'jwtSecret',
  'otpPepper',
  'razorpayKeys',
  'razorpayWebhook',
  'whatsapp',
  'whatsappAppSecret',
  'otpProvider',
];

const missing = requiredForLive.filter((k) => !checks[k]);
const liveReady = missing.length === 0 && checks.mongoListening;

const report = {
  phase: 'L1-L5',
  demoMode,
  liveReady,
  missing,
  warnings: [
    !checks.paymentTemplate ? 'WHATSAPP_PAYMENT_TEMPLATE_NAME (optional; free text works in open sessions)' : null,
    !checks.otpProviderMsg91 && !waOtp
      ? 'Set WhatsApp token+phone id for free OTP, or MSG91 for SMS OTP'
      : null,
    !present('CREDENTIALS_ENCRYPTION_KEY') ? 'CREDENTIALS_ENCRYPTION_KEY (optional; falls back to JWT)' : null,
  ].filter(Boolean),
  checks,
};

console.log(JSON.stringify(report, null, 2));

if (requireLive && !liveReady) {
  console.error('\nNot live-ready. Fill missing keys in backend/.env, start Mongo (npm run db:local), then retry.');
  process.exitCode = 1;
} else if (!demoMode && !liveReady) {
  console.error('\nDEMO_MODE=false but live checks failed — API will refuse to boot. Fix missing items or set DEMO_MODE=true.');
  process.exitCode = 1;
} else if (demoMode) {
  console.log(`
Still in DEMO (intentional until keys are filled).
When Razorpay test keys + MSG91 + WhatsApp are set:
  npm run live:enable
Then restart API. Webhooks need a public HTTPS tunnel to :3000.
`);
} else {
  console.log('\nLIVE ready. Restart API and configure Razorpay/WhatsApp webhook URLs on your tunnel.');
}
