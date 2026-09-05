import crypto from 'crypto';

/** Human-readable invoice id, unique enough for MVP without a counter collection. */
export function makeInvoiceNumber(prefix = 'PB') {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export function advanceRecurringDate(from, cadence) {
  const next = new Date(from);
  if (cadence === 'weekly') {
    next.setDate(next.getDate() + 7);
    return next;
  }
  // monthly — keep day-of-month when possible
  const day = next.getDate();
  next.setMonth(next.getMonth() + 1);
  if (next.getDate() < day) {
    next.setDate(0); // last day of previous month overflow
  }
  return next;
}
