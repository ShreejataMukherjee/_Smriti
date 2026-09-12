/**
 * SMRITI RELATIONSHIP AUTHORIZATION MIDDLEWARE
 * Strictly validates that a caretaker has an active 'accepted' relationship with the target elderly user.
 * Supports both direct middleware use (requireActiveRelationship) and parameterized factory use (requireActiveRelationship(extractor)).
 */

import { relationshipService } from '../services/relationship-service.js';
import { specialistService } from '../services/specialist-service.js';
import { normalizeRole } from '../models/user.model.js';
import { enforceClinicalScoping } from './rbac.js';
import { logger } from '../utils/logger.js';

export function requireActiveRelationship(arg1, arg2, arg3) {
  // Direct middleware signature: (req, res, next)
  if (arg1 && arg1.headers && typeof arg2?.status === 'function' && typeof arg3 === 'function') {
    return executeGuard(arg1, arg2, arg3, null);
  }

  // Factory signature: (extractor) => (req, res, next)
  const extractor = typeof arg1 === 'function' ? arg1 : null;
  return (req, res, next) => executeGuard(req, res, next, extractor);
}

/**
 * Specifically requires an active specialist relationship
 */
export function requireActiveSpecialistRelationship(req, res, next) {
  return executeSpecialistGuard(req, res, next);
}

async function executeSpecialistGuard(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const targetElderlyId = req.params.elderlyUserId || req.body?.elderlyUserId || req.query?.elderlyUserId;
    if (!targetElderlyId) {
      return res.status(400).json({ success: false, error: 'Missing elderlyUserId in request' });
    }

    if (req.user.id === targetElderlyId) return next();

    const role = normalizeRole(req.user.role);

    // If caretaker or specialist, check their active connection
    if (role === 'medical_specialist') {
      const isAuthorized = await specialistService.hasActiveSpecialistRelationship(req.user.id, targetElderlyId);
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: 'Access Forbidden: An active accepted specialist relationship is required to access this patient\'s clinical records.'
        });
      }
      return next();
    }

    // Caretakers can also view clinical summaries/prescriptions for their active patients
    const hasCaretakerRel = await relationshipService.hasActiveRelationship(req.user.id, targetElderlyId);
    if (hasCaretakerRel) return next();

    return res.status(403).json({
      success: false,
      error: 'Access Forbidden: No active care or clinical relationship found for this patient.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function executeGuard(req, res, next, extractor) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const targetElderlyId = extractor 
      ? extractor(req) 
      : (req.params.elderlyUserId || req.body?.elderlyUserId || req.query?.elderlyUserId);

    if (!targetElderlyId) {
      return res.status(400).json({
        success: false,
        error: 'Missing elderlyUserId target in request'
      });
    }

    // Self-access by the elderly user is allowed
    if (req.user.id === targetElderlyId) {
      return next();
    }

    const userRole = normalizeRole(req.user.role);

    // If user is a specialist, check clinical scoping and specialist relationship
    if (userRole === 'medical_specialist') {
      // Memory vault / personal data is strictly blocked for specialists
      const isMemoryVault = req.originalUrl.includes('/api/media') || 
                            req.originalUrl.includes('/api/family') ||
                            req.originalUrl.includes('/api/routine');
      if (isMemoryVault) {
        return res.status(403).json({
          success: false,
          clinicalPrivacyScoping: true,
          error: 'Clinical Scoping Restriction: Medical specialists cannot access personal memory vault items or family archives.'
        });
      }

      const isSpecialistAuth = await specialistService.hasActiveSpecialistRelationship(req.user.id, targetElderlyId);
      if (isSpecialistAuth) {
        return next();
      }
    }

    // Caretaker access requires verified accepted relationship
    const isAuthorized = await relationshipService.hasActiveRelationship(req.user.id, targetElderlyId);
    if (!isAuthorized) {
      logger.warn('Relationship Authorization Denied', {
        callerId: req.user.id,
        callerRole: req.user.role,
        targetElderlyId,
        path: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        error: 'Access Forbidden: An active accepted relationship is required to access this elderly user\'s profile or memory vault.'
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Relationship authorization verification failed',
      details: err.message
    });
  }
}
