/**
 * SMRITI AUTHENTICATION MIDDLEWARE
 * Verifies caller identity and attaches the authoritative user profile to req.user.
 */

import { authService } from '../auth/auth-service.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-session-token'];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No session token provided.'
      });
    }

    const user = await authService.verifySessionToken(token);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please sign in again.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      details: err.message
    });
  }
}

/**
 * Optional Auth: Attaches user if present, continues without blocking if guest
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-session-token'];

    if (token) {
      const user = await authService.verifySessionToken(token);
      if (user) req.user = user;
    }
  } catch (e) {
    // silently continue for optional auth
  }
  next();
}
