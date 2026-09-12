/**
 * SMRITI RELATIONSHIP ROUTES
 * /api/relationships/*
 */

import { Router } from 'express';
import { relationshipService } from '../services/relationship-service.js';
import { requireAuth } from '../middleware/auth-middleware.js';
import { requireRole } from '../middleware/rbac-middleware.js';

const router = Router();

// 1. Caretaker or Healthcare Worker creates connection request to elderly user
router.post('/request', requireAuth, requireRole(['caretaker', 'healthcare_worker']), async (req, res) => {
  try {
    const elderlyTarget = req.body.elderlyTarget || req.body.elderlyEmail;
    const relationshipType = req.body.relationshipType;

    if (!elderlyTarget) {
      return res.status(400).json({ success: false, error: 'Target elderly email or ID is required' });
    }

    const relationship = await relationshipService.createConnectionRequest({
      caretakerId: req.user.id,
      elderlyTarget: String(elderlyTarget).trim(),
      relationshipType
    });

    return res.status(201).json({ success: true, message: 'Connection request sent successfully', relationship });
  } catch (err) {
    const message = err.message || 'Failed to create connection request';
    const isNotFound = message.includes('No registered elderly user found');
    const isConflict = message.includes('already exists') || message.includes('already pending');
    const isRoleError = message.includes('role elderly_user');

    const status = isNotFound ? 404 : 400;

    return res.status(status).json({ success: false, error: message });
  }
});

// 2. Caretaker / Healthcare Worker retrieves their connected elderly patients
router.get('/caretaker', requireAuth, requireRole(['caretaker', 'healthcare_worker']), async (req, res) => {
  try {
    const relationships = await relationshipService.getCaretakerRelationships(req.user.id);
    return res.status(200).json({ success: true, relationships });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Elderly user retrieves their active & pending caretaker relationships
router.get('/elderly', requireAuth, requireRole(['elderly_user']), async (req, res) => {
  try {
    const relationships = await relationshipService.getElderlyRelationships(req.user.id);
    return res.status(200).json({ success: true, relationships });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Elderly user responds to a connection request (accept / reject)
router.put('/:id/respond', requireAuth, requireRole(['elderly_user']), async (req, res) => {
  try {
    const { decision } = req.body; // 'accept' | 'reject'
    if (!['accept', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, error: "Decision must be 'accept' or 'reject'" });
    }

    const updated = await relationshipService.respondToRequest(req.params.id, req.user.id, decision);
    return res.status(200).json({ success: true, message: `Relationship ${decision}ed successfully`, relationship: updated });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Caretaker or Elderly user revokes an active connection
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const updated = await relationshipService.revokeConnection(req.params.id, req.user.id);
    return res.status(200).json({ success: true, message: 'Relationship revoked successfully', relationship: updated });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
