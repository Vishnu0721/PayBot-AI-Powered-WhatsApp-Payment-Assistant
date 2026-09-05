import Razorpay from 'razorpay';
import { env, isRazorpayConfigured } from '../config/env.js';
import { HttpError } from '../utils/http.js';
import { logError } from '../utils/logger.js';
import { decryptSecret } from '../utils/secrets.js';

const clientCache = new Map();

function buildClient(keyId, keySecret) {
  if (!keyId || !keySecret) return null;
  const cacheKey = keyId;
  let client = clientCache.get(cacheKey);
  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    clientCache.set(cacheKey, client);
  }
  return client;
}

function getPlatformClient() {
  if (!isRazorpayConfigured()) return null;
  return buildClient(env.razorpay.keyId, env.razorpay.keySecret);
}

/**
 * Resolve which Razorpay account creates/cancels links for this seller.
 * Independent merchants use their own encrypted keys; everyone else uses platform.
 */
export function getClientForSeller(seller) {
  if (
    seller &&
    !seller.usesPlatformCredentials &&
    seller.razorpayKeyId &&
    seller.razorpayKeySecretEnc
  ) {
    try {
      const secret = decryptSecret(seller.razorpayKeySecretEnc);
      const client = buildClient(seller.razorpayKeyId, secret);
      if (client) {
        return {
          client,
          keyId: seller.razorpayKeyId,
          source: 'merchant',
        };
      }
    } catch (error) {
      logError('Failed to decrypt merchant Razorpay credentials', {
        sellerId: seller.sellerId,
        message: error?.message,
      });
      throw new HttpError(
        503,
        'Merchant Razorpay credentials could not be loaded. Reconnect Razorpay in Setup.',
        'MERCHANT_RAZORPAY_CORRUPT',
      );
    }
  }

  const platform = getPlatformClient();
  if (!platform) {
    return { client: null, keyId: '', source: 'none' };
  }
  return { client: platform, keyId: env.razorpay.keyId, source: 'platform' };
}

export function razorpayStatus() {
  return {
    configured: isRazorpayConfigured(),
    mode: env.demoMode ? 'demo' : 'live',
    keyIdPresent: Boolean(env.razorpay.keyId),
    webhookConfigured: Boolean(env.razorpay.webhookSecret),
  };
}

export async function assertRazorpayCredentials(keyId, keySecret) {
  const id = String(keyId || '').trim();
  const secret = String(keySecret || '').trim();
  if (!id.startsWith('rzp_')) {
    throw new HttpError(400, 'Enter a valid Razorpay Key ID.', 'INVALID_RAZORPAY_KEY_ID');
  }
  if (secret.length < 10) {
    throw new HttpError(400, 'Enter a valid Razorpay Key Secret.', 'INVALID_RAZORPAY_KEY_SECRET');
  }

  const client = new Razorpay({ key_id: id, key_secret: secret });
  try {
    // Short timeout so a bad network doesn't hang the Setup page.
    const probe = Promise.resolve(client.payments.all({ count: 1 }));
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Razorpay credential check timed out')), 12000);
    });
    await Promise.race([probe, timeout]);
  } catch (error) {
    logError('Razorpay credential check failed', { message: error?.message });
    throw new HttpError(
      400,
      'Razorpay rejected these keys (or the check timed out). Use test Key ID + Key Secret from the Razorpay dashboard.',
      'RAZORPAY_KEYS_INVALID',
    );
  }
  return { keyId: id };
}

export async function createPaymentLink({
  amount,
  currency = 'INR',
  description,
  customerPhone,
  customerName,
  paymentId,
  sellerId,
  seller,
  callbackUrl,
}) {
  const { client: razorpay, keyId, source } = getClientForSeller(seller);

  if (!razorpay) {
    if (env.demoMode) {
      return {
        id: `plink_demo_${paymentId}`,
        short_url: callbackUrl,
        simulated: true,
        keyId: '',
        source: 'demo',
      };
    }
    throw new HttpError(
      503,
      source === 'none'
        ? 'Razorpay is not configured. Add platform keys or connect your Razorpay account in Setup.'
        : 'Razorpay is not configured. Add keys to accept live payments.',
      'RAZORPAY_NOT_CONFIGURED',
    );
  }

  try {
    const link = await razorpay.paymentLink.create({
      amount: Math.round(Number(amount) * 100),
      currency,
      accept_partial: false,
      description: description || 'PayBot payment',
      customer: {
        name: customerName || 'Customer',
        contact: customerPhone ? customerPhone.replace('+', '') : undefined,
      },
      notify: { sms: false, email: false },
      reminder_enable: false,
      callback_url: callbackUrl,
      callback_method: 'get',
      notes: {
        paybot_payment_id: String(paymentId),
        seller_id: sellerId,
        razorpay_key_id: keyId || '',
      },
    });

    return {
      id: link.id,
      short_url: link.short_url,
      simulated: false,
      keyId,
      source,
    };
  } catch (error) {
    logError('Razorpay payment link failed', { message: error?.message, source });
    if (env.demoMode && source === 'platform') {
      return {
        id: `plink_demo_${paymentId}`,
        short_url: callbackUrl,
        simulated: true,
        keyId: '',
        source: 'demo',
      };
    }
    throw new HttpError(502, 'Unable to create a Razorpay payment link.', 'RAZORPAY_LINK_FAILED');
  }
}

export async function cancelPaymentLink(linkId, seller) {
  if (!linkId || String(linkId).startsWith('plink_demo_')) {
    return { cancelled: false, skipped: true };
  }

  const { client: razorpay } = getClientForSeller(seller);
  if (!razorpay) {
    return { cancelled: false, skipped: true };
  }

  try {
    await razorpay.paymentLink.cancel(String(linkId));
    return { cancelled: true };
  } catch (error) {
    logError('Razorpay payment link cancel failed', { message: error?.message, linkId });
    return { cancelled: false, error: error?.message || 'cancel_failed' };
  }
}

/** Drop cached client after credential rotation. */
export function invalidateRazorpayClient(keyId) {
  if (keyId) clientCache.delete(keyId);
}
