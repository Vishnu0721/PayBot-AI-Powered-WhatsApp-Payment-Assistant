import { Router } from 'express';
import { getPublicPayment, simulatePublicPay } from '../controllers/paymentController.js';
import { requireDb } from '../utils/http.js';

const router = Router();
router.get('/:id', requireDb, getPublicPayment);
router.post('/:id/simulate', requireDb, simulatePublicPay);
export default router;
