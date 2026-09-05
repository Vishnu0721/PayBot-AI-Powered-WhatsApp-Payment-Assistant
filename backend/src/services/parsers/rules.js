import { tryNormalizePhone } from '../../utils/phone.js';

const AMOUNT_PATTERNS = [
  /₹\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|rupees?|inr|rupee)\b/i,
  /\bcollect\s+([\d,]+(?:\.\d{1,2})?)/i,
];

export function parseWithRules(text) {
  const original = String(text || '').trim();
  if (!original) {
    return emptyResult(original, 'Message is empty.');
  }

  const amount = extractAmount(original);
  const customer = extractCustomer(original);
  const description = extractDescription(original, customer.raw);

  const missing = [];
  if (!amount) missing.push('amount');
  if (!customer.phone && !customer.name) missing.push('customer');

  return {
    ok: missing.length === 0 && Boolean(amount),
    amount,
    currency: 'INR',
    description: description || 'Payment',
    customerPhone: customer.phone,
    customerName: customer.name,
    parser: 'rules',
    original,
    missing,
    error: missing.length ? `Could not find ${missing.join(' and ')} in the message.` : null,
  };
}

function emptyResult(original, error) {
  return {
    ok: false,
    amount: null,
    currency: 'INR',
    description: '',
    customerPhone: null,
    customerName: '',
    parser: 'rules',
    original,
    missing: ['amount', 'customer'],
    error,
  };
}

function extractAmount(text) {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = Number(String(match[1]).replace(/,/g, ''));
      if (Number.isFinite(value) && value > 0) return Math.round(value);
    }
  }
  return null;
}

function extractCustomer(text) {
  const fromPhone = text.match(/\bfrom\s+(\+?91[\s-]?\d{10}|\d{10})\b/i);
  if (fromPhone) {
    const phone = tryNormalizePhone(fromPhone[1]) || extractPhone(fromPhone[1]);
    if (phone) return { phone, name: '', raw: fromPhone[1] };
  }

  const fromName = text.match(/\bfrom\s+([A-Za-z][A-Za-z]{1,32})\b/i);
  if (fromName) {
    return { phone: null, name: fromName[1], raw: fromName[1] };
  }

  const phone = extractPhone(text);
  if (phone) return { phone, name: '', raw: phone };
  return { phone: null, name: '', raw: '' };
}

function extractPhone(text) {
  const candidates = String(text).match(/(\+?91[\s-]?)?[6-9]\d{9}/g) || [];
  for (const candidate of candidates) {
    const normalized = tryNormalizePhone(candidate);
    if (normalized) return normalized;
  }
  return null;
}

function extractDescription(text, customerRaw) {
  const forFrom = text.match(/\bfor\s+(.+?)\s+from\b/i);
  if (forFrom?.[1]) return cleanDescription(forFrom[1]);

  const fromFor = text.match(/\bfrom\s+[A-Za-z0-9+][A-Za-z0-9+\s-]{1,40}?\s+for\s+(.+)$/i);
  if (fromFor?.[1]) return cleanDescription(fromFor[1]);

  let working = text;
  if (customerRaw) {
    working = working.replace(new RegExp(`\\bfrom\\s+${escapeRegExp(customerRaw)}\\b`, 'i'), '');
  }
  working = working.replace(/₹\s*[\d,]+(?:\.\d{1,2})?/gi, '');
  working = working.replace(/(?:rs\.?|inr)\s*[\d,]+(?:\.\d{1,2})?/gi, '');
  working = working.replace(/[\d,]+(?:\.\d{1,2})?\s*(?:rs\.?|rupees?|inr|rupee)\b/gi, '');
  working = working.replace(/\bcollect\s+[\d,]+(?:\.\d{1,2})?/gi, '');
  working = working.replace(/^\s*(?:for|please|pls)\s+/i, '');
  working = working.replace(/\bfor\s+/i, '');
  return cleanDescription(working);
}

function cleanDescription(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\-–]+|[,.\-–]+$/g, '')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
