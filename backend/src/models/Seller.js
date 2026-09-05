import mongoose from 'mongoose';

const sellerSchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, unique: true, index: true },
    phoneNumber: { type: String, required: true, unique: true, index: true },
    phoneVerified: { type: Boolean, default: false },
    name: { type: String, default: '' },
    businessName: { type: String, default: '' },
    paymentProvider: { type: String, default: 'razorpay' },
    paymentProviderAccountId: { type: String, default: '' },
    usesPlatformCredentials: { type: Boolean, default: true },
    /** Public Razorpay key id when merchant uses their own account. */
    razorpayKeyId: { type: String, default: '' },
    /** AES-GCM encrypted key secret — never exposed via toPublic(). */
    razorpayKeySecretEnc: { type: String, default: '' },
    /** AES-GCM encrypted webhook secret for this merchant's Razorpay account. */
    razorpayWebhookSecretEnc: { type: String, default: '' },
  },
  { timestamps: true },
);

sellerSchema.methods.toPublic = function toPublic() {
  return {
    sellerId: this.sellerId,
    phoneNumber: this.phoneNumber,
    phoneVerified: this.phoneVerified,
    name: this.name || '',
    businessName: this.businessName || '',
    paymentProvider: this.paymentProvider,
    paymentProviderAccountId: this.paymentProviderAccountId || '',
    usesPlatformCredentials: this.usesPlatformCredentials,
    razorpayKeyId: this.usesPlatformCredentials ? '' : this.razorpayKeyId || '',
    hasMerchantRazorpay: Boolean(
      !this.usesPlatformCredentials && this.razorpayKeyId && this.razorpayKeySecretEnc,
    ),
    hasMerchantWebhookSecret: Boolean(
      !this.usesPlatformCredentials && this.razorpayWebhookSecretEnc,
    ),
    onboarded: Boolean(this.businessName && this.name),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Seller = mongoose.model('Seller', sellerSchema);
