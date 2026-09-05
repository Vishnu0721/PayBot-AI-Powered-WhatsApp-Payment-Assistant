import { Router } from 'express';
import { sendOtp, verifyOtp } from '../controllers/authController.js';
import { otpIpLimiter, otpPhoneLimiter } from '../middleware/rateLimit.js';
import { requireDb } from '../utils/http.js';

const router = Router();
router.post('/send-otp', requireDb, otpIpLimiter, otpPhoneLimiter, sendOtp);
router.post('/verify-otp', requireDb, otpIpLimiter, verifyOtp);
export default router;
