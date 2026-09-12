/**
 * SMRITI PERFORMANCE & ACTIVITY TRACKING SERVICE
 * Computes non-diagnostic activity performance metrics, category trends,
 * session consistency, and reminder adherence.
 * In production, strictly interacts with Cloud Firestore (cognitive_sessions collection).
 * Local disk fallback is strictly isolated to offline development/testing without cloud credentials.
 */

import { firestoreDb, isFirebaseLive } from '../config/firebase-admin.js';
import { isProduction, shouldUseLocalFallback } from '../config/env.js';
import { createCognitiveSessionModel } from '../models/cognitive-session.model.js';
import { adaptiveEngineService } from './adaptive-engine.service.js';
import { relationshipService } from './relationship-service.js';
import { reminderService } from './reminder-service.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const LOCAL_SESSIONS_PATH = path.join(DATA_DIR, 'cognitive_sessions.json');

let localSessions = new Map();

function initLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(LOCAL_SESSIONS_PATH)) {
      const raw = fs.readFileSync(LOCAL_SESSIONS_PATH, 'utf-8');
      const data = JSON.parse(raw || '{}');
      Object.entries(data).forEach(([k, v]) => localSessions.set(k, v));
    }
  } catch (e) {
    logger.warn('Failed to read local cognitive sessions', { error: e.message });
  }
}

function persistLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const obj = {};
    for (const [k, v] of localSessions.entries()) obj[k] = v;
    fs.writeFileSync(LOCAL_SESSIONS_PATH, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    // Read-only serverless environment fallback
  }
}

initLocalStorage();

export const performanceService = {
  /**
   * Records a completed cognitive session, persists to Firestore, and invokes adaptive engine
   */
  async recordSession(sessionData, callerId) {
    const elderlyUserId = sessionData.elderlyUserId;
    if (!elderlyUserId) throw new Error('elderlyUserId is required');

    // Relationship check: caller must be elderly user or connected caregiver
    if (callerId !== elderlyUserId) {
      const isAuthorized = await relationshipService.hasActiveRelationship(callerId, elderlyUserId);
      if (!isAuthorized) {
        throw new Error('Unauthorized: You cannot record cognitive sessions for this elderly user.');
      }
    }

    const session = createCognitiveSessionModel(sessionData);

    // Persist to Firestore
    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('cognitive_sessions').doc(session.id).set(session);
        logger.info('Cognitive session saved to Firestore', { id: session.id });
      } catch (err) {
        logger.error('Cloud Firestore save cognitive_session error', { id: session.id, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore session record failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localSessions.set(session.id, session);
      persistLocalStorage();
    }

    // Invoke Adaptive Difficulty Engine
    const adaptation = await adaptiveEngineService.evaluatePerformance(session);

    return {
      success: true,
      session,
      adaptation
    };
  },

  /**
   * Retrieves all sessions for an elderly user
   */
  async getSessionsForElderly(elderlyUserId, callerId) {
    if (callerId && callerId !== elderlyUserId) {
      const isAuthorized = await relationshipService.hasActiveRelationship(callerId, elderlyUserId);
      let isSpecialistAuthorized = false;
      if (!isAuthorized) {
        try {
          const { specialistService } = await import('./specialist-service.js');
          isSpecialistAuthorized = await specialistService.hasActiveSpecialistRelationship(callerId, elderlyUserId);
        } catch (e) {}
      }
      if (!isAuthorized && !isSpecialistAuthorized) {
        throw new Error('Access Forbidden: You are not authorized to view performance data for this elderly user.');
      }
    }

    let sessions = [];
    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('cognitive_sessions')
          .where('elderlyUserId', '==', elderlyUserId)
          .get();
        sessions = snap.docs.map(d => d.data());
        return sessions.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
      } catch (err) {
        logger.error('Cloud Firestore getSessionsForElderly error', { elderlyUserId, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore sessions query failed: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      sessions = Array.from(localSessions.values()).filter(s => s.elderlyUserId === elderlyUserId);
      return sessions.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
    }

    return [];
  },

  /**
   * Computes comprehensive performance insights and trends for Caregivers / Healthcare monitoring
   */
  async getPerformanceInsights(elderlyUserId, callerId) {
    const sessions = await this.getSessionsForElderly(elderlyUserId, callerId);
    const adaptiveProfile = await adaptiveEngineService.getAdaptiveProfile(elderlyUserId);
    const reminders = await reminderService.getRemindersForElderly(elderlyUserId);
    const alerts = await adaptiveEngineService.getAlerts(elderlyUserId);

    if (sessions.length === 0) {
      return {
        hasData: false,
        elderlyUserId,
        message: 'No activity data yet.',
        totalSessions: 0,
        averageAccuracy: 0,
        averageResponseTimeMs: 0,
        currentDifficulty: adaptiveProfile.currentDifficulty || 1,
        categoryBreakdown: {},
        recentSessions: [],
        remindersSummary: {
          total: reminders.length,
          completed: reminders.filter(r => r.status === 'completed').length,
          active: reminders.filter(r => r.active).length
        },
        alerts
      };
    }

    // Aggregate category performance
    const categoryStats = {
      memory: { total: 0, totalAccuracy: 0, totalTime: 0 },
      attention: { total: 0, totalAccuracy: 0, totalTime: 0 },
      routine_recall: { total: 0, totalAccuracy: 0, totalTime: 0 },
      pattern_recognition: { total: 0, totalAccuracy: 0, totalTime: 0 },
      emotional_engagement: { total: 0, totalAccuracy: 0, totalTime: 0 }
    };

    let totalAcc = 0;
    let totalTime = 0;

    sessions.forEach(s => {
      const cat = s.category || 'memory';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { total: 0, totalAccuracy: 0, totalTime: 0 };
      }
      categoryStats[cat].total += 1;
      categoryStats[cat].totalAccuracy += (s.accuracyScore || 0);
      categoryStats[cat].totalTime += (s.responseTimeMs || 0);

      totalAcc += (s.accuracyScore || 0);
      totalTime += (s.responseTimeMs || 0);
    });

    const categoryBreakdown = {};
    Object.keys(categoryStats).forEach(cat => {
      const stat = categoryStats[cat];
      if (stat.total > 0) {
        categoryBreakdown[cat] = {
          count: stat.total,
          attempts: stat.total,
          accuracy: Math.round(stat.totalAccuracy / stat.total),
          averageResponseTimeMs: Math.round(stat.totalTime / stat.total)
        };
      }
    });

    const recentSessions = sessions.slice(0, 5).map(s => ({
      id: s.id,
      activityId: s.activityId,
      category: s.category,
      difficulty: s.difficulty,
      accuracyScore: s.accuracyScore,
      responseTimeMs: s.responseTimeMs,
      completedAt: s.completedAt
    }));

    return {
      hasData: true,
      elderlyUserId,
      totalSessions: sessions.length,
      averageAccuracy: Math.round(totalAcc / sessions.length),
      averageResponseTimeMs: Math.round(totalTime / sessions.length),
      currentDifficulty: adaptiveProfile.currentDifficulty || 1,
      supportLevel: adaptiveProfile.supportLevel || 'standard',
      categoryBreakdown,
      recentSessions,
      remindersSummary: {
        total: reminders.length,
        completed: reminders.filter(r => r.status === 'completed').length,
        active: reminders.filter(r => r.active).length
      },
      alerts
    };
  }
};
