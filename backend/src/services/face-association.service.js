/**
 * SMRITI FACE ASSOCIATION SERVICE
 * Manages manual caretaker-to-family member assignments on detected face regions.
 * In production, strictly interacts with Cloud Firestore (faceAssociations collection).
 * Local disk fallback is strictly isolated to offline development/testing (!isProduction && !isFirebaseLive).
 */

import { firestoreDb, isFirebaseLive } from '../config/firebase-admin.js';
import { isProduction, shouldUseLocalFallback } from '../config/env.js';
import { createFaceAssociationModel } from '../models/face-association.model.js';
import { relationshipService } from './relationship-service.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const ASSOCIATIONS_FILE = path.join(DATA_DIR, 'face_associations.json');

const localAssociations = new Map();

function initLocalStore() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ASSOCIATIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ASSOCIATIONS_FILE, 'utf-8') || '{}');
      Object.entries(data).forEach(([k, v]) => localAssociations.set(k, v));
    }
  } catch (e) {
    logger.warn('Failed to load local face associations store', { error: e.message });
  }
}

function persistLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const obj = {};
    for (const [k, v] of localAssociations.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(ASSOCIATIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    // Read-only serverless environment fallback
  }
}

initLocalStore();

export const faceAssociationService = {
  /**
   * Saves or updates a list of face associations for a specific memory photo
   */
  async saveAssociations({ memoryId, elderlyUserId, associations = [], createdBy }) {
    if (!memoryId) throw new Error('memoryId is required');
    if (!elderlyUserId) throw new Error('elderlyUserId is required');
    if (!createdBy) throw new Error('createdBy is required');

    // 1. Verify relationship authorization
    if (createdBy !== elderlyUserId) {
      const isAuthorized = await relationshipService.hasActiveRelationship(createdBy, elderlyUserId);
      if (!isAuthorized) {
        throw new Error('Unauthorized: An active accepted relationship is required to manage face associations for this elderly user.');
      }
    }

    const savedRecords = [];

    for (const item of associations) {
      const model = createFaceAssociationModel({
        id: item.id || item.faceId,
        elderlyUserId,
        photoId: memoryId,
        personId: item.personId || null,
        personName: item.personName || 'Family Member',
        relationship: item.relationship || '',
        boundingBox: item.boundingBox || {},
        confidence: item.confidence || 0.95,
        joyLikelihood: item.joyLikelihood || 'UNKNOWN',
        createdBy
      });

      if (isFirebaseLive && firestoreDb) {
        try {
          await firestoreDb.collection('faceAssociations').doc(model.id).set(model);
        } catch (err) {
          logger.error('Cloud Firestore saveFaceAssociation error', { id: model.id, error: err.message });
          if (!shouldUseLocalFallback(isFirebaseLive)) {
            throw new Error(`Cloud Firestore face association write failed: ${err.message}`);
          }
        }
      }

      if (shouldUseLocalFallback(isFirebaseLive)) {
        localAssociations.set(model.id, model);
      }

      savedRecords.push(model);
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      persistLocalStorage();
    }

    // 2. Update parent memory metadata with association summary
    const associatedPeople = savedRecords
      .filter(r => r.personName && r.personName !== 'Unknown')
      .map(r => ({
        personId: r.personId,
        personName: r.personName,
        relationship: r.relationship,
        faceId: r.id
      }));

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('memories').doc(memoryId).set({
          associatedPeopleCount: associatedPeople.length,
          associatedPeople,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        logger.warn('Failed to update memory with associated people summary', { memoryId, error: e.message });
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      try {
        const raw = fs.readFileSync(new URL('../../data/memories.json', import.meta.url), 'utf-8');
        const all = JSON.parse(raw || '{}');
        if (all[memoryId]) {
          all[memoryId].associatedPeopleCount = associatedPeople.length;
          all[memoryId].associatedPeople = associatedPeople;
          all[memoryId].updatedAt = new Date().toISOString();
          fs.writeFileSync(new URL('../../data/memories.json', import.meta.url), JSON.stringify(all, null, 2), 'utf-8');
        }
      } catch (e) {}
    }

    logger.info('Face associations saved successfully', { memoryId, count: savedRecords.length });

    return {
      success: true,
      memoryId,
      elderlyUserId,
      associationsCount: savedRecords.length,
      associations: savedRecords
    };
  },

  /**
   * Retrieves all face associations for a specific memory photo
   */
  async getAssociationsForMemory(memoryId, callerId) {
    if (!memoryId) return [];

    let items = [];
    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('faceAssociations')
          .where('photoId', '==', memoryId)
          .get();
        items = snap.docs.map(d => d.data());
      } catch (err) {
        logger.error('Cloud Firestore getAssociationsForMemory error', { memoryId, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore query failed: ${err.message}`);
        }
      }
    }

    if (items.length === 0 && shouldUseLocalFallback(isFirebaseLive)) {
      items = Array.from(localAssociations.values()).filter(a => a.photoId === memoryId);
    }

    return items;
  },

  /**
   * Retrieves all face associations for an elderly user (for personalized quiz generation)
   */
  async getAssociationsForElderly(elderlyUserId, callerId) {
    if (!elderlyUserId) return [];

    // Relationship check if caller is specified and distinct
    if (callerId && callerId !== elderlyUserId) {
      const isAuthorized = await relationshipService.hasActiveRelationship(callerId, elderlyUserId);
      if (!isAuthorized) {
        throw new Error('Unauthorized: You do not have permission to view face associations for this user.');
      }
    }

    let items = [];
    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('faceAssociations')
          .where('elderlyUserId', '==', elderlyUserId)
          .get();
        items = snap.docs.map(d => d.data());
      } catch (err) {
        logger.error('Cloud Firestore getAssociationsForElderly error', { elderlyUserId, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore query failed: ${err.message}`);
        }
      }
    }

    if (items.length === 0 && shouldUseLocalFallback(isFirebaseLive)) {
      items = Array.from(localAssociations.values()).filter(a => a.elderlyUserId === elderlyUserId);
    }

    return items;
  },

  /**
   * Deletes a face association
   */
  async deleteAssociation(faceId, callerId) {
    if (!faceId) throw new Error('faceId is required');

    let existing = null;
    if (isFirebaseLive && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('faceAssociations').doc(faceId).get();
        if (doc.exists) existing = doc.data();
      } catch (e) {}
    }

    if (!existing && shouldUseLocalFallback(isFirebaseLive)) {
      existing = localAssociations.get(faceId);
    }

    if (!existing) return { success: true, message: 'Association already removed.' };

    if (callerId && callerId !== existing.elderlyUserId && callerId !== existing.createdBy) {
      const isAuthorized = await relationshipService.hasActiveRelationship(callerId, existing.elderlyUserId);
      if (!isAuthorized) {
        throw new Error('Unauthorized to delete this face association.');
      }
    }

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('faceAssociations').doc(faceId).delete();
      } catch (err) {
        logger.error('Cloud Firestore deleteFaceAssociation error', { faceId, error: err.message });
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localAssociations.delete(faceId);
      persistLocalStorage();
    }

    return { success: true, id: faceId };
  }
};
