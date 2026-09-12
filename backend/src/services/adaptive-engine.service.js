/**
 * SMRITI ADAPTIVE DIFFICULTY ENGINE SERVICE
 * Transparent, performance-based adaptation service adjusting task complexity,
 * visual hints, and distractor counts based on observed task accuracy and latency.
 * In production, strictly interacts with Cloud Firestore (adaptive_profiles & support_alerts).
 * Local disk fallback is strictly isolated to offline development/testing without cloud credentials.
 */

import { firestoreDb, isFirebaseLive } from '../config/firebase-admin.js';
import { isProduction, shouldUseLocalFallback } from '../config/env.js';
import { createAdaptiveProfileModel } from '../models/adaptive-profile.model.js';
import { createSupportAlertModel } from '../models/support-alert.model.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const LOCAL_PROFILES_PATH = path.join(DATA_DIR, 'adaptive_profiles.json');
const LOCAL_ALERTS_PATH = path.join(DATA_DIR, 'support_alerts.json');

let localProfiles = new Map();
let localAlerts = new Map();

function initLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(LOCAL_PROFILES_PATH)) {
      const raw = fs.readFileSync(LOCAL_PROFILES_PATH, 'utf-8');
      const data = JSON.parse(raw || '{}');
      Object.entries(data).forEach(([k, v]) => localProfiles.set(k, v));
    }
    if (fs.existsSync(LOCAL_ALERTS_PATH)) {
      const raw = fs.readFileSync(LOCAL_ALERTS_PATH, 'utf-8');
      const data = JSON.parse(raw || '{}');
      Object.entries(data).forEach(([k, v]) => localAlerts.set(k, v));
    }
  } catch (e) {
    logger.warn('Failed to read local adaptive storage', { error: e.message });
  }
}

function persistLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const pObj = {};
    for (const [k, v] of localProfiles.entries()) pObj[k] = v;
    fs.writeFileSync(LOCAL_PROFILES_PATH, JSON.stringify(pObj, null, 2), 'utf-8');

    const aObj = {};
    for (const [k, v] of localAlerts.entries()) aObj[k] = v;
    fs.writeFileSync(LOCAL_ALERTS_PATH, JSON.stringify(aObj, null, 2), 'utf-8');
  } catch (e) {
    // Read-only serverless environment fallback
  }
}

initLocalStorage();

