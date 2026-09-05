import { Customer } from '../models/Customer.js';
import { RecurringPlan } from '../models/RecurringPlan.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { advanceRecurringDate } from '../utils/billing.js';

async function hydratePlans(plans, sellerId) {
  const customerIds = plans.map((p) => p.customerId).filter(Boolean);
  const customers = await Customer.find({ _id: { $in: customerIds }, sellerId });
  const map = new Map(customers.map((c) => [String(c._id), c.toPublic()]));
  return plans.map((plan) => ({
    ...plan.toPublic(),
    customer: map.get(String(plan.customerId)) || null,
  }));
}

export const listRecurring = asyncHandler(async (req, res) => {
  const plans = await RecurringPlan.find({ sellerId: req.sellerId }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, plans: await hydratePlans(plans, req.sellerId) });
});

export const createRecurring = asyncHandler(async (req, res) => {
  const amount = Number(req.body?.amount);
  const description = String(req.body?.description || 'Recurring payment').trim().slice(0, 120);
  const cadence = String(req.body?.cadence || 'monthly').toLowerCase();
  const customerId = req.body?.customerId;

  if (!Number.isFinite(amount) || amount < 1) {
    throw new HttpError(400, 'Enter a valid amount.', 'INVALID_AMOUNT');
  }
  if (!['weekly', 'monthly'].includes(cadence)) {
    throw new HttpError(400, 'Cadence must be weekly or monthly.', 'INVALID_CADENCE');
  }

  const customer = await Customer.findOne({ _id: customerId, sellerId: req.sellerId });
  if (!customer) throw new HttpError(404, 'Customer not found.', 'CUSTOMER_NOT_FOUND');
  if (!customer.phoneNumber) {
    throw new HttpError(
      400,
      'Customer needs a WhatsApp number before starting a recurring plan.',
      'CUSTOMER_PHONE_REQUIRED',
    );
  }

  const start = req.body?.startAt ? new Date(req.body.startAt) : new Date();
  if (Number.isNaN(start.getTime())) {
    throw new HttpError(400, 'Invalid start date.', 'INVALID_START');
  }

  const plan = await RecurringPlan.create({
    sellerId: req.sellerId,
    customerId: customer._id,
    amount: Math.round(amount),
    description: description || 'Recurring payment',
    cadence,
    active: true,
    nextRunAt: start,
  });

  const [hydrated] = await hydratePlans([plan], req.sellerId);
  res.status(201).json({ success: true, plan: hydrated });
});

export const pauseRecurring = asyncHandler(async (req, res) => {
  const plan = await RecurringPlan.findOne({ _id: req.params.id, sellerId: req.sellerId });
  if (!plan) throw new HttpError(404, 'Recurring plan not found.', 'NOT_FOUND');
  plan.active = false;
  await plan.save();
  const [hydrated] = await hydratePlans([plan], req.sellerId);
  res.json({ success: true, plan: hydrated });
});

export const resumeRecurring = asyncHandler(async (req, res) => {
  const plan = await RecurringPlan.findOne({ _id: req.params.id, sellerId: req.sellerId });
  if (!plan) throw new HttpError(404, 'Recurring plan not found.', 'NOT_FOUND');
  plan.active = true;
  if (!plan.nextRunAt || plan.nextRunAt.getTime() < Date.now()) {
    plan.nextRunAt = advanceRecurringDate(new Date(), plan.cadence);
  }
  await plan.save();
  const [hydrated] = await hydratePlans([plan], req.sellerId);
  res.json({ success: true, plan: hydrated });
});

export const deleteRecurring = asyncHandler(async (req, res) => {
  const plan = await RecurringPlan.findOneAndDelete({ _id: req.params.id, sellerId: req.sellerId });
  if (!plan) throw new HttpError(404, 'Recurring plan not found.', 'NOT_FOUND');
  res.json({ success: true });
});
