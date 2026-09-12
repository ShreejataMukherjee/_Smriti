/**
 * SMRITI FAMILY & CONTACTS MODEL
 * Reusable memory and personality dataset for family recognition, face-name matching, and emotional recall.
 */

export function createFamilyMemberModel(data = {}) {
  return {
    id: data.id || `fam_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    elderlyUserId: data.elderlyUserId || '',
    name: data.name || 'Family Member',
    relationship: data.relationship || 'Family Member', // Custom relationship chosen by caretaker
    familiarTitle: data.familiarTitle || data.relationship || 'Family Member', // Caretaker-chosen title/familiar reference (e.g. Papa, Maa, Son, Daughter, Bhaity)
    gender: data.gender || 'unspecified', // 'male' | 'female' | 'other' | 'unspecified'
    photoURL: data.photoURL || data.avatarUrl || '',
    avatarUrl: data.avatarUrl || data.photoURL || '',
    avatar: data.avatar || '🧑‍💼',
    location: data.location || '', // e.g. 'Guwahati', 'Delhi', 'Tezpur'
    personalContext: data.personalContext || data.memoryContext || data.shortDescription || '', // e.g. 'Loves drinking morning tea together'
    shortDescription: data.shortDescription || data.personalContext || '',
    voicePrompt: data.voicePrompt || data.memoryPrompt || '', // e.g. 'Ask about the garden walk or Bihu festival'
    importantNotes: data.importantNotes || '',
    phone: data.phone || '',
    isFavorite: Boolean(data.isFavorite || data.isImportant),
    isPrimaryCaregiver: Boolean(data.isPrimaryCaregiver),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  };
}

