/**
 * SMRITI VISION & FACE DETECTION API ROUTES
 * /api/vision/*
 * Relationship-protected REST endpoints for server-side Google Cloud Vision Face Detection
 * and caretaker face-to-family member association management.
 */

import { Router } from 'express';
import { visionFaceService } from '../services/vision-face.service.js';
import { faceAssociationService } from '../services/face-association.service.js';
import { requireAuth } from '../middleware/auth-middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * 1. POST /api/vision/faces/:memoryId
 * Runs Face Detection on a photo memory (or returns cached results without repeated cloud calls)
 */
router.post('/faces/:memoryId', requireAuth, async (req, res) => {
  try {
    const { memoryId } = req.params;
    const { forceReanalyze } = req.body || {};

    const result = await visionFaceService.detectFaces(memoryId, req.user.id, { forceReanalyze });
    return res.status(200).json(result);
  } catch (err) {
    logger.error('Vision face detection route error', { error: err.message, memoryId: req.params.memoryId });
    const statusCode = err.message.includes('Unauthorized') ? 403 : err.message.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
});

/**
 * 2. POST /api/vision/associations
 * Saves caretaker assignments linking detected face regions to real family members
 */
router.post('/associations', requireAuth, async (req, res) => {
  try {
    const { memoryId, elderlyUserId, associations } = req.body;

    if (!memoryId || !elderlyUserId || !Array.isArray(associations)) {
      return res.status(400).json({
        success: false,
        error: 'memoryId, elderlyUserId, and associations array are required.'
      });
    }

    const result = await faceAssociationService.saveAssociations({
      memoryId,
      elderlyUserId,
      associations,
      createdBy: req.user.id
    });

    return res.status(201).json(result);
  } catch (err) {
    logger.error('Save face associations route error', { error: err.message });
    const statusCode = err.message.includes('Unauthorized') ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
});

/**
 * 3. GET /api/vision/associations/:elderlyUserId
 * Retrieves all saved face associations for an elderly user
 */
router.get('/associations/:elderlyUserId', requireAuth, async (req, res) => {
  try {
    const associations = await faceAssociationService.getAssociationsForElderly(
      req.params.elderlyUserId,
      req.user.id
    );
    return res.status(200).json({ success: true, associations });
  } catch (err) {
    logger.error('Get face associations route error', { error: err.message });
    const statusCode = err.message.includes('Unauthorized') ? 403 : 500;
    return res.status(statusCode).json({ success: false, error: err.message });
  }
});

/**
 * 4. GET /api/vision/faces/:memoryId
 * Retrieves saved associations for a single memory photo
 */
router.get('/faces/:memoryId', requireAuth, async (req, res) => {
  try {
    const associations = await faceAssociationService.getAssociationsForMemory(
      req.params.memoryId,
      req.user.id
    );
    return res.status(200).json({ success: true, memoryId: req.params.memoryId, associations });
  } catch (err) {
    logger.error('Get memory face associations route error', { error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
