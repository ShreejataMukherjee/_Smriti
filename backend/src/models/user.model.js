/**
 * SMRITI USER MODEL & SCHEMA DEFINITION
 * Data model for Elderly Patients, Caretakers, and future Healthcare Workers.
 * Aligned with the SIH Problem Statement for NER dementia care.
 */

export const VALID_ROLES = ['elderly_user', 'caretaker', 'healthcare_worker'];
export const VALID_PLANS = ['basic', 'premium'];
export const VALID_LANGUAGES = ['as', 'bn', 'hi', 'en', 'mni', 'kha']; // Assamese, Bengali, Hindi, English, Manipuri, Khasi

/**
 * Creates and validates a normalized User Profile entity
 * @param {Object} data 
 * @returns {Object} Validated user profile
 */
export function createUserModel(data = {}) {
  const role = VALID_ROLES.includes(data.role) ? data.role : 'elderly_user';
  const plan = VALID_PLANS.includes(data.plan) ? data.plan : 'basic';
  const language = VALID_LANGUAGES.includes(data.language) ? data.language : 'as';

  return {
    id: data.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: data.name ? String(data.name).trim() : 'Smriti User',
    email: data.email ? String(data.email).trim().toLowerCase() : '',
    photoURL: data.photoURL || '',
    gender: data.gender || '', // 'male' | 'female' | ''
    title: data.title || '',   // 'Baba' | 'Maa' | ''
    role,
    plan,
    region: data.region || 'NER',
    language,
    status: data.status || 'active',
    metadata: {
      lastLogin: new Date().toISOString(),
      onboardingComplete: Boolean(data.onboardingComplete),
      elderlyAssignedId: data.elderlyAssignedId || null,
      caretakerAssignedId: data.caretakerAssignedId || null,
    },
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
