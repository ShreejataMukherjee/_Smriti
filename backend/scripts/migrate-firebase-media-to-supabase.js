/**
 * SMRITI FIREBASE TO SUPABASE MEDIA MIGRATION SCRIPT
 * Migrates existing Firebase Cloud Storage media binaries & local vault items to Supabase Storage,
 * updates Firestore metadata with storageProvider="supabase" & storageBucket="smriti-media",
 * and preserves original Firebase files intact.
 */

import { firestoreDb, isFirebaseLive, storageBucket } from '../src/config/firebase-admin.js';
import { supabaseStorageAdapter } from '../src/services/storage/supabase-storage-adapter.js';
import { logger } from '../src/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const LOCAL_MEMORIES_PATH = path.join(DATA_DIR, 'memories.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

async function migrateMedia() {
  console.log('========================================================================');
  console.log('🚀 SMRITI MEDIA MIGRATION: FIREBASE CLOUD STORAGE -> SUPABASE STORAGE');
  console.log('========================================================================');

  if (!supabaseStorageAdapter.isConfigured) {
    console.error('❌ Supabase Storage is not configured in environment. Aborting migration.');
    process.exit(1);
  }

  const targetBucket = 'smriti-media';
  console.log(`Target Supabase Bucket: ${targetBucket}`);

  let memories = [];

  // 1. Fetch metadata from Firestore
  if (isFirebaseLive && firestoreDb) {
    try {
      const snap = await firestoreDb.collection('memories').get();
      memories = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      console.log(`Found ${memories.length} media metadata records in Cloud Firestore.`);
    } catch (e) {
      console.warn('Could not read from Firestore, reading local memories dataset...', e.message);
    }
  }

  // Fallback to local memories if Firestore is empty or unavailable
  if (memories.length === 0 && fs.existsSync(LOCAL_MEMORIES_PATH)) {
    try {
      const raw = fs.readFileSync(LOCAL_MEMORIES_PATH, 'utf-8');
      const obj = JSON.parse(raw || '{}');
      memories = Object.values(obj);
      console.log(`Found ${memories.length} media metadata records in local database.`);
    } catch (e) {
      console.error('Failed to read local memories file:', e.message);
    }
  }

  if (memories.length === 0) {
    console.log('ℹ️ No media records found to migrate.');
    return;
  }

  let migratedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const memory of memories) {
    console.log(`\nProcessing Memory: ${memory.id} (${memory.title || 'Untitled'})`);
    console.log(`  Path: ${memory.storagePath}`);
    console.log(`  Current Provider: ${memory.storageProvider || 'firebase'}`);

    if (memory.storageProvider === 'supabase') {
      const alreadyExists = await supabaseStorageAdapter.exists({
        storagePath: memory.storagePath,
        bucket: targetBucket
      });
      if (alreadyExists) {
        console.log('  ⏭️ Already migrated to Supabase Storage. Skipping.');
        skippedCount++;
        continue;
      }
    }

    let fileBuffer = null;
    let mimeType = memory.mimeType || 'application/octet-stream';

    // A. Attempt to download from Firebase Cloud Storage
    if (isFirebaseLive && storageBucket) {
      try {
        const gcsFile = storageBucket.file(memory.storagePath);
        const [exists] = await gcsFile.exists();
        if (exists) {
          const [buffer] = await gcsFile.download();
          fileBuffer = buffer;
          console.log(`  📥 Downloaded ${fileBuffer.length} bytes from Firebase Cloud Storage.`);
        }
      } catch (err) {
        console.warn(`  ⚠️ Could not download from Firebase Cloud Storage: ${err.message}`);
      }
    }

    // B. Fallback to local uploads disk if not found in Cloud Storage
    if (!fileBuffer) {
      const localFilePath = path.join(UPLOADS_DIR, memory.storagePath);
      if (fs.existsSync(localFilePath)) {
        fileBuffer = fs.readFileSync(localFilePath);
        console.log(`  📥 Read ${fileBuffer.length} bytes from local vault.`);
      }
    }

    if (!fileBuffer) {
      console.error(`  ❌ Binary file not found in Firebase or local vault for ${memory.storagePath}`);
      failedCount++;
      continue;
    }

    // C. Upload to Supabase Storage
    try {
      await supabaseStorageAdapter.upload({
        storagePath: memory.storagePath,
        fileBuffer,
        mimeType,
        bucket: targetBucket
      });
      console.log('  📤 Successfully uploaded to Supabase Storage private bucket.');

      // D. Verify existence in Supabase
      const verified = await supabaseStorageAdapter.exists({
        storagePath: memory.storagePath,
        bucket: targetBucket
      });

      if (!verified) {
        throw new Error('Supabase verification check returned false after upload.');
      }
      console.log('  ✅ Verified object exists in Supabase Storage.');

      // E. Update metadata in Firestore
      const updatedMetadata = {
        ...memory,
        storageProvider: 'supabase',
        storageBucket: targetBucket,
        cloudBacked: true,
        updatedAt: new Date().toISOString()
      };

      if (isFirebaseLive && firestoreDb) {
        await firestoreDb.collection('memories').doc(memory.id).set(updatedMetadata, { merge: true });
        console.log('  📝 Updated Firestore metadata (storageProvider="supabase").');
      }

      // Update local storage copy
      if (fs.existsSync(LOCAL_MEMORIES_PATH)) {
        try {
          const raw = fs.readFileSync(LOCAL_MEMORIES_PATH, 'utf-8');
          const obj = JSON.parse(raw || '{}');
          obj[memory.id] = updatedMetadata;
          fs.writeFileSync(LOCAL_MEMORIES_PATH, JSON.stringify(obj, null, 2), 'utf-8');
        } catch (e) {}
      }

      migratedCount++;
      console.log('  🎉 Migration completed successfully for item.');
    } catch (err) {
      console.error(`  ❌ Failed to upload to Supabase: ${err.message}`);
      failedCount++;
    }
  }

  console.log('\n========================================================================');
  console.log('📊 SMRITI MEDIA MIGRATION SUMMARY');
  console.log('========================================================================');
  console.log(`Total Records:    ${memories.length}`);
  console.log(`Migrated:         ${migratedCount}`);
  console.log(`Already Present:  ${skippedCount}`);
  console.log(`Failed:           ${failedCount}`);
  console.log('========================================================================');
}

migrateMedia().catch(console.error);
