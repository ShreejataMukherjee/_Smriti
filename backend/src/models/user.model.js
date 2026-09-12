/**
 * SMRITI USER MODEL & SCHEMA DEFINITION
 * Data model for Elderly Patients, Caretakers, and future Healthcare Workers.
 * Aligned with the SIH Problem Statement for NER dementia care.
 */

export const VALID_ROLES = ['elderly_user', 'caretaker', 'healthcare_worker', 'medical_specialist'];
export const VALID_PLANS = ['basic', 'premium'];
export const VALID_LANGUAGES = ['as', 'bn', 'hi', 'en', 'mni', 'kha']; // Assamese, Bengali, Hindi, English, Manipuri, Khasi

/**
 * Normalizes input role string to one of standard VALID_ROLES
 */
export function normalizeRole(rawRole) {
  if (!rawRole) return 'elderly_user';
  const r = String(rawRole).trim().toLowerCase();
  if (['medical_specialist', 'specialist', 'doctor', 'physician', 'nurse', 'clinician'].includes(r)) {
    return 'medical_specialist';
  }
  if (['caretaker', 'caregiver', 'family'].includes(r)) {
    return 'caretaker';
  }
  if (['healthcare_worker', 'asha_worker'].includes(r)) {
    return 'healthcare_worker';
  }
  if (['elderly_user', 'elderly', 'senior', 'patient'].includes(r)) {
    return 'elderly_user';
  }
  return VALID_ROLES.includes(r) ? r : 'elderly_user';
}

/**
 * Creates and validates a normalized User Profile entity
 * @param {Object} data 
 * @returns {Object} Validated user profile
 */
export function createUserModel(data = {}) {
  const role = normalizeRole(data.role);
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
