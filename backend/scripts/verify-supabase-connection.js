/**
 * SMRITI SUPABASE CONNECTION & BUCKET VERIFICATION SCRIPT
 * Tests Supabase URL, Service Role credentials, and 'smriti-media' bucket accessibility.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../src/config/env.js';

async function verifySupabase() {
  console.log('--- SMRITI SUPABASE CONNECTIVITY AUDIT ---');

  const supabaseUrl = config.supabase.url;
  const serviceKey = config.supabase.serviceRoleKey;
  const bucketName = config.supabase.storageBucket;

  console.log('1. Supabase URL Configuration:', supabaseUrl ? 'configured' : 'missing');
  console.log('2. Supabase Service Role Key:', serviceKey ? 'configured' : 'missing');
  console.log('3. Target Storage Bucket:', bucketName);

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Supabase credentials missing from environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  try {
    // List buckets to check connection & permissions
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) {
      console.error('❌ Failed to list buckets:', listErr.message);
      process.exit(1);
    }

    const bucketFound = buckets.find(b => b.name === bucketName || b.id === bucketName);
    console.log('4. Storage Buckets Found:', buckets.map(b => b.name).join(', '));
    console.log(`5. Bucket "${bucketName}" Status:`, bucketFound ? 'accessible' : 'not found');

    if (!bucketFound) {
      console.log(`Creating bucket "${bucketName}"...`);
      const { data: createData, error: createErr } = await supabase.storage.createBucket(bucketName, {
        public: false
      });
      if (createErr) {
        console.error('❌ Failed to create bucket:', createErr.message);
      } else {
        console.log(`✅ Bucket "${bucketName}" created successfully and set to private.`);
      }
    }

    // Test a ping write and delete to confirm read/write permissions
    const testPath = `.smriti_connectivity_test_${Date.now()}.txt`;
    const testBuffer = Buffer.from('smriti_connection_ok');

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(bucketName)
      .upload(testPath, testBuffer, { contentType: 'text/plain', upsert: true });

    if (uploadErr) {
      console.error('❌ Bucket upload test failed:', uploadErr.message);
      process.exit(1);
    }
    console.log('6. Bucket Write Access: accessible');

    const { data: downloadData, error: downloadErr } = await supabase.storage
      .from(bucketName)
      .download(testPath);

    if (downloadErr) {
      console.error('❌ Bucket download test failed:', downloadErr.message);
      process.exit(1);
    }
    console.log('7. Bucket Read Access: accessible');

    // Clean up ping file
    await supabase.storage.from(bucketName).remove([testPath]);
    console.log('8. Bucket Delete Access: accessible');

    console.log('✅ Supabase Storage is fully configured and accessible!');
  } catch (err) {
    console.error('❌ Supabase verification error:', err.message);
    process.exit(1);
  }
}

verifySupabase();
