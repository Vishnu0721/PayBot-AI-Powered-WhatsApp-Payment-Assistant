import { Router } from 'express';
import {
  connectRazorpay,
  disconnectRazorpay,
  getSeller,
  getSetup,
  updateSeller,
} from '../controllers/sellerController.js';
import { requireAuth, requireOnboarded, requireOwner } from '../middleware/auth.js';
import { requireDb } from '../utils/http.js';

const router = Router();
router.use(requireDb, requireAuth);
router.get('/', getSeller);
router.put('/', updateSeller);
router.get('/setup', getSetup);
router.post('/razorpay', requireOnboarded, requireOwner, connectRazorpay);
router.delete('/razorpay', requireOnboarded, requireOwner, disconnectRazorpay);
export default router;
