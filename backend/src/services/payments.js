import { Customer } from '../models/Customer.js';
import { Payment } from '../models/Payment.js';
import { Seller } from '../models/Seller.js';
import { createPaymentLink } from './razorpay.js';
import { emitPaymentUpdate } from './sse.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';
import { tryNormalizePhone } from '../utils/phone.js';
import { makeInvoiceNumber } from '../utils/billing.js';
import { pushMessage, sendPaymentRequest, sendWhatsAppText } from './whatsapp.js';

export async function findOrCreateCustomer(sellerId, { phoneNumber, name }) {
  const normalized = phoneNumber ? tryNormalizePhone(phoneNumber) : null;
  let customer = null;

  if (normalized) {
    customer = await Customer.findOne({ sellerId, phoneNumber: normalized });
  }

  if (!customer && name && !normalized) {
    customer = await Customer.findOne({ sellerId, name, phoneNumber: '' });
  }

  if (!customer) {
    customer = await Customer.create({
      sellerId,
      phoneNumber: normalized || '',
      name: name || '',
    });
  } else if (name && !customer.name) {
    customer.name = name;
    await customer.save();
  }

  return customer;
}

export async function createCollection({
  seller,
  amount,
  description,
  customerPhone,
  customerName,
  productId = null,
  source = 'dashboard',
  recurringPlanId = null,
}) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 1) {
    throw new HttpError(400, 'Enter a valid amount.', 'INVALID_AMOUNT');
  }

  const customer = await findOrCreateCustomer(seller.sellerId, {
    phoneNumber: customerPhone,
    name: customerName,
  });

  const payment = await Payment.create({
    sellerId: seller.sellerId,
    customerId: customer._id,
    productId,
    amount: Math.round(value),
    currency: 'INR',
    description: description || 'Payment',
    status: 'PENDING',
    source,
    invoiceNumber: makeInvoiceNumber(),
    recurringPlanId: recurringPlanId || null,
  });

  const publicPayUrl = `${env.frontendUrl}/pay/${payment._id}`;
  const link = await createPaymentLink({
    amount: payment.amount,
    currency: payment.currency,
    description: payment.description,
    customerPhone: customer.phoneNumber,
    customerName: customer.name || seller.businessName || 'Customer',
    paymentId: payment._id,
    sellerId: seller.sellerId,
    seller,
    callbackUrl: publicPayUrl,
  });

  payment.razorpayPaymentLinkId = link.id;
  payment.paymentUrl = link.short_url || publicPayUrl;
  payment.razorpayMerchantKeyId = link.keyId || '';
  await payment.save();

  emitPaymentUpdate(payment);

  const payTarget = payment.paymentUrl;
  const merchantName = seller.businessName || 'a PayBot merchant';

  if (customer.phoneNumber) {
    await sendPaymentRequest({
      to: customer.phoneNumber,
      merchantName,
      amount: payment.amount,
      description: payment.description,
      paymentUrl: payTarget,
    });
  }

  if (source === 'whatsapp' || source === 'simulator') {
    pushMessage(seller.sellerId, {
      role: 'paybot',
      kind: 'payment_created',
      text: `Payment request created ✓\n₹${payment.amount}\n${payment.description}`,
      payment: payment.toPublic(),
      customer: customer.toPublic(),
    });
  }

  return { payment, customer, simulatedLink: Boolean(link.simulated) };
}

/**
 * Attach a phone to a name-only customer (if needed) and send/resend the payment link.
 */
export async function notifyPayment(payment, { customerPhone } = {}) {
  if (payment.status !== 'PENDING') {
    throw new HttpError(400, 'Only pending payments can be notified.', 'NOT_PENDING');
  }

  let customer = payment.customerId ? await Customer.findById(payment.customerId) : null;
  if (!customer) {
    throw new HttpError(404, 'Customer not found for this payment.', 'CUSTOMER_NOT_FOUND');
  }

  if (customerPhone) {
    const normalized = tryNormalizePhone(customerPhone);
    if (!normalized) {
      throw new HttpError(400, 'Enter a valid customer mobile number.', 'INVALID_PHONE');
    }
    customer.phoneNumber = normalized;
    await customer.save();
  }

  if (!customer.phoneNumber) {
    throw new HttpError(
      400,
      'Add a customer phone number before sending the payment request.',
      'CUSTOMER_PHONE_REQUIRED',
    );
  }

  const seller = await Seller.findOne({ sellerId: payment.sellerId });
  if (!seller) {
    throw new HttpError(404, 'Seller not found.', 'SELLER_NOT_FOUND');
  }

  const payTarget = payment.paymentUrl || `${env.frontendUrl}/pay/${payment._id}`;
  const delivery = await sendPaymentRequest({
    to: customer.phoneNumber,
    merchantName: seller.businessName || 'a PayBot merchant',
    amount: payment.amount,
    description: payment.description,
    paymentUrl: payTarget,
  });

  return { payment, customer, delivery };
}

export async function markPaymentPaid(payment, { razorpayPaymentId } = {}) {
  const setFields = {
    status: 'PAID',
    paidAt: new Date(),
  };
  if (razorpayPaymentId) {
    setFields.razorpayPaymentId = razorpayPaymentId;
  }

  const updated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: 'PAID' } },
    { $set: setFields },
    { new: true },
  );

  if (!updated) {
    const current = (await Payment.findById(payment._id)) || payment;
    return { payment: current, changed: false };
  }

  emitPaymentUpdate(updated);

  const seller = await Seller.findOne({ sellerId: updated.sellerId });
  if (seller) {
    pushMessage(seller.sellerId, {
      role: 'paybot',
      kind: 'payment_paid',
      text: `Payment successful ✓\n₹${updated.amount} received`,
      payment: updated.toPublic(),
    });
    await sendWhatsAppText(
      seller.phoneNumber,
      `Payment received: ₹${updated.amount} for ${updated.description}.`,
    );
  }

  return { payment: updated, changed: true };
}

export async function applyPaymentStatus(payment, status) {
  if (!['FAILED', 'EXPIRED', 'CANCELLED', 'PENDING'].includes(status)) {
    return payment;
  }

  const updated = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: { $nin: ['PAID', status] },
    },
    { $set: { status } },
    { new: true },
  );

  if (!updated) {
    return (await Payment.findById(payment._id)) || payment;
  }

  emitPaymentUpdate(updated);
  return updated;
}
