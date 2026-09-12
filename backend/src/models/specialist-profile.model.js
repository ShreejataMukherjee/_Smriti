/**
 * SMRITI MEDICAL SPECIALIST PROFILE MODEL
 * Stores clinician details, medical registration number, verification status, and credentials.
 */

export function createSpecialistProfileModel(data = {}) {
  return {
    id: data.id || data.specialistId || `spec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    specialistId: data.specialistId || data.id || '',
    name: data.name ? String(data.name).trim() : 'Medical Specialist',
    email: data.email ? String(data.email).trim().toLowerCase() : '',
    photoURL: data.photoURL || '👨‍⚕️',
    title: data.title || 'Dr.',
    role: 'medical_specialist',
    licenseNumber: data.licenseNumber ? String(data.licenseNumber).trim() : 'MCI-REG-PENDING',
    specialization: data.specialization || 'Geriatric Neurology / Dementia Care',
    hospitalOrClinic: data.hospitalOrClinic || 'Guwahati Geriatric Neurological Centre',
    department: data.department || 'Cognitive Neurology',
    contactPhone: data.contactPhone || '',
    qualification: data.qualification || 'MBBS, MD (Neurology), Fellowship in Cognitive Disorders',
    verified: Boolean(data.verified !== undefined ? data.verified : true),
    verificationSource: data.verificationSource || 'National Medical Commission / State Registry',
    verifiedAt: data.verifiedAt || (data.verified !== false ? new Date().toISOString() : null),
    bio: data.bio || 'Specialist clinician supporting personalized memory and cognitive care for elderly dementia patients.',
    activePatientCount: Number(data.activePatientCount) || 0,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
