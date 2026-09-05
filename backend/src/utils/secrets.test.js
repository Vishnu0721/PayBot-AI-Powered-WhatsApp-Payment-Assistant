import assert from 'node:assert/strict';
import test from 'node:test';
import { env } from '../config/env.js';
import { decryptSecret, encryptSecret, maskRazorpayKeyId } from '../utils/secrets.js';

test('encryptSecret round-trips', () => {
  const previousJwt = env.jwtSecret;
  const previousEnc = env.credentialsEncryptionKey;
  env.jwtSecret = 'test-secret-at-least-16-chars';
  env.credentialsEncryptionKey = '';
  try {
    const plain = 'rzp_test_secret_value';
    const token = encryptSecret(plain);
    assert.notEqual(token, plain);
    assert.equal(decryptSecret(token), plain);
  } finally {
    env.jwtSecret = previousJwt;
    env.credentialsEncryptionKey = previousEnc;
  }
});

test('maskRazorpayKeyId hides middle', () => {
  assert.equal(maskRazorpayKeyId('rzp_test_ABCDEFGH'), 'rzp_test…EFGH');
  assert.equal(maskRazorpayKeyId(''), '');
});
