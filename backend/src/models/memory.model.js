/**
 * SMRITI MEMORY & MEDIA ENTITY MODEL
 * Private media metadata schema for Supabase Storage integration with legacy Firebase fallback.
 * Enforces canonical private storage paths without storing permanent public download URLs.
 */

export const MEMORY_TYPES = ['photo', 'video', 'audio', 'memory'];

export function createMemoryModel(data = {}) {
  const type = MEMORY_TYPES.includes(data.type) ? data.type : 'photo';

  if (!data.elderlyUserId || !data.uploadedBy) {
    throw new Error('elderlyUserId and uploadedBy are required for a memory record.');
  }

  const memoryId = data.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const defaultPath = `elderly/${data.elderlyUserId}/${type}s/${memoryId}_${data.fileName || 'asset'}`;

  return {
    id: memoryId,
    elderlyUserId: String(data.elderlyUserId).trim(),
    uploadedBy: String(data.uploadedBy).trim(),
    type,
    title: data.title ? String(data.title).trim() : 'Family Memory',
    description: data.description ? String(data.description).trim() : '',
    storageProvider: data.storageProvider || 'supabase',
    storageBucket: data.storageBucket || 'smriti-media',
    storagePath: data.storagePath || defaultPath,
    mimeType: data.mimeType || 'application/octet-stream',
    size: Number(data.size) || 0,
    language: data.language || 'as',
    tags: Array.isArray(data.tags) ? data.tags : [],
    culturalContext: {
      region: data.region || 'NER',
      era: data.era || 'Nostalgic Classic',
      language: data.language || 'as'
    },
    emotionalAnchorRating: Number(data.emotionalAnchorRating) || 5,
    cloudBacked: data.cloudBacked !== undefined ? Boolean(data.cloudBacked) : true,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
