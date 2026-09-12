/**
 * SMRITI ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
 * Strictly enforces role boundaries on server endpoints and data mutations.
 */

export { requireRole, requireVerifiedSpecialist, enforceClinicalScoping } from './rbac.js';

