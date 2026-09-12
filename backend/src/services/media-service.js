/**
 * SMRITI MEDIA & MEMORY VAULT SERVICE
 * Manages media binary storage with Supabase Storage (smriti-media) as the production private vault,
 * Cloud Firestore as the authoritative metadata store, and relationship-aware RBAC security guards.
 * In production, strictly interacts with Supabase Storage & Cloud Firestore with zero local disk fallback.
 */

import { firestoreDb, isFirebaseLive } from '../config/firebase-admin.js';
import { isProduction, shouldUseLocalFallback } from '../config/env.js';
import { createMemoryModel } from '../models/memory.model.js';
import { relationshipService } from './relationship-service.js';
import { storageService } from './storage/storage-service.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const LOCAL_MEMORIES_PATH = path.join(DATA_DIR, 'memories.json');

let localMemories = new Map();

function initLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
    }
    if (fs.existsSync(LOCAL_MEMORIES_PATH)) {
      const raw = fs.readFileSync(LOCAL_MEMORIES_PATH, 'utf-8');
      const data = JSON.parse(raw || '{}');
      Object.entries(data).forEach(([k, v]) => localMemories.set(k, v));
    }
  } catch (e) {
    logger.warn('Failed to read local memories file', { error: e.message });
  }
}

function persistLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
    }
    const obj = {};
    for (const [k, v] of localMemories.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(LOCAL_MEMORIES_PATH, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    // Read-only serverless environment fallback
  }
}

initLocalStorage();

