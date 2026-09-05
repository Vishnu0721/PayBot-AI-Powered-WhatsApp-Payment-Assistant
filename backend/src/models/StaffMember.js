import mongoose from 'mongoose';

export const STAFF_ROLES = ['admin', 'collector'];

const staffMemberSchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    phoneNumber: { type: String, required: true, index: true },
    name: { type: String, default: '' },
    role: { type: String, enum: STAFF_ROLES, default: 'collector' },
    active: { type: Boolean, default: true },
    invitedBy: { type: String, default: '' },
  },
  { timestamps: true },
);

staffMemberSchema.index({ sellerId: 1, phoneNumber: 1 }, { unique: true });

staffMemberSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    sellerId: this.sellerId,
    phoneNumber: this.phoneNumber,
    name: this.name || '',
    role: this.role,
    active: this.active,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const StaffMember = mongoose.model('StaffMember', staffMemberSchema);
