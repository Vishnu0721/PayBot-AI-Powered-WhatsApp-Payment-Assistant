import {
  env,
  getLiveReadiness,
  isOtpProviderConfigured,
  isRazorpayConfigured,
  isWhatsAppConfigured,
  isWhatsAppWebhookReady,
  resolveOtpProvider,
} from '../config/env.js';
import { isMongoConnected, getDbMode } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';

export const getHealth = asyncHandler(async (req, res) => {
  const mongo = isMongoConnected();
  const otpProvider = resolveOtpProvider() || (env.otpDemoMode ? 'demo' : 'none');
  const mode = getDbMode();
  const live = getLiveReadiness();

  res.json({
    success: true,
    status: mongo ? 'ok' : 'degraded',
    demoMode: env.demoMode,
    liveReady: !env.demoMode && live.ready && mongo,
    live,
    mongodb: mongo,
    mongodbMode: mode,
    mongodbPersistent: mode === 'mongo',
    razorpay: {
      configured: isRazorpayConfigured(),
      webhookConfigured: Boolean(env.razorpay.webhookSecret),
    },
    whatsapp: {
      configured: isWhatsAppConfigured(),
      webhookReady: isWhatsAppWebhookReady(),
      appSecretConfigured: Boolean(env.whatsapp.appSecret),
      paymentTemplateConfigured: Boolean(env.whatsapp.paymentTemplate),
    },
    otp: {
      demoMode: env.otpDemoMode,
      provider: otpProvider,
      configured: isOtpProviderConfigured(),
    },
    parser: {
      provider: env.parser.provider || 'rules',
      llmConfigured: Boolean(env.parser.llmApiKey),
    },
    reminders: {
      enabled: env.reminders.enabled,
      afterHours: env.reminders.afterHours,
      maxCount: env.reminders.maxCount,
    },
    recurring: {
      enabled: env.recurring.enabled,
    },
    paymentProvider: env.paymentProvider || 'razorpay',
  });
});
