/**
 * SMRITI OFFLINE SYNC SERVICE
 * Handles batch synchronization of offline-executed cognitive sessions,
 * performs deduplication, persists to Cloud Firestore, and triggers adaptive difficulty updates.
 */

import { performanceService } from './performance.service.js';
import { logger } from '../utils/logger.js';

export const syncService = {
  /**
   * Batch syncs offline-recorded cognitive sessions
   */
  async syncOfflineSessions(sessions, callerId) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return { success: true, syncedCount: 0, message: 'No sessions to sync' };
    }

    logger.info('Starting offline session batch sync', { total: sessions.length, callerId });
    const results = [];
    let syncedCount = 0;
    let errors = 0;

    for (const sessionData of sessions) {
      try {
        const res = await performanceService.recordSession({
          ...sessionData,
          syncStatus: 'synced',
          syncedAt: new Date().toISOString()
        }, callerId);

        results.push({ id: sessionData.id, success: true });
        syncedCount++;
      } catch (err) {
        logger.error('Failed to sync individual offline session', { id: sessionData.id, error: err.message });
        results.push({ id: sessionData.id, success: false, error: err.message });
        errors++;
      }
    }

    return {
      success: errors === 0,
      syncedCount,
      errors,
      results
    };
  }
};
