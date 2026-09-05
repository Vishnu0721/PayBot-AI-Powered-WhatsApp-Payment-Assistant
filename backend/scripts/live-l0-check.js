/**
 * L0 readiness probe — reports infra status only. Does not flip DEMO_MODE or print secrets.
 */
import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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

const mongoPort = Number(process.env.PAYBOT_MONGO_PORT || 27017);
const mongoOpen = await probePort('127.0.0.1', mongoPort);
const apiOpen = await probePort('127.0.0.1', Number(process.env.PORT || 3000));

const checks = {
  mongoListeningOn27017: mongoOpen,
  apiListening: apiOpen,
  mongodbUriSet: present('MONGODB_URI'),
  demoModeStillOn: String(process.env.DEMO_MODE || 'true').toLowerCase() !== 'false',
  otpDemoStillOn: String(process.env.OTP_DEMO_MODE || '').toLowerCase() === 'true',
  razorpayKeyId: present('RAZORPAY_KEY_ID'),
  razorpayKeySecret: present('RAZORPAY_KEY_SECRET'),
  razorpayWebhookSecret: present('RAZORPAY_WEBHOOK_SECRET'),
  msg91AuthKey: present('MSG91_AUTH_KEY'),
  msg91TemplateId: present('MSG91_TEMPLATE_ID'),
  whatsappToken: present('WHATSAPP_ACCESS_TOKEN'),
  whatsappPhoneId: present('WHATSAPP_PHONE_NUMBER_ID'),
  whatsappVerifyToken: present('WHATSAPP_VERIFY_TOKEN'),
  whatsappAppSecret: present('WHATSAPP_APP_SECRET'),
  durableMongoDataDir: fs.existsSync(path.resolve(__dirname, '../../.data/mongo')),
};

const l0Pass = checks.mongoListeningOn27017 && checks.mongodbUriSet;

console.log(JSON.stringify({ phase: 'L0', pass: l0Pass, checks }, null, 2));

if (!l0Pass) {
  console.log(`
L0 not ready yet:
  1. Terminal A: cd backend && npm run db:local
  2. Confirm MONGODB_URI=mongodb://127.0.0.1:27017/paybot in backend/.env
  3. Do NOT flip DEMO_MODE until L1
`);
  process.exitCode = 1;
} else {
  console.log(`
L0 Mongo OK. Next (still L0 accounts — you fill these; do not commit):
  - Razorpay Dashboard → Test API keys + webhook secret (tunnel URL later)
  - MSG91 → Auth key + OTP template id (chosen OTP provider)
  - Meta WhatsApp → token, phone number id, verify token, app secret
  - Public HTTPS tunnel (ngrok) for webhooks — L2/L3
L1 will flip DEMO_MODE=false after keys exist.
`);
}
