/**
 * SMRITI ELDERLY PROFILE SERVICE
 * Manages personalized elderly profiles.
 * In production, strictly interacts with Cloud Firestore (elderlyProfiles collection).
 * Local disk fallback is strictly isolated to offline development/testing without cloud credentials.
 */

import { firestoreDb, isFirebaseLive } from '../config/firebase-admin.js';
import { isProduction, shouldUseLocalFallback } from '../config/env.js';
import { createElderlyProfileModel } from '../models/elderly-profile.model.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const PROFILES_FILE = path.join(DATA_DIR, 'elderly_profiles.json');

const localProfiles = new Map();

function initLocalStore() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(PROFILES_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));
      Object.entries(data).forEach(([k, v]) => localProfiles.set(k, v));
    }
  } catch (e) {
    logger.warn('Failed to load local elderly profiles store', { error: e.message });
  }
}

function persistLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    const obj = {};
    for (const [k, v] of localProfiles.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    // Read-only serverless environment fallback
  }
}

initLocalStore();

export const profileService = {
  /**
   * Retrieves profile for an elderly user, initializing default if not found
   */
  async getProfile(elderlyUserId) {
    if (!elderlyUserId) return null;

    if (isFirebaseLive && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('elderlyProfiles').doc(elderlyUserId).get();
        if (doc.exists) {
          return doc.data();
        }

        // Initialize default profile in Firestore
        const defaultProfile = createElderlyProfileModel({ elderlyUserId });
        await firestoreDb.collection('elderlyProfiles').doc(elderlyUserId).set(defaultProfile);
        return defaultProfile;
      } catch (err) {
        logger.error('Cloud Firestore getProfile error', { elderlyUserId, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore profile query failed: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      if (localProfiles.has(elderlyUserId)) {
        return localProfiles.get(elderlyUserId);
      }
      const defaultProfile = createElderlyProfileModel({ elderlyUserId });
      localProfiles.set(elderlyUserId, defaultProfile);
      persistLocalStorage();
      return defaultProfile;
    }

    return null;
  },

  /**
   * Saves or updates an elderly profile
   */
  async saveProfile(elderlyUserId, profileData) {
    if (!elderlyUserId) throw new Error('elderlyUserId is required');

    let existing = null;
    if (isFirebaseLive && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('elderlyProfiles').doc(elderlyUserId).get();
        if (doc.exists) existing = doc.data();
      } catch (e) {
        logger.error('Cloud Firestore lookup error before saveProfile', { elderlyUserId, error: e.message });
      }
    }

    if (!existing && shouldUseLocalFallback(isFirebaseLive)) {
      existing = localProfiles.get(elderlyUserId) || {};
    }

    const updated = createElderlyProfileModel({
      ...(existing || {}),
      ...profileData,
      elderlyUserId,
      updatedAt: new Date().toISOString()
    });

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('elderlyProfiles').doc(elderlyUserId).set(updated, { merge: true });
      } catch (err) {
        logger.error('Cloud Firestore saveProfile error', { elderlyUserId, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore saveProfile failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localProfiles.set(elderlyUserId, updated);
      persistLocalStorage();
    }

    logger.info('Elderly profile saved successfully', { elderlyUserId });
    return updated;
  }
};
