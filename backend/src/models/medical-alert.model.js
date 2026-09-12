/**
 * SMRITI MEDICAL ALERT MODEL
 * Clinical alerts for missed doses, adverse symptoms, allergy conflicts, or urgent caretaker escalations.
 */

export const MEDICAL_ALERT_STATUSES = ['active', 'reviewed', 'resolved'];
export const MEDICAL_ALERT_SEVERITIES = ['info', 'warning', 'urgent', 'critical'];

export function createMedicalAlertModel(data = {}) {
  if (!data.elderlyUserId) {
    throw new Error('elderlyUserId is required for a medical alert.');
  }

  const status = MEDICAL_ALERT_STATUSES.includes(data.status) ? data.status : 'active';
  const severity = MEDICAL_ALERT_SEVERITIES.includes(data.severity) ? data.severity : 'warning';

  return {
    id: data.id || `medalert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    elderlyUserId: String(data.elderlyUserId).trim(),
    alertType: data.alertType || 'missed_dose_streak', // 'missed_dose_streak' | 'adverse_symptom' | 'allergy_warning' | 'caretaker_escalation'
    severity,
    title: data.title || 'Clinical Attention Flag',
    message: data.message || 'Clinical observation flagged for specialist review.',
    drugName: data.drugName || null,
    metadata: data.metadata || {},
    status,
    reviewedBy: data.reviewedBy || null,
    resolutionNotes: data.resolutionNotes || null,
    timestamp: data.timestamp || new Date().toISOString(),
    resolvedAt: data.resolvedAt || (status === 'resolved' ? new Date().toISOString() : null)
  };
}
