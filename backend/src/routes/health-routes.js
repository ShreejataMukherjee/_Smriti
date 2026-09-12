/**
 * SMRITI SYSTEM HEALTH & METRICS ROUTE
 * /api/health
 */

import { Router } from 'express';
import { isFirebaseLive } from '../config/firebase-admin.js';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'smriti-platform-backend',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    engine: {
      firebaseLive: isFirebaseLive,
      authProvider: 'Google OAuth',
      storage: isFirebaseLive ? 'Cloud Firestore' : 'Secure Persistent Storage'
    }
  });
});

export default router;
