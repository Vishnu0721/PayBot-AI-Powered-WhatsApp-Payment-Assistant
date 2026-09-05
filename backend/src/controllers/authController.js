import crypto from 'crypto';
import { OTPVerification } from '../models/OTPVerification.js';
import { Seller } from '../models/Seller.js';
import { StaffMember } from '../models/StaffMember.js';
import { env } from '../config/env.js';
import { sendOtpMessage } from '../services/otpService.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { signSellerToken } from '../utils/jwt.js';
import { generateOtp, getMaxAttempts, hashOtp, otpExpiresAt, otpMatches } from '../utils/otp.js';
import { formatPhoneDisplay, normalizePhone, readPhoneInput } from '../utils/phone.js';
import { logInfo } from '../utils/logger.js';

export const sendOtp = asyncHandler(async (req, res) => {
  let phoneNumber;
  try {
    phoneNumber = normalizePhone(readPhoneInput(req.body));
  } catch {
    throw new HttpError(400, 'Enter a valid 10-digit mobile number.', 'INVALID_PHONE');
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp, phoneNumber);

  await OTPVerification.updateMany(
    { phoneNumber, verified: false },
    { $set: { verified: true, expiresAt: new Date(0) } },
  );

  const record = await OTPVerification.create({
    phoneNumber,
    otpHash,
    expiresAt: otpExpiresAt(),
    attempts: 0,
    verified: false,
  });

  try {
    await sendOtpMessage(phoneNumber, otp);
  } catch (error) {
    // While DEMO_MODE is on (payments still simulated), don't lock the user out if
    // Meta rejects free-text OTP outside the 24h session window.
    if (env.demoMode && error?.code === 'OTP_SEND_FAILED') {
      logInfo('WhatsApp OTP failed in DEMO — returning on-screen fallback code', {
        phoneDisplay: formatPhoneDisplay(phoneNumber),
      });
      return res.json({
        success: true,
        message:
          error.message ||
          'WhatsApp could not deliver the OTP. Use the on-screen code, or fix Meta allowlist / session.',
        phoneNumber,
        phoneDisplay: formatPhoneDisplay(phoneNumber),
        expiresInSeconds: 300,
        developmentMode: true,
        developmentOtp: otp,
        whatsappFallback: true,
      });
    }

    record.verified = true;
    record.expiresAt = new Date(0);
    await record.save();
    throw error;
  }

  const payload = {
    success: true,
    message: 'OTP sent successfully',
    phoneNumber,
    phoneDisplay: formatPhoneDisplay(phoneNumber),
    expiresInSeconds: 300,
    developmentMode: env.otpDemoMode,
  };

  if (env.otpDemoMode) {
    payload.developmentOtp = otp;
  }

  res.json(payload);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  let phoneNumber;
  try {
    phoneNumber = normalizePhone(readPhoneInput(req.body));
  } catch {
    throw new HttpError(400, 'Enter a valid 10-digit mobile number.', 'INVALID_PHONE');
  }

  const otp = String(req.body?.otp || '').trim();
  if (!/^\d{6}$/.test(otp)) {
    throw new HttpError(400, 'Enter the 6-digit verification code.', 'INVALID_OTP_FORMAT');
  }

  const record = await OTPVerification.findOne({ phoneNumber, verified: false }).sort({
    createdAt: -1,
  });

  if (!record) {
    throw new HttpError(
      400,
      'No active OTP found. Tap Resend OTP to get a new code.',
      'OTP_EXPIRED',
    );
  }

  if (record.expiresAt.getTime() < Date.now()) {
    throw new HttpError(
      400,
      'This OTP has expired. Tap Resend OTP to get a new code.',
      'OTP_EXPIRED',
    );
  }

  if (record.attempts >= getMaxAttempts()) {
    throw new HttpError(429, 'Too many attempts. Please request a new OTP.', 'OTP_LOCKED');
  }

  record.attempts += 1;

  if (!otpMatches(otp, phoneNumber, record.otpHash)) {
    await record.save();
    if (record.attempts >= getMaxAttempts()) {
      throw new HttpError(429, 'Too many attempts. Please request a new OTP.', 'OTP_LOCKED');
    }
    throw new HttpError(400, 'Incorrect OTP. Please check the code and try again.', 'OTP_INVALID');
  }

  record.verified = true;
  await record.save();

  // Prefer business owner account for this phone.
  let seller = await Seller.findOne({ phoneNumber });
  let role = 'owner';
  let staffId = null;

  if (!seller) {
    const staff = await StaffMember.findOne({ phoneNumber, active: true });
    if (staff) {
      seller = await Seller.findOne({ sellerId: staff.sellerId });
      if (!seller) {
        throw new HttpError(
          403,
          'This staff invite points to a missing business. Ask the owner to re-invite you.',
          'STAFF_BUSINESS_MISSING',
        );
      }
      role = staff.role;
      staffId = staff._id;
    } else {
      seller = await Seller.create({
        sellerId: `sel_${crypto.randomUUID().replace(/-/g, '')}`,
        phoneNumber,
        phoneVerified: true,
        name: '',
        businessName: '',
        paymentProvider: 'razorpay',
        paymentProviderAccountId: env.razorpay.keyId || '',
        usesPlatformCredentials: true,
      });
    }
  } else if (!seller.phoneVerified) {
    seller.phoneVerified = true;
    await seller.save();
  }

  const token = signSellerToken(seller.sellerId, { role, staffId });

  res.json({
    success: true,
    message: 'Phone verified successfully',
    token,
    role,
    seller: {
      ...seller.toPublic(),
      role,
      staffId: staffId ? String(staffId) : null,
    },
  });
});
