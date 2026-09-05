import crypto from 'crypto';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

/**
 * Meta WhatsApp Cloud webhooks sign the raw body as:
 * X-Hub-Signature-256: sha256=<hex>
 */
export function verifyWhatsAppSignature(rawBody, signatureHeader) {
  if (!env.whatsapp.appSecret) {
    if (env.demoMode) return;
    throw new HttpError(
      503,
      'WhatsApp app secret is not configured. Set WHATSAPP_APP_SECRET.',
      'WHATSAPP_SECRET_NOT_CONFIGURED',
    );
  }

  if (!signatureHeader) {
    throw new HttpError(400, 'Missing WhatsApp signature.', 'MISSING_WHATSAPP_SIGNATURE');
  }

  const provided = String(signatureHeader);
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', env.whatsapp.appSecret).update(rawBody).digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new HttpError(400, 'Invalid WhatsApp webhook signature.', 'INVALID_WHATSAPP_SIGNATURE');
  }
}
