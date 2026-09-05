import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    name: { type: String, default: '' },
    phoneNumber: { type: String, default: '', index: true },
  },
  { timestamps: true },
);

customerSchema.index({ sellerId: 1, phoneNumber: 1 });

customerSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    sellerId: this.sellerId,
    name: this.name || '',
    phoneNumber: this.phoneNumber || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Customer = mongoose.model('Customer', customerSchema);
