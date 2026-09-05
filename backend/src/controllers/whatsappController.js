import { Seller } from '../models/Seller.js';
import { env, isWhatsAppConfigured } from '../config/env.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { parsePaymentRequest } from '../services/parser.js';
import { createCollection } from '../services/payments.js';
import {
  clearPendingDraft,
  getPendingDraft,
  setPendingDraft,
} from '../services/pendingPaymentDrafts.js';
import { verifyWhatsAppSignature } from '../services/whatsappSignature.js';
import { getConversation, pushMessage, sendWhatsAppText } from '../services/whatsapp.js';
import { normalizePhone, tryNormalizePhone } from '../utils/phone.js';
import { logError } from '../utils/logger.js';

export const verifyWhatsAppWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === env.whatsapp.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

export const receiveWhatsAppWebhook = asyncHandler(async (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  verifyWhatsAppSignature(raw, req.headers['x-hub-signature-256']);

  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'Invalid WhatsApp webhook payload.', 'INVALID_WHATSAPP_PAYLOAD');
  }

  res.json({ success: true });

  try {
    const messages = payload?.entry?.[0]?.changes?.[0]?.value?.messages || [];
    for (const message of messages) {
      if (message.type !== 'text' || !message.text?.body) continue;
      const from = tryNormalizePhone(message.from);
      if (!from) continue;
      await handleIncomingMessage(from, message.text.body, 'whatsapp');
    }
  } catch (error) {
    logError('WhatsApp webhook processing failed', error);
  }
});

export const listWhatsAppMessages = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    demoMode: env.demoMode,
    live: isWhatsAppConfigured() && !env.demoMode,
    messages: getConversation(req.sellerId),
  });
});

export const simulateWhatsApp = asyncHandler(async (req, res) => {
  if (!env.demoMode) {
    throw new HttpError(
      403,
      'WhatsApp simulator is disabled in live mode. Message your connected WhatsApp Business number.',
      'SIMULATOR_DISABLED',
    );
  }

  const text = String(req.body?.message || '').trim();
  if (!text) throw new HttpError(400, 'Enter a message.', 'EMPTY_MESSAGE');

  const merchantMessage = pushMessage(req.sellerId, {
    role: 'merchant',
    kind: 'text',
    text,
  });

  const result = await handleIncomingMessage(req.seller.phoneNumber, text, 'simulator', req.seller);

  res.json({
    success: true,
    merchantMessage,
    ...result,
    messages: getConversation(req.sellerId),
  });
});

export const parsePreview = asyncHandler(async (req, res) => {
  res.json({ success: true, parsed: await parsePaymentRequest(req.body?.message || '') });
});

function extractPhoneOnly(text) {
  const trimmed = String(text || '').trim();
  const direct = tryNormalizePhone(trimmed);
  if (direct) return direct;
  const match = trimmed.match(/(\+?91[\s-]?)?[6-9]\d{9}/);
  return match ? tryNormalizePhone(match[0]) : null;
}

async function handleIncomingMessage(fromPhone, text, source, knownSeller) {
  const seller =
    knownSeller || (await Seller.findOne({ phoneNumber: normalizePhone(fromPhone) }));

  if (!seller) {
    await sendWhatsAppText(
      fromPhone,
      `Welcome to PayBot. Sign in at ${env.frontendUrl}/login to connect this number, then send a collection like: ₹500 for groceries from 9876543210`,
    );
    return { ok: false, error: 'Seller not registered for this number.' };
  }

  // Keep dashboard conversation in sync for live Cloud API traffic (not only simulator).
  if (source !== 'simulator') {
    pushMessage(seller.sellerId, { role: 'merchant', kind: 'text', text, source });
  }

  if (!seller.businessName) {
    const reply =
      'Finish setting up your business in PayBot before collecting payments.';
    pushMessage(seller.sellerId, { role: 'paybot', kind: 'text', text: reply });
    await sendWhatsAppText(seller.phoneNumber, reply);
    return { ok: false, error: reply };
  }

  const pending = getPendingDraft(seller.sellerId);
  if (pending) {
    const phoneOnly = extractPhoneOnly(text);
    if (phoneOnly) {
      clearPendingDraft(seller.sellerId);
      return finalizeCollection(seller, {
        amount: pending.amount,
        description: pending.description,
        customerPhone: phoneOnly,
        customerName: pending.customerName,
        source,
        parsed: pending.parsed,
      });
    }

    // If they sent a new full payment request, replace the draft below.
    const maybeNew = await parsePaymentRequest(text);
    if (!maybeNew.ok) {
      const reply = `Reply with ${pending.customerName || 'the customer'}'s 10-digit WhatsApp number to send the ₹${pending.amount} request.`;
      pushMessage(seller.sellerId, { role: 'paybot', kind: 'text', text: reply });
      await sendWhatsAppText(seller.phoneNumber, reply);
      return { ok: false, needsPhone: true, pending };
    }
  }

  const parsed = await parsePaymentRequest(text);
  if (!parsed.ok) {
    const reply = `I couldn't read that payment request. Try: ₹500 for groceries from 9876543210\n${parsed.error || ''}`;
    pushMessage(seller.sellerId, { role: 'paybot', kind: 'error', text: reply, parsed });
    await sendWhatsAppText(seller.phoneNumber, reply);
    return { ok: false, parsed };
  }

  if (!parsed.customerPhone && parsed.customerName) {
    setPendingDraft(seller.sellerId, {
      amount: parsed.amount,
      description: parsed.description,
      customerName: parsed.customerName,
      parsed,
    });
    const reply = `Got it — ₹${parsed.amount} for ${parsed.description} from ${parsed.customerName}.\nReply with their 10-digit WhatsApp number to send the payment request.`;
    pushMessage(seller.sellerId, {
      role: 'paybot',
      kind: 'needs_phone',
      text: reply,
      parsed,
    });
    await sendWhatsAppText(seller.phoneNumber, reply);
    return { ok: false, needsPhone: true, parsed };
  }

  clearPendingDraft(seller.sellerId);
  return finalizeCollection(seller, {
    amount: parsed.amount,
    description: parsed.description,
    customerPhone: parsed.customerPhone,
    customerName: parsed.customerName,
    source,
    parsed,
  });
}

async function finalizeCollection(seller, { amount, description, customerPhone, customerName, source, parsed }) {
  const { payment, customer } = await createCollection({
    seller,
    amount,
    description,
    customerPhone,
    customerName,
    source,
  });

  const customerLine = customer.phoneNumber || customer.name || 'your customer';
  const reply = `Payment request created ✓\n₹${payment.amount} for ${payment.description}\nCustomer: ${customerLine}\n${payment.paymentUrl}`;
  pushMessage(seller.sellerId, {
    role: 'paybot',
    kind: 'payment',
    text: reply,
    payment: payment.toPublic(),
    customer: customer.toPublic(),
  });
  await sendWhatsAppText(seller.phoneNumber, reply);

  return {
    ok: true,
    parsed,
    payment: payment.toPublic(),
    customer: customer.toPublic(),
  };
}
