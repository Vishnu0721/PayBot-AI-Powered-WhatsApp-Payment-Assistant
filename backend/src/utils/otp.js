import crypto from 'crypto';
import { env } from '../config/env.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function getOtpTtlMs() {
  return OTP_TTL_MS;
}

export function getMaxAttempts() {
  return MAX_ATTEMPTS;
}

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(otp, phoneNumber) {
  return crypto
    .createHmac('sha256', env.otpPepper)
    .update(`${phoneNumber}:${otp}`)
    .digest('hex');
}

export function otpMatches(otp, phoneNumber, storedHash) {
  if (!storedHash) return false;
  const incoming = hashOtp(otp, phoneNumber);
  const a = Buffer.from(incoming, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function otpExpiresAt(from = new Date()) {
  return new Date(from.getTime() + OTP_TTL_MS);
}
