/**
 * SMRITI AUTHENTICATION ROUTES
 * /api/auth/*
 */

import { Router } from 'express';
import { authController } from '../controllers/auth-controller.js';
import { requireAuth } from '../middleware/auth-middleware.js';

const router = Router();

// Public auth endpoints
router.post('/google', authController.googleAuth);
router.post('/logout', authController.logout);

// Protected session check
router.get('/session', requireAuth, authController.getSession);

export default router;
