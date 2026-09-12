/**
 * SMRITI PHASE 3 PERSONALIZATION & STUDIO TEST SUITE
 * Tests Elderly Profiles, Family Datasets, Daily Routines, Health Reminders, Media, and Preview Aggregation.
 */

import assert from 'assert';

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

async function runPhase3Tests() {
  console.log('\n🧪 Starting Smriti Phase 3 Personalization & Studio Test Suite...\n');

  // Helper for auth
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
    return data.sessionToken;
  };

  // 1. Setup Test Accounts
  console.log('1. Setting up authenticated test accounts and relationship...');
  const aryanToken = await authUser('google_oauth_caretaker_aryan', 'Aryan', 'aryan@example.com', 'caretaker', '🧑‍💻');
  const hrisitToken = await authUser('google_oauth_caretaker_hrisit', 'Hrisit', 'hrisit@example.com', 'caretaker', '👨‍💼');
  const srutiToken = await authUser('google_oauth_elderly_sruti', 'Sruti', 'sruti@example.com', 'elderly_user', '👵');

  // Test GET /api/auth/session and POST /api/auth/logout
  const sessionRes = await fetch(`${API_BASE}/api/auth/session`, {
    headers: { 'Authorization': `Bearer ${aryanToken}` }
  });
  const sessionData = await sessionRes.json();
  assert.strictEqual(sessionRes.status, 200);
  assert.strictEqual(sessionData.success, true);
  assert.strictEqual(sessionData.user.email, 'aryan@example.com');
  console.log('   ✅ GET /api/auth/session verified successfully');

  const logoutRes = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${aryanToken}` }
  });
  const logoutData = await logoutRes.json();
  assert.strictEqual(logoutRes.status, 200);
  assert.strictEqual(logoutData.success, true);
  console.log('   ✅ POST /api/auth/logout verified successfully');

  // Establish connection Aryan <-> Sruti
  const invRes = await fetch(`${API_BASE}/api/relationships/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryanToken}` },
    body: JSON.stringify({ elderlyTarget: 'sruti@example.com' })
  });
  const invData = await invRes.json();
  const relId = invData.relationship ? invData.relationship.id : null;

  if (relId) {
    await fetch(`${API_BASE}/api/relationships/${relId}/respond`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${srutiToken}` },
      body: JSON.stringify({ action: 'accept' })
    });
  }
  console.log('   ✅ Active relationship ready (Caretaker Aryan <-> Elderly Sruti)');

  // 2. Elderly Profile Personalization CRUD (with dynamic real name)
  console.log('2. Testing Elderly Profile Personalization CRUD...');
  const profilePayload = {
    displayName: 'Sruti (Elder)',
    preferredLanguage: 'as',
    region: 'NER - Assam',
    familiarPlaces: ['Guwahati Brahmaputra Ghat', 'Majuli Island'],
    interests: ['Gardening', 'Listening to Bihu folk songs'],
    culturalPreferences: ['Rongali Bihu', 'Traditional Tea Walks'],
    personalNotes: 'Prefers morning tea at 07:00 AM with soft radio playing.',
    accessibility: {
      largeText: true,
      highContrast: false,
      voiceGuidance: true,
      slowTiming: true
    },
    cognitivePreferences: {
      categories: ['family_recognition', 'photo_recall', 'daily_routine_recall'],
      difficultyLevel: 'mild',
      sessionLengthMinutes: 10
    }
  };

  const profRes = await fetch(`${API_BASE}/api/profile/google_oauth_elderly_sruti`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryanToken}` },
    body: JSON.stringify(profilePayload)
  });
  const profData = await profRes.json();
  assert.strictEqual(profRes.status, 200);
  assert.strictEqual(profData.success, true);
  assert.strictEqual(profData.profile.displayName, 'Sruti (Elder)');
  assert.strictEqual(profData.profile.preferredLanguage, 'as');
  assert.strictEqual(profData.profile.accessibility.voiceGuidance, true);
  console.log('   ✅ Profile personalization saved successfully');

  // 3. Family Members Dataset CRUD (supports any real name)
  console.log('3. Testing Family Members Dataset CRUD...');
  const fam1Res = await fetch(`${API_BASE}/api/family`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryanToken}` },
    body: JSON.stringify({
      elderlyUserId: 'google_oauth_elderly_sruti',
      name: 'Ramesh',
      relationship: 'Elder Brother',
      avatar: '🧑‍🦳',
      shortDescription: 'Lives in Tezpur, visits on festivals',
      importantNotes: 'Enjoys talking about childhood tea garden days'
    })
  });
  const fam1Data = await fam1Res.json();
  assert.strictEqual(fam1Res.status, 201);
  assert.strictEqual(fam1Data.member.name, 'Ramesh');
  assert.strictEqual(fam1Data.member.relationship, 'Elder Brother');
  const fam1Id = fam1Data.member.id;

  const fam2Res = await fetch(`${API_BASE}/api/family`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryanToken}` },
    body: JSON.stringify({
      elderlyUserId: 'google_oauth_elderly_sruti',
      name: 'Ananya',
      relationship: 'Daughter',
      avatar: '👩',
      shortDescription: 'Studies in Shillong, calls every evening',
      importantNotes: 'Brings traditional Assamese silk shawls'
    })
  });
  const fam2Data = await fam2Res.json();
  assert.strictEqual(fam2Res.status, 201);

  // List family members
  const listFamRes = await fetch(`${API_BASE}/api/family/elderly/google_oauth_elderly_sruti`, {
    headers: { 'Authorization': `Bearer ${aryanToken}` }
  });
  const listFamData = await listFamRes.json();
  assert.strictEqual(listFamRes.status, 200);
  assert.ok(listFamData.family.length >= 2);
  console.log(`   ✅ Family members registered in dataset (Total: ${listFamData.family.length})`);

  // 4. Daily Routine Schedule CRUD
  console.log('4. Testing Daily Routine Schedule CRUD...');
  const routine1Res = await fetch(`${API_BASE}/api/routine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryanToken}` },
    body: JSON.stringify({
      elderlyUserId: 'google_oauth_elderly_sruti',
      activityName: 'Morning Tea & Radio Melodies',
      time: '07:00 AM',
      category: 'morning',
      icon: '🌅',
      notes: 'In the garden verandah'
    })
  });
  const routine1Data = await routine1Res.json();
  assert.strictEqual(routine1Res.status, 201);
  assert.strictEqual(routine1Data.item.activityName, 'Morning Tea & Radio Melodies');

  const getRoutinesRes = await fetch(`${API_BASE}/api/routine/elderly/google_oauth_elderly_sruti`, {
    headers: { 'Authorization': `Bearer ${aryanToken}` }
  });
  const getRoutinesData = await getRoutinesRes.json();
  assert.strictEqual(getRoutinesRes.status, 200);
  assert.ok(getRoutinesData.routine.length >= 1);
  console.log(`   ✅ Daily routines active in schedule (Total: ${getRoutinesData.routine.length})`);

  // 5. Health & Reminders CRUD
  console.log('5. Testing Health & Reminders CRUD...');
  const remRes = await fetch(`${API_BASE}/api/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryanToken}` },
    body: JSON.stringify({
      elderlyUserId: 'google_oauth_elderly_sruti',
      type: 'medicine',
      title: 'Morning Memory & BP Supplement',
      schedule: '08:15 AM',
      dosageOrTarget: '1 capsule with lukewarm water',
      notes: 'Take right after light breakfast'
    })
  });
  const remData = await remRes.json();
  assert.strictEqual(remRes.status, 201);
  assert.strictEqual(remData.reminder.type, 'medicine');

  const getRemsRes = await fetch(`${API_BASE}/api/reminders/elderly/google_oauth_elderly_sruti`, {
    headers: { 'Authorization': `Bearer ${aryanToken}` }
  });
  const getRemsData = await getRemsRes.json();
  assert.strictEqual(getRemsRes.status, 200);
  assert.ok(getRemsData.reminders.length >= 1);
  console.log(`   ✅ Health reminders configured (Total: ${getRemsData.reminders.length})`);

  // 6. Experience Preview Aggregation
  console.log('6. Testing Experience Preview Aggregator (/api/preview)...');
  const prevRes = await fetch(`${API_BASE}/api/preview/google_oauth_elderly_sruti`, {
    headers: { 'Authorization': `Bearer ${aryanToken}` }
  });
  const prevData = await prevRes.json();
  assert.strictEqual(prevRes.status, 200);
  assert.strictEqual(prevData.success, true);
  assert.strictEqual(prevData.experience.displayName, 'Sruti (Elder)');
  assert.ok(prevData.experience.greeting.includes('Sruti (Elder)'));
  assert.ok(prevData.experience.family.length >= 2);
  assert.ok(prevData.experience.routines.length >= 1);
  assert.ok(prevData.experience.reminders.length >= 1);
  console.log('   ✅ Preview experience aggregated successfully with live data');

  // 7. Security Isolation: Unrelated Caretaker Guard
  console.log('7. Testing Relationship-Aware Guard on Unrelated Caretaker Hrisit...');
  const blockedProfRes = await fetch(`${API_BASE}/api/profile/google_oauth_elderly_sruti`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hrisitToken}` },
    body: JSON.stringify({ displayName: 'Hacked Name' })
  });
  assert.strictEqual(blockedProfRes.status, 403);

  const blockedPrevRes = await fetch(`${API_BASE}/api/preview/google_oauth_elderly_sruti`, {
    headers: { 'Authorization': `Bearer ${hrisitToken}` }
  });
  assert.strictEqual(blockedPrevRes.status, 403);
  console.log('   ✅ Unrelated Caretaker correctly blocked with HTTP 403');

  // Cleanup added test items
  await fetch(`${API_BASE}/api/family/${fam1Id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${aryanToken}` } });

  console.log('\n🎉 ALL PHASE 3 PERSONALIZATION & STUDIO TESTS PASSED SUCCESSFULLY!\n');
}

runPhase3Tests().catch(err => {
  console.error('❌ Phase 3 Test Suite Failed:', err);
  process.exit(1);
});
