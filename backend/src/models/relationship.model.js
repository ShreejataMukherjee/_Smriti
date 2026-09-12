/**
 * SMRITI MANY-TO-MANY RELATIONSHIP MODEL
 * Supports 1 Caretaker <-> Many Elderly Users and 1 Elderly User <-> Many Caretakers.
 * Extensible for future Healthcare Worker relationships.
 */

export const RELATIONSHIP_STATUSES = ['pending', 'accepted', 'rejected', 'revoked'];
export const RELATIONSHIP_TYPES = ['caretaker', 'healthcare_worker'];

/**
 * Creates and normalizes a Relationship entity
 * @param {Object} data 
 * @returns {Object} Validated relationship record
 */
export function createRelationshipModel(data = {}) {
  const status = RELATIONSHIP_STATUSES.includes(data.status) ? data.status : 'pending';
  const relationshipType = RELATIONSHIP_TYPES.includes(data.relationshipType) ? data.relationshipType : 'caretaker';

  if (!data.caretakerId || !data.elderlyUserId) {
    throw new Error('Both caretakerId and elderlyUserId are required for a relationship record.');
  }

  return {
    id: data.id || `rel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    caretakerId: String(data.caretakerId).trim(),
    elderlyUserId: String(data.elderlyUserId).trim(),
    relationshipType,
    caretakerName: data.caretakerName ? String(data.caretakerName).trim() : 'Caretaker',
    caretakerEmail: data.caretakerEmail ? String(data.caretakerEmail).trim().toLowerCase() : '',
    elderlyName: data.elderlyName ? String(data.elderlyName).trim() : 'Elderly User',
    elderlyEmail: data.elderlyEmail ? String(data.elderlyEmail).trim().toLowerCase() : '',
    status,
    createdBy: data.createdBy || data.caretakerId,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    acceptedAt: data.acceptedAt || (status === 'accepted' ? new Date().toISOString() : null),
    revokedAt: data.revokedAt || (status === 'revoked' ? new Date().toISOString() : null)
  };
}
