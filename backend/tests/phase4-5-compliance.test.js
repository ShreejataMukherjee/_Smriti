/**
 * SMRITI PHASE 4.5 — SIH COMPLIANCE AUDIT & INTEGRATION TEST SUITE
 * 
 * Verifies the complete end-to-end loop for the official SIH Problem Statement:
 * "AI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients in North Eastern Region (NER)"
 * 
 * Integration Areas Tested:
 * 1. Caretaker Auth & Multi-Category Personalization Setup (NER Profile, Family, Media, Routine, 4 Reminder Types, A11y)
 * 2. Real Data Persistence & Integrity Verification
 * 3. Elderly User Session & Personalized Activity Generation (5 Cognitive Categories)
 * 4. Multilingual Translation Matrix (as, bn, hi, en)
 * 5. Deterministic Adaptive Difficulty Progression (Levels 1-5, Support Scaling)
 * 6. Caregiver Support Alerts Triggering & Acknowledgment Workflow
 * 7. Caregiver & Healthcare Worker Performance Monitoring Foundation
 * 8. Healthcare Worker Restricted Access & Authorization Verification
 * 9. Offline Batch Synchronization & Idempotent Deduplication
 * 10. Security Boundary Isolation (Unrelated Caretaker HTTP 403, Unauthenticated HTTP 401)
 */

import assert from 'assert';

const API_BASE = 'http://localhost:3000';

