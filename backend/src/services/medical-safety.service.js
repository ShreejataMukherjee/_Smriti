/**
 * SMRITI MEDICAL SAFETY LAYER (NON-DIAGNOSTIC RULE ENGINE)
 * Validates prescription proposals against:
 * 1. Documented allergy conflicts in the elderly patient's profile
 * 2. Duplicate or conflicting drug class overlaps among active prescriptions
 *
 * NOTE: Non-diagnostic safety assistance for licensed clinicians.
 */

import { logger } from '../utils/logger.js';

// Drug classification mapping for geriatric & dementia pharmacotherapy
export const DRUG_CLASSES = {
  CHOLINESTERASE_INHIBITOR: {
    key: 'cholinesterase_inhibitor',
    name: 'Cholinesterase Inhibitor (AChEI)',
    drugs: ['donepezil', 'aricept', 'rivastigmine', 'exelon', 'galantamine', 'razadyne'],
    maxConcurrent: 1,
    duplicateWarning: 'Concurrent use of multiple cholinesterase inhibitors is contraindicated due to heightened risk of cholinergic toxicity (bradycardia, severe GI distress).'
  },
  NMDA_ANTAGONIST: {
    key: 'nmda_antagonist',
    name: 'NMDA Receptor Antagonist',
    drugs: ['memantine', 'namenda', 'ebixa', 'admenta'],
    maxConcurrent: 1,
    duplicateWarning: 'Duplicate NMDA receptor antagonist therapy detected. Verify intended single-agent titration schedule.'
  },
  NSAID: {
    key: 'nsaid',
    name: 'Nonsteroidal Anti-inflammatory Drug (NSAID)',
    drugs: ['ibuprofen', 'naproxen', 'diclofenac', 'celecoxib', 'indomethacin', 'meloxicam', 'aspirin', 'ecospirin'],
    maxConcurrent: 1,
    duplicateWarning: 'Multiple concurrent NSAIDs significantly increase risks of gastrointestinal bleeding and renal impairment in geriatric patients.'
  },
  SEDATIVE_BENZODIAZEPINE: {
    key: 'sedative_benzodiazepine',
    name: 'Sedative / Benzodiazepine',
    drugs: ['diazepam', 'lorazepam', 'ativan', 'clonazepam', 'alprazolam', 'xanax', 'zolpidem', 'ambien'],
    maxConcurrent: 1,
    duplicateWarning: 'Caution: Sedatives/Benzodiazepines are associated with increased confusion, paradoxical agitation, and fall risk in elderly dementia patients (Beers Criteria).'
  },
  ANTICHOLINERGIC: {
    key: 'anticholinergic',
    name: 'Strong Anticholinergic Agent',
    drugs: ['diphenhydramine', 'benadryl', 'hydroxyzine', 'oxybutynin', 'amitriptyline', 'chlorpheniramine'],
    maxConcurrent: 1,
    duplicateWarning: 'High Anticholinergic Cognitive Burden: Anticholinergic agents can acutely worsen cognitive decline and memory recall in dementia patients.'
  },
  ANTIHYPERTENSIVE: {
    key: 'antihypertensive',
    name: 'Antihypertensive',
    drugs: ['amlodipine', 'telmisartan', 'losartan', 'enalapril', 'ramipril', 'atenolol', 'metoprolol'],
    maxConcurrent: 3,
    duplicateWarning: 'High cumulative antihypertensive load: Monitor for orthostatic hypotension and sundowning dizziness.'
  }
};

/**
 * Normalizes drug name string for keyword matching
 */
function normalizeDrugString(str = '') {
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
}