export const mediaService = {
  /**
   * Saves uploaded binary file to Supabase Storage (Production private vault)
   * and persists metadata to Cloud Firestore.
   */
  async saveUploadedFile({ fileBuffer, elderlyUserId, uploadedBy, type, title, description, originalName, mimeType, size, tags }) {
    logger.info('[UPLOAD_START]', {
      elderlyUserId,
      uploadedBy,
      type,
      originalName,
      mimeType,
      size: size || fileBuffer?.length
    });

    if (!elderlyUserId) {
      logger.error('[UPLOAD_FAILED] stage=VALIDATION error="Target elderlyUserId is required"');
      throw new Error('Target elderlyUserId is required');
    }
    if (!fileBuffer) {
      logger.error('[UPLOAD_FAILED] stage=VALIDATION error="File buffer is required"');
      throw new Error('File buffer is required');
    }

    logger.info('[AUTH_VERIFIED]', { uploadedBy, elderlyUserId });

    // 1. Verify relationship authorization
    if (uploadedBy !== elderlyUserId) {
      const isAuthorized = await relationshipService.hasActiveRelationship(uploadedBy, elderlyUserId);
      if (!isAuthorized) {
        logger.error('[UPLOAD_FAILED] stage=RELATIONSHIP_VERIFIED error="Unauthorized relationship"', { uploadedBy, elderlyUserId });
        throw new Error('Unauthorized: An active accepted relationship is required to upload media for this elderly user.');
      }
    }
    logger.info('[RELATIONSHIP_VERIFIED]', { uploadedBy, elderlyUserId });

    // 2. Generate canonical Memory ID and storage path BEFORE uploading
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const cleanFileName = (originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const mediaType = type || (mimeType?.startsWith('video/') ? 'video' : mimeType?.startsWith('audio/') ? 'audio' : 'photo');
    const storagePath = `elderly/${elderlyUserId}/${mediaType}s/${memoryId}_${cleanFileName}`;

    logger.info('[MEMORY_ID_CREATED]', { memoryId, storagePath, mediaType });

    // 3. Production Media Vault: Supabase Storage upload
    logger.info('[SUPABASE_UPLOAD_STARTED]', { storagePath, size: fileBuffer.length, mimeType });
    let uploadResult = null;
    try {
      uploadResult = await storageService.upload({
        storagePath,
        fileBuffer,
        mimeType: mimeType || 'application/octet-stream'
      });
      logger.info('[SUPABASE_UPLOAD_COMPLETED]', {
        storagePath,
        provider: uploadResult.storageProvider,
        bucket: uploadResult.storageBucket
      });
    } catch (uploadErr) {
      logger.error('[UPLOAD_FAILED] stage=SUPABASE_UPLOAD_STARTED', {
        error: uploadErr.message,
        storagePath
      });
      throw new Error(`Media storage transfer failed: ${uploadErr.message}`);
    }

    // 4. Verify Supabase object exists
    const exists = await storageService.exists({
      storagePath,
      storageProvider: uploadResult.storageProvider,
      storageBucket: uploadResult.storageBucket
    });
    logger.info('[SUPABASE_OBJECT_VERIFIED]', { storagePath, verified: exists });

    // 5. Create Canonical Metadata Model
    const memory = createMemoryModel({
      id: memoryId,
      elderlyUserId,
      uploadedBy,
      type: mediaType,
      title: title || originalName || 'Family Memory',
      description: description || '',
      storageProvider: uploadResult.storageProvider,
      storageBucket: uploadResult.storageBucket,
      storagePath,
      mimeType: mimeType || 'application/octet-stream',
      size: size || fileBuffer.length,
      tags: tags || [],
      cloudBacked: uploadResult.cloudBacked
    });

    // 6. Cloud Firestore Persistence (Authoritative Source of Truth) with ORPHAN CLEANUP GUARD
    logger.info('[FIRESTORE_METADATA_STARTED]', { memoryId, storagePath });
    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('memories').doc(memory.id).set(memory);
        logger.info('[FIRESTORE_METADATA_COMPLETED]', { id: memory.id, provider: memory.storageProvider });
      } catch (err) {
        logger.error('[UPLOAD_FAILED] stage=FIRESTORE_METADATA_STARTED - attempting orphan cleanup', {
          error: err.message,
          storagePath
        });

        // Cleanup orphaned uploaded storage object to prevent leaks
        try {
          await storageService.delete({
            storagePath: memory.storagePath,
            storageProvider: memory.storageProvider,
            storageBucket: memory.storageBucket
          });
          logger.info('[ORPHAN_CLEANUP_SUCCESS]', { storagePath: memory.storagePath });
        } catch (cleanupErr) {
          logger.error('[ORPHAN_CLEANUP_FAILED]', { storagePath: memory.storagePath, error: cleanupErr.message });
        }

        throw new Error(`Failed to finalize memory metadata record: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localMemories.set(memory.id, memory);
      persistLocalStorage();
    }

    const runtimeUrl = `/api/media/file/${memory.storagePath}`;
    logger.info('[RUNTIME_URL_GENERATED]', { runtimeUrl });
    logger.info('[UPLOAD_RESPONSE_SENT]', { memoryId: memory.id, status: 201 });

    return {
      ...memory,
      runtimeUrl
    };
  },

  /**
   * Records media metadata after external/direct file upload
   */
  async saveMediaMetadata(data) {
    const memory = createMemoryModel(data);

    // Verify relationship authorization
    if (memory.uploadedBy !== memory.elderlyUserId) {
      const isAuthorized = await relationshipService.hasActiveRelationship(memory.uploadedBy, memory.elderlyUserId);
      if (!isAuthorized) {
        throw new Error('Unauthorized: An active accepted relationship is required to upload media for this elderly user.');
      }
    }

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('memories').doc(memory.id).set(memory);
      } catch (err) {
        logger.error('Cloud Firestore saveMediaMetadata error', { errorCode: err.code, error: err.message });
        throw new Error(`Failed to save memory metadata: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localMemories.set(memory.id, memory);
      persistLocalStorage();
    }

    logger.info('Media metadata saved successfully', { id: memory.id, type: memory.type, elderlyUserId: memory.elderlyUserId });
    return {
      ...memory,
      runtimeUrl: `/api/media/file/${memory.storagePath}`
    };
  },

  /**
   * Retrieves memories for an elderly user with relationship verification
   */
  async getMemoriesForElderly(elderlyUserId, callerId) {
    if (callerId !== elderlyUserId) {
      const isAuthorized = await relationshipService.hasActiveRelationship(callerId, elderlyUserId);
      if (!isAuthorized) {
        throw new Error('Access Forbidden: You are not authorized to view memory vault items for this elderly user.');
      }
    }

    let items = [];
    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('memories')
          .where('elderlyUserId', '==', elderlyUserId)
          .get();
        items = snap.docs.map(d => d.data());
        return items.map(m => ({
          ...m,
          runtimeUrl: `/api/media/file/${m.storagePath}`
        }));
      } catch (err) {
        logger.error('Cloud Firestore getMemoriesForElderly error', { elderlyUserId, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore query failed: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      items = Array.from(localMemories.values()).filter(m => m.elderlyUserId === elderlyUserId);
      return items.map(m => ({
        ...m,
        runtimeUrl: `/api/media/file/${m.storagePath}`
      }));
    }

    return [];
  },

  /**
   * Streams binary media from Supabase Storage or Firebase Legacy
   */
  async getMediaStreamOrFile(storagePath, callerId) {
    if (!storagePath) throw new Error('storagePath is required');

    // Extract elderlyUserId from path: elderly/{elderlyUserId}/...
    const parts = storagePath.split('/');
    if (parts.length >= 2 && parts[0] === 'elderly') {
      const elderlyUserId = parts[1];
      if (callerId && callerId !== elderlyUserId) {
        const isAuthorized = await relationshipService.hasActiveRelationship(callerId, elderlyUserId);
        if (!isAuthorized) {
          throw new Error('Access Forbidden: You are not authorized to access this media file.');
        }
      }
    }

    // Find memory record to determine storageProvider
    let memory = null;
    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('memories').where('storagePath', '==', storagePath).limit(1).get();
        if (!snap.empty) {
          memory = snap.docs[0].data();
        }
      } catch (e) {
        logger.error('Cloud Firestore lookup error in getMediaStreamOrFile', { storagePath, error: e.message });
      }
    }

    if (!memory && shouldUseLocalFallback(isFirebaseLive)) {
      memory = Array.from(localMemories.values()).find(m => m.storagePath === storagePath);
    }

    const storageProvider = memory?.storageProvider || 'supabase';
    const storageBucket = memory?.storageBucket || 'smriti-media';

    return storageService.download({
      storagePath,
      storageProvider,
      storageBucket
    });
  },

  /**
   * Deletes a memory item from Supabase/Firebase Storage and Cloud Firestore
   */
  async deleteMemory(memoryId, callerId) {
    let memory = null;
    if (isFirebaseLive && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('memories').doc(memoryId).get();
        if (doc.exists) memory = doc.data();
      } catch (e) {
        logger.error('Cloud Firestore get memory before delete error', { memoryId, error: e.message });
      }
    }

    if (!memory && shouldUseLocalFallback(isFirebaseLive)) {
      memory = localMemories.get(memoryId);
    }

    if (!memory) throw new Error('Memory item not found');

    if (memory.elderlyUserId !== callerId && memory.uploadedBy !== callerId) {
      const isAuthorized = await relationshipService.hasActiveRelationship(callerId, memory.elderlyUserId);
      if (!isAuthorized) {
        throw new Error('Unauthorized: You cannot delete this memory item.');
      }
    }

    // Delete from binary storage provider
    if (memory.storagePath) {
      await storageService.delete({
        storagePath: memory.storagePath,
        storageProvider: memory.storageProvider || 'supabase',
        storageBucket: memory.storageBucket || 'smriti-media'
      });
    }

    // Delete from Firestore
    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('memories').doc(memoryId).delete();
      } catch (err) {
        logger.error('Cloud Firestore deleteMemory error', { memoryId, error: err.message });
        throw new Error(`Cloud Firestore delete failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localMemories.delete(memoryId);
      persistLocalStorage();
    }

    logger.info('Memory metadata deleted', { memoryId });
    return { success: true };
  }
};
