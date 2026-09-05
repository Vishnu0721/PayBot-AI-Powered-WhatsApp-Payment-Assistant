const PHONE_ERROR = 'Enter a valid 10-digit Indian mobile number.';

export function normalizePhone(input) {
  if (input === undefined || input === null) {
    throw new Error(PHONE_ERROR);
  }

  const raw = String(input).trim();
  if (!raw) throw new Error(PHONE_ERROR);

  const digits = raw.replace(/\D/g, '');

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
    return `+91${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    return `+${digits}`;
  }

  if (digits.length > 10 && digits.endsWith(digits.slice(-10)) && /^[6-9]/.test(digits.slice(-10))) {
    const last10 = digits.slice(-10);
    if (digits.endsWith(`91${last10}`) || raw.startsWith('+91')) {
      return `+91${last10}`;
    }
  }

  throw new Error(PHONE_ERROR);
}

export function readPhoneInput(body = {}) {
  return body.phone || body.phoneNumber || '';
}

export function tryNormalizePhone(input) {
  try {
    return normalizePhone(input);
  } catch {
    return null;
  }
}

export function formatPhoneDisplay(e164) {
  if (!e164) return '';
  const digits = String(e164).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return e164;
}

export function localDigits(e164) {
  const digits = String(e164 || '').replace(/\D/g, '');
  return digits.slice(-10);
}
