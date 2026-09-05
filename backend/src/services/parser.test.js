import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePaymentRequest } from '../services/parser.js';
import { normalizeParsedResult } from '../services/parsers/normalize.js';

test('parses rupee symbol amount with for/from phone', async () => {
  const result = await parsePaymentRequest('₹500 for groceries from 9876543210');
  assert.equal(result.ok, true);
  assert.equal(result.amount, 500);
  assert.equal(result.currency, 'INR');
  assert.match(result.description.toLowerCase(), /groceries/);
  assert.equal(result.customerPhone, '+919876543210');
  assert.equal(result.parser, 'rules');
});

test('parses collect ... from ... for ...', async () => {
  const result = await parsePaymentRequest('Collect 750 from 9876543210 for vegetables');
  assert.equal(result.ok, true);
  assert.equal(result.amount, 750);
  assert.match(result.description.toLowerCase(), /vegetables/);
  assert.equal(result.customerPhone, '+919876543210');
});

test('parses name-only customer', async () => {
  const result = await parsePaymentRequest('₹200 for 2kg rice from Rahul');
  assert.equal(result.ok, true);
  assert.equal(result.amount, 200);
  assert.equal(result.customerName, 'Rahul');
  assert.equal(result.customerPhone, null);
});

test('rejects empty message', async () => {
  const result = await parsePaymentRequest('   ');
  assert.equal(result.ok, false);
  assert.ok(result.missing.includes('amount'));
});

test('normalizeParsedResult rejects unsafe LLM-shaped amounts', () => {
  const result = normalizeParsedResult(
    { amount: -5, description: 'x', customerPhone: '9876543210', customerName: '' },
    'test',
    'llm',
  );
  assert.equal(result.ok, false);
  assert.equal(result.amount, null);
});

test('normalizeParsedResult normalizes phone', () => {
  const result = normalizeParsedResult(
    { amount: 100, description: 'rice', customerPhone: '9876543210', customerName: '' },
    'test',
    'llm',
  );
  assert.equal(result.ok, true);
  assert.equal(result.customerPhone, '+919876543210');
});
