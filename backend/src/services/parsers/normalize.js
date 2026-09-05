import { tryNormalizePhone } from '../../utils/phone.js';

export function normalizeParsedResult(raw, original, parserName) {
  const amountNum = Number(raw?.amount);
  const amount =
    Number.isFinite(amountNum) && amountNum >= 1 ? Math.round(amountNum) : null;

  let customerPhone = null;
  if (raw?.customerPhone) {
    customerPhone = tryNormalizePhone(String(raw.customerPhone)) || null;
  }

  const customerName = String(raw?.customerName || '')
    .replace(/[^\p{L}\p{N}\s.'-]/gu, '')
    .trim()
    .slice(0, 40);

  const description =
    String(raw?.description || 'Payment')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'Payment';

  const missing = [];
  if (!amount) missing.push('amount');
  if (!customerPhone && !customerName) missing.push('customer');

  return {
    ok: missing.length === 0 && Boolean(amount),
    amount,
    currency: 'INR',
    description,
    customerPhone,
    customerName,
    parser: parserName,
    original: String(original || ''),
    missing,
    error: missing.length ? `Could not find ${missing.join(' and ')} in the message.` : null,
  };
}
