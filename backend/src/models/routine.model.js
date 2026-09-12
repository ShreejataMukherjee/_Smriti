/**
 * SMRITI DAILY ROUTINE MODEL
 * Defines daily schedule anchors that power SIH Daily Routine Recall games and caregiver monitoring.
 */

export function createRoutineItemModel(data = {}) {
  return {
    id: data.id || `rout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    elderlyUserId: data.elderlyUserId || '',
    activityName: data.activityName || 'Daily Activity',
    time: data.time || '08:00 AM',
    repeatDays: Array.isArray(data.repeatDays) ? data.repeatDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    category: data.category || 'morning', // 'morning' | 'afternoon' | 'evening' | 'night'
    icon: data.icon || '🌅',
    notes: data.notes || '',
    reminderEnabled: data.reminderEnabled !== undefined ? Boolean(data.reminderEnabled) : true,
    priority: data.priority || 'normal', // 'normal' | 'high'
    order: data.order || 0,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  };
}
