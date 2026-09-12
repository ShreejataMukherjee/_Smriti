/**
 * SMRITI PUBLIC CONFIGURATION ROUTE
 * Exposes non-sensitive Firebase Web SDK configuration to the frontend client.
 */

import { Router } from 'express';
import { config } from '../config/env.js';

const router = Router();

router.get('/firebase', (req, res) => {
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "AIzaSyCLNTEdpJq8pf2M3oJ2RYHNjPhQwJxXppQ";
  const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || "smriti-133e1.firebaseapp.com";
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "smriti-133e1";
  const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || "smriti-133e1.firebasestorage.app";
  const messagingSenderId = process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || "479866678046";
  const appId = process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || "1:479866678046:web:da721fae47963bc9ef370f";

  const isVercelProd = process.env.VERCEL_ENV === 'production' || process.env.VERCEL === '1' || req.headers.host?.includes('vercel.app');
  const nodeEnv = isVercelProd ? 'production' : config.nodeEnv;

  res.status(200).json({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    isConfigured: Boolean(apiKey && projectId),
    nodeEnv
  });
});

export default router;
