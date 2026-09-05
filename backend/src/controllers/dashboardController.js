import { Payment } from '../models/Payment.js';
import { Customer } from '../models/Customer.js';
import { asyncHandler } from '../utils/http.js';

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n) {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
}

export const getDashboard = asyncHandler(async (req, res) => {
  const sellerId = req.sellerId;
  const today = startOfDay();
  const weekAgo = daysAgo(6);

  const [
    collectedTodayAgg,
    collectedWeekAgg,
    transactionsToday,
    pending,
    successful,
    failed,
    cancelled,
    recent,
    dailyPaid,
  ] = await Promise.all([
    Payment.aggregate([
      { $match: { sellerId, status: 'PAID', paidAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { sellerId, status: 'PAID', paidAt: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.countDocuments({ sellerId, createdAt: { $gte: today } }),
    Payment.countDocuments({ sellerId, status: 'PENDING' }),
    Payment.countDocuments({ sellerId, status: 'PAID' }),
    Payment.countDocuments({ sellerId, status: 'FAILED' }),
    Payment.countDocuments({ sellerId, status: 'CANCELLED' }),
    Payment.find({ sellerId }).sort({ createdAt: -1 }).limit(8).lean(),
    Payment.aggregate([
      { $match: { sellerId, status: 'PAID', paidAt: { $gte: weekAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paidAt' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const customerIds = recent.map((p) => p.customerId).filter(Boolean);
  const customers = await Customer.find({ _id: { $in: customerIds } }).lean();
  const customerMap = new Map(customers.map((c) => [String(c._id), c]));

  const weekTotal = collectedWeekAgg[0]?.total || 0;
  const weekCount = collectedWeekAgg[0]?.count || 0;

  res.json({
    success: true,
    stats: {
      collectedToday: collectedTodayAgg[0]?.total || 0,
      collectedTodayCount: collectedTodayAgg[0]?.count || 0,
      collectedLast7Days: weekTotal,
      averageTicketLast7Days: weekCount ? Math.round(weekTotal / weekCount) : 0,
      transactions: transactionsToday,
      pending,
      successfulPayments: successful,
      failedPayments: failed,
      cancelledPayments: cancelled,
    },
    series: {
      paidLast7Days: dailyPaid.map((row) => ({
        date: row._id,
        total: row.total,
        count: row.count,
      })),
    },
    recentPayments: recent.map((payment) => {
      const customer = customerMap.get(String(payment.customerId));
      return {
        id: String(payment._id),
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        status: payment.status,
        invoiceNumber: payment.invoiceNumber || '',
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
        customer: customer
          ? {
              id: String(customer._id),
              name: customer.name || '',
              phoneNumber: customer.phoneNumber || '',
            }
          : null,
      };
    }),
  });
});
