/**
 * SMRITI CAREGIVER SUPPORT ALERT MODEL
 * Non-diagnostic support notifications alerting caregivers about routine engagement, missed reminders, or task difficulty.
 */

export function createSupportAlertModel(data = {}) {
  return {
    id: data.id || `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    elderlyUserId: data.elderlyUserId || '',
    type: data.type || 'category_support', // 'missed_reminders' | 'unusual_inactivity' | 'task_abandonment' | 'category_support'
    category: data.category || 'general',
    severity: data.severity || 'info', // 'info' | 'attention_needed'
    message: data.message || 'Support may be helpful for current daily activities.',
    status: data.status || 'active', // 'active' | 'acknowledged'
    acknowledgedBy: data.acknowledgedBy || null,
    acknowledgedAt: data.acknowledgedAt || null,
    createdAt: data.createdAt || new Date().toISOString()
  };
}
