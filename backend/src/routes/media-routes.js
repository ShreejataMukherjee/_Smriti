/**
 * SMRITI MEDIA & MEMORY VAULT ROUTES
 * /api/media/*
 * Handles file uploads, metadata registration, and relationship-protected media streaming.
 */

import { Router } from 'express';
import multer from 'multer';
import { mediaService } from '../services/media-service.js';
import { requireAuth } from '../middleware/auth-middleware.js';
import { requireActiveRelationship } from '../middleware/relationship-middleware.js';
import { logger } from '../utils/logger.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

const router = Router();

/**
 * 1. POST /api/media/upload
 * Direct binary upload with progress tracking and automatic metadata persistence
 */
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No media file provided' });
    }

    const { elderlyUserId, type, title, description, tags } = req.body;
    if (!elderlyUserId) {
      return res.status(400).json({ success: false, error: 'Target elderlyUserId is required' });
    }

    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = [tags];
      }
    }

    const memory = await mediaService.saveUploadedFile({
      fileBuffer: file.buffer,
      elderlyUserId,
      uploadedBy: req.user.id,
      type,
      title: title || file.originalname,
      description: description || '',
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      tags: parsedTags
    });

    return res.status(201).json({
      success: true,
      message: 'Media uploaded and saved successfully',
      memory
    });
  } catch (err) {
    logger.error('Media upload error', err);
    return res.status(403).json({ success: false, error: err.message });
  }
});

/**
 * 2. POST /api/media/upload-metadata
 * Direct metadata registration (for external or modular clients)
 */
router.post('/upload-metadata', requireAuth, async (req, res) => {
  try {
    const { elderlyUserId, type, title, description, storagePath, mimeType, size, tags, language } = req.body;

    if (!elderlyUserId || !storagePath) {
      return res.status(400).json({ success: false, error: 'elderlyUserId and storagePath are required' });
    }

    const memory = await mediaService.saveMediaMetadata({
      elderlyUserId,
      uploadedBy: req.user.id,
      type,
      title,
      description,
      storagePath,
      mimeType,
      size,
      tags,
      language
    });

    return res.status(201).json({ success: true, message: 'Media metadata recorded successfully', memory });
  } catch (err) {
    return res.status(403).json({ success: false, error: err.message });
  }
});

/**
 * 3. GET /api/media/file/*
 * Streams authorized media files directly to the browser
 */
router.get('/file/*', async (req, res) => {
  try {
    const storagePath = req.params[0];
    if (!storagePath) {
      return res.status(400).json({ success: false, error: 'Missing storage path' });
    }

    // Attempt to extract session token from query, header, or cookie for media tags
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '') || req.headers['x-session-token'];
    let callerId = null;

    if (token) {
      try {
        const decodedStr = Buffer.from(token, 'base64url').toString('utf-8');
        const payload = JSON.parse(decodedStr);
        callerId = payload.uid;
      } catch (e) {}
    }

    const result = await mediaService.getMediaStreamOrFile(storagePath, callerId);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Media file not found' });
    }

    if (result.contentType) {
      res.setHeader('Content-Type', result.contentType);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (result.buffer) {
      return res.status(200).send(result.buffer);
    } else if (result.stream) {
      return result.stream.pipe(res);
    } else if (result.filePath) {
      return res.sendFile(result.filePath);
    }

    return res.status(404).json({ success: false, error: 'Media file not found' });
  } catch (err) {
    logger.error('Stream media file error', err);
    return res.status(403).json({ success: false, error: err.message });
  }
});

/**
 * 4. GET /api/media/elderly/:elderlyUserId
 * Retrieves memories for an elderly user (Relationship-Protected)
 */
router.get('/elderly/:elderlyUserId', requireAuth, requireActiveRelationship(), async (req, res) => {
  try {
    const memories = await mediaService.getMemoriesForElderly(req.params.elderlyUserId, req.user.id);
    return res.status(200).json({ success: true, memories });
  } catch (err) {
    return res.status(403).json({ success: false, error: err.message });
  }
});

/**
 * 5. DELETE /api/media/:id
 * Deletes memory metadata and physical file
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await mediaService.deleteMemory(req.params.id, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(403).json({ success: false, error: err.message });
  }
});

export default router;
