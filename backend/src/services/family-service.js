/**
 * SMRITI FAMILY & CONTACTS SERVICE
 * Manages family members and personality dataset.
 * In production, strictly interacts with Cloud Firestore (familyMembers collection).
 * Local disk fallback is strictly isolated to offline development/testing without cloud credentials.
 */

import { firestoreDb, isFirebaseLive } from '../config/firebase-admin.js';
import { isProduction, shouldUseLocalFallback } from '../config/env.js';
import { createFamilyMemberModel } from '../models/family-member.model.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const FAMILY_FILE = path.join(DATA_DIR, 'family_members.json');

const localFamily = new Map();

function initLocalStore() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(FAMILY_FILE)) {
      const data = JSON.parse(fs.readFileSync(FAMILY_FILE, 'utf-8'));
      Object.entries(data).forEach(([k, v]) => localFamily.set(k, v));
    }
  } catch (e) {
    logger.warn('Failed to load local family store', { error: e.message });
  }
}

function persistLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    const obj = {};
    for (const [k, v] of localFamily.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(FAMILY_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    // Read-only serverless environment fallback
  }
}

initLocalStore();

export const familyService = {
  /**
   * Retrieves all family members for an elderly user
   */
  async getFamilyForElderly(elderlyUserId) {
    if (!elderlyUserId) return [];

    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('familyMembers')
          .where('elderlyUserId', '==', elderlyUserId)
          .get();
        return snap.docs.map(d => d.data());
      } catch (err) {
        logger.error('Cloud Firestore getFamilyForElderly error', { elderlyUserId, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore family query failed: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      return Array.from(localFamily.values()).filter(f => f.elderlyUserId === elderlyUserId);
    }

    return [];
  },

  /**
   * Retrieves a single family member by ID
   */
  async getFamilyMemberById(id) {
    if (!id) return null;

    if (isFirebaseLive && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('familyMembers').doc(id).get();
        if (doc.exists) return doc.data();
        return null;
      } catch (err) {
        logger.error('Cloud Firestore getFamilyMemberById error', { id, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore query failed for family member ${id}: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      return localFamily.get(id) || null;
    }

    return null;
  },

  /**
   * Creates a new family member record
   */
  async addFamilyMember(data) {
    if (!data.elderlyUserId) throw new Error('elderlyUserId is required');
    if (!data.name) throw new Error('Family member name is required');

    const member = createFamilyMemberModel(data);

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('familyMembers').doc(member.id).set(member);
      } catch (err) {
        logger.error('Cloud Firestore addFamilyMember error', { id: member.id, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore family member creation failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localFamily.set(member.id, member);
      persistLocalStorage();
    }

    logger.info('Family member added', { id: member.id, name: member.name });
    return member;
  },

  /**
   * Updates an existing family member
   */
  async updateFamilyMember(id, updates) {
    const existing = await this.getFamilyMemberById(id);
    if (!existing) throw new Error('Family member not found');

    const updated = {
      ...existing,
      ...updates,
      id,
      elderlyUserId: existing.elderlyUserId,
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('familyMembers').doc(id).set(updated, { merge: true });
      } catch (err) {
        logger.error('Cloud Firestore updateFamilyMember error', { id, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore family member update failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localFamily.set(id, updated);
      persistLocalStorage();
    }

    logger.info('Family member updated', { id });
    return updated;
  },

  /**
   * Deletes a family member
   */
  async deleteFamilyMember(id) {
    const existing = await this.getFamilyMemberById(id);
    if (!existing) throw new Error('Family member not found');

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('familyMembers').doc(id).delete();
      } catch (err) {
        logger.error('Cloud Firestore deleteFamilyMember error', { id, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore family member deletion failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localFamily.delete(id);
      persistLocalStorage();
    }

    logger.info('Family member deleted', { id });
    return { success: true, id };
  }
};
