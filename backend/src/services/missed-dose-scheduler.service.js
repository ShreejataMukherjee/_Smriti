/**
 * SMRITI MISSED DOSE SCHEDULER & CLINICAL EVENT SERVICE
 * Automated cron scheduler and event triggers to detect consecutive missed doses
 * and generate 'missed_dose_streak' alerts in medicalAlerts.
 */

import specialistService from './specialist-service.js';
import { logger } from '../utils/logger.js';

// In-memory tracking for consecutive missed doses per patient and drug
const doseStreakRegistry = new Map();

function getStreakKey(elderlyUserId, drugName = 'regimen') {
  return `${elderlyUserId}:${drugName.toLowerCase().trim()}`;
}

export const missedDoseSchedulerService = {
  _timer: null,
  _intervalMs: 60 * 60 * 1000, // default: 1 hour

  /**
   * Event trigger: Records a dose adherence observation (taken vs missed).
   * When consecutive missed count >= threshold (default 2), automatically creates a
   * 'missed_dose_streak' medical alert.
   */
  async recordDoseObservation({ elderlyUserId, drugName = 'Prescription Regimen', status = 'missed', missedCountThreshold = 2 }) {
    if (!elderlyUserId) return null;

    const key = getStreakKey(elderlyUserId, drugName);
    const isMissed = status === 'missed' || status === false;

    let currentStreak = doseStreakRegistry.get(key) || 0;

    if (isMissed) {
      currentStreak += 1;
      doseStreakRegistry.set(key, currentStreak);

      logger.warn(`[MISSED_DOSE_STREAK] Patient ${elderlyUserId} missed dose of ${drugName}. Current consecutive streak: ${currentStreak}`);

      if (currentStreak >= missedCountThreshold) {
        const alert = await specialistService.checkAndGenerateMissedDoseAlerts(
          elderlyUserId,
          currentStreak,
          drugName
        );
        return { alertGenerated: true, streak: currentStreak, alert };
      }

      return { alertGenerated: false, streak: currentStreak, alert: null };
    } else {
      // Dose taken - reset streak
      doseStreakRegistry.set(key, 0);
      return { alertGenerated: false, streak: 0, alert: null };
    }
  },

  /**
   * Directly triggers automated missed dose streak evaluation for an elderly user or all active patients.
   */
  async triggerMissedDoseCheck(elderlyUserId = null, missedCount = 2, drugName = null) {
    if (elderlyUserId) {
      return await specialistService.checkAndGenerateMissedDoseAlerts(elderlyUserId, missedCount, drugName);
    }
    return await specialistService.runMissedDoseStreakScheduler();
  },

  /**
   * Starts the periodic cron-like scheduler interval.
   */
  startScheduler(intervalMs = null) {
    if (this._timer) return;
    if (intervalMs) this._intervalMs = intervalMs;

    this._timer = setInterval(async () => {
      try {
        logger.info('[CRON] Executing automated missed-dose streak check across active clinical cohort...');
        const alerts = await specialistService.runMissedDoseStreakScheduler();
        if (alerts.length > 0) {
          logger.warn(`[CRON] Automated check generated ${alerts.length} missed-dose streak alerts.`);
        }
      } catch (err) {
        logger.error('[CRON] Error during automated missed-dose evaluation', err);
      }
    }, this._intervalMs);

    // Unref timer so it does not block Node process exit in tests
    if (this._timer.unref) {
      this._timer.unref();
    }

    logger.info(`[SCHEDULER] Missed dose cron scheduler started (interval: ${this._intervalMs / 1000}s).`);
  },

  /**
   * Stops the background scheduler interval.
   */
  stopScheduler() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      logger.info('[SCHEDULER] Missed dose cron scheduler stopped.');
    }
  },

  /**
   * Inspect current streak count for debugging/testing
   */
  getStreak(elderlyUserId, drugName = 'regimen') {
    return doseStreakRegistry.get(getStreakKey(elderlyUserId, drugName)) || 0;
  },

  /**
   * Clear in-memory streak cache
   */
  clearStreaks() {
    doseStreakRegistry.clear();
  }
};

export default missedDoseSchedulerService;
