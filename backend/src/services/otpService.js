import {
  env,
  isMsg91Configured,
  isOtpProviderConfigured,
  isTwilioOtpConfigured,
  isWhatsAppOtpConfigured,
  resolveOtpProvider,
} from '../config/env.js';
import { HttpError } from '../utils/http.js';
import { logError, logInfo } from '../utils/logger.js';

const OTP_MESSAGE = (otp) =>
  `Your PayBot verification code is ${otp}.\nThis code expires in 5 minutes.\nDo not share this code with anyone.`;

const CONFIG_ERROR =
  'OTP service is not configured. Set OTP_PROVIDER (whatsapp|twilio|msg91) with credentials, or enable OTP_DEMO_MODE for local demos.';

function buildWhatsAppOtpPayload(to, otp) {
  if (!env.whatsapp.otpTemplate) {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: false, body: OTP_MESSAGE(otp) },
    };
  }

  const components = [
    {
      type: 'body',
      parameters: [{ type: 'text', text: String(otp) }],
    },
  ];

  const button = env.whatsapp.otpTemplateButton;
  if (button === 'url' || button === 'otp') {
    components.push({
      type: 'button',
      sub_type: button === 'otp' ? 'otp' : 'url',
      index: '0',
      parameters: [{ type: 'text', text: String(otp) }],
    });
  }

  return {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: env.whatsapp.otpTemplate,
      language: { code: env.whatsapp.otpTemplateLanguage || 'en' },
      components,
    },
  };
}

export async function sendWhatsAppOtp(phone, otp) {
  if (!isWhatsAppOtpConfigured()) {
    throw new HttpError(503, CONFIG_ERROR, 'OTP_NOT_CONFIGURED');
  }

  const to = String(phone).replace(/\D/g, '');
  const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;
  const payload = buildWhatsAppOtpPayload(to, otp);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.whatsapp.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text().catch(() => '');
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const metaMsg = String(data?.error?.message || raw || '').slice(0, 180);
    logError('WhatsApp OTP send failed', {
      status: response.status,
      meta: metaMsg,
      via: env.whatsapp.otpTemplate ? 'template' : 'text',
    });
    let hint = '';
    if (/allowed list|131030/i.test(metaMsg)) {
      hint =
        ' This number is not on the Meta allowlist. In developers.facebook.com → WhatsApp → API Setup → To, add the number (sandbox max 5).';
    } else if (/template|re-engage|24|session/i.test(metaMsg)) {
      hint =
        ' Message the Meta test WhatsApp number first, then Resend — or set WHATSAPP_OTP_TEMPLATE_NAME.';
    }
    throw new HttpError(
      502,
      `We couldn't send the OTP via WhatsApp.${hint}`,
      'OTP_SEND_FAILED',
    );
  }

  logInfo('WhatsApp OTP accepted by Meta', {
    via: env.whatsapp.otpTemplate ? 'template' : 'text',
    messageId: data?.messages?.[0]?.id || '',
  });

  return { sent: true, provider: 'whatsapp', messageId: data?.messages?.[0]?.id || '' };
}

export async function sendOtpMessage(phoneNumber, otp) {
  const provider = resolveOtpProvider();

  if (provider === 'whatsapp') {
    return sendWhatsAppOtp(phoneNumber, otp);
  }

  if (provider === 'twilio') {
    await sendTwilioWhatsApp(phoneNumber, otp);
    return { sent: true, provider: 'twilio' };
  }

  if (provider === 'msg91') {
    await sendMsg91Otp(phoneNumber, otp);
    return { sent: true, provider: 'msg91' };
  }

  if (env.otpDemoMode && !isOtpProviderConfigured()) {
    logInfo('OTP provider skipped — OTP_DEMO_MODE is enabled');
    return { sent: false, provider: 'demo' };
  }

  throw new HttpError(503, CONFIG_ERROR, 'OTP_NOT_CONFIGURED');
}

async function sendTwilioWhatsApp(phoneNumber, otp) {
  if (!isTwilioOtpConfigured()) {
    throw new HttpError(503, CONFIG_ERROR, 'OTP_NOT_CONFIGURED');
  }

  const { accountSid, authToken, fromNumber } = env.twilio;
  const to = fromNumber.startsWith('whatsapp:') ? `whatsapp:${phoneNumber}` : phoneNumber;
  const from = fromNumber;
  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: OTP_MESSAGE(otp),
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );

  if (!response.ok) {
    logError('Twilio OTP send failed', { status: response.status });
    throw new HttpError(502, "We couldn't send the OTP. Please try again.", 'OTP_SEND_FAILED');
  }
}

/**
 * MSG91 OTP API (v5). Requires MSG91_AUTH_KEY + MSG91_TEMPLATE_ID.
 * Optional MSG91_SENDER_ID is sent when present.
 */
async function sendMsg91Otp(phoneNumber, otp) {
  if (!isMsg91Configured()) {
    throw new HttpError(503, CONFIG_ERROR, 'OTP_NOT_CONFIGURED');
  }

  const mobile = String(phoneNumber).replace(/\D/g, '');
  const url = new URL('https://control.msg91.com/api/v5/otp');
  url.searchParams.set('template_id', env.msg91.templateId);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp', String(otp));
  if (env.msg91.senderId) {
    url.searchParams.set('sender', env.msg91.senderId);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authkey: env.msg91.authKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    logError('MSG91 OTP send failed', {
      status: response.status,
      // Truncate body; never log auth key.
      body: String(errBody || '').slice(0, 200),
    });
    throw new HttpError(502, "We couldn't send the OTP. Please try again.", 'OTP_SEND_FAILED');
  }

  const data = await response.json().catch(() => ({}));
  if (String(data.type || '').toLowerCase() === 'error') {
    logError('MSG91 OTP rejected', { message: String(data.message || '').slice(0, 200) });
    throw new HttpError(502, "We couldn't send the OTP. Please try again.", 'OTP_SEND_FAILED');
  }

  return { sent: true, provider: 'msg91' };
}
