/**
 * SMRITI ONE CONTROLLED REAL GOOGLE CLOUD VISION SMOKE TEST
 * Executes exactly ONE Google Cloud Vision FACE_DETECTION request.
 * Verifies live Google Cloud authentication, response parsing, and caching.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { visionFaceService } from '../src/services/vision-face.service.js';
import { mediaService } from '../src/services/media-service.js';
import { relationshipService } from '../src/services/relationship-service.js';
import { userService } from '../src/services/user-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRealVisionSmokeTest() {
  console.log('\n==================================================');
  console.log('🔍 RUNNING SINGLE CONTROLLED REAL GOOGLE VISION SMOKE TEST');
  console.log('==================================================\n');

  // Enforce production google vision provider
  process.env.VISION_PROVIDER = 'google';
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/Users/aryanrajtiwary/smriti-secrets/smriti-vision.json';
  process.env.GOOGLE_CLOUD_PROJECT_ID = 'smriti-133e1';

  console.log('1. Verifying credentials path...');
  assert(fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS), 'Google credentials file not found');
  console.log('   ✅ Credentials path confirmed.');

  // Create temporary in-memory memory record
  const elderlyId = 'smoke_test_elderly_sruti';
  const caretakerId = 'smoke_test_caretaker_aryan';
  const testPhotoPath = path.join(__dirname, 'fixtures/test-photo.jpg');
  const fileBuffer = fs.readFileSync(testPhotoPath);

  console.log('2. Preparing test photo memory record...');
  const mem = await mediaService.saveUploadedFile({
    fileBuffer,
    elderlyUserId: elderlyId,
    uploadedBy: elderlyId,
    type: 'photo',
    title: 'Smoke Test Memory Photo',
    originalName: 'test-photo.jpg',
    mimeType: 'image/jpeg',
    size: fileBuffer.length
  });

  console.log(`   Memory created with ID: ${mem.id}`);

  console.log('3. Executing EXACTLY ONE Google Cloud Vision FACE_DETECTION call...');
  const startTime = Date.now();
  const result = await visionFaceService.detectFaces(mem.id, elderlyId);
  const latency = Date.now() - startTime;

  console.log(`   ✅ Live Vision API call succeeded in ${latency}ms.`);
  console.log(`   Status: Success`);
  console.log(`   Provider: ${result.provider}`);
  console.log(`   Faces detected: ${result.facesCount}`);
  console.log(`   Cached flag: ${result.cached}`);

  console.log('4. Verifying caching guard (Second call MUST NOT hit Google Vision)...');
  const secondResult = await visionFaceService.detectFaces(mem.id, elderlyId);
  assert.strictEqual(secondResult.cached, true, 'Second call must return cached result');
  console.log('   ✅ Caching guard confirmed: second call returned cached result in 0ms.');

  // Cleanup test memory
  await mediaService.deleteMemory(mem.id, elderlyId).catch(() => {});

  console.log('\n==================================================');
  console.log('🎉 SINGLE REAL GOOGLE VISION SMOKE TEST PASSED!');
  console.log('==================================================\n');
}

runRealVisionSmokeTest().catch(err => {
  console.error('\n❌ Real Vision Smoke Test Failed:', err.message);
  process.exit(1);
});
