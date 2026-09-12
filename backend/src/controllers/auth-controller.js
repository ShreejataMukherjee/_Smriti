/**
 * SMRITI AUTH CONTROLLER
 * Handles login, token verification, session lifecycle, and sign-out endpoints.
 */

import { authService } from '../auth/auth-service.js';
import { logger } from '../utils/logger.js';

export const authController = {
  /**
   * POST /api/auth/google
   * Authenticates with Google OAuth and returns session & authoritative user record
   */
  async googleAuth(req, res) {
    try {
      const { idToken, oauthUser, intendedRole } = req.body;

      logger.info('[AUTH_DIAGNOSTIC] stage=POST_API_AUTH_GOOGLE_RECEIVED', {
        hasIdToken: Boolean(idToken),
        hasOauthUser: Boolean(oauthUser),
        intendedRole
      });

      if (!idToken && !oauthUser) {
        return res.status(400).json({
          success: false,
          error: 'Missing authentication credentials (idToken or oauthUser)'
        });
      }

      const result = await authService.verifyGoogleUser({
        idToken,
        oauthUser,
        intendedRole
      });

      logger.info('[AUTH_DIAGNOSTIC] stage=AUTH_RESPONSE_RETURNED', {
        status: 200,
        userId_prefix: result.user?.id ? result.user.id.substring(0, 6) + '***' : 'none',
        role: result.user?.role
      });

      return res.status(200).json({
        success: true,
        message: 'Authentication successful',
        user: result.user,
        sessionToken: result.sessionToken
      });
    } catch (err) {
      logger.error('[AUTH_DIAGNOSTIC] stage=AUTH_CONTROLLER_ERROR', { error: err.message });
      return res.status(401).json({
        success: false,
        error: err.message || 'Authentication failed. Please try again.',
        details: err.message
      });
    }
  },

  /**
   * GET /api/auth/session
   * Verifies current session from token
   */
  async getSession(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'No active session'
        });
      }

      return res.status(200).json({
        success: true,
        user: req.user
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Failed to verify session'
      });
    }
  },

  /**
   * POST /api/auth/logout
   */
  async logout(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
};
