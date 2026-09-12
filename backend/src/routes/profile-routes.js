/**
 * SMRITI ELDERLY PROFILE ROUTES
 * REST endpoints for reading and updating elderly personalization settings.
 */

import { Router } from 'express';
import { profileService } from '../services/profile-service.js';
import { requireAuth } from '../middleware/auth-middleware.js';
import { requireActiveRelationship } from '../middleware/relationship-middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/profile/:elderlyUserId
 */
router.get('/:elderlyUserId', requireAuth, requireActiveRelationship, async (req, res) => {
  try {
    const { elderlyUserId } = req.params;
    const profile = await profileService.getProfile(elderlyUserId);
    res.status(200).json({ success: true, profile });
  } catch (err) {
    logger.error('Failed to get elderly profile', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/profile/:elderlyUserId
 */
router.put('/:elderlyUserId', requireAuth, requireActiveRelationship, async (req, res) => {
  try {
    const { elderlyUserId } = req.params;
    const profile = await profileService.saveProfile(elderlyUserId, req.body);
    res.status(200).json({ success: true, profile });
  } catch (err) {
    logger.error('Failed to update elderly profile', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
