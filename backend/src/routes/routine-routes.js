/**
 * SMRITI DAILY ROUTINE ROUTES
 * REST endpoints for managing daily routine schedule anchors.
 */

import { Router } from 'express';
import { routineService } from '../services/routine-service.js';
import { requireAuth } from '../middleware/auth-middleware.js';
import { requireActiveRelationship } from '../middleware/relationship-middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/routine/elderly/:elderlyUserId
 */
router.get('/elderly/:elderlyUserId', requireAuth, requireActiveRelationship, async (req, res) => {
  try {
    const { elderlyUserId } = req.params;
    const routine = await routineService.getRoutineForElderly(elderlyUserId);
    res.status(200).json({ success: true, routine });
  } catch (err) {
    logger.error('Failed to get routines', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/routine
 */
router.post('/', requireAuth, async (req, res, next) => {
  req.params.elderlyUserId = req.body.elderlyUserId;
  next();
}, requireActiveRelationship, async (req, res) => {
  try {
    const item = await routineService.addRoutineItem(req.body);
    res.status(201).json({ success: true, item });
  } catch (err) {
    logger.error('Failed to add routine item', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/routine/:id
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await routineService.getRoutineItemById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Routine item not found' });

    req.params.elderlyUserId = existing.elderlyUserId;
    const item = await routineService.updateRoutineItem(req.params.id, req.body);
    res.status(200).json({ success: true, item });
  } catch (err) {
    logger.error('Failed to update routine item', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/routine/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await routineService.getRoutineItemById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Routine item not found' });

    await routineService.deleteRoutineItem(req.params.id);
    res.status(200).json({ success: true, message: 'Routine item deleted' });
  } catch (err) {
    logger.error('Failed to delete routine item', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
