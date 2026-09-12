/**
 * SMRITI RELATIONSHIP SERVICE
 * Manages many-to-many relationships between Caretakers and Elderly Users.
 * In production, strictly interacts with Cloud Firestore (relationships collection).
 * Local disk fallback is strictly isolated to offline development/testing without cloud credentials.
 */

import { firestoreDb, isFirebaseLive } from '../config/firebase-admin.js';
import { isProduction, shouldUseLocalFallback } from '../config/env.js';
import { createRelationshipModel } from '../models/relationship.model.js';
import { userService } from './user-service.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_RELATIONSHIPS_PATH = path.join(__dirname, '../../data/relationships.json');

// In-memory store for offline dev/test only
let localRelationships = new Map();

function initLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    const dir = path.dirname(LOCAL_RELATIONSHIPS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(LOCAL_RELATIONSHIPS_PATH)) {
      const raw = fs.readFileSync(LOCAL_RELATIONSHIPS_PATH, 'utf-8');
      const data = JSON.parse(raw || '{}');
      Object.entries(data).forEach(([k, v]) => localRelationships.set(k, v));
    }
  } catch (e) {
    logger.warn('Failed to read local relationships file', { error: e.message });
  }
}

function persistLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    const dir = path.dirname(LOCAL_RELATIONSHIPS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = {};
    for (const [k, v] of localRelationships.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(LOCAL_RELATIONSHIPS_PATH, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    // Read-only serverless environment fallback
  }
}

initLocalStorage();

export const relationshipService = {
  /**
   * Retrieves a relationship by ID
   */
  async getRelationshipById(relId) {
    if (!relId) return null;

    if (isFirebaseLive && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('relationships').doc(relId).get();
        if (doc.exists) return doc.data();
        return null;
      } catch (err) {
        logger.error('Cloud Firestore getRelationshipById query error', { relId, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore query failed for relationship ${relId}: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      if (localRelationships.has(relId)) return localRelationships.get(relId);
      try {
        if (fs.existsSync(LOCAL_RELATIONSHIPS_PATH)) {
          const raw = fs.readFileSync(LOCAL_RELATIONSHIPS_PATH, 'utf-8');
          const data = JSON.parse(raw || '{}');
          if (data[relId]) {
            localRelationships.set(relId, data[relId]);
            return data[relId];
          }
        }
      } catch (e) {}
    }

    return null;
  },

  /**
   * Checks if an existing active or pending relationship exists between a pair
   */
  async findExistingConnection(caretakerId, elderlyUserId) {
    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('relationships')
          .where('caretakerId', '==', caretakerId)
          .where('elderlyUserId', '==', elderlyUserId)
          .get();

        const active = snap.docs.find(d => ['pending', 'accepted'].includes(d.data().status));
        return active ? active.data() : null;
      } catch (err) {
        logger.error('Cloud Firestore findExistingConnection query error', { errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore query failed: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      for (const rel of localRelationships.values()) {
        if (rel.caretakerId === caretakerId && rel.elderlyUserId === elderlyUserId) {
          if (['pending', 'accepted'].includes(rel.status)) {
            return rel;
          }
        }
      }

      try {
        if (fs.existsSync(LOCAL_RELATIONSHIPS_PATH)) {
          const raw = fs.readFileSync(LOCAL_RELATIONSHIPS_PATH, 'utf-8');
          const data = JSON.parse(raw || '{}');
          for (const rel of Object.values(data)) {
            if (rel.caretakerId === caretakerId && rel.elderlyUserId === elderlyUserId) {
              if (['pending', 'accepted'].includes(rel.status)) {
                localRelationships.set(rel.id, rel);
                return rel;
              }
            }
          }
        }
      } catch (e) {}
    }

    return null;
  },

  /**
   * Caretaker sends connection request to an elderly user
   */
  async createConnectionRequest({ caretakerId, elderlyTarget, relationshipType = 'caretaker' }) {
    const caretaker = await userService.getUserById(caretakerId);
    if (!caretaker) throw new Error('Caretaker user not found');
    if (!['caretaker', 'healthcare_worker'].includes(caretaker.role)) {
      throw new Error('Only caretakers or authorized healthcare workers can initiate patient connection requests');
    }
    const actualRelType = caretaker.role === 'healthcare_worker' ? 'healthcare_worker' : relationshipType;

    // Resolve target elderly user by email or ID
    let elderlyUser = null;
    if (elderlyTarget.includes('@')) {
      elderlyUser = await userService.getUserByEmail(elderlyTarget);
    } else {
      elderlyUser = await userService.getUserById(elderlyTarget);
    }

    if (!elderlyUser) {
      throw new Error(`No registered elderly user found for identifier: ${elderlyTarget}`);
    }

    if (elderlyUser.role !== 'elderly_user') {
      throw new Error('Connection target account must have the role elderly_user');
    }

    if (elderlyUser.id === caretakerId) {
      throw new Error('Cannot connect to own account');
    }

    // Check duplicate
    const existing = await this.findExistingConnection(caretakerId, elderlyUser.id);
    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('An active connection with this elderly user already exists');
      }
      if (existing.status === 'pending') {
        throw new Error('A connection request is already pending for this elderly user');
      }
    }

    const newRel = createRelationshipModel({
      caretakerId: caretaker.id,
      elderlyUserId: elderlyUser.id,
      relationshipType: actualRelType,
      caretakerName: caretaker.name,
      caretakerEmail: caretaker.email,
      elderlyName: elderlyUser.name,
      elderlyEmail: elderlyUser.email,
      status: 'pending',
      createdBy: caretaker.id
    });

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('relationships').doc(newRel.id).set(newRel);
      } catch (err) {
        logger.error('Cloud Firestore create connection request error', { relId: newRel.id, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore connection creation failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localRelationships.set(newRel.id, newRel);
      persistLocalStorage();
    }

    logger.info('Connection request created', { id: newRel.id, caretakerId, elderlyUserId: elderlyUser.id });
    return newRel;
  },

  /**
   * Responds to a connection request (Accept or Reject) by the elderly user
   */
  async respondToRequest(relId, elderlyUserId, decision) {
    const rel = await this.getRelationshipById(relId);
    if (!rel) throw new Error('Relationship record not found');

    if (rel.elderlyUserId !== elderlyUserId) {
      throw new Error('Unauthorized: Only the designated elderly user can respond to this connection request');
    }

    if (rel.status !== 'pending') {
      throw new Error(`Cannot respond to relationship in status: ${rel.status}`);
    }

    const newStatus = decision === 'accept' ? 'accepted' : 'rejected';
    const updated = {
      ...rel,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      acceptedAt: newStatus === 'accepted' ? new Date().toISOString() : null
    };

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('relationships').doc(relId).set(updated, { merge: true });
      } catch (err) {
        logger.error('Cloud Firestore respondToRequest error', { relId, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore update failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localRelationships.set(relId, updated);
      persistLocalStorage();
    }

    logger.info(`Connection request ${decision}ed`, { id: relId, status: newStatus });
    return updated;
  },

  /**
   * Revokes an existing connection by either the caretaker or elderly user
   */
  async revokeConnection(relId, userId) {
    const rel = await this.getRelationshipById(relId);
    if (!rel) throw new Error('Relationship record not found');

    if (rel.caretakerId !== userId && rel.elderlyUserId !== userId) {
      throw new Error('Unauthorized: Only connected members can revoke this relationship');
    }

    const updated = {
      ...rel,
      status: 'revoked',
      updatedAt: new Date().toISOString(),
      revokedAt: new Date().toISOString()
    };

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('relationships').doc(relId).set(updated, { merge: true });
      } catch (err) {
        logger.error('Cloud Firestore revokeConnection error', { relId, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore revocation failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localRelationships.set(relId, updated);
      persistLocalStorage();
    }

    logger.info('Connection revoked', { id: relId });
    return updated;
  },

  /**
   * Returns all relationships for a caretaker
   */
  async getCaretakerRelationships(caretakerId) {
    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('relationships')
          .where('caretakerId', '==', caretakerId)
          .get();
        return snap.docs.map(d => d.data());
      } catch (err) {
        logger.error('Cloud Firestore getCaretakerRelationships error', { caretakerId, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore query failed: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      return Array.from(localRelationships.values()).filter(r => r.caretakerId === caretakerId);
    }

    return [];
  },

  /**
   * Returns all relationships for an elderly user
   */
  async getElderlyRelationships(elderlyUserId) {
    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('relationships')
          .where('elderlyUserId', '==', elderlyUserId)
          .get();
        return snap.docs.map(d => d.data());
      } catch (err) {
        logger.error('Cloud Firestore getElderlyRelationships error', { elderlyUserId, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore query failed: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      return Array.from(localRelationships.values()).filter(r => r.elderlyUserId === elderlyUserId);
    }

    return [];
  },

  /**
   * Authoritative check: Does an active 'accepted' relationship exist between caretakerId and elderlyUserId?
   */
  async hasActiveRelationship(caretakerId, elderlyUserId) {
    if (!caretakerId || !elderlyUserId) return false;

    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('relationships')
          .where('caretakerId', '==', caretakerId)
          .where('elderlyUserId', '==', elderlyUserId)
          .where('status', '==', 'accepted')
          .limit(1)
          .get();
        return !snap.empty;
      } catch (err) {
        logger.error('Cloud Firestore hasActiveRelationship query error', { errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          return false;
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      for (const rel of localRelationships.values()) {
        if (rel.caretakerId === caretakerId && rel.elderlyUserId === elderlyUserId && rel.status === 'accepted') {
          return true;
        }
      }
    }

    return false;
  }
};
