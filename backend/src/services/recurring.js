import { Customer } from '../models/Customer.js';
import { RecurringPlan } from '../models/RecurringPlan.js';
import { Seller } from '../models/Seller.js';
import { env } from '../config/env.js';
import { logError, logInfo } from '../utils/logger.js';
import { advanceRecurringDate } from '../utils/billing.js';
import { createCollection } from './payments.js';

let timer = null;
let running = false;

export function startRecurringWorker() {
  if (!env.recurring.enabled) {
    logInfo('Recurring collections disabled (RECURRING_ENABLED=false)');
    return;
  }

  const pollMs = env.recurring.pollMs;
  logInfo(`Recurring collections enabled — polling every ${Math.round(pollMs / 1000)}s`);
  timer = setInterval(() => {
    runDueRecurringPlans().catch((error) => logError('Recurring worker failed', error));
  }, pollMs);

  if (typeof timer.unref === 'function') timer.unref();
}

export function stopRecurringWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}

export async function runDueRecurringPlans() {
  if (running) return { skipped: true };
  running = true;
  try {
    const due = await RecurringPlan.find({
      active: true,
      nextRunAt: { $lte: new Date() },
    })
      .sort({ nextRunAt: 1 })
      .limit(20);

    let created = 0;
    let failed = 0;

    for (const plan of due) {
      try {
        await runOnePlan(plan);
        created += 1;
      } catch (error) {
        failed += 1;
        logError('Recurring plan run failed', {
          planId: String(plan._id),
          message: error?.message,
        });
        plan.failureCount = (plan.failureCount || 0) + 1;
        // Back off one cadence so a hard failure does not tight-loop.
        plan.nextRunAt = advanceRecurringDate(new Date(), plan.cadence);
        await plan.save();
      }
    }

    return { checked: due.length, created, failed };
  } finally {
    running = false;
  }
}

async function runOnePlan(plan) {
  const seller = await Seller.findOne({ sellerId: plan.sellerId });
  if (!seller) {
    plan.active = false;
    await plan.save();
    throw new Error('Seller missing for recurring plan');
  }

  const customer = await Customer.findOne({ _id: plan.customerId, sellerId: plan.sellerId });
  if (!customer) {
    plan.active = false;
    await plan.save();
    throw new Error('Customer missing for recurring plan');
  }

  const { payment } = await createCollection({
    seller,
    amount: plan.amount,
    description: plan.description || 'Recurring payment',
    customerPhone: customer.phoneNumber,
    customerName: customer.name,
    source: 'recurring',
    recurringPlanId: plan._id,
  });

  const now = new Date();
  plan.lastRunAt = now;
  plan.lastPaymentId = payment._id;
  plan.runCount = (plan.runCount || 0) + 1;
  plan.failureCount = 0;
  plan.nextRunAt = advanceRecurringDate(now, plan.cadence);
  await plan.save();

  return payment;
}
