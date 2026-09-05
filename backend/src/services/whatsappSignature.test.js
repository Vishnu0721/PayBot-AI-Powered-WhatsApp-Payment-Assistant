import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { env } from '../config/env.js';
import { verifyWhatsAppSignature } from '../services/whatsappSignature.js';
import { HttpError } from '../utils/http.js';

test('verifyWhatsAppSignature accepts valid sha256 HMAC', () => {
  const previousSecret = env.whatsapp.appSecret;
  const previousDemo = env.demoMode;
  env.whatsapp.appSecret = 'wa_app_secret_test';
  env.demoMode = false;
  try {
    const raw = Buffer.from('{"object":"whatsapp_business_account"}');
    const digest = crypto
      .createHmac('sha256', env.whatsapp.appSecret)
      .update(raw)
      .digest('hex');
    assert.doesNotThrow(() => verifyWhatsAppSignature(raw, `sha256=${digest}`));
  } finally {
    env.whatsapp.appSecret = previousSecret;
    env.demoMode = previousDemo;
  }
});

test('verifyWhatsAppSignature rejects invalid HMAC', () => {
  const previousSecret = env.whatsapp.appSecret;
  const previousDemo = env.demoMode;
  env.whatsapp.appSecret = 'wa_app_secret_test';
  env.demoMode = false;
  try {
    const raw = Buffer.from('{"object":"whatsapp_business_account"}');
    assert.throws(
      () => verifyWhatsAppSignature(raw, 'sha256=deadbeef'),
      (error) => error instanceof HttpError && error.code === 'INVALID_WHATSAPP_SIGNATURE',
    );
  } finally {
    env.whatsapp.appSecret = previousSecret;
    env.demoMode = previousDemo;
  }
});

test('verifyWhatsAppSignature allows missing secret only in demo mode', () => {
  const previousSecret = env.whatsapp.appSecret;
  const previousDemo = env.demoMode;
  env.whatsapp.appSecret = '';
  try {
    env.demoMode = true;
    assert.doesNotThrow(() => verifyWhatsAppSignature(Buffer.from('{}'), undefined));

    env.demoMode = false;
    assert.throws(
      () => verifyWhatsAppSignature(Buffer.from('{}'), undefined),
      (error) => error instanceof HttpError && error.code === 'WHATSAPP_SECRET_NOT_CONFIGURED',
    );
  } finally {
    env.whatsapp.appSecret = previousSecret;
    env.demoMode = previousDemo;
  }
});
