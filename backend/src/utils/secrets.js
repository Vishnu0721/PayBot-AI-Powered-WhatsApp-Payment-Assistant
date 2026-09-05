import crypto from 'crypto';
import { env } from '../config/env.js';
import { HttpError } from './http.js';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function encryptionKey() {
  const material = env.credentialsEncryptionKey || env.jwtSecret;
  if (!material || String(material).length < 16) {
    throw new HttpError(
      503,
      'Credential encryption is not configured. Set CREDENTIALS_ENCRYPTION_KEY or JWT_SECRET.',
      'ENCRYPTION_NOT_CONFIGURED',
    );
  }
  return crypto.createHash('sha256').update(String(material)).digest();
}

/** Returns opaque token: iv:tag:ciphertext (base64url parts). */
export function encryptSecret(plainText) {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((buf) => buf.toString('base64url')).join(':');
}

export function decryptSecret(token) {
  if (!token) return '';
  const parts = String(token).split(':');
  if (parts.length !== 3) {
    throw new HttpError(500, 'Stored credential is corrupt.', 'CREDENTIAL_CORRUPT');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const decipher = crypto.createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function maskRazorpayKeyId(keyId) {
  const value = String(keyId || '');
  if (value.length <= 8) return value ? '••••' : '';
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}
