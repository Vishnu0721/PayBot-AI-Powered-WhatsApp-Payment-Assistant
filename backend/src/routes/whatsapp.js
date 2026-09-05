import { Router } from 'express';
import {
  listWhatsAppMessages,
  parsePreview,
  simulateWhatsApp,
} from '../controllers/whatsappController.js';
import { requireAuth, requireOnboarded } from '../middleware/auth.js';
import { requireDb } from '../utils/http.js';

/** Authenticated app routes. Cloud webhook GET/POST are mounted in index.js (raw body). */
export const whatsappAppRouter = Router();
whatsappAppRouter.use(requireDb, requireAuth, requireOnboarded);
whatsappAppRouter.get('/messages', listWhatsAppMessages);
whatsappAppRouter.post('/simulate', simulateWhatsApp);
whatsappAppRouter.post('/parse', parsePreview);
