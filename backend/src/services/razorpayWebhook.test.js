import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { env } from '../config/env.js';
import {
  resolveWebhookEventId,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} from '../services/razorpayWebhook.js';
import { HttpError } from '../utils/http.js';

test('verifyRazorpaySignature accepts valid HMAC', () => {
  const previous = env.razorpay.webhookSecret;
  env.razorpay.webhookSecret = 'test_webhook_secret';
  try {
    const raw = Buffer.from('{"event":"payment_link.paid"}');
    const signature = crypto
      .createHmac('sha256', env.razorpay.webhookSecret)
      .update(raw)
      .digest('hex');
    assert.doesNotThrow(() => verifyRazorpaySignature(raw, signature));
  } finally {
    env.razorpay.webhookSecret = previous;
  }
});

test('verifyRazorpaySignature rejects invalid HMAC', () => {
  const previous = env.razorpay.webhookSecret;
  env.razorpay.webhookSecret = 'test_webhook_secret';
  try {
    const raw = Buffer.from('{"event":"payment_link.paid"}');
    assert.throws(
      () => verifyRazorpaySignature(raw, 'deadbeef'),
      (error) => error instanceof HttpError && error.code === 'INVALID_SIGNATURE',
    );
  } finally {
    env.razorpay.webhookSecret = previous;
  }
});

test('verifyRazorpayWebhookSignature accepts platform secret', async () => {
  const previous = env.razorpay.webhookSecret;
  env.razorpay.webhookSecret = 'platform_whsec';
  try {
    const raw = Buffer.from(JSON.stringify({ event: 'payment_link.paid', payload: {} }));
    const signature = crypto.createHmac('sha256', 'platform_whsec').update(raw).digest('hex');
    const result = await verifyRazorpayWebhookSignature(raw, signature);
    assert.equal(result.ok, true);
  } finally {
    env.razorpay.webhookSecret = previous;
  }
});

test('resolveWebhookEventId prefers header id', () => {
  const id = resolveWebhookEventId(
    { 'x-razorpay-event-id': 'evt_header_1' },
    { event: 'payment_link.paid', created_at: 1 },
  );
  assert.equal(id, 'evt_header_1');
});

test('resolveWebhookEventId builds stable fallback', () => {
  const payload = {
    event: 'payment_link.paid',
    created_at: 1710000000,
    payload: {
      payment_link: { entity: { id: 'plink_abc' } },
      payment: { entity: { id: 'pay_xyz' } },
    },
  };
  const id = resolveWebhookEventId({}, payload);
  assert.equal(id, 'payment_link.paid:plink_abc:pay_xyz:1710000000');
});
