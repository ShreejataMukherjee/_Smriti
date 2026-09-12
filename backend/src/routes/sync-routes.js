/**
 * SMRITI OFFLINE SYNC API ROUTES
 * Batch session synchronization endpoint for offline elderly cognitive sessions.
 */

import express from 'express';
import { syncService } from '../services/sync-service.js';
import { requireAuth } from '../middleware/auth-middleware.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/sync/sessions
 * Batch ingest and sync offline-recorded cognitive sessions
 */
router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const { sessions } = req.body;
    const result = await syncService.syncOfflineSessions(sessions, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    logger.error('Error syncing offline sessions', err);
    return res.status(403).json({ success: false, error: err.message });
  }
});

export default router;
