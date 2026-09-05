import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() === 'true' || value === '1';
}

export const env = {
  port: Number(process.env.PORT || 3000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  // Prefer OTP_PEPPER when strong; otherwise fall back to JWT_SECRET (never keep a weak pepper).
  otpPepper:
    String(process.env.OTP_PEPPER || '').length >= 16
      ? process.env.OTP_PEPPER
      : process.env.JWT_SECRET || process.env.OTP_PEPPER || '',
  credentialsEncryptionKey: process.env.CREDENTIALS_ENCRYPTION_KEY || '',
  demoMode: bool(process.env.DEMO_MODE, true),
  otpDemoMode: bool(process.env.OTP_DEMO_MODE, false),
  otpProvider: (process.env.OTP_PROVIDER || '').toLowerCase().trim(),
  parser: {
    provider: (process.env.PARSER_PROVIDER || 'rules').toLowerCase().trim(),
    llmApiKey: process.env.PARSER_LLM_API_KEY || '',
    llmBaseUrl: process.env.PARSER_LLM_BASE_URL || 'https://api.openai.com/v1',
    llmModel: process.env.PARSER_LLM_MODEL || 'gpt-4o-mini',
  },
  reminders: {
    enabled: bool(process.env.REMINDERS_ENABLED, false),
    afterHours: Math.max(1, Number(process.env.REMINDER_AFTER_HOURS || 24)),
    intervalHours: Math.max(1, Number(process.env.REMINDER_INTERVAL_HOURS || 24)),
    maxCount: Math.max(1, Number(process.env.REMINDER_MAX_COUNT || 2)),
    pollMs: Math.max(60_000, Number(process.env.REMINDER_POLL_MS || 300_000)),
  },
  recurring: {
    enabled: bool(process.env.RECURRING_ENABLED, true),
    pollMs: Math.max(60_000, Number(process.env.RECURRING_POLL_MS || 300_000)),
  },
  paymentProvider: (process.env.PAYMENT_PROVIDER || 'razorpay').toLowerCase().trim(),
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },
  msg91: {
    authKey: process.env.MSG91_AUTH_KEY || '',
    templateId: process.env.MSG91_TEMPLATE_ID || '',
    senderId: process.env.MSG91_SENDER_ID || '',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    otpTemplate: process.env.WHATSAPP_OTP_TEMPLATE_NAME || '',
    otpTemplateLanguage: process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE || 'en',
    // Auth templates usually need a URL/copy-code button param with the same OTP.
    // none | url | otp  (otp = copy-code style)
    otpTemplateButton: (process.env.WHATSAPP_OTP_TEMPLATE_BUTTON || 'url').toLowerCase().trim(),
    paymentTemplate: process.env.WHATSAPP_PAYMENT_TEMPLATE_NAME || '',
    paymentTemplateLanguage: process.env.WHATSAPP_PAYMENT_TEMPLATE_LANGUAGE || 'en',
  },
};

export function isWhatsAppOtpConfigured() {
  return Boolean(env.whatsapp.accessToken && env.whatsapp.phoneNumberId);
}

export function isTwilioOtpConfigured() {
  return Boolean(env.twilio.accountSid && env.twilio.authToken && env.twilio.fromNumber);
}

export function isMsg91Configured() {
  return Boolean(env.msg91.authKey && env.msg91.templateId);
}

export function isOtpProviderConfigured() {
  return resolveOtpProvider() !== null;
}

/**
 * Prefer explicit OTP_PROVIDER when that provider is fully configured.
 * Live mode prefers MSG91 (reliable Indian OTP) before WhatsApp/Twilio.
 * Demo mode prefers WhatsApp → Twilio → MSG91 (existing auto-detect).
 */
export function resolveOtpProvider() {
  const chosen = env.otpProvider;

  if (chosen === 'msg91') return isMsg91Configured() ? 'msg91' : null;
  if (chosen === 'twilio') return isTwilioOtpConfigured() ? 'twilio' : null;
  if (chosen === 'whatsapp') return isWhatsAppOtpConfigured() ? 'whatsapp' : null;

  if (!env.demoMode) {
    if (isMsg91Configured()) return 'msg91';
    if (isWhatsAppOtpConfigured()) return 'whatsapp';
    if (isTwilioOtpConfigured()) return 'twilio';
    return null;
  }

  if (isWhatsAppOtpConfigured()) return 'whatsapp';
  if (isTwilioOtpConfigured()) return 'twilio';
  if (isMsg91Configured()) return 'msg91';
  return null;
}

export function isRazorpayConfigured() {
  return Boolean(env.razorpay.keyId && env.razorpay.keySecret);
}

export function isWhatsAppConfigured() {
  return Boolean(
    env.whatsapp.accessToken && env.whatsapp.phoneNumberId && env.whatsapp.verifyToken,
  );
}

export function isWhatsAppWebhookReady() {
  if (!isWhatsAppConfigured()) return false;
  if (env.demoMode) return true;
  return Boolean(env.whatsapp.appSecret);
}

/**
 * Live-mode readiness. Does not mutate env. Safe to call from health / boot / CLI.
 * required = must pass before LIVE boot; warnings = recommended for production quality.
 */
export function getLiveReadiness() {
  const checks = {
    demoModeOff: !env.demoMode,
    otpDemoOff: !env.otpDemoMode,
    mongodbUri: Boolean(env.mongodbUri),
    jwtSecret: Boolean(env.jwtSecret && env.jwtSecret.length >= 16),
    otpPepper: Boolean(env.otpPepper && env.otpPepper.length >= 16),
    razorpayKeys: isRazorpayConfigured(),
    razorpayWebhook: Boolean(env.razorpay.webhookSecret),
    whatsappConfigured: isWhatsAppConfigured(),
    whatsappAppSecret: Boolean(env.whatsapp.appSecret),
    otpProvider: isOtpProviderConfigured(),
  };

  const warnings = {
    whatsappPaymentTemplate: Boolean(env.whatsapp.paymentTemplate),
    credentialsEncryptionKey: Boolean(env.credentialsEncryptionKey),
    otpProviderIsMsg91: resolveOtpProvider() === 'msg91',
  };

  const requiredLabels = {
    demoModeOff: 'DEMO_MODE=false',
    otpDemoOff: 'OTP_DEMO_MODE=false',
    mongodbUri: 'MONGODB_URI',
    jwtSecret: 'JWT_SECRET (16+ chars)',
    otpPepper: 'OTP_PEPPER (16+ chars)',
    razorpayKeys: 'RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET',
    razorpayWebhook: 'RAZORPAY_WEBHOOK_SECRET',
    whatsappConfigured: 'WHATSAPP_ACCESS_TOKEN + PHONE_NUMBER_ID + VERIFY_TOKEN',
    whatsappAppSecret: 'WHATSAPP_APP_SECRET',
    otpProvider: 'OTP provider (MSG91_AUTH_KEY + MSG91_TEMPLATE_ID recommended)',
  };

  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => requiredLabels[key] || key);

  const warningList = Object.entries(warnings)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);

  return {
    mode: env.demoMode ? 'demo' : 'live',
    ready: missing.length === 0,
    checks,
    warnings,
    missing,
    warningList,
    otpProvider: resolveOtpProvider() || (env.otpDemoMode ? 'demo' : null),
  };
}
