import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    sellerId: this.sellerId,
    name: this.name,
    description: this.description || '',
    price: this.price,
    active: this.active,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Product = mongoose.model('Product', productSchema);
