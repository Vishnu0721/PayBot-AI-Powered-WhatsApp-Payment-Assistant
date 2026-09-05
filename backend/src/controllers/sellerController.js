import { asyncHandler, HttpError } from '../utils/http.js';
import { formatPhoneDisplay } from '../utils/phone.js';
import {
  env,
  getLiveReadiness,
  isRazorpayConfigured,
  isWhatsAppConfigured,
  isWhatsAppWebhookReady,
  resolveOtpProvider,
} from '../config/env.js';
import {
  assertRazorpayCredentials,
  invalidateRazorpayClient,
} from '../services/razorpay.js';
import { encryptSecret, maskRazorpayKeyId } from '../utils/secrets.js';

export const getSeller = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    seller: {
      ...req.seller.toPublic(),
      phoneDisplay: formatPhoneDisplay(req.seller.phoneNumber),
      role: req.role || 'owner',
      staffId: req.staffId || null,
    },
  });
});

export const updateSeller = asyncHandler(async (req, res) => {
  if (req.role && req.role !== 'owner') {
    throw new HttpError(403, 'Only the business owner can update the profile.', 'OWNER_REQUIRED');
  }

  const businessName = String(req.body?.businessName || '').trim();
  const name = String(req.body?.name || req.body?.ownerName || '').trim();

  if (!businessName) {
    throw new HttpError(400, 'Enter your business name.', 'BUSINESS_NAME_REQUIRED');
  }
  if (!name) {
    throw new HttpError(400, 'Enter the owner name.', 'OWNER_NAME_REQUIRED');
  }

  req.seller.businessName = businessName.slice(0, 80);
  req.seller.name = name.slice(0, 80);
  await req.seller.save();

  res.json({
    success: true,
    seller: {
      ...req.seller.toPublic(),
      phoneDisplay: formatPhoneDisplay(req.seller.phoneNumber),
    },
  });
});

export const getSetup = asyncHandler(async (req, res) => {
  const independent = Boolean(
    !req.seller.usesPlatformCredentials &&
      req.seller.razorpayKeyId &&
      req.seller.razorpayKeySecretEnc,
  );

  res.json({
    success: true,
    seller: {
      ...req.seller.toPublic(),
      phoneDisplay: formatPhoneDisplay(req.seller.phoneNumber),
      razorpayKeyIdMasked: independent ? maskRazorpayKeyId(req.seller.razorpayKeyId) : '',
    },
    connections: {
      backend: true,
      mongodb: true,
      demoMode: env.demoMode,
      whatsapp: isWhatsAppConfigured() && !env.demoMode,
      whatsappWebhookReady: isWhatsAppWebhookReady(),
      razorpay: isRazorpayConfigured() || independent,
      razorpayWebhook:
        Boolean(env.razorpay.webhookSecret) ||
        Boolean(!req.seller.usesPlatformCredentials && req.seller.razorpayWebhookSecretEnc),
      razorpayIndependentMerchant: independent,
      razorpayPlatformConfigured: isRazorpayConfigured(),
      otp: resolveOtpProvider() || (env.otpDemoMode ? 'demo' : 'unconfigured'),
    },
    live: getLiveReadiness(),
  });
});

/**
 * Connect this merchant's own Razorpay account.
 * Secrets are encrypted at rest and never returned in the response.
 */
export const connectRazorpay = asyncHandler(async (req, res) => {
  const keyId = String(req.body?.keyId || req.body?.razorpayKeyId || '').trim();
  const keySecret = String(req.body?.keySecret || req.body?.razorpayKeySecret || '').trim();
  const webhookSecret = String(
    req.body?.webhookSecret || req.body?.razorpayWebhookSecret || '',
  ).trim();

  if (!keyId || !keySecret) {
    throw new HttpError(400, 'Enter Razorpay Key ID and Key Secret.', 'RAZORPAY_KEYS_REQUIRED');
  }

  if (!env.demoMode && !webhookSecret) {
    throw new HttpError(
      400,
      'In live mode, enter your Razorpay webhook secret so PayBot can confirm payments to your account.',
      'RAZORPAY_WEBHOOK_SECRET_REQUIRED',
    );
  }

  await assertRazorpayCredentials(keyId, keySecret);

  if (req.seller.razorpayKeyId) {
    invalidateRazorpayClient(req.seller.razorpayKeyId);
  }

  req.seller.razorpayKeyId = keyId;
  req.seller.razorpayKeySecretEnc = encryptSecret(keySecret);
  req.seller.razorpayWebhookSecretEnc = webhookSecret ? encryptSecret(webhookSecret) : '';
  req.seller.paymentProvider = 'razorpay';
  req.seller.paymentProviderAccountId = keyId;
  req.seller.usesPlatformCredentials = false;
  await req.seller.save();

  res.json({
    success: true,
    message: 'Razorpay account connected. Settlements will use your merchant account.',
    seller: {
      ...req.seller.toPublic(),
      phoneDisplay: formatPhoneDisplay(req.seller.phoneNumber),
      razorpayKeyIdMasked: maskRazorpayKeyId(keyId),
    },
  });
});

/** Disconnect merchant keys and return to platform credentials. */
export const disconnectRazorpay = asyncHandler(async (req, res) => {
  if (req.seller.razorpayKeyId) {
    invalidateRazorpayClient(req.seller.razorpayKeyId);
  }

  req.seller.razorpayKeyId = '';
  req.seller.razorpayKeySecretEnc = '';
  req.seller.razorpayWebhookSecretEnc = '';
  req.seller.usesPlatformCredentials = true;
  req.seller.paymentProviderAccountId = env.razorpay.keyId || '';
  await req.seller.save();

  res.json({
    success: true,
    message: 'Disconnected. New payments will use platform Razorpay credentials.',
    seller: {
      ...req.seller.toPublic(),
      phoneDisplay: formatPhoneDisplay(req.seller.phoneNumber),
      razorpayKeyIdMasked: '',
    },
  });
});
