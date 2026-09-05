import rateLimit from 'express-rate-limit';
import { tryNormalizePhone } from '../utils/phone.js';

export const otpIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many OTP requests. Please try again later.',
    code: 'RATE_LIMITED',
  },
});

const phoneHits = new Map();

export function otpPhoneLimiter(req, res, next) {
  const phone = tryNormalizePhone(req.body?.phone || req.body?.phoneNumber);
  if (!phone) return next();

  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const rec = phoneHits.get(phone) || [];
  const recent = rec.filter((ts) => now - ts < windowMs);
  if (recent.length >= 5) {
    return res.status(429).json({
      success: false,
      error: 'Too many OTP requests. Please try again later.',
      code: 'RATE_LIMITED',
    });
  }
  recent.push(now);
  phoneHits.set(phone, recent);
  next();
}
