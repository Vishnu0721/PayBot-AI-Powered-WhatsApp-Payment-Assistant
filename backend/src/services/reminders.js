import { Customer } from '../models/Customer.js';
import { Payment } from '../models/Payment.js';
import { Seller } from '../models/Seller.js';
import { env } from '../config/env.js';
import { logError, logInfo } from '../utils/logger.js';
import { sendPaymentRequest } from './whatsapp.js';

let timer = null;
let running = false;

export function startReminderWorker() {
  if (!env.reminders.enabled) {
    logInfo('Payment reminders disabled (REMINDERS_ENABLED=false)');
    return;
  }

  const pollMs = env.reminders.pollMs;
  logInfo(`Payment reminders enabled — polling every ${Math.round(pollMs / 1000)}s`);
  timer = setInterval(() => {
    runPaymentReminders().catch((error) => {
      logError('Reminder worker failed', error);
    });
  }, pollMs);

  if (typeof timer.unref === 'function') timer.unref();
}

export function stopReminderWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}

export async function runPaymentReminders() {
  if (running) return { skipped: true };
  running = true;
  try {
    const afterMs = env.reminders.afterHours * 60 * 60 * 1000;
    const intervalMs = env.reminders.intervalHours * 60 * 60 * 1000;
    const maxCount = env.reminders.maxCount;
    const now = Date.now();
    const createdBefore = new Date(now - afterMs);

    const candidates = await Payment.find({
      status: 'PENDING',
      createdAt: { $lte: createdBefore },
      reminderCount: { $lt: maxCount },
    })
      .sort({ createdAt: 1 })
      .limit(25);

    let sent = 0;
    for (const payment of candidates) {
      const last = payment.lastRemindedAt ? payment.lastRemindedAt.getTime() : 0;
      if (last && now - last < intervalMs) continue;

      const result = await sendPaymentReminder(payment, { kind: 'auto' });
      if (result.sent) sent += 1;
    }
    return { checked: candidates.length, sent };
  } finally {
    running = false;
  }
}

export async function sendPaymentReminder(payment, { kind = 'manual' } = {}) {
  if (!payment || payment.status !== 'PENDING') {
    return { sent: false, reason: 'not_pending' };
  }

  const customer = payment.customerId
    ? await Customer.findById(payment.customerId)
    : null;
  if (!customer?.phoneNumber) {
    return { sent: false, reason: 'no_customer_phone' };
  }

  const seller = await Seller.findOne({ sellerId: payment.sellerId });
  if (!seller) return { sent: false, reason: 'no_seller' };

  const payTarget = payment.paymentUrl || `${env.frontendUrl}/pay/${payment._id}`;
  const merchantName = seller.businessName || 'a PayBot merchant';

  const delivery = await sendPaymentRequest({
    to: customer.phoneNumber,
    merchantName,
    amount: payment.amount,
    description: `${payment.description} (reminder)`,
    paymentUrl: payTarget,
  });

  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'PENDING' },
    {
      $set: { lastRemindedAt: new Date() },
      $inc: { reminderCount: 1 },
    },
    { new: true },
  );

  return {
    sent: Boolean(delivery.sent) || env.demoMode,
    delivery,
    payment: updated,
    kind,
  };
}
