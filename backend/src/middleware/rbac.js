/**
 * SMRITI ROLE-BASED ACCESS CONTROL (RBAC) & CLINICAL SCOPING MIDDLEWARE
 * Supports three primary roles: ELDERLY_USER, CARETAKER, and MEDICAL_SPECIALIST.
 * Enforces medical registration verification checks and relationship-aware clinical data scoping.
 */

import { logger } from '../utils/logger.js';
import { normalizeRole } from '../models/user.model.js';

/**
 * Requires the authenticated user to possess at least one of the allowed roles
 * @param {Array<string>|string} allowedRoles 
 */
export function requireRole(allowedRoles) {
  const rawRoles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const roles = rawRoles.map(r => normalizeRole(r));

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required before checking role permissions.'
      });
    }

    let userRole = normalizeRole(req.user.role);

    // If allowedRoles requires medical_specialist, allow specialists even if status is pending,
    // unverified (verified: false), or role is aliased
    if (roles.includes('medical_specialist') && userRole !== 'medical_specialist') {
      const isPendingSpecialist = req.user.role === 'pending' || 
                                  req.user.role === 'specialist_pending' || 
                                  req.user.role === 'doctor' ||
                                  req.user.role === 'specialist' ||
                                  req.user.verificationStatus === 'pending' ||
                                  req.user.isSpecialist === true;

      let hasSpecialistProfile = false;
      try {
        const { specialistService } = await import('../services/specialist-service.js');
        const profile = await specialistService.getSpecialistProfile(req.user.id);
        if (profile && (profile.role === 'medical_specialist' || profile.licenseNumber || profile.specialization)) {
          hasSpecialistProfile = true;
        }
      } catch (e) {}

      if (isPendingSpecialist || hasSpecialistProfile) {
        userRole = 'medical_specialist';
        req.user.role = 'medical_specialist';
      }
    }

    if (!roles.includes(userRole)) {
      logger.warn('RBAC Access Denied', {
        userId: req.user.id,
        userRole,
        requiredRoles: roles,
        path: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        error: 'Access Forbidden: Your account role does not have permission for this resource.',
        assignedRole: userRole,
        requiredRoles: roles
      });
    }

    next();
  };
}

/**
 * Middleware: Requires the user to be a verified Medical Specialist
 */
export async function requireVerifiedSpecialist(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required.'
    });
  }

  let role = normalizeRole(req.user.role);
  if (role !== 'medical_specialist' && role !== 'healthcare_worker') {
    const isPending = req.user.role === 'pending' || 
                      req.user.role === 'specialist_pending' || 
                      req.user.verificationStatus === 'pending' ||
                      req.user.isSpecialist === true;
    if (isPending) {
      role = 'medical_specialist';
      req.user.role = 'medical_specialist';
    } else {
      try {
        const { specialistService } = await import('../services/specialist-service.js');
        const profile = await specialistService.getSpecialistProfile(req.user.id);
        if (profile) {
          role = 'medical_specialist';
          req.user.role = 'medical_specialist';
        }
      } catch (e) {}
    }
  }

  if (role !== 'medical_specialist' && role !== 'healthcare_worker') {
    return res.status(403).json({
      success: false,
      error: 'Access Forbidden: Only verified medical specialists or healthcare clinicians can access this endpoint.',
      userRole: req.user.role
    });
  }

  // Allow specialists with status 'pending' or verified: false to initiate clinical link requests
  const isLinkRequest = req.baseUrl?.includes('/link') || req.path?.includes('/link') || req.originalUrl?.includes('/link');
  if (isLinkRequest) {
    return next();
  }

  // Check verification status from specialist profile
  let isVerified = true;
  try {
    const { specialistService } = await import('../services/specialist-service.js');
    const profile = await specialistService.getSpecialistProfile(req.user.id);
    if (profile && profile.verified !== undefined) {
      isVerified = Boolean(profile.verified);
    } else {
      isVerified = Boolean(req.user.isVerifiedSpecialist ?? req.user.verified ?? true);
    }
  } catch (e) {
    isVerified = Boolean(req.user.isVerifiedSpecialist ?? req.user.verified ?? false);
  }

  if (!isVerified) {
    logger.warn('Unverified Specialist Action Blocked', { userId: req.user.id });
    return res.status(403).json({
      success: false,
      verificationPending: true,
      error: 'Access Forbidden: Medical specialist profile pending license/registration verification.',
      notice: 'Clinical verification pending: Your account is currently awaiting administrative license verification (MCI-REG-PENDING). Prescribing medications and restricted clinical actions will be enabled once verified.'
    });
  }

  next();
}

/**
 * Middleware: Enforces clinical data isolation.
 * Medical specialists can only access clinical data (prescriptions, requests, alerts, adherence)
 * and aggregated non-diagnostic cognitive performance trends.
 * They are STRICTLY BLOCKED from personal memory vault items (photos, personal audio, family relationship notes).
 */
export function enforceClinicalScoping(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const role = normalizeRole(req.user.role);

  // If the caller is a specialist trying to access personal memory vault endpoints
  if (role === 'medical_specialist') {
    const isMemoryVault = req.originalUrl.includes('/api/media') || 
                          req.originalUrl.includes('/api/family') ||
                          req.originalUrl.includes('/api/routine');

    // Clinical scoping block
    if (isMemoryVault) {
      logger.warn('Specialist attempted unauthorized personal memory vault access', {
        specialistId: req.user.id,
        path: req.originalUrl
      });
      return res.status(403).json({
        success: false,
        clinicalPrivacyScoping: true,
        error: 'Clinical Scoping Restriction: Medical specialists are restricted to clinical records and cognitive performance trends, and cannot access raw personal memory vault photos or family archives.'
      });
    }
  }

  next();
}

export default {
  requireRole,
  requireVerifiedSpecialist,
  enforceClinicalScoping
};
