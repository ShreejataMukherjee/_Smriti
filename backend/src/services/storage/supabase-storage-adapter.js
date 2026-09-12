/**
 * SMRITI SUPABASE STORAGE ADAPTER
 * Production private media vault adapter for Supabase Storage (smriti-media).
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { Readable } from 'stream';

class SupabaseStorageAdapter {
  constructor() {
    this.client = null;
    this.defaultBucket = config.supabase?.storageBucket || 'smriti-media';
    this.isConfigured = Boolean(config.supabase?.url && config.supabase?.serviceRoleKey);

    if (this.isConfigured) {
      try {
        this.client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
          auth: { persistSession: false }
        });
        logger.info('Supabase Storage Adapter initialized successfully with private bucket', { bucket: this.defaultBucket });
      } catch (err) {
        logger.error('Failed to initialize Supabase Storage client', err);
        this.isConfigured = false;
      }
    } else {
      logger.info('Supabase Storage not configured in environment (adapter inactive).');
    }
  }

  /**
   * Uploads file buffer to Supabase Storage private bucket
   */
  async upload({ storagePath, fileBuffer, mimeType, bucket }) {
    if (!this.isConfigured || !this.client) {
      throw new Error('Supabase Storage is not configured.');
    }

    const targetBucket = bucket || this.defaultBucket;
    const contentType = mimeType || 'application/octet-stream';

    const { data, error } = await this.client.storage
      .from(targetBucket)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true
      });

    if (error) {
      logger.error('Supabase upload error', { error: error.message, storagePath });
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    return {
      storageProvider: 'supabase',
      storageBucket: targetBucket,
      storagePath,
      key: data.path
    };
  }

  /**
   * Downloads binary object from Supabase Storage and returns stream / buffer
   */
  async download({ storagePath, bucket }) {
    if (!this.isConfigured || !this.client) {
      throw new Error('Supabase Storage is not configured.');
    }

    const targetBucket = bucket || this.defaultBucket;

    const { data, error } = await this.client.storage
      .from(targetBucket)
      .download(storagePath);

    if (error || !data) {
      logger.warn('Supabase download item not found or failed', { error: error?.message, storagePath });
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    return {
      stream,
      buffer,
      contentType: data.type || 'application/octet-stream',
      size: buffer.length
    };
  }

  /**
   * Deletes object from Supabase Storage private bucket
   */
  async delete({ storagePath, bucket }) {
    if (!this.isConfigured || !this.client) {
      return { success: false, reason: 'not_configured' };
    }

    const targetBucket = bucket || this.defaultBucket;

    const { data, error } = await this.client.storage
      .from(targetBucket)
      .remove([storagePath]);

    if (error) {
      logger.warn('Supabase delete item warning', { error: error.message, storagePath });
      return { success: false, error: error.message };
    }

    return { success: true, removed: data };
  }

  /**
   * Checks if object exists in Supabase Storage
   */
  async exists({ storagePath, bucket }) {
    if (!this.isConfigured || !this.client) return false;
    const targetBucket = bucket || this.defaultBucket;

    try {
      const parts = storagePath.split('/');
      const fileName = parts.pop();
      const folderPath = parts.join('/');

      const { data, error } = await this.client.storage
        .from(targetBucket)
        .list(folderPath, { search: fileName });

      if (error || !data) return false;
      return data.some(item => item.name === fileName);
    } catch (e) {
      return false;
    }
  }

  /**
   * Generates a short-lived signed URL for authorized access
   */
  async getSignedUrl({ storagePath, bucket, expiresInSeconds = 3600 }) {
    if (!this.isConfigured || !this.client) {
      throw new Error('Supabase Storage is not configured.');
    }

    const targetBucket = bucket || this.defaultBucket;

    const { data, error } = await this.client.storage
      .from(targetBucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
      throw new Error(`Failed to generate Supabase signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }
}

export const supabaseStorageAdapter = new SupabaseStorageAdapter();