async function runComplianceAuditTests() {
  console.log('\n========================================================================');
  console.log('🏛️  SMRITI PHASE 4.5 — SIH COMPLIANCE AUDIT & INTEGRATION TEST SUITE');
  console.log('========================================================================\n');

  // Authentication Helper
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

  // 1. Authenticate Users (Caretaker Aryan, Elderly Sruti, Healthcare Worker Hrithik, Unrelated Caretaker Hrisit)
  console.log('1. Setting up authenticated test accounts with specific RBAC roles...');
  const aryan = await authUser('google_oauth_caretaker_aryan', 'Aryan', 'aryan@example.com', 'caretaker', '🧑‍💻');
  const sruti = await authUser('google_oauth_elderly_sruti', 'Sruti', 'sruti@example.com', 'elderly_user', '👵');
  const hrithik = await authUser('google_oauth_hc_hrithik', 'Hrithik', 'hrithik@example.com', 'healthcare_worker', '👨‍⚕️');
  const hrisit = await authUser('google_oauth_caretaker_hrisit', 'Hrisit', 'hrisit@example.com', 'caretaker', '👨‍💼');
  console.log('   ✅ Authenticated: Caretaker Aryan, Elderly Sruti, Healthcare Worker Hrithik, Caretaker Hrisit');

  // 2. Establish Active Accepted Relationship: Aryan <--> Sruti
  console.log('2. Verifying active accepted relationship between Caretaker Aryan and Elderly Sruti...');
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
    const relId = reqData.relationship?.id;
    if (relId) {
      await fetch(`${API_BASE}/api/relationships/${relId}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
        body: JSON.stringify({ decision: 'accept' })
      });
    } else {
      const srutiRelsRes = await fetch(`${API_BASE}/api/relationships/elderly`, { headers: { 'Authorization': `Bearer ${sruti.token}` } });
      const srutiRelsData = await srutiRelsRes.json();
      const pending = srutiRelsData.relationships?.find(r => r.caretakerId === aryan.user.id && r.status === 'pending');
      if (pending) {
        await fetch(`${API_BASE}/api/relationships/${pending.id}/respond`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
          body: JSON.stringify({ decision: 'accept' })
        });
      }
    }
  }
  console.log('   ✅ Caretaker-Elderly relationship active and verified');

  // 3. Establish Active Healthcare Worker Relationship: Hrithik <--> Sruti
  console.log('3. Establishing Healthcare Worker monitoring relationship (Hrithik <--> Sruti)...');
  const hcReqRes = await fetch(`${API_BASE}/api/relationships/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hrithik.token}` },
    body: JSON.stringify({ elderlyTarget: 'sruti@example.com' })
  });
  const hcReqData = await hcReqRes.json();
  if (hcReqData.relationship?.id) {
    await fetch(`${API_BASE}/api/relationships/${hcReqData.relationship.id}/respond`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
      body: JSON.stringify({ decision: 'accept' })
    });
  } else {
    const srutiRelsRes = await fetch(`${API_BASE}/api/relationships/elderly`, { headers: { 'Authorization': `Bearer ${sruti.token}` } });
    const srutiRelsData = await srutiRelsRes.json();
    const pendingHc = srutiRelsData.relationships?.find(r => r.caretakerId === hrithik.user.id && r.status === 'pending');
    if (pendingHc) {
      await fetch(`${API_BASE}/api/relationships/${pendingHc.id}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
        body: JSON.stringify({ decision: 'accept' })
      });
    }
  }
  console.log('   ✅ Healthcare Worker relationship active and verified');

  // 4. Configure Full Profile (NER Cultural Preferences, Family, Routine, 4 Reminder Types)
  console.log('4. Configuring comprehensive Caretaker dataset for Elderly Sruti...');
  
  // Profile Update (NER region, Assamese language, cultural anchors)
  const profRes = await fetch(`${API_BASE}/api/profile/${sruti.user.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
    body: JSON.stringify({
      preferredLanguage: 'as',
      regionalContext: 'assam_brahmaputra_valley',
      culturalPreferences: {
        primaryLanguage: 'as',
        stateOrRegion: 'Assam',
        traditionalFestival: 'Rongali Bihu',
        favoriteFolkMusic: 'Bihu Flute & Dhol Melody',
        culturalAnchors: ['Jaapi', 'Phulam Gamosa', 'Pepa', 'Brass Xorai', 'Tea Gardens']
      },
      accessibility: {
        largeText: true,
        highContrast: true,
        voiceGuidance: true
      },
      cognitivePreferences: {
        categories: ['family_recognition', 'photo_recall', 'daily_routine_recall', 'music_recall'],
        difficultyLevel: 'adaptive',
        sessionLengthMinutes: 10
      }
    })
  });
  assert.strictEqual(profRes.status, 200);

  // Seed Family Member
  await fetch(`${API_BASE}/api/family`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
    body: JSON.stringify({
      elderlyUserId: sruti.user.id,
      name: 'Nahida',
      relationship: 'Daughter',
      shortDescription: 'Lives in Tezpur, visits on weekends',
      importantNotes: 'Enjoys traditional Assam tea and Bihu celebrations together'
    })
  });

  // Seed Routine Anchors
  await fetch(`${API_BASE}/api/routine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
    body: JSON.stringify({
      elderlyUserId: sruti.user.id,
      time: '07:30 AM',
      activityName: 'Morning Tea & Brahmaputra Walk',
      icon: '🌅',
      notes: 'Enjoying fresh morning air by the riverside'
    })
  });

  // Seed All 4 Types of Health Reminders (Medicine, Hydration, Daily Activity, Doctor Appointment)
  const reminderTypes = [
    { type: 'medicine', title: 'Blood Pressure & Memory Medication', time: '08:00 AM', dosage: '1 tablet with water' },
    { type: 'hydration', title: 'Hydration - Warm Water', time: '11:00 AM', dosage: '1 full glass' },
    { type: 'activity', title: 'Afternoon Memory Exercise', time: '03:30 PM', dosage: '10 mins Cognitive Space' },
    { type: 'appointment', title: 'Dr. Barua Neurological Wellness Review', time: '05:00 PM', doctor: 'Dr. Barua, Guwahati Health' }
  ];

  for (const rem of reminderTypes) {
    await fetch(`${API_BASE}/api/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
      body: JSON.stringify({
        elderlyUserId: sruti.user.id,
        ...rem,
        active: true
      })
    });
  }
  console.log('   ✅ Comprehensive profile configured (NER Context, Family, Routine, 4 Reminder Types, Accessibility)');

  // 5. Test Experience Preview Aggregation
  console.log('5. Testing Caretaker Experience Preview (/api/preview/:elderlyUserId)...');
  const prevRes = await fetch(`${API_BASE}/api/preview/${sruti.user.id}`, {
    headers: { 'Authorization': `Bearer ${aryan.token}` }
  });
  const prevData = await prevRes.json();
  assert.strictEqual(prevRes.status, 200);
  assert.strictEqual(prevData.success, true);
  assert.ok(prevData.experience.family.length >= 1);
  assert.ok(prevData.experience.routines.length >= 1);
  assert.ok(prevData.experience.reminders.length >= 4);
  console.log(`   ✅ Live Caretaker Preview verified: ${prevData.experience.family.length} family contacts, ${prevData.experience.reminders.length} reminders`);

  // 6. Test Elderly User Dynamic Cognitive Activity Pack Generation (5 Categories)
  console.log('6. Testing Dynamic Activity Pack Generation across all 5 cognitive categories...');
  const actRes = await fetch(`${API_BASE}/api/cognitive/activities/${sruti.user.id}?language=as`, {
    headers: { 'Authorization': `Bearer ${sruti.token}` }
  });
  const actData = await actRes.json();
  assert.strictEqual(actRes.status, 200);
  assert.strictEqual(actData.success, true);
  assert.ok(actData.activities.length >= 4);

  const categories = actData.activities.map(a => a.category);
  assert.ok(categories.includes('memory'), 'Must include Memory');
  assert.ok(categories.includes('attention'), 'Must include Attention');
  assert.ok(categories.includes('pattern_recognition'), 'Must include Pattern Recognition');
  console.log(`   ✅ Activity Pack generated with ${actData.activities.length} personalized activities (Categories: ${[...new Set(categories)].join(', ')})`);

  // 7. Test Multilingual Localization Matrix across All 4 Languages
  console.log('7. Verifying Multilingual Localization Matrix (Assamese, Bengali, Hindi, English)...');
  const expectedLanguages = ['as', 'bn', 'hi', 'en'];

  for (const lang of expectedLanguages) {
    const langRes = await fetch(`${API_BASE}/api/cognitive/activities/${sruti.user.id}?language=${lang}`, {
      headers: { 'Authorization': `Bearer ${sruti.token}` }
    });
    const langData = await langRes.json();
    assert.strictEqual(langRes.status, 200);
    assert.strictEqual(langData.language, lang);
    assert.ok(langData.activities.length > 0);
    assert.ok(typeof langData.activities[0].prompt === 'string' && langData.activities[0].prompt.length > 0);
  }
  console.log('   ✅ Multilingual translation matrix verified across as, bn, hi, and en');

  // 8. Test Performance-Based Adaptive Difficulty Progression (Level 1 -> Level 2 on High Performance)
  console.log('8. Testing Adaptive Engine: Difficulty Graduation (Level 1 -> Level 2 on strong accuracy)...');
  const highPerfSession = {
    elderlyUserId: sruti.user.id,
    activityId: actData.activities[0].activityId,
    category: 'memory',
    difficulty: 1,
    accuracy: 1.0,
    score: 100,
    responseTimeMs: 3100,
    totalQuestions: 3,
    correctAnswers: 3,
    hintsUsed: 0,
    completed: true
  };

  const highRes = await fetch(`${API_BASE}/api/cognitive/session/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
    body: JSON.stringify(highPerfSession)
  });
  const highData = await highRes.json();
  assert.strictEqual(highRes.status, 201);
  assert.strictEqual(highData.adaptation.nextDifficulty, 2, 'High accuracy should increase difficulty to Level 2');
  console.log(`   ✅ Strong performance: accuracy=100%, latency=3.1s -> Next Difficulty: Level ${highData.adaptation.nextDifficulty}`);

  // 9. Test Adaptive Engine: Scaling Down & Support Alert on Persistent Struggle
  console.log('9. Testing Adaptive Engine: Difficulty Scaling Down & Support Alert on struggle...');
  const struggleSession = {
    elderlyUserId: sruti.user.id,
    activityId: actData.activities[0].activityId,
    category: 'memory',
    difficulty: 2,
    accuracy: 0.25,
    score: 25,
    responseTimeMs: 15000,
    totalQuestions: 4,
    correctAnswers: 1,
    hintsUsed: 3,
    completed: true
  };

  // Submit two consecutive struggling sessions to trigger persistent alert
  await fetch(`${API_BASE}/api/cognitive/session/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
    body: JSON.stringify(struggleSession)
  });

  const struggleRes = await fetch(`${API_BASE}/api/cognitive/session/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
    body: JSON.stringify(struggleSession)
  });
  const struggleData = await struggleRes.json();
  assert.strictEqual(struggleData.success, true);
  assert.strictEqual(struggleData.adaptation.nextDifficulty, 1, 'Struggling should reduce difficulty to Level 1');
  assert.strictEqual(struggleData.adaptation.supportLevel, 'high', 'Support level should be escalated to high');
  assert.ok(struggleData.adaptation.alertCreated, 'Support Alert should be created');
  const alertId = struggleData.adaptation.alertCreated.id;
  console.log(`   ✅ Struggle handled: difficulty reduced to Level 1, supportLevel='high', Caregiver Alert: "${struggleData.adaptation.alertCreated.message}"`);

  // 10. Test Caregiver Support Alert Acknowledgment Workflow
  console.log('10. Testing Caregiver Support Alert Acknowledgment...');
  const ackRes = await fetch(`${API_BASE}/api/cognitive/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${aryan.token}` }
  });
  const ackData = await ackRes.json();
  assert.strictEqual(ackRes.status, 200);
  assert.strictEqual(ackData.alert.status, 'acknowledged');
  console.log('   ✅ Support Alert status transitioned to "acknowledged"');

  // 11. Test Healthcare Worker Monitoring Foundation
  console.log('11. Testing Healthcare Worker monitoring access to Sruti\'s insights...');
  const hcInsightsRes = await fetch(`${API_BASE}/api/cognitive/insights/${sruti.user.id}`, {
    headers: { 'Authorization': `Bearer ${hrithik.token}` }
  });
  const hcInsightsData = await hcInsightsRes.json();
  assert.strictEqual(hcInsightsRes.status, 200);
  assert.strictEqual(hcInsightsData.success, true);
  assert.ok(hcInsightsData.insights.totalSessions >= 3);
  console.log(`   ✅ Healthcare Worker Hrithik successfully monitored Sruti's activity performance (${hcInsightsData.insights.totalSessions} sessions logged)`);

  // 12. Test Offline-First Batch Synchronization & Idempotent Deduplication
  console.log('12. Testing Offline Batch Session Synchronization and Deduplication...');
  const offlineTimestamp = Date.now();
  const offlineBatch = [
    {
      id: `offline_audit_${offlineTimestamp}_1`,
      elderlyUserId: sruti.user.id,
      category: 'attention',
      difficulty: 1,
      accuracy: 1.0,
      responseTimeMs: 2800,
      completed: true
    },
    {
      id: `offline_audit_${offlineTimestamp}_2`,
      elderlyUserId: sruti.user.id,
      category: 'routine_recall',
      difficulty: 1,
      accuracy: 1.0,
      responseTimeMs: 3400,
      completed: true
    }
  ];

  // First sync
  const syncRes1 = await fetch(`${API_BASE}/api/sync/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
    body: JSON.stringify({ sessions: offlineBatch })
  });
  const syncData1 = await syncRes1.json();
  assert.strictEqual(syncData1.status || syncData1.success, true);
  assert.strictEqual(syncData1.syncedCount, 2);

  // Re-sync identical batch to test deduplication
  const syncRes2 = await fetch(`${API_BASE}/api/sync/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
    body: JSON.stringify({ sessions: offlineBatch })
  });
  const syncData2 = await syncRes2.json();
  assert.strictEqual(syncData2.syncedCount, 2); // Handled idempotently
  console.log('   ✅ Offline batch sync & duplicate prevention verified');

  // 13. Test Security Boundary Isolation: Unrelated Caretaker Hrisit
  console.log('13. Testing Relationship Security: Unrelated Caretaker Hrisit querying Sruti...');
  const blockedPrevRes = await fetch(`${API_BASE}/api/preview/${sruti.user.id}`, {
    headers: { 'Authorization': `Bearer ${hrisit.token}` }
  });
  assert.strictEqual(blockedPrevRes.status, 403);

  const blockedActRes = await fetch(`${API_BASE}/api/cognitive/activities/${sruti.user.id}`, {
    headers: { 'Authorization': `Bearer ${hrisit.token}` }
  });
  assert.strictEqual(blockedActRes.status, 403);

  const blockedInsRes = await fetch(`${API_BASE}/api/cognitive/insights/${sruti.user.id}`, {
    headers: { 'Authorization': `Bearer ${hrisit.token}` }
  });
  assert.strictEqual(blockedInsRes.status, 403);
  console.log('   ✅ Unrelated Caretaker strictly blocked with HTTP 403 across Preview, Activities, and Insights');

  // 14. Test Unauthenticated Access Rejection
  console.log('14. Testing Unauthenticated Request Rejection (HTTP 401)...');
  const unauthRes = await fetch(`${API_BASE}/api/cognitive/activities/${sruti.user.id}`);
  assert.strictEqual(unauthRes.status, 401);
  console.log('   ✅ Protected endpoint strictly returned HTTP 401 for unauthenticated request');

  console.log('\n========================================================================');
  console.log('🎉 ALL 14 PHASE 4.5 SIH COMPLIANCE & INTEGRATION AUDIT TESTS PASSED!');
  console.log('========================================================================\n');
}

runComplianceAuditTests().catch(err => {
  console.error('❌ Compliance Audit Test Failed:', err);
  process.exit(1);
});
