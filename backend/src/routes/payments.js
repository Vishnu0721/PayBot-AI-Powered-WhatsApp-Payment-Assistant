import { Router } from 'express';
import {
  createPayment,
  expireOwnPayment,
  getPayment,
  listPayments,
  notifyOwnPayment,
  remindOwnPayment,
} from '../controllers/paymentController.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { requireDb } from '../utils/http.js';

const router = Router();
router.use(requireDb, requireAuth, requireOnboarded);
router.get('/', listPayments);
router.post('/', createPayment);
router.get('/:id', getPayment);
router.post('/:id/cancel', expireOwnPayment);
router.post('/:id/notify', notifyOwnPayment);
router.post('/:id/remind', remindOwnPayment);
export default router;
