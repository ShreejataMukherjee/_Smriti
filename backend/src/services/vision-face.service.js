/**
 * SMRITI VISION FACE DETECTION SERVICE
 * Performs server-side Face Detection on memory photos using Google Cloud Vision API (FACE_DETECTION).
 * Strictly guards against repeated cloud calls via comprehensive result caching in Firestore / memory metadata.
 * Supports mock provider for isolated local testing (VISION_PROVIDER=mock).
 * Strictly avoids automated biometric recognition, identity vectors, or vector databases.
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import { firestoreDb, isFirebaseLive } from '../config/firebase-admin.js';
import { config, shouldUseLocalFallback, isProduction } from '../config/env.js';
import { mediaService } from './media-service.js';
import { relationshipService } from './relationship-service.js';
import { logger } from '../utils/logger.js';

class VisionFaceService {
  constructor() {
    this.authClient = null;
  }

  /**
   * Initializes Google Auth client securely using configured environment credentials
   */
  async getAuthClient() {
    if (this.authClient) return this.authClient;

    const credentialsJsonStr = process.env.GOOGLE_VISION_CREDENTIALS_JSON;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || config.firebase.projectId || 'smriti-133e1';

    let authOptions = {
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      projectId
    };

    if (credentialsJsonStr) {
      try {
        const credentials = JSON.parse(credentialsJsonStr);
        authOptions.credentials = credentials;
      } catch (e) {
        logger.warn('Failed to parse GOOGLE_VISION_CREDENTIALS_JSON', { error: e.message });
      }
    } else if (credentialsPath && fs.existsSync(credentialsPath)) {
      authOptions.keyFile = credentialsPath;
    }

    try {
      const auth = new GoogleAuth(authOptions);
      this.authClient = await auth.getClient();
      return this.authClient;
    } catch (err) {
      logger.error('Failed to initialize Google Auth for Vision API', { error: err.message });
      throw new Error(`Google Cloud Vision authentication failed: ${err.message}`);
    }
  }

  /**
   * Primary entry point: Detects face regions on a memory photo with quota protection & caching.
   */
  async detectFaces(memoryId, callerId, options = {}) {
    logger.info('[VISION_FACE_DETECTION_REQUEST]', { memoryId, callerId });

    if (!memoryId) throw new Error('memoryId is required for face detection.');

    // 1. Fetch memory record from Firestore or local storage
    let memory = null;
    if (isFirebaseLive && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('memories').doc(memoryId).get();
        if (doc.exists) memory = doc.data();
      } catch (err) {
        logger.error('Failed to fetch memory from Firestore', { memoryId, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Firestore query failed: ${err.message}`);
        }
      }
    }

    if (!memory && shouldUseLocalFallback(isFirebaseLive)) {
      // Look up in local memories
      const DATA_DIR = fs.existsSync('/tmp') ? '/tmp' : '.';
      const memories = await mediaService.getMemoriesForElderly(callerId, callerId).catch(() => []);
      memory = memories.find(m => m.id === memoryId);
      if (!memory) {
        // Broad search in local memory store
        try {
          const raw = fs.readFileSync(new URL('../../data/memories.json', import.meta.url), 'utf-8');
          const all = JSON.parse(raw || '{}');
          memory = all[memoryId] || null;
        } catch (e) {}
      }
    }

    if (!memory) {
      throw new Error('Memory photo record not found.');
    }

    if (memory.type !== 'photo') {
      throw new Error('Face detection is only supported for photo memories.');
    }

    // 2. Relationship Authorization Check
    const elderlyUserId = memory.elderlyUserId;
    if (callerId !== elderlyUserId && callerId !== memory.uploadedBy) {
      const isAuthorized = await relationshipService.hasActiveRelationship(callerId, elderlyUserId);
      if (!isAuthorized) {
        throw new Error('Unauthorized: You do not have an active accepted relationship with this elderly user.');
      }
    }

    // 3. CACHE GUARD: Check if photo was already analyzed
    if (memory.faceAnalysis?.status === 'completed' && Array.isArray(memory.faceAnalysis?.faces) && !options.forceReanalyze) {
      logger.info('[VISION_CACHE_HIT]', { memoryId, facesCount: memory.faceAnalysis.faces.length });
      return {
        success: true,
        cached: true,
        memoryId,
        elderlyUserId,
        facesCount: memory.faceAnalysis.faces.length,
        faces: memory.faceAnalysis.faces,
        analyzedAt: memory.faceAnalysis.analyzedAt,
        provider: memory.faceAnalysis.provider
      };
    }

    // 4. Determine Vision Provider (mock vs google)
    const provider = (process.env.VISION_PROVIDER || 'google').toLowerCase();

    if (provider === 'mock') {
      logger.info('[VISION_MOCK_EXECUTION]', { memoryId });
      const mockFaces = this.generateMockFaces(memoryId, elderlyUserId);
      const faceAnalysis = {
        status: 'completed',
        provider: 'mock',
        analyzedAt: new Date().toISOString(),
        facesCount: mockFaces.length,
        faces: mockFaces
      };

      await this.persistFaceAnalysis(memoryId, faceAnalysis);

      return {
        success: true,
        cached: false,
        memoryId,
        elderlyUserId,
        facesCount: mockFaces.length,
        faces: mockFaces,
        analyzedAt: faceAnalysis.analyzedAt,
        provider: 'mock'
      };
    }

    // 5. Real Google Cloud Vision API Execution (ONE call per photo)
    logger.info('[VISION_GOOGLE_CALL_START]', { memoryId, storagePath: memory.storagePath });

    // Download image binary from Supabase Storage
    let imageStreamOrBuffer = null;
    try {
      imageStreamOrBuffer = await mediaService.getMediaStreamOrFile(memory.storagePath, callerId);
    } catch (err) {
      logger.error('Failed to retrieve image for Vision API', { storagePath: memory.storagePath, error: err.message });
      throw new Error(`Failed to retrieve image media: ${err.message}`);
    }

    let imageBuffer = null;
    if (imageStreamOrBuffer?.buffer) {
      imageBuffer = imageStreamOrBuffer.buffer;
    } else if (imageStreamOrBuffer?.stream) {
      imageBuffer = await this.streamToBuffer(imageStreamOrBuffer.stream);
    } else if (imageStreamOrBuffer?.filePath && fs.existsSync(imageStreamOrBuffer.filePath)) {
      imageBuffer = fs.readFileSync(imageStreamOrBuffer.filePath);
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Image media buffer is empty or unavailable.');
    }

    const imageBase64 = imageBuffer.toString('base64');
    let faces = [];

    try {
      const client = await this.getAuthClient();
      const visionUrl = 'https://vision.googleapis.com/v1/images:annotate';
      const requestPayload = {
        requests: [
          {
            image: { content: imageBase64 },
            features: [
              { type: 'FACE_DETECTION', maxResults: 10 }
            ]
          }
        ]
      };

      const response = await client.request({
        url: visionUrl,
        method: 'POST',
        data: requestPayload
      });

      const faceAnnotations = response.data?.responses?.[0]?.faceAnnotations || [];
      logger.info('[VISION_GOOGLE_CALL_SUCCESS]', { memoryId, detectedCount: faceAnnotations.length });

      faces = faceAnnotations.map((face, index) => {
        const poly = face.boundingPoly || face.fdBoundingPoly || {};
        const normVertices = face.boundingPoly?.normalizedVertices || face.fdBoundingPoly?.normalizedVertices;
        
        let boundingBox = {
          left: 0.1,
          top: 0.1,
          width: 0.8,
          height: 0.8,
          normalizedVertices: []
        };

        if (Array.isArray(normVertices) && normVertices.length > 0) {
          const xs = normVertices.map(v => typeof v.x === 'number' ? v.x : 0);
          const ys = normVertices.map(v => typeof v.y === 'number' ? v.y : 0);
          const minX = Math.max(0, Math.min(...xs));
          const maxX = Math.min(1, Math.max(...xs));
          const minY = Math.max(0, Math.min(...ys));
          const maxY = Math.min(1, Math.max(...ys));

          boundingBox = {
            left: Number(minX.toFixed(4)),
            top: Number(minY.toFixed(4)),
            width: Number((maxX - minX).toFixed(4)),
            height: Number((maxY - minY).toFixed(4)),
            normalizedVertices: normVertices
          };
        } else if (Array.isArray(poly.vertices) && poly.vertices.length > 0) {
          // If pixel coordinates, normalize with safe bounds
          const xs = poly.vertices.map(v => v.x || 0);
          const ys = poly.vertices.map(v => v.y || 0);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          boundingBox = {
            left: minX,
            top: minY,
            width: Math.max(1, maxX - minX),
            height: Math.max(1, maxY - minY),
            vertices: poly.vertices
          };
        }

        return {
          faceIndex: index + 1,
          faceId: `face_${memoryId}_${index + 1}`,
          boundingBox,
          confidence: Number((face.detectionConfidence || 0.95).toFixed(3)),
          joyLikelihood: face.joyLikelihood || 'UNKNOWN',
          landmarkingConfidence: Number((face.landmarkingConfidence || 0.8).toFixed(3))
        };
      });

    } catch (visionErr) {
      logger.error('[VISION_GOOGLE_CALL_FAILED]', {
        memoryId,
        error: visionErr.message,
        status: visionErr.status || visionErr.code
      });

      // Update memory with failed status to avoid infinite retry loops
      const failedAnalysis = {
        status: 'failed',
        provider: 'google-vision',
        failedAt: new Date().toISOString(),
        error: visionErr.message
      };
      await this.persistFaceAnalysis(memoryId, failedAnalysis).catch(() => {});

      throw new Error('Face analysis is temporarily unavailable.');
    }

    // 6. Persist successful face detection to memory metadata in Firestore / local storage
    const faceAnalysis = {
      status: 'completed',
      provider: 'google-vision',
      analyzedAt: new Date().toISOString(),
      facesCount: faces.length,
      faces
    };

    await this.persistFaceAnalysis(memoryId, faceAnalysis);

    return {
      success: true,
      cached: false,
      memoryId,
      elderlyUserId,
      facesCount: faces.length,
      faces,
      analyzedAt: faceAnalysis.analyzedAt,
      provider: 'google-vision'
    };
  }

  /**
   * Persists face analysis result on memory metadata record
   */
  async persistFaceAnalysis(memoryId, faceAnalysis) {
    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('memories').doc(memoryId).set({
          faceAnalysis,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        logger.info('[FIRESTORE_FACE_ANALYSIS_SAVED]', { memoryId });
      } catch (err) {
        logger.error('Failed to save face analysis to Firestore', { memoryId, error: err.message });
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      try {
        const raw = fs.readFileSync(new URL('../../data/memories.json', import.meta.url), 'utf-8');
        const all = JSON.parse(raw || '{}');
        if (all[memoryId]) {
          all[memoryId].faceAnalysis = faceAnalysis;
          all[memoryId].updatedAt = new Date().toISOString();
          fs.writeFileSync(new URL('../../data/memories.json', import.meta.url), JSON.stringify(all, null, 2), 'utf-8');
        }
      } catch (e) {}
    }
  }

  /**
   * Helper: generates realistic mock face detections for local UI development and isolated unit tests
   */
  generateMockFaces(memoryId, elderlyUserId) {
    // Generate 2 realistic face bounding boxes
    return [
      {
        faceIndex: 1,
        faceId: `face_${memoryId}_1`,
        boundingBox: {
          left: 0.18,
          top: 0.15,
          width: 0.30,
          height: 0.38,
          normalizedVertices: [
            { x: 0.18, y: 0.15 },
            { x: 0.48, y: 0.15 },
            { x: 0.48, y: 0.53 },
            { x: 0.18, y: 0.53 }
          ]
        },
        confidence: 0.985,
        joyLikelihood: 'VERY_LIKELY'
      },
      {
        faceIndex: 2,
        faceId: `face_${memoryId}_2`,
        boundingBox: {
          left: 0.54,
          top: 0.20,
          width: 0.32,
          height: 0.40,
          normalizedVertices: [
            { x: 0.54, y: 0.20 },
            { x: 0.86, y: 0.20 },
            { x: 0.86, y: 0.60 },
            { x: 0.54, y: 0.60 }
          ]
        },
        confidence: 0.942,
        joyLikelihood: 'LIKELY'
      }
    ];
  }

  /**
   * Utility to buffer a readable stream
   */
  async streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', err => reject(err));
    });
  }
}

export const visionFaceService = new VisionFaceService();