export const medicalSafety = {
  /**
   * Identifies the primary drug class for a given medication name
   */
  classifyDrug(drugName = '') {
    const normalized = normalizeDrugString(drugName);
    for (const [classKey, classDef] of Object.entries(DRUG_CLASSES)) {
      for (const drugKeyword of classDef.drugs) {
        if (normalized.includes(drugKeyword)) {
          return {
            classKey,
            className: classDef.name,
            matchedKeyword: drugKeyword
          };
        }
      }
    }
    return {
      classKey: 'other',
      className: 'General Supportive Medication',
      matchedKeyword: null
    };
  },

  /**
   * Cross-references medication against patient's known allergies
   * @param {Object} prescription - Proposed prescription
   * @param {Object} profile - Elderly profile (with allergies array or notes)
   */
  checkAllergyConflicts(prescription, profile = {}) {
    const conflicts = [];
    const warnings = [];

    const rawAllergies = [
      ...(Array.isArray(profile.allergies) ? profile.allergies : []),
      ...(Array.isArray(profile.knownAllergies) ? profile.knownAllergies : []),
      ...(profile.personalNotes ? [profile.personalNotes] : []),
      ...(profile.medicalHistory ? [profile.medicalHistory] : [])
    ];

    if (rawAllergies.length === 0) {
      return { hasAllergyConflict: false, conflicts, warnings };
    }

    const proposedDrug = normalizeDrugString(prescription.drugName + ' ' + (prescription.genericName || ''));
    const allergyText = rawAllergies.map(a => normalizeDrugString(a)).join(' ');

    // Check specific allergen keywords
    const commonAllergens = [
      { key: 'penicillin', names: ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin'] },
      { key: 'sulfa', names: ['sulfa', 'sulfamethoxazole', 'bactrim', 'septra', 'sulfonamide'] },
      { key: 'aspirin', names: ['aspirin', 'salicylate', 'ecospirin', 'disprin'] },
      { key: 'nsaid', names: ['nsaid', 'ibuprofen', 'brufen', 'combiflam', 'naproxen', 'diclofenac', 'voveran'] },
      { key: 'donepezil', names: ['donepezil', 'aricept', 'donecept'] },
      { key: 'rivastigmine', names: ['rivastigmine', 'exelon'] },
      { key: 'memantine', names: ['memantine', 'namenda', 'admenta'] },
      { key: 'codeine', names: ['codeine', 'tramadol', 'opioid', 'morphine'] }
    ];

    for (const group of commonAllergens) {
      const patientHasAllergy = group.names.some(n => allergyText.includes(n));
      const proposedMatches = group.names.some(n => proposedDrug.includes(n));

      if (patientHasAllergy && proposedMatches) {
        conflicts.push(`CRITICAL ALLERGY MATCH: Patient has documented sensitivity to '${group.key.toUpperCase()}'. Proposed prescription '${prescription.drugName}' matches this allergen.`);
      }
    }

    // Direct token substring match
    for (const allergy of rawAllergies) {
      const cleanAllergy = normalizeDrugString(allergy);
      if (cleanAllergy.length >= 4 && proposedDrug.includes(cleanAllergy)) {
        if (!conflicts.some(c => c.includes(cleanAllergy))) {
          conflicts.push(`POTENTIAL ALLERGY CONFLICT: Prescription '${prescription.drugName}' matches profile allergy note '${allergy}'.`);
        }
      }
    }

    return {
      hasAllergyConflict: conflicts.length > 0,
      conflicts,
      warnings
    };
  },

  /**
   * Checks for duplicate / conflicting drug classes with active prescriptions
   * @param {Object} proposedPrescription - Proposed prescription
   * @param {Array<Object>} activePrescriptions - Current active prescriptions
   */
  checkClassConflicts(proposedPrescription, activePrescriptions = []) {
    const conflicts = [];
    const warnings = [];

    const proposedClass = this.classifyDrug(proposedPrescription.drugName);

    const activeList = activePrescriptions.filter(p => 
      p.status === 'active' && 
      p.id !== proposedPrescription.id
    );

    // 1. Direct duplicate drug name check
    const duplicateDrug = activeList.find(p => 
      normalizeDrugString(p.drugName) === normalizeDrugString(proposedPrescription.drugName)
    );
    if (duplicateDrug) {
      conflicts.push(`DUPLICATE PRESCRIPTION: Patient already has active prescription for '${duplicateDrug.drugName}' (Current Dosage: ${duplicateDrug.dosage}, Frequency: ${duplicateDrug.frequency}).`);
    }

    // 2. Class overlap check
    if (proposedClass.classKey !== 'other') {
      const classDef = DRUG_CLASSES[proposedClass.classKey];
      const sameClassActives = activeList.filter(p => {
        const pClass = this.classifyDrug(p.drugName);
        return pClass.classKey === proposedClass.classKey;
      });

      if (sameClassActives.length >= (classDef.maxConcurrent || 1)) {
        const existingNames = sameClassActives.map(p => `${p.drugName} (${p.dosage})`).join(', ');
        warnings.push(`DRUG CLASS OVERLAP (${classDef.name}): ${classDef.duplicateWarning} (Existing active: ${existingNames})`);
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      warnings,
      detectedClass: proposedClass
    };
  },

  /**
   * Comprehensive safety evaluation combining allergy and drug class checks
   */
  validatePrescriptionSafety({ prescription, profile = {}, activePrescriptions = [] }) {
    const allergyResult = this.checkAllergyConflicts(prescription, profile);
    const classResult = this.checkClassConflicts(prescription, activePrescriptions);

    const allConflicts = [...allergyResult.conflicts, ...classResult.conflicts];
    const allWarnings = [...allergyResult.warnings, ...classResult.warnings];

    const isSafe = allConflicts.length === 0;

    logger.info('[MEDICAL_SAFETY_CHECK]', {
      drugName: prescription.drugName,
      safe: isSafe,
      conflictCount: allConflicts.length,
      warningCount: allWarnings.length
    });

    return {
      safe: isSafe,
      hasAllergyConflict: allergyResult.hasAllergyConflict,
      hasDuplicateConflict: classResult.hasConflicts,
      conflicts: allConflicts,
      warnings: allWarnings,
      drugClassification: classResult.detectedClass,
      timestamp: new Date().toISOString()
    };
  }
};

export { medicalSafety as medicalSafetyService };
export default medicalSafety;
