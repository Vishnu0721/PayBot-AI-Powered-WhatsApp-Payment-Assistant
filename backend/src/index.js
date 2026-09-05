import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, getLiveReadiness } from './config/env.js';
import { connectDb, isMongoConnected } from './config/db.js';
import { errorHandler, notFound } from './middleware/error.js';
import { logError, logInfo } from './utils/logger.js';
import { getHealth } from './controllers/healthController.js';
import { razorpayWebhook } from './controllers/webhookController.js';
import {
  receiveWhatsAppWebhook,
  verifyWhatsAppWebhook,
} from './controllers/whatsappController.js';
import authRoutes from './routes/auth.js';
import sellerRoutes from './routes/seller.js';
import dashboardRoutes from './routes/dashboard.js';
import paymentRoutes from './routes/payments.js';
import publicPaymentRoutes from './routes/publicPayments.js';
import customerRoutes from './routes/customers.js';
import productRoutes from './routes/products.js';
import eventsRoutes from './routes/events.js';
import { whatsappAppRouter } from './routes/whatsapp.js';
import recurringRoutes from './routes/recurring.js';
import staffRoutes from './routes/staff.js';

if (!env.jwtSecret || env.jwtSecret.length < 16) {
  console.error('[paybot] JWT_SECRET must be set to a long random value.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && env.demoMode) {
  console.error('[paybot] DEMO_MODE must be false when NODE_ENV=production.');
  process.exit(1);
}

if (!env.demoMode && env.otpDemoMode) {
  console.error('[paybot] OTP_DEMO_MODE must be false when DEMO_MODE=false (live mode).');
  process.exit(1);
}

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
);

app.post(
  '/api/razorpay/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.app.set('mongoReady', isMongoConnected());
    next();
  },
  razorpayWebhook,
);

app.get('/api/whatsapp/webhook', verifyWhatsAppWebhook);
app.post(
  '/api/whatsapp/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.app.set('mongoReady', isMongoConnected());
    next();
  },
  receiveWhatsAppWebhook,
);

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  req.app.set('mongoReady', isMongoConnected());
  next();
});

app.get('/api/health', getHealth);
app.use('/api/auth', authRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/public/payments', publicPaymentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/whatsapp', whatsappAppRouter);
app.use('/api/events', eventsRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/staff', staffRoutes);

app.use(notFound);
app.use(errorHandler);

const mongo = await connectDb();
app.set('mongoReady', mongo);

if (!env.demoMode) {
  if (!mongo) {
    console.error(
      '[paybot] LIVE mode requires a reachable MongoDB (MONGODB_URI). No demo DB fallback.',
    );
    process.exit(1);
  }

  const readiness = getLiveReadiness();
  if (!readiness.ready) {
    console.error('[paybot] LIVE mode is incomplete. Missing:');
    for (const item of readiness.missing) {
      console.error(`  - ${item}`);
    }
    console.error('[paybot] Fill backend/.env then restart. Or keep DEMO_MODE=true until ready.');
    console.error('[paybot] Tip: npm run live:check');
    process.exit(1);
  }

  if (readiness.warningList.length) {
    logInfo('LIVE mode warnings (recommended)', { warnings: readiness.warningList });
  }
}

const { startReminderWorker } = await import('./services/reminders.js');
const { startRecurringWorker } = await import('./services/recurring.js');
startReminderWorker();
startRecurringWorker();

const server = app.listen(env.port, () => {
  logInfo(`PayBot API listening on ${env.port} (${env.demoMode ? 'DEMO' : 'LIVE'} mode)`);
});

server.on('error', (error) => {
  logError('Server failed to start', error);
  process.exit(1);
});
