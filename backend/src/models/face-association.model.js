/**
 * SMRITI FACE ASSOCIATION ENTITY MODEL
 * Schema for caretaker-assigned person associations on detected face regions.
 * Stores normalized bounding coordinates and family member references.
 * Strictly avoids biometric embeddings or automated facial identity vectors.
 */

export function createFaceAssociationModel(data = {}) {
  if (!data.elderlyUserId || !data.photoId) {
    throw new Error('elderlyUserId and photoId are required for a face association record.');
  }

  const faceId = data.id || `face_${data.photoId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Normalize bounding box coordinates (0-1 percentage floats)
  const rawBox = data.boundingBox || {};
  const boundingBox = {
    left: typeof rawBox.left === 'number' ? Math.max(0, Math.min(1, rawBox.left)) : 0,
    top: typeof rawBox.top === 'number' ? Math.max(0, Math.min(1, rawBox.top)) : 0,
    width: typeof rawBox.width === 'number' ? Math.max(0, Math.min(1, rawBox.width)) : 1,
    height: typeof rawBox.height === 'number' ? Math.max(0, Math.min(1, rawBox.height)) : 1,
    normalizedVertices: Array.isArray(rawBox.normalizedVertices) ? rawBox.normalizedVertices : []
  };

  return {
    id: faceId,
    elderlyUserId: String(data.elderlyUserId).trim(),
    photoId: String(data.photoId).trim(), // memoryId
    personId: data.personId ? String(data.personId).trim() : null, // family member ID
    personName: data.personName ? String(data.personName).trim() : 'Family Member',
    relationship: data.relationship ? String(data.relationship).trim() : '',
    boundingBox,
    confidence: typeof data.confidence === 'number' ? data.confidence : 0.95,
    joyLikelihood: data.joyLikelihood || 'UNKNOWN',
    createdBy: data.createdBy ? String(data.createdBy).trim() : null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
