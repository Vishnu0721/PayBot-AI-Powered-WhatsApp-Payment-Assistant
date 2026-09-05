import { Router } from 'express';
import {
  createRecurring,
  deleteRecurring,
  listRecurring,
  pauseRecurring,
  resumeRecurring,
} from '../controllers/recurringController.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { requireDb } from '../utils/http.js';

const router = Router();
router.use(requireDb, requireAuth, requireOnboarded);
router.get('/', listRecurring);
router.post('/', createRecurring);
router.post('/:id/pause', pauseRecurring);
router.post('/:id/resume', resumeRecurring);
router.delete('/:id', deleteRecurring);
export default router;
