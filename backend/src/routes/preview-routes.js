/**
 * SMRITI PREVIEW & PERSONALIZATION AGGREGATOR ROUTE
 * Aggregates all personalization datasets to power the Caretaker Experience Preview and Senior Space.
 */

import { Router } from 'express';
import { previewService } from '../services/preview-service.js';
import { requireAuth } from '../middleware/auth-middleware.js';
import { requireActiveRelationship } from '../middleware/relationship-middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/preview/:elderlyUserId
 */
router.get('/:elderlyUserId', requireAuth, requireActiveRelationship, async (req, res) => {
  try {
    const { elderlyUserId } = req.params;
    const callerId = req.user.id;
    const experience = await previewService.getElderlyExperience(elderlyUserId, callerId);
    res.status(200).json({ success: true, experience });
  } catch (err) {
    logger.error('Failed to get elderly preview experience', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
