/**
 * SMRITI FIREBASE ADMIN / PERSISTENT STORAGE INITIALIZER
 * Provides access to server-side Firebase Admin Auth & Firestore when credentials are provided,
 * or switches smoothly to high-fidelity server storage in local/dev environments.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let isFirebaseLive = false;
let adminAuth = null;
let firestoreDb = null;
let storageBucket = null;

// Initialize live Firebase Admin if valid project credentials exist
if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
  try {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        })
      });
    }
    adminAuth = getAuth();
    firestoreDb = getFirestore();
    isFirebaseLive = true;
    logger.info('Firebase Admin & Cloud Firestore initialized successfully with project credentials.');
  } catch (err) {
    logger.warn('Firebase Admin initialization skipped (running in local secure storage mode).', { reason: err.message });
  }
} else {
  logger.info('Running with local persistent secure storage engine (Phase 2 dev & test mode).');
}

export { isFirebaseLive, adminAuth, firestoreDb, storageBucket };
