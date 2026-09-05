import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

export function signSellerToken(sellerId, { role = 'owner', staffId = null } = {}) {
  const payload = { sellerId, role: role || 'owner' };
  if (staffId) payload.staffId = String(staffId);
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
}

export function verifySellerToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.', 'INVALID_TOKEN');
  }
}

export function readBearerToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.query?.token) return String(req.query.token);
  return null;
}
