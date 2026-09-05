import { Router } from 'express';
import { streamEvents } from '../controllers/eventsController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../utils/http.js';

const router = Router();
router.get('/', requireDb, requireAuth, streamEvents);
export default router;
