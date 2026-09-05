import { env, isWhatsAppConfigured } from '../config/env.js';
import { logError } from '../utils/logger.js';

const conversations = new Map();

export function whatsappStatus() {
  return {
    configured: isWhatsAppConfigured(),
    mode: env.demoMode || !isWhatsAppConfigured() ? 'demo' : 'live',
    phoneNumberIdPresent: Boolean(env.whatsapp.phoneNumberId),
    appSecretConfigured: Boolean(env.whatsapp.appSecret),
    paymentTemplateConfigured: Boolean(env.whatsapp.paymentTemplate),
  };
}

export function getConversation(sellerId) {
  return conversations.get(sellerId) || [];
}

export function pushMessage(sellerId, message) {
  const list = conversations.get(sellerId) || [];
  list.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    ...message,
  });
  conversations.set(sellerId, list.slice(-80));
  return list[list.length - 1];
}

function graphMessagesUrl() {
  return `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;
}

async function postWhatsAppMessage(payload) {
  const response = await fetch(graphMessagesUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.whatsapp.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    logError('WhatsApp send failed', { status: response.status });
    return { sent: false, provider: 'whatsapp' };
  }

  return { sent: true, provider: 'whatsapp' };
}

export async function sendWhatsAppText(to, body) {
  if (!isWhatsAppConfigured() || env.demoMode) {
    return { sent: false, provider: env.demoMode ? 'demo' : 'unconfigured' };
  }

  return postWhatsAppMessage({
    messaging_product: 'whatsapp',
    to: String(to).replace('+', ''),
    type: 'text',
    text: { body, preview_url: true },
  });
}

/**
 * Customer payment request. Uses an approved Meta template in live mode when
 * WHATSAPP_PAYMENT_TEMPLATE_NAME is set; otherwise falls back to free text.
 *
 * Template body params (in order):
 * 1 = merchant name, 2 = amount, 3 = description, 4 = payment URL
 */
export async function sendPaymentRequest({
  to,
  merchantName,
  amount,
  description,
  paymentUrl,
}) {
  if (!to) {
    return { sent: false, provider: 'skipped' };
  }

  if (!isWhatsAppConfigured() || env.demoMode) {
    return { sent: false, provider: env.demoMode ? 'demo' : 'unconfigured' };
  }

  const merchant = String(merchantName || 'a PayBot merchant');
  const amountText = String(amount);
  const desc = String(description || 'Payment');
  const url = String(paymentUrl || '');

  if (env.whatsapp.paymentTemplate) {
    return postWhatsAppMessage({
      messaging_product: 'whatsapp',
      to: String(to).replace('+', ''),
      type: 'template',
      template: {
        name: env.whatsapp.paymentTemplate,
        language: { code: env.whatsapp.paymentTemplateLanguage || 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: merchant },
              { type: 'text', text: amountText },
              { type: 'text', text: desc },
              { type: 'text', text: url },
            ],
          },
        ],
      },
    });
  }

  return sendWhatsAppText(
    to,
    `${merchant} requested ₹${amountText} for ${desc}.\nPay here: ${url}`,
  );
}
