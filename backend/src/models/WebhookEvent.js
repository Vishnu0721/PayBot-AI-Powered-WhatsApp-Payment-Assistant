import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    event: { type: String, default: '' },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);
