import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceRecurringDate, makeInvoiceNumber } from './billing.js';

test('makeInvoiceNumber has PB-YYYYMMDD- prefix', () => {
  const value = makeInvoiceNumber();
  assert.match(value, /^PB-\d{8}-[A-F0-9]{6}$/);
});

test('advanceRecurringDate weekly adds 7 days', () => {
  const from = new Date('2026-03-01T10:00:00.000Z');
  const next = advanceRecurringDate(from, 'weekly');
  assert.equal(next.toISOString().slice(0, 10), '2026-03-08');
});

test('advanceRecurringDate monthly moves month', () => {
  const from = new Date('2026-01-15T10:00:00.000Z');
  const next = advanceRecurringDate(from, 'monthly');
  assert.equal(next.getUTCMonth(), 1);
  assert.equal(next.getUTCDate(), 15);
});
