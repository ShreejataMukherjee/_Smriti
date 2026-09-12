/**
 * SMRITI MEDICAL AUDIT LOG MODEL
 * Immutable timestamped trail of all clinical and dosage decisions attributed to specialists.
 */

export function createMedicalAuditLogModel(data = {}) {
  if (!data.elderlyUserId) {
    throw new Error('elderlyUserId is required for a medical audit log.');
  }

  return {
    id: data.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    elderlyUserId: String(data.elderlyUserId).trim(),
    prescriptionId: data.prescriptionId || null,
    specialistId: data.specialistId ? String(data.specialistId).trim() : 'system',
    specialistName: data.specialistName || 'Specialist Clinician',
    doctorLicenseNumber: data.doctorLicenseNumber || '',
    action: data.action || 'modified_prescription', // 'created_prescription' | 'modified_dosage' | 'discontinued_prescription' | 'approved_caretaker_request' | 'reviewed_alert'
    drugName: data.drugName || '',
    previousState: data.previousState || null,
    newState: data.newState || null,
    changes: data.changes || {
      previousValues: data.previousState || null,
      newValues: data.newState || null
    },
    reason: data.reason || 'Routine clinical adjustment',
    clinicalNotes: data.clinicalNotes || '',
    timestamp: data.timestamp || new Date().toISOString()
  };
}
