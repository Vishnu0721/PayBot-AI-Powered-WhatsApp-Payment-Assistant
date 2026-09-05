import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { requireDb } from '../utils/http.js';

const router = Router();
router.get('/', requireDb, requireAuth, requireOnboarded, getDashboard);
export default router;
