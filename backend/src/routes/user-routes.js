/**
 * SMRITI USER & RBAC ROUTES
 * /api/users/*
 */

import { Router } from 'express';
import { userController } from '../controllers/user-controller.js';
import { requireAuth } from '../middleware/auth-middleware.js';
import { requireRole } from '../middleware/rbac-middleware.js';

const router = Router();

// Current user profile
router.get('/me', requireAuth, userController.getMyProfile);
router.put('/profile', requireAuth, userController.updateMyProfile);

// Protected Elderly Space endpoint (RBAC: elderly_user only)
router.get('/senior-space/summary', requireAuth, requireRole(['elderly_user']), userController.getSeniorSpaceSummary);

// Protected Caretaker Studio endpoint (RBAC: caretaker only)
router.get('/caretaker-studio/summary', requireAuth, requireRole(['caretaker']), userController.getCaretakerStudioSummary);

// Protected Specialist Dashboard endpoint (RBAC: medical_specialist only)
router.get('/specialist-dashboard/summary', requireAuth, requireRole(['medical_specialist', 'healthcare_worker']), userController.getSpecialistDashboardSummary);

export default router;
