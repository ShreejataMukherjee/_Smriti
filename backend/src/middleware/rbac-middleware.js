/**
 * SMRITI ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
 * Strictly enforces role boundaries on server endpoints and data mutations.
 */

import { logger } from '../utils/logger.js';

/**
 * Requires the authenticated user to possess at least one of the allowed roles
 * @param {Array<string>|string} allowedRoles 
 */
export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required before checking role permissions.'
      });
    }

    const userRole = req.user.role;
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
