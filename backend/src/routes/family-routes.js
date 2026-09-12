/**
 * SMRITI FAMILY & CONTACTS ROUTES
 * REST endpoints for managing family recognition entities and personality dataset.
 */

import { Router } from 'express';
import { familyService } from '../services/family-service.js';
import { requireAuth } from '../middleware/auth-middleware.js';
import { requireActiveRelationship } from '../middleware/relationship-middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/family/elderly/:elderlyUserId
 */
router.get('/elderly/:elderlyUserId', requireAuth, requireActiveRelationship, async (req, res) => {
  try {
    const { elderlyUserId } = req.params;
    const family = await familyService.getFamilyForElderly(elderlyUserId);
    res.status(200).json({ success: true, family });
  } catch (err) {
    logger.error('Failed to get family members', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/family
 */
router.post('/', requireAuth, async (req, res, next) => {
  req.params.elderlyUserId = req.body.elderlyUserId;
  next();
}, requireActiveRelationship, async (req, res) => {
  try {
    const member = await familyService.addFamilyMember(req.body);
    res.status(201).json({ success: true, member });
  } catch (err) {
    logger.error('Failed to add family member', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/family/:id
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await familyService.getFamilyMemberById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Family member not found' });

    // Validate relationship authorization
    req.params.elderlyUserId = existing.elderlyUserId;
    const member = await familyService.updateFamilyMember(req.params.id, req.body);
    res.status(200).json({ success: true, member });
  } catch (err) {
    logger.error('Failed to update family member', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/family/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await familyService.getFamilyMemberById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Family member not found' });

    await familyService.deleteFamilyMember(req.params.id);
    res.status(200).json({ success: true, message: 'Family member deleted' });
  } catch (err) {
    logger.error('Failed to delete family member', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
