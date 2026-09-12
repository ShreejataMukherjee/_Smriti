/**
 * SMRITI HEALTH & REMINDER MODEL
 * Caregiver support schedule for medication, hydration, daily activities, and medical appointments.
 * NOTE: Care/support management tool only; non-diagnostic.
 */

export function createReminderModel(data = {}) {
  return {
    id: data.id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    elderlyUserId: data.elderlyUserId || '',
    type: data.type || 'medicine', // 'medicine' | 'hydration' | 'activity' | 'appointment'
    title: data.title || 'Schedule Reminder',
    schedule: data.schedule || '09:00 AM',
    dosageOrTarget: data.dosageOrTarget || '',
    frequency: data.frequency || 'Daily', // 'Daily' | 'Twice Daily' | 'Weekly' | 'As Needed'
    notes: data.notes || '',
    appointmentDate: data.appointmentDate || '',
    appointmentDoctor: data.appointmentDoctor || '',
    isCompleted: Boolean(data.isCompleted),
    reminderEnabled: data.reminderEnabled !== undefined ? Boolean(data.reminderEnabled) : true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  };
}
