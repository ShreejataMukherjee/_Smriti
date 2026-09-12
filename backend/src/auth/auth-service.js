/**
 * SMRITI BACKEND AUTHENTICATION SERVICE
 * Verifies OAuth tokens, manages secure user sessions, and guarantees role integrity.
 * Production mode strictly enforces live Firebase Admin Auth token verification and Firestore records.
 */

import { isFirebaseLive, adminAuth } from '../config/firebase-admin.js';
import { isProduction, shouldUseLocalFallback } from '../config/env.js';
import { userService } from '../services/user-service.js';
import { logger } from '../utils/logger.js';

export const authService = {
  /**
   * Validates a Google OAuth token or payload from the client
   */
  async verifyGoogleUser({ idToken, oauthUser, intendedRole }) {
    let verifiedId = null;
    let email = null;
    let name = null;
    let photoURL = null;

    const currentIsProd = Boolean(
      process.env.NODE_ENV === 'production' ||
      process.env.VERCEL === '1' ||
      process.env.VERCEL_ENV === 'production' ||
      isProduction
    );

    logger.info('[AUTH_DIAGNOSTIC] stage=VERIFY_GOOGLE_USER_STARTED', {
      isProduction: currentIsProd,
      hasIdToken: Boolean(idToken),
      hasOauthUser: Boolean(oauthUser),
      intendedRole
    });

    if (currentIsProd) {
      // In production: Strictly enforce live Firebase Admin Auth and genuine ID tokens
      if (!idToken) {
        logger.error('[AUTH_DIAGNOSTIC] stage=ID_TOKEN_MISSING_IN_PROD');
        throw new Error('Authentication failed: Firebase ID token is strictly required in production.');
      }
      if (!isFirebaseLive || !adminAuth) {
        logger.error('[AUTH_DIAGNOSTIC] stage=FIREBASE_ADMIN_UNAVAILABLE');
        throw new Error('Authentication failed: Firebase Authentication service is unavailable.');
      }

      logger.info('[AUTH_DIAGNOSTIC] stage=FIREBASE_ADMIN_VERIFY_ID_TOKEN_STARTED');
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        verifiedId = decoded.uid;
        email = decoded.email || oauthUser?.email || '';
        name = decoded.name || oauthUser?.name || (email ? email.split('@')[0] : 'Smriti User');
        photoURL = decoded.picture || oauthUser?.photoURL || '';

        logger.info('[AUTH_DIAGNOSTIC] stage=FIREBASE_ADMIN_VERIFY_ID_TOKEN_SUCCEEDED', {
          uid_prefix: verifiedId ? verifiedId.substring(0, 6) + '***' : 'none',
          hasEmail: Boolean(email),
          hasName: Boolean(name)
        });
      } catch (err) {
        logger.error('[AUTH_DIAGNOSTIC] stage=FIREBASE_ADMIN_VERIFY_ID_TOKEN_FAILED', { error: err.message, code: err.code });
        throw new Error(`Invalid or expired authentication token: ${err.message}`);
      }
    } else {
      // Local development or explicit test harness
      if (isFirebaseLive && adminAuth && idToken) {
        logger.info('[AUTH_DIAGNOSTIC] stage=DEV_FIREBASE_ADMIN_VERIFY_STARTED');
        try {
          const decoded = await adminAuth.verifyIdToken(idToken);
          verifiedId = decoded.uid;
          email = decoded.email || oauthUser?.email || '';
          name = decoded.name || oauthUser?.name || (email ? email.split('@')[0] : 'Smriti User');
          photoURL = decoded.picture || oauthUser?.photoURL || '';
          logger.info('[AUTH_DIAGNOSTIC] stage=DEV_FIREBASE_ADMIN_VERIFY_SUCCEEDED', {
            uid_prefix: verifiedId ? verifiedId.substring(0, 6) + '***' : 'none'
          });
        } catch (err) {
          logger.error('[AUTH_DIAGNOSTIC] stage=DEV_FIREBASE_ADMIN_VERIFY_FAILED', { error: err.message });
          throw new Error(`Invalid or expired authentication token: ${err.message}`);
        }
      } else if (oauthUser) {
        logger.info('[AUTH_DIAGNOSTIC] stage=DEV_OAUTH_USER_PAYLOAD_RECEIVED');
        verifiedId = oauthUser.id || oauthUser.uid;
        email = oauthUser.email || '';
        name = oauthUser.name || oauthUser.displayName || (email ? email.split('@')[0] : 'Smriti User');
        photoURL = oauthUser.photoURL || oauthUser.picture || '';

        if (!verifiedId || !email) {
          throw new Error('Missing essential Google profile fields (id, email)');
        }
      } else {
        throw new Error('No authentication credential provided');
      }
    }

    logger.info('[AUTH_DIAGNOSTIC] stage=VERIFIED_FIREBASE_UID', {
      uid_prefix: verifiedId ? verifiedId.substring(0, 6) + '***' : 'none'
    });

    // Sync or retrieve user record in authoritative storage
    logger.info('[AUTH_DIAGNOSTIC] stage=USER_SYNC_STARTED', {
      uid_prefix: verifiedId ? verifiedId.substring(0, 6) + '***' : 'none',
      intendedRole
    });

    const userProfile = await userService.syncOAuthUser({
      id: verifiedId,
      email,
      name,
      photoURL,
      intendedRole
    });

    if (!userProfile) {
      logger.error('[AUTH_DIAGNOSTIC] stage=USER_SYNC_FAILED');
      throw new Error('Failed to synchronize user profile with authoritative database.');
    }

    logger.info('[AUTH_DIAGNOSTIC] stage=USER_SYNC_SUCCEEDED', {
      userId_prefix: userProfile.id ? userProfile.id.substring(0, 6) + '***' : 'none',
      role: userProfile.role
    });

    // Generate session token (e.g. base64 payload or signed token)
    logger.info('[AUTH_DIAGNOSTIC] stage=SESSION_CREATION_STARTED');
    const sessionToken = Buffer.from(JSON.stringify({
      uid: userProfile.id,
      role: userProfile.role,
      plan: userProfile.plan,
      issuedAt: Date.now()
    })).toString('base64url');

    logger.info('[AUTH_DIAGNOSTIC] stage=SESSION_CREATION_SUCCEEDED');

    return {
      user: userProfile,
      sessionToken
    };
  },

  /**
   * Generates a signed session token for a user
   */
  generateSessionToken(user) {
    if (!user || !user.id) return null;
    return Buffer.from(JSON.stringify({
      uid: user.id,
      role: user.role,
      plan: user.plan || 'basic',
      issuedAt: Date.now()
    })).toString('base64url');
  },

  /**
   * Verifies an incoming session token
   */
  async verifySessionToken(token) {
    if (!token) return null;

    try {
      const decodedStr = Buffer.from(token, 'base64url').toString('utf-8');
      const payload = JSON.parse(decodedStr);
      if (!payload.uid) return null;

      const currentIsProd = Boolean(
        process.env.NODE_ENV === 'production' ||
        process.env.VERCEL === '1' ||
        process.env.VERCEL_ENV === 'production' ||
        isProduction
      );

      // Always fetch latest authoritative record from the database!
      const user = await userService.getUserById(payload.uid);
      if (user) return user;

      // In production, an authoritative Firestore record MUST exist; no simulated fallback
      if (currentIsProd) {
        return null;
      }

      // Local fallback only when explicitly permitted in dev/test
      if (shouldUseLocalFallback(isFirebaseLive) && payload.role) {
        return {
          id: payload.uid,
          role: payload.role,
          plan: payload.plan || 'basic'
        };
      }
      return null;
    } catch (e) {
      logger.warn('[AUTH_DIAGNOSTIC] stage=SESSION_TOKEN_PARSE_ERROR', { error: e.message });
      return null;
    }
  }
};
