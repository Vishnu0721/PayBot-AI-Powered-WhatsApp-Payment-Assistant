import crypto from 'crypto';
import { env } from '../config/env.js';
import { Seller } from '../models/Seller.js';
import { HttpError } from '../utils/http.js';
import { decryptSecret } from '../utils/secrets.js';

function hmacHex(secret, rawBody) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

function signaturesMatch(expectedHex, signature) {
  const a = Buffer.from(expectedHex);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Legacy helper — platform webhook secret only.
 * Prefer verifyRazorpayWebhookSignature for multi-merchant.
 */
export function verifyRazorpaySignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret) {
    throw new HttpError(503, 'Razorpay webhook secret is not configured.', 'WEBHOOK_NOT_CONFIGURED');
  }
  if (!signature) {
    throw new HttpError(400, 'Missing Razorpay signature.', 'MISSING_SIGNATURE');
  }
  const expected = hmacHex(env.razorpay.webhookSecret, rawBody);
  if (!signaturesMatch(expected, signature)) {
    throw new HttpError(400, 'Invalid Razorpay webhook signature.', 'INVALID_SIGNATURE');
  }
}

/**
 * Verify webhook HMAC using platform secret and, when identifiable, the
 * merchant's stored webhook secret. Payload is parsed only to select which
 * secret to try — state changes still require a matching signature.
 */
export async function verifyRazorpayWebhookSignature(rawBody, signature) {
  if (!signature) {
    throw new HttpError(400, 'Missing Razorpay signature.', 'MISSING_SIGNATURE');
  }

  const candidates = [];
  if (env.razorpay.webhookSecret) {
    candidates.push(env.razorpay.webhookSecret);
  }

  let payload = null;
  try {
    payload = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
  } catch {
    payload = null;
  }

  if (payload) {
    const notes =
      payload?.payload?.payment_link?.entity?.notes ||
      payload?.payload?.payment?.entity?.notes ||
      {};
    const sellerId = notes.seller_id;
    if (sellerId) {
      const seller = await Seller.findOne({ sellerId: String(sellerId) }).select(
        'razorpayWebhookSecretEnc usesPlatformCredentials',
      );
      if (seller && !seller.usesPlatformCredentials && seller.razorpayWebhookSecretEnc) {
        try {
          const merchantSecret = decryptSecret(seller.razorpayWebhookSecretEnc);
          if (merchantSecret) candidates.unshift(merchantSecret);
        } catch {
          // Ignore corrupt merchant secret; platform secret may still match.
        }
      }
    }
  }

  if (!candidates.length) {
    throw new HttpError(503, 'Razorpay webhook secret is not configured.', 'WEBHOOK_NOT_CONFIGURED');
  }

  for (const secret of candidates) {
    if (signaturesMatch(hmacHex(secret, rawBody), signature)) {
      return { ok: true, payload };
    }
  }

  throw new HttpError(400, 'Invalid Razorpay webhook signature.', 'INVALID_SIGNATURE');
}

/**
 * Prefer Razorpay's event id header; otherwise build a stable fallback key.
 */
export function resolveWebhookEventId(headers = {}, payload = {}) {
  const headerId = headers['x-razorpay-event-id'] || headers['X-Razorpay-Event-Id'];
  if (headerId) return String(headerId);

  const event = payload?.event || 'unknown';
  const created = payload?.created_at ?? '';
  const paymentLinkId =
    payload?.payload?.payment_link?.entity?.id ||
    payload?.payload?.payment?.entity?.payment_link_id ||
    '';
  const paymentId = payload?.payload?.payment?.entity?.id || '';
  return `${event}:${paymentLinkId}:${paymentId}:${created}`;
}
