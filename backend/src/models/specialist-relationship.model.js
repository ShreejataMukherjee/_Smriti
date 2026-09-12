/**
 * SMRITI SPECIALIST RELATIONSHIP MODEL
 * Many-to-many clinical care links between Medical Specialists, Elderly Patients, and Caretakers.
 * Scoped strictly to clinical, medication, and cognitive trajectory monitoring (excluding private memory vault items).
 */

export const SPECIALIST_RELATIONSHIP_STATUSES = ['pending', 'accepted', 'rejected', 'revoked'];

export function createSpecialistRelationshipModel(data = {}) {
  const status = SPECIALIST_RELATIONSHIP_STATUSES.includes(data.status) ? data.status : 'pending';

  if (!data.specialistId || !data.elderlyUserId) {
    throw new Error('Both specialistId and elderlyUserId are required for a specialist relationship.');
  }

  return {
    id: data.id || `srel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    specialistId: String(data.specialistId).trim(),
    elderlyUserId: String(data.elderlyUserId).trim(),
    caretakerId: data.caretakerId ? String(data.caretakerId).trim() : null,
    specialistName: data.specialistName ? String(data.specialistName).trim() : 'Medical Specialist',
    specialistEmail: data.specialistEmail ? String(data.specialistEmail).trim().toLowerCase() : '',
    specialistSpecialization: data.specialistSpecialization || 'Geriatric Specialist',
    elderlyName: data.elderlyName ? String(data.elderlyName).trim() : 'Elderly Patient',
    elderlyEmail: data.elderlyEmail ? String(data.elderlyEmail).trim().toLowerCase() : '',
    status,
    accessScope: 'clinical_and_cognitive_trends', // strictly excludes personal photo/audio vault
    initiatedBy: data.initiatedBy || 'specialist', // 'specialist' | 'caretaker'
    inviteCode: data.inviteCode || null,
    statusReason: data.statusReason || '',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    acceptedAt: data.acceptedAt || (status === 'accepted' ? new Date().toISOString() : null),
    revokedAt: data.revokedAt || (status === 'revoked' ? new Date().toISOString() : null)
  };
}
