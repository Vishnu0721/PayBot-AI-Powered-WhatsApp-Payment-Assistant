import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import mongoose from 'mongoose';
import { Payment } from '../models/Payment.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { markPaymentPaid } from '../services/payments.js';

const URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/paybot_test_phase1';
let connected = false;

before(async () => {
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 3000 });
    connected = true;
    await Promise.all([Payment.deleteMany({}), WebhookEvent.deleteMany({})]);
  } catch {
    connected = false;
  }
});

after(async () => {
  if (!connected) return;
  await Promise.all([Payment.deleteMany({}), WebhookEvent.deleteMany({})]);
  await mongoose.disconnect();
});

test('markPaymentPaid is atomic — second call does not change again', async (t) => {
  if (!connected) {
    t.skip('Local MongoDB not available for integration test');
    return;
  }

  const payment = await Payment.create({
    sellerId: 'sel_test_atomic',
    amount: 500,
    currency: 'INR',
    description: 'Test',
    status: 'PENDING',
    source: 'dashboard',
  });

  const first = await markPaymentPaid(payment, { razorpayPaymentId: 'pay_1' });
  const second = await markPaymentPaid(payment, { razorpayPaymentId: 'pay_2' });

  assert.equal(first.changed, true);
  assert.equal(first.payment.status, 'PAID');
  assert.equal(first.payment.razorpayPaymentId, 'pay_1');
  assert.equal(second.changed, false);
  assert.equal(second.payment.razorpayPaymentId, 'pay_1');
});

test('WebhookEvent rejects duplicate eventId', async (t) => {
  if (!connected) {
    t.skip('Local MongoDB not available for integration test');
    return;
  }

  await WebhookEvent.create({ eventId: 'evt_dup_1', event: 'payment_link.paid' });
  await assert.rejects(
    () => WebhookEvent.create({ eventId: 'evt_dup_1', event: 'payment_link.paid' }),
    (error) => error?.code === 11000,
  );
});
