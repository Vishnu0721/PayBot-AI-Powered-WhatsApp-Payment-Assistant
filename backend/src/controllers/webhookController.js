import { Payment } from '../models/Payment.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { env } from '../config/env.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import {
  resolveWebhookEventId,
  verifyRazorpayWebhookSignature,
} from '../services/razorpayWebhook.js';
import { applyPaymentStatus, markPaymentPaid } from '../services/payments.js';
import { logInfo } from '../utils/logger.js';

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

export const razorpayWebhook = asyncHandler(async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const { payload: verifiedPayload } = await verifyRazorpayWebhookSignature(
    raw,
    req.headers['x-razorpay-signature'],
  );

  const payload =
    verifiedPayload ||
    JSON.parse(raw.toString('utf8'));
  const event = payload?.event || '';
  const eventId = resolveWebhookEventId(req.headers, payload);

  try {
    await WebhookEvent.create({ eventId, event });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      logInfo('Duplicate Razorpay webhook ignored', { eventId, event });
      return res.json({ success: true, duplicate: true });
    }
    throw error;
  }

  const entity = payload?.payload?.payment_link?.entity || payload?.payload?.payment?.entity || {};

  const paymentLinkId = entity.id?.startsWith('plink_')
    ? entity.id
    : entity.payment_link_id || payload?.payload?.payment_link?.entity?.id || '';
  const notes = entity.notes || payload?.payload?.payment_link?.entity?.notes || {};
  const paymentIdFromNotes = notes.paybot_payment_id;
  const razorpayPaymentId =
    payload?.payload?.payment?.entity?.id || entity.payments?.[0]?.payment_id || '';

  let payment = null;
  if (paymentIdFromNotes) {
    payment = await Payment.findById(paymentIdFromNotes);
  }
  if (!payment && paymentLinkId) {
    payment = await Payment.findOne({ razorpayPaymentLinkId: paymentLinkId });
  }

  if (!payment) {
    logInfo('Webhook for unknown payment ignored', { eventId, event });
    return res.json({ success: true, ignored: true });
  }

  // Soft ownership check: notes.seller_id must match payment when both present.
  if (notes.seller_id && payment.sellerId && String(notes.seller_id) !== String(payment.sellerId)) {
    logInfo('Webhook seller_id mismatch ignored', { eventId, event });
    return res.json({ success: true, ignored: true });
  }

  await WebhookEvent.updateOne({ eventId }, { $set: { paymentId: payment._id } });

  if (event === 'payment_link.paid' || event === 'payment.captured' || entity.status === 'paid') {
    await markPaymentPaid(payment, { razorpayPaymentId });
  } else if (event === 'payment_link.expired' || entity.status === 'expired') {
    await applyPaymentStatus(payment, 'EXPIRED');
  } else if (event === 'payment_link.cancelled' || entity.status === 'cancelled') {
    await applyPaymentStatus(payment, 'CANCELLED');
  } else if (event === 'payment.failed') {
    await applyPaymentStatus(payment, 'FAILED');
  }

  res.json({ success: true });
});

export const demoWebhookDisabled = asyncHandler(async (req, res) => {
  if (!env.demoMode) {
    throw new HttpError(403, 'Demo webhook is disabled in live mode.', 'LIVE_MODE');
  }
  res.status(404).json({ success: false, error: 'Use the public demo pay endpoint.' });
});
