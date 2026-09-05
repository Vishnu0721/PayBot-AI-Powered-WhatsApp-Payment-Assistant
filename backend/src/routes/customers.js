import { Router } from 'express';
import { createCustomer, listCustomers } from '../controllers/customerController.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { requireDb } from '../utils/http.js';

const router = Router();
router.use(requireDb, requireAuth, requireOnboarded);
router.get('/', listCustomers);
router.post('/', createCustomer);
export default router;
