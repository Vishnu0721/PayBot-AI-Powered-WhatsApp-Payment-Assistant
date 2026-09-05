import { Customer } from '../models/Customer.js';
import { Payment } from '../models/Payment.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { tryNormalizePhone } from '../utils/phone.js';

export const listCustomers = asyncHandler(async (req, res) => {
  const sellerId = req.sellerId;
  const customers = await Customer.find({ sellerId }).sort({ updatedAt: -1 });
  const ids = customers.map((c) => c._id);

  const stats = await Payment.aggregate([
    { $match: { sellerId, customerId: { $in: ids } } },
    {
      $group: {
        _id: '$customerId',
        paymentCount: { $sum: 1 },
        totalCollected: {
          $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$amount', 0] },
        },
        lastPayment: { $max: '$createdAt' },
      },
    },
  ]);

  const statMap = new Map(stats.map((s) => [String(s._id), s]));

  res.json({
    success: true,
    customers: customers.map((customer) => {
      const extra = statMap.get(String(customer._id)) || {};
      return {
        ...customer.toPublic(),
        totalCollected: extra.totalCollected || 0,
        paymentCount: extra.paymentCount || 0,
        lastPayment: extra.lastPayment || null,
      };
    }),
  });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const phone = tryNormalizePhone(req.body?.phoneNumber || req.body?.phone);
  if (!name && !phone) {
    throw new HttpError(400, 'Enter a customer name or phone number.', 'CUSTOMER_REQUIRED');
  }

  if (phone) {
    const existing = await Customer.findOne({ sellerId: req.sellerId, phoneNumber: phone });
    if (existing) {
      if (name && !existing.name) {
        existing.name = name;
        await existing.save();
      }
      return res.json({ success: true, customer: existing.toPublic() });
    }
  }

  const customer = await Customer.create({
    sellerId: req.sellerId,
    name,
    phoneNumber: phone || '',
  });

  res.status(201).json({ success: true, customer: customer.toPublic() });
});
