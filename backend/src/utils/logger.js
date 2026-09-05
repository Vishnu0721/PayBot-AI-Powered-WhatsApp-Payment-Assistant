const SENSITIVE = /otp|token|secret|password|authorization|jwt|auth.?token|access.?token/i;

export function logInfo(message, extra) {
  if (extra) console.log(`[paybot] ${message}`, redact(extra));
  else console.log(`[paybot] ${message}`);
}

export function logError(message, extra) {
  if (extra) console.error(`[paybot] ${message}`, redact(extra));
  else console.error(`[paybot] ${message}`);
}

function redact(value) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE.test(key) ? '[redacted]' : redact(val);
    }
    return out;
  }
  return value;
}
