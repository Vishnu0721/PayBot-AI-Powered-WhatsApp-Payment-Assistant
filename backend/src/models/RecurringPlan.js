import mongoose from 'mongoose';

export const RECURRING_CADENCE = ['weekly', 'monthly'];

const recurringPlanSchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },
    description: { type: String, default: 'Recurring payment' },
    cadence: { type: String, enum: RECURRING_CADENCE, default: 'monthly' },
    active: { type: Boolean, default: true, index: true },
    nextRunAt: { type: Date, required: true, index: true },
    lastRunAt: { type: Date, default: null },
    lastPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    runCount: { type: Number, default: 0, min: 0 },
    failureCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

recurringPlanSchema.index({ active: 1, nextRunAt: 1 });

recurringPlanSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    sellerId: this.sellerId,
    customerId: this.customerId ? String(this.customerId) : null,
    amount: this.amount,
    currency: this.currency,
    description: this.description || '',
    cadence: this.cadence,
    active: this.active,
    nextRunAt: this.nextRunAt,
    lastRunAt: this.lastRunAt,
    lastPaymentId: this.lastPaymentId ? String(this.lastPaymentId) : null,
    runCount: this.runCount || 0,
    failureCount: this.failureCount || 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const RecurringPlan = mongoose.model('RecurringPlan', recurringPlanSchema);
