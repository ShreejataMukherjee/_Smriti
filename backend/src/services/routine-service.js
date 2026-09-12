/**
 * SMRITI DAILY ROUTINE SERVICE
 * Manages daily routine schedule items.
 * In production, strictly interacts with Cloud Firestore (routines collection).
 * Local disk fallback is strictly isolated to offline development/testing without cloud credentials.
 */

import { firestoreDb, isFirebaseLive } from '../config/firebase-admin.js';
import { isProduction, shouldUseLocalFallback } from '../config/env.js';
import { createRoutineItemModel } from '../models/routine.model.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const ROUTINE_FILE = path.join(DATA_DIR, 'routines.json');

const localRoutines = new Map();

function initLocalStore() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ROUTINE_FILE)) {
      const data = JSON.parse(fs.readFileSync(ROUTINE_FILE, 'utf-8'));
      Object.entries(data).forEach(([k, v]) => localRoutines.set(k, v));
    }
  } catch (e) {
    logger.warn('Failed to load local routine store', { error: e.message });
  }
}

function persistLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    const obj = {};
    for (const [k, v] of localRoutines.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(ROUTINE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    // Read-only serverless environment fallback
  }
}

initLocalStore();

export const routineService = {
  /**
   * Retrieves all routine items for an elderly user, ordered by time/order
   */
  async getRoutineForElderly(elderlyUserId) {
    if (!elderlyUserId) return [];

    let items = [];
    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('routines')
          .where('elderlyUserId', '==', elderlyUserId)
          .get();
        items = snap.docs.map(d => d.data());
      } catch (err) {
        logger.error('Cloud Firestore getRoutineForElderly error', { elderlyUserId, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore routine query failed: ${err.message}`);
        }
      }
    } else if (shouldUseLocalFallback(isFirebaseLive)) {
      items = Array.from(localRoutines.values()).filter(r => r.elderlyUserId === elderlyUserId);
    }

    if (items.length === 0) {
      items = await this.seedDefaultRoutines(elderlyUserId);
    }

    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  /**
   * Seed default SIH routine anchors
   */
  async seedDefaultRoutines(elderlyUserId) {
    const defaults = [
      { activityName: 'Wake Up & Morning Tea', time: '06:30 AM', category: 'morning', icon: '🌅', priority: 'high', order: 1 },
      { activityName: 'Morning Hydration & Medication', time: '07:30 AM', category: 'morning', icon: '💊', priority: 'high', order: 2 },
      { activityName: 'Nutritious Breakfast', time: '08:30 AM', category: 'morning', icon: '🥣', priority: 'normal', order: 3 },
      { activityName: 'Garden Walk & Sunlight', time: '09:30 AM', category: 'morning', icon: '🌿', priority: 'normal', order: 4 },
      { activityName: 'Mid-Day Rest & Relaxation', time: '11:30 AM', category: 'afternoon', icon: '🛋️', priority: 'normal', order: 5 },
      { activityName: 'Traditional Lunch', time: '01:00 PM', category: 'afternoon', icon: '🍲', priority: 'high', order: 6 },
      { activityName: 'Evening Nostalgic Music & Tea', time: '05:00 PM', category: 'evening', icon: '☕', priority: 'normal', order: 7 },
      { activityName: 'Family Dinner', time: '08:00 PM', category: 'night', icon: '🍽️', priority: 'high', order: 8 },
      { activityName: 'Night Rest & Sleep', time: '09:30 PM', category: 'night', icon: '🌙', priority: 'high', order: 9 }
    ];

    const seeded = [];
    for (const def of defaults) {
      const item = createRoutineItemModel({ ...def, elderlyUserId });
      if (isFirebaseLive && firestoreDb) {
        try {
          await firestoreDb.collection('routines').doc(item.id).set(item);
        } catch (e) {
          logger.error('Cloud Firestore seedDefaultRoutines error', { id: item.id, error: e.message });
        }
      }
      if (shouldUseLocalFallback(isFirebaseLive)) {
        localRoutines.set(item.id, item);
      }
      seeded.push(item);
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      persistLocalStorage();
    }
    return seeded;
  },

  /**
   * Retrieves single routine item
   */
  async getRoutineItemById(id) {
    if (!id) return null;

    if (isFirebaseLive && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('routines').doc(id).get();
        if (doc.exists) return doc.data();
        return null;
      } catch (err) {
        logger.error('Cloud Firestore getRoutineItemById error', { id, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore query failed for routine item ${id}: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      return localRoutines.get(id) || null;
    }

    return null;
  },

  /**
   * Adds a routine item
   */
  async addRoutineItem(data) {
    if (!data.elderlyUserId) throw new Error('elderlyUserId is required');
    if (!data.activityName) throw new Error('Activity name is required');

    const item = createRoutineItemModel(data);

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('routines').doc(item.id).set(item);
      } catch (err) {
        logger.error('Cloud Firestore addRoutineItem error', { id: item.id, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore routine item creation failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localRoutines.set(item.id, item);
      persistLocalStorage();
    }

    logger.info('Routine item added', { id: item.id, name: item.activityName });
    return item;
  },

  /**
   * Updates a routine item
   */
  async updateRoutineItem(id, updates) {
    const existing = await this.getRoutineItemById(id);
    if (!existing) throw new Error('Routine item not found');

    const updated = {
      ...existing,
      ...updates,
      id,
      elderlyUserId: existing.elderlyUserId,
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('routines').doc(id).set(updated, { merge: true });
      } catch (err) {
        logger.error('Cloud Firestore updateRoutineItem error', { id, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore routine item update failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localRoutines.set(id, updated);
      persistLocalStorage();
    }

    logger.info('Routine item updated', { id });
    return updated;
  },

  /**
   * Deletes a routine item
   */
  async deleteRoutineItem(id) {
    const existing = await this.getRoutineItemById(id);
    if (!existing) throw new Error('Routine item not found');

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('routines').doc(id).delete();
      } catch (err) {
        logger.error('Cloud Firestore deleteRoutineItem error', { id, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore routine item deletion failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localRoutines.delete(id);
      persistLocalStorage();
    }

    logger.info('Routine item deleted', { id });
    return { success: true, id };
  }
};
