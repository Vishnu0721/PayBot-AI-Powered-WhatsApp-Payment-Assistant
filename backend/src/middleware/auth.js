import jwt from 'jsonwebtoken';
import { Seller } from '../models/Seller.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';
import { readBearerToken } from '../utils/jwt.js';

export async function requireAuth(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) {
      throw new HttpError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw new HttpError(401, 'Your session has expired. Please sign in again.', 'INVALID_TOKEN');
    }

    if (!payload?.sellerId) {
      throw new HttpError(401, 'Your session has expired. Please sign in again.', 'INVALID_TOKEN');
    }

    const seller = await Seller.findOne({ sellerId: payload.sellerId });
    if (!seller) {
      throw new HttpError(401, 'Account not found. Please sign in again.', 'SELLER_NOT_FOUND');
    }

    req.seller = seller;
    req.sellerId = seller.sellerId;
    req.role = payload.role || 'owner';
    req.staffId = payload.staffId || null;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireOnboarded(req, res, next) {
  if (!req.seller?.businessName || !req.seller?.name) {
    return next(
      new HttpError(403, 'Finish setting up your business to continue.', 'ONBOARDING_REQUIRED'),
    );
  }
  next();
}

/** Owner of the business account (not invited staff). */
export function requireOwner(req, res, next) {
  if (req.role && req.role !== 'owner') {
    return next(
      new HttpError(403, 'Only the business owner can do that.', 'OWNER_REQUIRED'),
    );
  }
  next();
}

/** Owner or admin staff. */
export function requireOwnerOrAdmin(req, res, next) {
  if (req.role === 'collector') {
    return next(
      new HttpError(403, 'You do not have permission for this action.', 'FORBIDDEN'),
    );
  }
  next();
}
