import mongoose from 'mongoose';

export const PAYMENT_STATUS = ['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED'];

const paymentSchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },
    description: { type: String, default: '' },
    status: { type: String, enum: PAYMENT_STATUS, default: 'PENDING', index: true },
    razorpayPaymentLinkId: { type: String, default: '', index: true },
    razorpayPaymentId: { type: String, default: '' },
    /** Key id used to create the link (platform or merchant) — used for cancel. */
    razorpayMerchantKeyId: { type: String, default: '' },
    paymentUrl: { type: String, default: '' },
    paidAt: { type: Date, default: null },
    source: { type: String, default: 'dashboard' },
    invoiceNumber: { type: String, default: '', index: true },
    recurringPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringPlan', default: null },
    lastRemindedAt: { type: Date, default: null },
    reminderCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

paymentSchema.index({ sellerId: 1, createdAt: -1 });
paymentSchema.index({ sellerId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: 1, reminderCount: 1 });

paymentSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    sellerId: this.sellerId,
    customerId: this.customerId ? String(this.customerId) : null,
    productId: this.productId ? String(this.productId) : null,
    amount: this.amount,
    currency: this.currency,
    description: this.description || '',
    status: this.status,
    razorpayPaymentLinkId: this.razorpayPaymentLinkId || '',
    razorpayPaymentId: this.razorpayPaymentId || '',
    razorpayMerchantKeyId: this.razorpayMerchantKeyId || '',
    paymentUrl: this.paymentUrl || '',
    source: this.source,
    invoiceNumber: this.invoiceNumber || '',
    recurringPlanId: this.recurringPlanId ? String(this.recurringPlanId) : null,
    lastRemindedAt: this.lastRemindedAt,
    reminderCount: this.reminderCount || 0,
    createdAt: this.createdAt,
    paidAt: this.paidAt,
    updatedAt: this.updatedAt,
  };
};

export const Payment = mongoose.model('Payment', paymentSchema);
