/**
 * SMRITI MEDICATION REQUEST MODEL
 * Caretaker-submitted requests for dosage or medication changes / symptom reports.
 */

export const MEDICATION_REQUEST_STATUSES = ['pending', 'approved', 'modified_and_approved', 'rejected'];

export function createMedicationRequestModel(data = {}) {
  if (!data.elderlyUserId) {
    throw new Error('elderlyUserId is required for a medication request.');
  }

  const status = MEDICATION_REQUEST_STATUSES.includes(data.status) ? data.status : 'pending';

  return {
    id: data.id || `medreq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    elderlyUserId: String(data.elderlyUserId).trim(),
    caretakerId: data.caretakerId ? String(data.caretakerId).trim() : '',
    caretakerName: data.caretakerName || 'Caregiver',
    prescriptionId: data.prescriptionId || null,
    drugName: data.drugName ? String(data.drugName).trim() : 'Medication',
    requestType: data.requestType || 'dosage_change', // 'dosage_change' | 'side_effect' | 'symptom_report' | 'discontinue'
    currentDosage: data.currentDosage || '',
    requestedDosage: data.requestedDosage || '',
    symptomObservation: data.symptomObservation || data.notes || '',
    urgency: data.urgency || 'medium', // 'low' | 'medium' | 'high'
    status,
    specialistId: data.specialistId || null,
    specialistResponseNotes: data.specialistResponseNotes || '',
    resultingPrescriptionId: data.resultingPrescriptionId || null,
    reviewedBy: data.reviewedBy || null,
    reviewedDoctorName: data.reviewedDoctorName || null,
    reviewedAt: data.reviewedAt || (status !== 'pending' ? new Date().toISOString() : null),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
