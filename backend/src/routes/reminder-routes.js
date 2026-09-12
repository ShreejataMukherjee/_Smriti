/**
 * SMRITI HEALTH & REMINDER ROUTES
 * REST endpoints for medicine, hydration, activity, and appointment reminders.
 * NOTE: Care/support management tool only; non-diagnostic.
 */

import { Router } from 'express';
import { reminderService } from '../services/reminder-service.js';
import { requireAuth } from '../middleware/auth-middleware.js';
import { requireActiveRelationship } from '../middleware/relationship-middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/reminders/elderly/:elderlyUserId
 */
router.get('/elderly/:elderlyUserId', requireAuth, requireActiveRelationship, async (req, res) => {
  try {
    const { elderlyUserId } = req.params;
    const reminders = await reminderService.getRemindersForElderly(elderlyUserId);
    res.status(200).json({ success: true, reminders });
  } catch (err) {
    logger.error('Failed to get reminders', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/reminders
 */
router.post('/', requireAuth, async (req, res, next) => {
  req.params.elderlyUserId = req.body.elderlyUserId;
  next();
}, requireActiveRelationship, async (req, res) => {
  try {
    const reminder = await reminderService.addReminder(req.body);
    res.status(201).json({ success: true, reminder });
  } catch (err) {
    logger.error('Failed to add reminder', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/reminders/:id
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await reminderService.getReminderById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Reminder not found' });

    req.params.elderlyUserId = existing.elderlyUserId;
    const reminder = await reminderService.updateReminder(req.params.id, req.body);
    res.status(200).json({ success: true, reminder });
  } catch (err) {
    logger.error('Failed to update reminder', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/reminders/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await reminderService.getReminderById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Reminder not found' });

    await reminderService.deleteReminder(req.params.id);
    res.status(200).json({ success: true, message: 'Reminder deleted' });
  } catch (err) {
    logger.error('Failed to delete reminder', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
