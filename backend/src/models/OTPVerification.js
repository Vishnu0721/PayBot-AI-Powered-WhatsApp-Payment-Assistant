import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

otpSchema.index({ phoneNumber: 1, createdAt: -1 });

export const OTPVerification = mongoose.model('OTPVerification', otpSchema);
