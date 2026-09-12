/**
 * SMRITI PRESCRIPTION MODEL
 * Structured clinical prescription entity managed by verified medical specialists.
 */

export const PRESCRIPTION_STATUSES = ['active', 'modified', 'discontinued'];
export const PRESCRIPTION_ROUTES = ['Oral', 'Sublingual', 'Transdermal Patch', 'Inhalation', 'Topical', 'Injection'];

export function createPrescriptionModel(data = {}) {
  if (!data.elderlyUserId) {
    throw new Error('elderlyUserId is required for a prescription record.');
  }
  const drugName = data.drugName || data.medicationName;
  if (!drugName) {
    throw new Error('drugName is required for a prescription record.');
  }

  const status = PRESCRIPTION_STATUSES.includes(data.status) ? data.status : 'active';
  const route = PRESCRIPTION_ROUTES.includes(data.route) ? data.route : (data.route || 'Oral');

  return {
    id: data.id || `rx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    elderlyUserId: String(data.elderlyUserId).trim(),
    drugName: String(drugName).trim(),
    medicationName: String(drugName).trim(),
    genericName: data.genericName ? String(data.genericName).trim() : String(drugName).trim(),
    drugClass: data.drugClass || 'cognitive_support',
    dosage: data.dosage ? String(data.dosage).trim() : '5mg',
    frequency: data.frequency ? String(data.frequency).trim() : 'Once daily in the morning',
    route,
    scheduleTime: data.scheduleTime || '08:00 AM',
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    endDate: data.endDate || null,
    instructions: data.instructions ? String(data.instructions).trim() : 'Take after breakfast with water.',
    prescribedBy: data.prescribedBy || '',
    prescribingDoctorName: data.prescribingDoctorName || 'Dr. Specialist',
    doctorLicenseNumber: data.doctorLicenseNumber || '',
    reason: data.reason ? String(data.reason).trim() : 'Cognitive support & clinical management',
    status,
    safetyWarnings: Array.isArray(data.safetyWarnings) ? data.safetyWarnings : [],
    allergyConflict: Boolean(data.allergyConflict),
    linkedRequestId: data.linkedRequestId || null,
    discontinueReason: data.discontinueReason || null,
    discontinuedAt: data.discontinuedAt || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
