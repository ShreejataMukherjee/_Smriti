/**
 * SMRITI HEALTH & REMINDER SERVICE
 * Manages medicine, hydration, activity, and appointment reminders.
 * In production, strictly interacts with Cloud Firestore (reminders collection).
 * Local disk fallback is strictly isolated to offline development/testing without cloud credentials.
 */

import { firestoreDb, isFirebaseLive } from '../config/firebase-admin.js';
import { isProduction, shouldUseLocalFallback } from '../config/env.js';
import { createReminderModel } from '../models/reminder.model.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const REMINDERS_FILE = path.join(DATA_DIR, 'reminders.json');

const localReminders = new Map();

function initLocalStore() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(REMINDERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf-8'));
      Object.entries(data).forEach(([k, v]) => localReminders.set(k, v));
    }
  } catch (e) {
    logger.warn('Failed to load local reminders store', { error: e.message });
  }
}

function persistLocalStorage() {
  if (!shouldUseLocalFallback(isFirebaseLive)) return;
  try {
    const obj = {};
    for (const [k, v] of localReminders.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    // Read-only serverless environment fallback
  }
}

initLocalStore();

export const reminderService = {
  /**
   * Retrieves all reminders for an elderly user
   */
  async getRemindersForElderly(elderlyUserId) {
    if (!elderlyUserId) return [];

    let items = [];
    if (isFirebaseLive && firestoreDb) {
      try {
        const snap = await firestoreDb.collection('reminders')
          .where('elderlyUserId', '==', elderlyUserId)
          .get();
        items = snap.docs.map(d => d.data());
      } catch (err) {
        logger.error('Cloud Firestore getRemindersForElderly error', { elderlyUserId, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore reminders query failed: ${err.message}`);
        }
      }
    } else if (shouldUseLocalFallback(isFirebaseLive)) {
      items = Array.from(localReminders.values()).filter(r => r.elderlyUserId === elderlyUserId);
    }

    if (items.length === 0) {
      items = await this.seedDefaultReminders(elderlyUserId);
    }

    return items;
  },

  /**
   * Seed default reminders for initial setup
   */
  async seedDefaultReminders(elderlyUserId) {
    const defaults = [
      {
        type: 'medicine',
        title: 'Blood Pressure & Memory Support (Morning)',
        schedule: '08:00 AM',
        dosageOrTarget: '1 tablet after breakfast',
        frequency: 'Daily',
        notes: 'Take with a glass of lukewarm water'
      },
      {
        type: 'hydration',
        title: 'Mid-Morning Hydration Target',
        schedule: '10:30 AM',
        dosageOrTarget: '250ml water or coconut water',
        frequency: 'Daily',
        notes: 'Helps keep cognitive focus active'
      },
      {
        type: 'activity',
        title: 'Garden Walk & Mild Stretching',
        schedule: '04:30 PM',
        dosageOrTarget: '20 minutes',
        frequency: 'Daily',
        notes: 'Walk in the verandah or garden with family'
      },
      {
        type: 'appointment',
        title: 'Routine Health Checkup',
        schedule: '11:00 AM',
        appointmentDate: '2026-09-15',
        appointmentDoctor: 'Dr. Hrisit (Geriatric Wellness)',
        dosageOrTarget: 'Checkup & cognitive review',
        frequency: 'Monthly',
        notes: 'Bring memory diary & routine chart'
      }
    ];

    const seeded = [];
    for (const def of defaults) {
      const item = createReminderModel({ ...def, elderlyUserId });
      if (isFirebaseLive && firestoreDb) {
        try {
          await firestoreDb.collection('reminders').doc(item.id).set(item);
        } catch (e) {
          logger.error('Cloud Firestore seedDefaultReminders error', { id: item.id, error: e.message });
        }
      }
      if (shouldUseLocalFallback(isFirebaseLive)) {
        localReminders.set(item.id, item);
      }
      seeded.push(item);
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      persistLocalStorage();
    }
    return seeded;
  },

  /**
   * Retrieves single reminder by ID
   */
  async getReminderById(id) {
    if (!id) return null;

    if (isFirebaseLive && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('reminders').doc(id).get();
        if (doc.exists) return doc.data();
        return null;
      } catch (err) {
        logger.error('Cloud Firestore getReminderById error', { id, errorCode: err.code, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Cloud Firestore query failed for reminder ${id}: ${err.message}`);
        }
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      return localReminders.get(id) || null;
    }

    return null;
  },

  /**
   * Adds a reminder
   */
  async addReminder(data) {
    if (!data.elderlyUserId) throw new Error('elderlyUserId is required');
    if (!data.title) throw new Error('Reminder title is required');

    const reminder = createReminderModel(data);

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('reminders').doc(reminder.id).set(reminder);
      } catch (err) {
        logger.error('Cloud Firestore addReminder error', { id: reminder.id, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore reminder creation failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localReminders.set(reminder.id, reminder);
      persistLocalStorage();
    }

    logger.info('Reminder added', { id: reminder.id, title: reminder.title });
    return reminder;
  },

  /**
   * Updates a reminder
   */
  async updateReminder(id, updates) {
    const existing = await this.getReminderById(id);
    if (!existing) throw new Error('Reminder not found');

    const updated = {
      ...existing,
      ...updates,
      id,
      elderlyUserId: existing.elderlyUserId,
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('reminders').doc(id).set(updated, { merge: true });
      } catch (err) {
        logger.error('Cloud Firestore updateReminder error', { id, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore reminder update failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localReminders.set(id, updated);
      persistLocalStorage();
    }

    logger.info('Reminder updated', { id });
    return updated;
  },

  /**
   * Deletes a reminder
   */
  async deleteReminder(id) {
    const existing = await this.getReminderById(id);
    if (!existing) throw new Error('Reminder not found');

    if (isFirebaseLive && firestoreDb) {
      try {
        await firestoreDb.collection('reminders').doc(id).delete();
      } catch (err) {
        logger.error('Cloud Firestore deleteReminder error', { id, errorCode: err.code, error: err.message });
        throw new Error(`Cloud Firestore reminder deletion failed: ${err.message}`);
      }
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      localReminders.delete(id);
      persistLocalStorage();
    }

    logger.info('Reminder deleted', { id });
    return { success: true, id };
  }
};
