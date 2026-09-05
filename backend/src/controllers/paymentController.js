import { Payment } from '../models/Payment.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { env } from '../config/env.js';
import { applyPaymentStatus, createCollection, markPaymentPaid, notifyPayment } from '../services/payments.js';
import { cancelPaymentLink } from '../services/razorpay.js';
import { sendPaymentReminder } from '../services/reminders.js';
import { tryNormalizePhone } from '../utils/phone.js';

const PUBLIC_FIELDS = (payment, extra = {}) => ({
  id: String(payment._id),
  amount: payment.amount,
  currency: payment.currency,
  description: payment.description,
  status: payment.status,
  paymentUrl: payment.paymentUrl,
  invoiceNumber: payment.invoiceNumber || '',
  createdAt: payment.createdAt,
  paidAt: payment.paidAt,
  ...extra,
});

async function hydrate(payments, sellerId) {
  const customerIds = payments.map((p) => p.customerId).filter(Boolean);
  const productIds = payments.map((p) => p.productId).filter(Boolean);
  const [customers, products] = await Promise.all([
    Customer.find({ _id: { $in: customerIds }, sellerId }),
    Product.find({ _id: { $in: productIds }, sellerId }),
  ]);
  const customerMap = new Map(customers.map((c) => [String(c._id), c.toPublic()]));
  const productMap = new Map(products.map((p) => [String(p._id), p.toPublic()]));
  return payments.map((payment) => ({
    ...payment.toPublic(),
    customer: customerMap.get(String(payment.customerId)) || null,
    product: payment.productId ? productMap.get(String(payment.productId)) || null : null,
  }));
}

export const listPayments = asyncHandler(async (req, res) => {
  const filter = { sellerId: req.sellerId };
  const status = String(req.query.status || '').toUpperCase();
  if (['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(status)) {
    filter.status = status;
  }

  const payments = await Payment.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, payments: await hydrate(payments, req.sellerId) });
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, sellerId: req.sellerId });
  if (!payment) throw new HttpError(404, 'Payment not found.', 'NOT_FOUND');
  const [hydrated] = await hydrate([payment], req.sellerId);
  res.json({ success: true, payment: hydrated });
});

export const createPayment = asyncHandler(async (req, res) => {
  const amount = Number(req.body?.amount);
  const description = String(req.body?.description || '').trim();
  const customerName = String(req.body?.customerName || '').trim();
  const productId = req.body?.productId || null;
  let customerPhone = req.body?.customerPhone || req.body?.phoneNumber || '';

  if (customerPhone) {
    const normalized = tryNormalizePhone(customerPhone);
    if (!normalized) {
      throw new HttpError(400, 'Enter a valid customer mobile number.', 'INVALID_PHONE');
    }
    customerPhone = normalized;
  }

  if (!customerPhone && !customerName) {
    throw new HttpError(400, 'Enter a customer phone number or name.', 'CUSTOMER_REQUIRED');
  }

  let resolvedProductId = null;
  if (productId) {
    const product = await Product.findOne({ _id: productId, sellerId: req.sellerId, active: true });
    if (!product) throw new HttpError(404, 'Product not found.', 'PRODUCT_NOT_FOUND');
    resolvedProductId = product._id;
  }

  const { payment, customer } = await createCollection({
    seller: req.seller,
    amount,
    description: description || 'Payment',
    customerPhone,
    customerName,
    productId: resolvedProductId,
    source: 'dashboard',
  });

  res.status(201).json({
    success: true,
    payment: {
      ...payment.toPublic(),
      customer: customer.toPublic(),
    },
  });
});

export const getPublicPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new HttpError(404, 'This payment request was not found.', 'NOT_FOUND');

  const { Seller } = await import('../models/Seller.js');
  const seller = await Seller.findOne({ sellerId: payment.sellerId });
  const customer = payment.customerId ? await Customer.findById(payment.customerId) : null;

  res.json({
    success: true,
    demoMode: env.demoMode,
    payment: PUBLIC_FIELDS(payment, {
      merchantName: seller?.businessName || 'PayBot merchant',
      customerName: customer?.name || '',
    }),
  });
});

export const simulatePublicPay = asyncHandler(async (req, res) => {
  if (!env.demoMode) {
    throw new HttpError(403, 'Simulated payments are only available in demo mode.', 'LIVE_MODE');
  }

  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new HttpError(404, 'This payment request was not found.', 'NOT_FOUND');
  if (payment.status === 'PAID') {
    return res.json({ success: true, payment: PUBLIC_FIELDS(payment) });
  }

  const { payment: updated } = await markPaymentPaid(payment, {
    razorpayPaymentId: `pay_demo_${payment._id}`,
  });

  res.json({ success: true, payment: PUBLIC_FIELDS(updated) });
});

export const expireOwnPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, sellerId: req.sellerId });
  if (!payment) throw new HttpError(404, 'Payment not found.', 'NOT_FOUND');
  if (payment.status === 'PAID') {
    throw new HttpError(400, 'Paid payments cannot be cancelled.', 'ALREADY_PAID');
  }

  await cancelPaymentLink(payment.razorpayPaymentLinkId, req.seller);
  const updated = await applyPaymentStatus(payment, 'CANCELLED');
  res.json({ success: true, payment: updated.toPublic() });
});

export const notifyOwnPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, sellerId: req.sellerId });
  if (!payment) throw new HttpError(404, 'Payment not found.', 'NOT_FOUND');

  const { payment: updated, customer, delivery } = await notifyPayment(payment, {
    customerPhone: req.body?.customerPhone || req.body?.phoneNumber || '',
  });

  const [hydrated] = await hydrate([updated], req.sellerId);
  res.json({
    success: true,
    payment: { ...hydrated, customer: customer.toPublic() },
    delivery,
  });
});

export const remindOwnPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, sellerId: req.sellerId });
  if (!payment) throw new HttpError(404, 'Payment not found.', 'NOT_FOUND');

  const result = await sendPaymentReminder(payment, { kind: 'manual' });
  if (result.reason === 'no_customer_phone') {
    throw new HttpError(
      400,
      'Add a customer phone number before sending a reminder.',
      'CUSTOMER_PHONE_REQUIRED',
    );
  }
  if (result.reason === 'not_pending') {
    throw new HttpError(400, 'Only pending payments can be reminded.', 'NOT_PENDING');
  }

  const [hydrated] = await hydrate([result.payment || payment], req.sellerId);
  res.json({
    success: true,
    payment: hydrated,
    sent: Boolean(result.sent),
  });
});
