import { StaffMember, STAFF_ROLES } from '../models/StaffMember.js';
import { Seller } from '../models/Seller.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { formatPhoneDisplay, normalizePhone } from '../utils/phone.js';

export const listStaff = asyncHandler(async (req, res) => {
  const members = await StaffMember.find({ sellerId: req.sellerId }).sort({ createdAt: -1 });
  res.json({
    success: true,
    members: members.map((m) => ({
      ...m.toPublic(),
      phoneDisplay: formatPhoneDisplay(m.phoneNumber),
    })),
  });
});

export const inviteStaff = asyncHandler(async (req, res) => {
  let phoneNumber;
  try {
    phoneNumber = normalizePhone(req.body?.phone || req.body?.phoneNumber);
  } catch {
    throw new HttpError(400, 'Enter a valid 10-digit mobile number.', 'INVALID_PHONE');
  }

  const name = String(req.body?.name || '').trim().slice(0, 80);
  const role = String(req.body?.role || 'collector').toLowerCase();
  if (!STAFF_ROLES.includes(role)) {
    throw new HttpError(400, 'Role must be admin or collector.', 'INVALID_ROLE');
  }

  if (phoneNumber === req.seller.phoneNumber) {
    throw new HttpError(400, 'You are already the business owner.', 'OWNER_PHONE');
  }

  const existingOwner = await Seller.findOne({ phoneNumber });
  if (existingOwner) {
    throw new HttpError(
      400,
      'That number already owns another PayBot business. Use a different number.',
      'PHONE_OWNS_BUSINESS',
    );
  }

  let member = await StaffMember.findOne({ sellerId: req.sellerId, phoneNumber });
  if (member) {
    member.name = name || member.name;
    member.role = role;
    member.active = true;
    member.invitedBy = req.seller.sellerId;
    await member.save();
  } else {
    member = await StaffMember.create({
      sellerId: req.sellerId,
      phoneNumber,
      name,
      role,
      active: true,
      invitedBy: req.seller.sellerId,
    });
  }

  res.status(201).json({
    success: true,
    member: {
      ...member.toPublic(),
      phoneDisplay: formatPhoneDisplay(member.phoneNumber),
    },
  });
});

export const removeStaff = asyncHandler(async (req, res) => {
  const member = await StaffMember.findOneAndDelete({
    _id: req.params.id,
    sellerId: req.sellerId,
  });
  if (!member) throw new HttpError(404, 'Team member not found.', 'NOT_FOUND');
  res.json({ success: true });
});
