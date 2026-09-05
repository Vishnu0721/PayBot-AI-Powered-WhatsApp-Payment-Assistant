import test from 'node:test';
import assert from 'node:assert/strict';
import { env, getLiveReadiness, resolveOtpProvider } from './env.js';

test('getLiveReadiness reports demo mode when DEMO_MODE is on', () => {
  const previous = env.demoMode;
  env.demoMode = true;
  const live = getLiveReadiness();
  env.demoMode = previous;
  assert.equal(live.mode, 'demo');
  assert.equal(live.ready, false);
  assert.ok(live.missing.includes('DEMO_MODE=false'));
});

test('getLiveReadiness ready only when all required live checks pass', () => {
  const snap = {
    demoMode: env.demoMode,
    otpDemoMode: env.otpDemoMode,
    mongodbUri: env.mongodbUri,
    jwtSecret: env.jwtSecret,
    otpPepper: env.otpPepper,
    razorpay: { ...env.razorpay },
    whatsapp: { ...env.whatsapp },
    msg91: { ...env.msg91 },
    otpProvider: env.otpProvider,
  };

  env.demoMode = false;
  env.otpDemoMode = false;
  env.mongodbUri = 'mongodb://127.0.0.1:27017/paybot';
  env.jwtSecret = 'x'.repeat(16);
  env.otpPepper = 'y'.repeat(16);
  env.razorpay.keyId = 'rzp_test_abc';
  env.razorpay.keySecret = 'secretsecret';
  env.razorpay.webhookSecret = 'whsec';
  env.whatsapp.accessToken = 'token';
  env.whatsapp.phoneNumberId = '123';
  env.whatsapp.verifyToken = 'verify';
  env.whatsapp.appSecret = 'appsecret';
  env.msg91.authKey = 'msgkey';
  env.msg91.templateId = 'tmpl';
  env.otpProvider = 'msg91';

  const live = getLiveReadiness();
  assert.equal(live.mode, 'live');
  assert.equal(live.ready, true);
  assert.equal(live.missing.length, 0);
  assert.equal(resolveOtpProvider(), 'msg91');

  Object.assign(env, {
    demoMode: snap.demoMode,
    otpDemoMode: snap.otpDemoMode,
    mongodbUri: snap.mongodbUri,
    jwtSecret: snap.jwtSecret,
    otpPepper: snap.otpPepper,
    otpProvider: snap.otpProvider,
  });
  env.razorpay = snap.razorpay;
  env.whatsapp = snap.whatsapp;
  env.msg91 = snap.msg91;
});
