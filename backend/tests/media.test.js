/**
 * SMRITI MEDIA & RELATIONSHIP-AWARE AUTHORIZATION TEST SUITE
 * Tests photo, audio, and video binary upload, streaming, metadata recording, and relationship-aware authorization.
 */

import assert from 'assert';

const API_BASE = 'http://localhost:3000';

async function runMediaTests() {
  console.log('🧪 Starting Smriti Media & Relationship Authorization Test Suite...\n');

  // 1. Setup accounts and relationships
  console.log('1. Setting up accounts and establishing accepted relationship...');

  const authUser = async (id, name, email, role, avatar) => {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oauthUser: { id, name, email, photoURL: avatar },
        intendedRole: role
      })
    });
    const data = await res.json();
    return { token: data.sessionToken, user: data.user };
  };

  const aryan = await authUser('google_oauth_caretaker_aryan', 'Aryan', 'aryan@example.com', 'caretaker', '🧑‍💻');
  const hrisit = await authUser('google_oauth_caretaker_hrisit', 'Hrisit', 'hrisit@example.com', 'caretaker', '👨‍💼');
  const sruti = await authUser('google_oauth_elderly_sruti', 'Sruti', 'sruti@example.com', 'elderly_user', '👵');

  // Ensure active accepted relationship between Aryan and Sruti
  const aryanRelsRes = await fetch(`${API_BASE}/api/relationships/caretaker`, { headers: { 'Authorization': `Bearer ${aryan.token}` } });
  const aryanRelsData = await aryanRelsRes.json();
  let activeRel = aryanRelsData.relationships?.find(r => r.elderlyUserId === sruti.user.id && r.status === 'accepted');

  if (!activeRel) {
    const reqRes = await fetch(`${API_BASE}/api/relationships/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
      body: JSON.stringify({ elderlyTarget: 'sruti@example.com' })
    });
    const reqData = await reqRes.json();
    if (reqData.success) {
      await fetch(`${API_BASE}/api/relationships/${reqData.relationship.id}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
        body: JSON.stringify({ decision: 'accept' })
      });
    }
  }

  console.log('   ✅ Active relationship: Caretaker Aryan <--> Elderly Sruti');

  // 2. Direct Binary Photo Upload via POST /api/media/upload
  console.log('2. Testing Direct Binary Photo Upload via POST /api/media/upload...');
  const photoBlob = new Blob(['fake-jpeg-binary-image-data'], { type: 'image/jpeg' });
  const photoFormData = new FormData();
  photoFormData.append('file', photoBlob, 'assam_tea_garden.jpg');
  photoFormData.append('elderlyUserId', sruti.user.id);
  photoFormData.append('type', 'photo');
  photoFormData.append('title', 'Assam Tea Garden Memories');
  photoFormData.append('description', 'Morning walk near tea bushes in Tezpur');
  photoFormData.append('tags', JSON.stringify(['garden', 'assam', 'family']));

  const uploadPhotoRes = await fetch(`${API_BASE}/api/media/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${aryan.token}` },
    body: photoFormData
  });
  const uploadPhotoData = await uploadPhotoRes.json();
  assert.strictEqual(uploadPhotoRes.status, 201);
  assert.strictEqual(uploadPhotoData.success, true);
  assert.strictEqual(uploadPhotoData.memory.type, 'photo');
  assert.ok(uploadPhotoData.memory.storagePath.includes('photos/'));
  const photoMemoryId = uploadPhotoData.memory.id;
  const photoStoragePath = uploadPhotoData.memory.storagePath;
  console.log(`   ✅ Binary photo uploaded & persisted (ID: ${photoMemoryId}, Path: ${photoStoragePath})`);

  // 3. Direct Binary Video Upload via POST /api/media/upload
  console.log('3. Testing Direct Binary Video Upload (MP4)...');
  const videoBlob = new Blob(['fake-mp4-video-data'], { type: 'video/mp4' });
  const videoFormData = new FormData();
  videoFormData.append('file', videoBlob, 'bihu_festival_dance.mp4');
  videoFormData.append('elderlyUserId', sruti.user.id);
  videoFormData.append('type', 'video');
  videoFormData.append('title', 'Bihu Festival Dance');

  const uploadVideoRes = await fetch(`${API_BASE}/api/media/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${aryan.token}` },
    body: videoFormData
  });
  const uploadVideoData = await uploadVideoRes.json();
  assert.strictEqual(uploadVideoRes.status, 201);
  assert.strictEqual(uploadVideoData.memory.type, 'video');
  const videoMemoryId = uploadVideoData.memory.id;
  console.log(`   ✅ Binary video uploaded & persisted (ID: ${videoMemoryId})`);

  // 4. Direct Binary Audio Upload (MP3)
  console.log('4. Testing Direct Binary Audio Upload (MP3)...');
  const audioBlob = new Blob(['fake-mp3-audio-data'], { type: 'audio/mpeg' });
  const audioFormData = new FormData();
  audioFormData.append('file', audioBlob, 'nostalgic_flute_tune.mp3');
  audioFormData.append('elderlyUserId', sruti.user.id);
  audioFormData.append('type', 'audio');
  audioFormData.append('title', 'Nostalgic Flute Folk Tune');

  const uploadAudioRes = await fetch(`${API_BASE}/api/media/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${aryan.token}` },
    body: audioFormData
  });
  const uploadAudioData = await uploadAudioRes.json();
  assert.strictEqual(uploadAudioRes.status, 201);
  assert.strictEqual(uploadAudioData.memory.type, 'audio');
  console.log(`   ✅ Binary audio uploaded & persisted (ID: ${uploadAudioData.memory.id})`);

  // 5. Test Streaming Media Binary via GET /api/media/file/*
  console.log('5. Testing Streaming Media Binary via GET /api/media/file/*...');
  const streamRes = await fetch(`${API_BASE}/api/media/file/${photoStoragePath}?token=${aryan.token}`);
  assert.strictEqual(streamRes.status, 200);
  const streamText = await streamRes.text();
  assert.strictEqual(streamText, 'fake-jpeg-binary-image-data');
  console.log('   ✅ Media file streamed successfully with exact binary content');

  // 6. Unrelated Caretaker Hrisit attempts binary upload (Blocked!)
  console.log('6. Testing Relationship-Aware Guard: Unrelated Caretaker Hrisit upload...');
  const blockedBlob = new Blob(['unauthorized-file'], { type: 'image/jpeg' });
  const blockedFormData = new FormData();
  blockedFormData.append('file', blockedBlob, 'unauth.jpg');
  blockedFormData.append('elderlyUserId', sruti.user.id);

  const blockedRes = await fetch(`${API_BASE}/api/media/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${hrisit.token}` },
    body: blockedFormData
  });
  assert.strictEqual(blockedRes.status, 403);
  console.log('   ✅ Guard correctly blocked unrelated Caretaker from uploading');

  // 7. Caretaker Aryan retrieves Sruti\'s Memory Vault
  console.log('7. Testing Authorized Caretaker Aryan querying Sruti\'s Memory Vault...');
  const aryanVaultRes = await fetch(`${API_BASE}/api/media/elderly/${sruti.user.id}`, {
    headers: { 'Authorization': `Bearer ${aryan.token}` }
  });
  const aryanVaultData = await aryanVaultRes.json();
  assert.strictEqual(aryanVaultRes.status, 200);
  assert.ok(aryanVaultData.memories.length >= 3);
  assert.ok(aryanVaultData.memories.some(m => m.id === photoMemoryId));
  console.log(`   ✅ Caretaker Aryan successfully retrieved ${aryanVaultData.memories.length} vault items with runtimeUrls`);

  // 8. Delete Memory Item
  console.log('8. Testing Memory Deletion...');
  const delRes = await fetch(`${API_BASE}/api/media/${photoMemoryId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${aryan.token}` }
  });
  const delData = await delRes.json();
  assert.strictEqual(delRes.status, 200);
  assert.strictEqual(delData.success, true);
  console.log('   ✅ Memory deleted successfully');

  console.log('\n🎉 ALL MEDIA & RELATIONSHIP AUTHORIZATION TESTS PASSED SUCCESSFULLY!\n');
}

runMediaTests().catch(err => {
  console.error('\n❌ Media Test Suite Failed:', err);
  process.exit(1);
});
