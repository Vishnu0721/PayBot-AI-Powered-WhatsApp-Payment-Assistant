import { Router } from 'express';
import { inviteStaff, listStaff, removeStaff } from '../controllers/staffController.js';
import { requireAuth, requireOnboarded, requireOwner } from '../middleware/auth.js';
import { requireDb } from '../utils/http.js';

const router = Router();
router.use(requireDb, requireAuth, requireOnboarded, requireOwner);
router.get('/', listStaff);
router.post('/', inviteStaff);
router.delete('/:id', removeStaff);
export default router;
