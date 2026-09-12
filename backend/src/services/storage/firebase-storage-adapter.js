/**
 * SMRITI FIREBASE STORAGE ADAPTER
 * Legacy storage adapter for backward compatibility with existing Firebase Cloud Storage media.
 */

import { storageBucket, isFirebaseLive } from '../../config/firebase-admin.js';
import { logger } from '../../utils/logger.js';

class FirebaseStorageAdapter {
  constructor() {
    this.isConfigured = isFirebaseLive && Boolean(storageBucket);
  }

  /**
   * Uploads file buffer to Google Cloud Storage (legacy)
   */
  async upload({ storagePath, fileBuffer, mimeType }) {
    if (!isFirebaseLive || !storageBucket) {
      throw new Error('Firebase Storage is not live or bucket is not configured.');
    }

    const gcsFile = storageBucket.file(storagePath);
    await gcsFile.save(fileBuffer, {
      metadata: { contentType: mimeType || 'application/octet-stream' },
      resumable: false
    });

    return {
      storageProvider: 'firebase',
      storageBucket: storageBucket.name,
      storagePath
    };
  }

  /**
   * Downloads binary object from Firebase Cloud Storage and returns stream / buffer
   */
  async download({ storagePath }) {
    if (!isFirebaseLive || !storageBucket) return null;

    try {
      const gcsFile = storageBucket.file(storagePath);
      const [exists] = await gcsFile.exists();
      if (!exists) return null;

      const [metadata] = await gcsFile.getMetadata();
      const stream = gcsFile.createReadStream();
      const [buffer] = await gcsFile.download();

      return {
        stream,
        buffer,
        contentType: metadata.contentType || 'application/octet-stream',
        size: buffer.length
      };
    } catch (err) {
      logger.warn('Firebase Storage download error', { error: err.message, storagePath });
      return null;
    }
  }

  /**
   * Deletes object from Firebase Cloud Storage
   */
  async delete({ storagePath }) {
    if (!isFirebaseLive || !storageBucket) return { success: false };

    try {
      const gcsFile = storageBucket.file(storagePath);
      await gcsFile.delete({ ignoreNotFound: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Checks if object exists in Firebase Cloud Storage
   */
  async exists({ storagePath }) {
    if (!isFirebaseLive || !storageBucket) return false;

    try {
      const gcsFile = storageBucket.file(storagePath);
      const [exists] = await gcsFile.exists();
      return exists;
    } catch (e) {
      return false;
    }
  }
}

export const firebaseStorageAdapter = new FirebaseStorageAdapter();
