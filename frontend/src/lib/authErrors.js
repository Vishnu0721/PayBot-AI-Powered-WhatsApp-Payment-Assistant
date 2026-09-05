const MESSAGES = {
  INVALID_PHONE: 'Enter a valid 10-digit mobile number.',
  OTP_SEND_FAILED: "We couldn't send the OTP. Please try again.",
  OTP_NOT_CONFIGURED: 'OTP service is not configured.',
  OTP_INVALID: 'Incorrect OTP. Please check the code and try again.',
  OTP_EXPIRED: 'This OTP expired or was cleared. Tap Resend OTP for a new code.',
  OTP_LOCKED: 'Too many attempts. Please request a new OTP.',
  RATE_LIMITED: 'Too many OTP requests. Please try again later.',
  NETWORK: 'Backend unreachable. Make sure `npm run dev` is running in the backend folder.',
};

export function authErrorMessage(err, fallback) {
  if (!err) return fallback;
  if (err.code === 'OTP_NOT_CONFIGURED') {
    return err.message || MESSAGES.OTP_NOT_CONFIGURED;
  }
  return MESSAGES[err.code] || err.message || fallback;
}
