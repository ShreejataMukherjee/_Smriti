/**
 * SMRITI UNIFIED STORAGE SERVICE ABSTRACTION
 * Routes binary media operations across Supabase Storage (Production primary),
 * Firebase Cloud Storage (Legacy backward compatibility), and local server vault.
 * Production mode strictly enforces Supabase Storage with zero automatic local disk fallback.
 */

import { supabaseStorageAdapter } from './supabase-storage-adapter.js';
import { firebaseStorageAdapter } from './firebase-storage-adapter.js';
import { isFirebaseLive } from '../../config/firebase-admin.js';
import { isProduction, shouldUseLocalFallback } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

class StorageService {
  constructor() {
    this.primaryProvider = supabaseStorageAdapter.isConfigured ? 'supabase' : 'local';
    this.supabaseAdapter = supabaseStorageAdapter;
    this.firebaseAdapter = firebaseStorageAdapter;

    if (shouldUseLocalFallback(isFirebaseLive)) {
      try {
        if (!fs.existsSync(UPLOADS_DIR)) {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
      } catch (e) {}
    }
  }

  /**
   * Uploads binary media to the primary storage provider (Supabase Storage in production)
   */
  async upload({ storagePath, fileBuffer, mimeType, bucket }) {
    if (!storagePath || !fileBuffer) {
      throw new Error('storagePath and fileBuffer are required for storage upload.');
    }

    // 1. Primary Production Vault: Supabase Storage
    if (this.supabaseAdapter.isConfigured) {
      try {
        const uploadResult = await this.supabaseAdapter.upload({
          storagePath,
          fileBuffer,
          mimeType,
          bucket
        });
        logger.info('Media binary uploaded to Supabase Storage production vault', { storagePath });
        return {
          storageProvider: 'supabase',
          storageBucket: uploadResult?.storageBucket || 'smriti-media',
          storagePath,
          cloudBacked: true
        };
      } catch (err) {
        logger.error('Supabase Storage upload error', { storagePath, error: err.message });
        throw new Error(`Supabase Storage upload failed: ${err.message}`);
      }
    }

    // 2. Local Vault Write (Allowed ONLY in explicit offline dev/test mode)
    if (shouldUseLocalFallback(isFirebaseLive)) {
      try {
        const localFilePath = path.join(UPLOADS_DIR, storagePath);
        const localDir = path.dirname(localFilePath);
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        fs.writeFileSync(localFilePath, fileBuffer);
        return {
          storageProvider: 'local',
          storageBucket: 'smriti-media',
          storagePath,
          cloudBacked: false
        };
      } catch (err) {
        throw new Error(`Local disk write failed: ${err.message}`);
      }
    }

    throw new Error('No authorized cloud storage provider configured.');
  }

  /**
   * Downloads and streams binary media by respecting the document's storageProvider
   */
  async download({ storagePath, storageProvider = 'supabase', storageBucket = 'smriti-media' }) {
    if (!storagePath) throw new Error('storagePath is required for download.');

    // 1. Primary provider: Supabase Storage
    if (storageProvider === 'supabase' && this.supabaseAdapter.isConfigured) {
      try {
        const result = await this.supabaseAdapter.download({ storagePath, bucket: storageBucket });
        if (result) return result;
      } catch (err) {
        logger.error('Supabase Storage download error', { storagePath, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Supabase Storage download failed: ${err.message}`);
        }
      }
    }

    // 2. Legacy provider: Firebase Cloud Storage
    if (storageProvider === 'firebase' && this.firebaseAdapter.isConfigured) {
      try {
        const result = await this.firebaseAdapter.download({ storagePath });
        if (result) return result;
      } catch (err) {
        logger.error('Firebase Storage download error', { storagePath, error: err.message });
        if (!shouldUseLocalFallback(isFirebaseLive)) {
          throw new Error(`Firebase Storage download failed: ${err.message}`);
        }
      }
    }

    // 3. Fallback check on Supabase if provider was not set
    if (storageProvider !== 'supabase' && this.supabaseAdapter.isConfigured) {
      try {
        const result = await this.supabaseAdapter.download({ storagePath, bucket: storageBucket });
        if (result) return result;
      } catch (e) {}
    }

    // 4. Local Server Vault Fallback (offline dev/test only)
    if (shouldUseLocalFallback(isFirebaseLive)) {
      try {
        const localPath = path.join(UPLOADS_DIR, storagePath);
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath);
          return {
            filePath: localPath,
            buffer,
            size: buffer.length
          };
        }
      } catch (e) {}
    }

    return null;
  }

  /**
   * Deletes binary media from the appropriate storage provider and local disk
   */
  async delete({ storagePath, storageProvider = 'supabase', storageBucket = 'smriti-media' }) {
    if (!storagePath) return { success: false };

    // Delete from Supabase
    if (storageProvider === 'supabase' && this.supabaseAdapter.isConfigured) {
      try {
        await this.supabaseAdapter.delete({ storagePath, bucket: storageBucket });
      } catch (e) {
        logger.error('Supabase Storage delete error', { storagePath, error: e.message });
      }
    }

    // Delete from Firebase
    if (storageProvider === 'firebase' && this.firebaseAdapter.isConfigured) {
      try {
        await this.firebaseAdapter.delete({ storagePath });
      } catch (e) {
        logger.error('Firebase Storage delete error', { storagePath, error: e.message });
      }
    }

    // Delete from local disk (dev/test only)
    if (shouldUseLocalFallback(isFirebaseLive)) {
      try {
        const localPath = path.join(UPLOADS_DIR, storagePath);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch (e) {}
    }

    return { success: true };
  }

  /**
   * Checks if object exists in storage
   */
  async exists({ storagePath, storageProvider = 'supabase', storageBucket = 'smriti-media' }) {
    if (!storagePath) return false;

    if (storageProvider === 'supabase' && this.supabaseAdapter.isConfigured) {
      const exists = await this.supabaseAdapter.exists({ storagePath, bucket: storageBucket });
      if (exists) return true;
    }

    if (storageProvider === 'firebase' && this.firebaseAdapter.isConfigured) {
      const exists = await this.firebaseAdapter.exists({ storagePath });
      if (exists) return true;
    }

    if (shouldUseLocalFallback(isFirebaseLive)) {
      try {
        const localPath = path.join(UPLOADS_DIR, storagePath);
        return fs.existsSync(localPath);
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  /**
   * Creates a signed URL for authorized access
   */
  async getSignedUrl({ storagePath, storageProvider = 'supabase', storageBucket = 'smriti-media', expiresInSeconds = 3600 }) {
    if (storageProvider === 'supabase' && this.supabaseAdapter.isConfigured) {
      return this.supabaseAdapter.getSignedUrl({ storagePath, bucket: storageBucket, expiresInSeconds });
    }
    return null;
  }
}

export const storageService = new StorageService();