export const adaptiveEngineService = {
  /**
   * Retrieves the adaptive difficulty profile for an elderly user
   */
  async getAdaptiveProfile(elderlyUserId) {
    if (!elderlyUserId) return createAdaptiveProfileModel({ elderlyUserId });

    if (isFirebaseLive && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('adaptive_profiles').doc(elderlyUserId).get();
        if (doc.exists) {
          return doc.data();
        }
        // Initialize default profile in Firestore
        const defaultProfile = createAdaptiveProfileModel({ elderlyUserId });
        await firestoreDb.collection('adaptive_profiles').doc(elderlyUserId).set(defaultProfile);
        return defaultProfile;
      } catch (err) {
        logger.error('Cloud Firestore getAdaptiveProfile error', { elderlyUserId, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore adaptive profile query failed: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      let profile = localProfiles.get(elderlyUserId);
      if (!profile) {
        profile = createAdaptiveProfileModel({ elderlyUserId });
        localProfiles.set(elderlyUserId, profile);
        persistLocalStorage();
      }
      return profile;
    }

    return createAdaptiveProfileModel({ elderlyUserId });
  },

  /**
   * Evaluates a completed cognitive session and updates adaptive difficulty
   */
  async evaluatePerformance(session) {
    const { elderlyUserId, category = 'memory', accuracy = 1.0, responseTimeMs = 3500, hintsUsed = 0 } = session;
    logger.info('Adaptive engine evaluating performance', { elderlyUserId, category, accuracy, responseTimeMs });

    const profile = await this.getAdaptiveProfile(elderlyUserId);
    const currentCatDiff = profile.categoryDifficulties[category] || profile.currentDifficulty || 1;

    let nextDifficulty = currentCatDiff;
    let supportLevel = 'standard';
    let adjustmentReason = 'Difficulty maintained';
    let alertCreated = null;

    const isPoorPerformance = accuracy < 0.5 || responseTimeMs > 12000 || hintsUsed >= 2;
    const isStrongPerformance = accuracy > 0.8 && responseTimeMs < 7000 && hintsUsed === 0;

    if (isPoorPerformance) {
      nextDifficulty = Math.max(1, currentCatDiff - 1);
      supportLevel = 'high';
      adjustmentReason = 'Reduced task complexity and increased visual cues for comforting experience';

      profile.consecutiveFailures[category] = (profile.consecutiveFailures[category] || 0) + 1;
      profile.consecutiveSuccesses[category] = 0;

      // If persistent difficulty observed (>= 2 sessions) -> emit support alert
      if (profile.consecutiveFailures[category] >= 2) {
        alertCreated = createSupportAlertModel({
          elderlyUserId,
          type: 'category_support',
          category,
          severity: 'attention_needed',
          message: `Gentle support or caregiver companionship may be helpful for ${category.replace('_', ' ')} activities.`
        });
        if (isFirebaseLive && firestoreDb) {
          try {
            await firestoreDb.collection('support_alerts').doc(alertCreated.id).set(alertCreated);
          } catch (e) {
            logger.error('Cloud Firestore save support_alert error', { id: alertCreated.id, error: e.message });
          }
        }
        if (shouldUseLocalFallback(isFirebaseLive)) {
          localAlerts.set(alertCreated.id, alertCreated);
        }
      }
    } else if (isStrongPerformance) {
      nextDifficulty = Math.min(5, currentCatDiff + 1);
      supportLevel = 'minimal';
      adjustmentReason = 'Excellent recall and prompt response, graduated to next challenge tier';

      profile.consecutiveSuccesses[category] = (profile.consecutiveSuccesses[category] || 0) + 1;
      profile.consecutiveFailures[category] = 0;
    } else {
      nextDifficulty = currentCatDiff;
      supportLevel = 'standard';
      adjustmentReason = 'Consistent recall performance, steady pacing maintained';
      profile.consecutiveSuccesses[category] = 0;
      profile.consecutiveFailures[category] = 0;
    }

    // Update profile metrics
    profile.categoryDifficulties[category] = nextDifficulty;
    profile.currentDifficulty = nextDifficulty;
    profile.supportLevel = supportLevel;
    profile.adjustmentReason = adjustmentReason;
    profile.recentAccuracyAverage = Number(((profile.recentAccuracyAverage * 0.7) + (accuracy * 0.3)).toFixed(2));
    profile.recentResponseTimeAverage = Math.round((profile.recentResponseTimeAverage * 0.7) + (responseTimeMs * 0.3));
    profile.lastAdjustedAt = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();

    // Persist profile
    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('adaptive_profiles').doc(elderlyUserId).set(profile);
      } catch (err) {
        logger.error('Cloud Firestore save adaptive_profile error', { elderlyUserId, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore adaptive profile update failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localProfiles.set(elderlyUserId, profile);
      persistLocalStorage();
    }

    return {
      elderlyUserId,
      category,
      previousDifficulty: currentCatDiff,
      nextDifficulty,
      supportLevel,
      adjustmentReason,
      alertCreated
    };
  },

  /**
   * Retrieves active caregiver support alerts for an elderly user
   */
  async getAlerts(elderlyUserId) {
    if (!elderlyUserId) return [];

    let alerts = [];
    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('support_alerts')
          .where('elderlyUserId', '==', elderlyUserId)
          .get();
        alerts = snap.docs.map(d => d.data());
        return alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } catch (err) {
        logger.error('Cloud Firestore getAlerts error', { elderlyUserId, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore support alerts query failed: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      alerts = Array.from(localAlerts.values()).filter(a => a.elderlyUserId === elderlyUserId);
      return alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return [];
  },

  /**
   * Acknowledges an active caregiver support alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    let alert = null;
    if (isFirebaseLive && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('support_alerts').doc(alertId).get();
        if (doc.exists) alert = doc.data();
      } catch (e) {
        logger.error('Cloud Firestore lookup error before acknowledgeAlert', { alertId, error: e.message });
      }
    }

    if (!alert && shouldUseLocalFallback(isFirebaseLive)) {
      alert = localAlerts.get(alertId);
    }

    if (!alert) throw new Error('Alert not found');

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('support_alerts').doc(alertId).set(alert);
      } catch (err) {
        logger.error('Cloud Firestore acknowledgeAlert error', { alertId, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore alert update failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localAlerts.set(alertId, alert);
      persistLocalStorage();
    }

    return alert;
  }
};
