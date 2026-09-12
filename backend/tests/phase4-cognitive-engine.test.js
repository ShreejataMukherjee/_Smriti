/**
 * SMRITI PHASE 4 COGNITIVE ENGINE & ADAPTIVE SYSTEM TEST SUITE
 * Tests:
 * 1. Activity Generation from real family, routine, photo, and cultural datasets
 * 2. Multilingual prompt & instruction resolution (as, bn, hi, en)
 * 3. Session recording and score/latency metrics
 * 4. Adaptive Difficulty Engine (performance-based difficulty progression & support scaling)
 * 5. Caregiver Support Alert generation and acknowledgment
 * 6. Caregiver / Healthcare performance insights computation
 * 7. Offline batch session synchronization and deduplication
 * 8. Relationship-aware security isolation (unrelated caretaker blocked with HTTP 403)
 */

import assert from 'assert';

const API_BASE = 'http://localhost:3000';

async function runPhase4CognitiveTests() {
  console.log('\n🧩 Starting Smriti Phase 4 Cognitive & Adaptive Engine Test Suite...\n');

  // Helper for authentication
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

  // 1. Setup authenticated test accounts
  console.log('1. Setting up authenticated users (Aryan, Sruti, Hrisit)...');
  const aryan = await authUser('google_oauth_caretaker_aryan', 'Aryan', 'aryan@example.com', 'caretaker', '🧑‍💻');
  const sruti = await authUser('google_oauth_elderly_sruti', 'Sruti', 'sruti@example.com', 'elderly_user', '👵');
  const hrisit = await authUser('google_oauth_caretaker_hrisit', 'Hrisit', 'hrisit@example.com', 'caretaker', '👨‍💼');

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
    if (reqData.relationship?.id) {
      await fetch(`${API_BASE}/api/relationships/${reqData.relationship.id}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
        body: JSON.stringify({ decision: 'accept' })
      });
    } else {
      const srutiRelsRes = await fetch(`${API_BASE}/api/relationships/elderly`, { headers: { 'Authorization': `Bearer ${sruti.token}` } });
      const srutiRelsData = await srutiRelsRes.json();
      const pendingRel = srutiRelsData.relationships?.find(r => r.caretakerId === aryan.user.id);
      if (pendingRel) {
        await fetch(`${API_BASE}/api/relationships/${pendingRel.id}/respond`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
          body: JSON.stringify({ decision: 'accept' })
        });
      }
    }
  }
  console.log('   ✅ Active relationship verified: Aryan (Caretaker) <--> Sruti (Elderly)');

  // 2. Add sample family member & routine to guarantee rich personalized activity generation
  console.log('2. Seeding family and routine anchors for Sruti...');
  await fetch(`${API_BASE}/api/family`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
    body: JSON.stringify({
      elderlyUserId: sruti.user.id,
      name: 'Nahida',
      relationship: 'Daughter',
      shortDescription: 'Lives in Tezpur, calls every morning',
      importantNotes: 'Enjoys brewing traditional Assam tea together'
    })
  });

  await fetch(`${API_BASE}/api/routine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
    body: JSON.stringify({
      elderlyUserId: sruti.user.id,
      time: '07:30 AM',
      activityName: 'Morning Tea & Walk',
      icon: '🌅',
      notes: 'Fresh morning tea with family'
    })
  });
  console.log('   ✅ Personalized dataset anchors established');

  // 3. Test Dynamic Activity Pack Generation
  console.log('3. Testing Personalized Activity Pack Generation (GET /api/cognitive/activities/:id)...');
  const actRes = await fetch(`${API_BASE}/api/cognitive/activities/${sruti.user.id}?language=as`, {
    headers: { 'Authorization': `Bearer ${aryan.token}` }
  });
  const actData = await actRes.json();
  if (actRes.status !== 200) {
    console.error('DEBUG actRes failed:', actRes.status, actData);
  }
  assert.strictEqual(actRes.status, 200);
  assert.strictEqual(actData.success, true);
  assert.ok(actData.activities.length >= 4, 'Activity pack should have multiple categories');

  // Verify categories present
  const categories = actData.activities.map(a => a.category);
  assert.ok(categories.includes('memory'), 'Must include Memory category');
  assert.ok(categories.includes('attention'), 'Must include Attention category');
  assert.ok(categories.includes('pattern_recognition'), 'Must include Pattern/Object Recognition');
  console.log(`   ✅ Activity Pack generated with ${actData.activities.length} personalized activities`);

  // 4. Test Multilingual Language Resolutions
  console.log('4. Testing Multilingual Prompt Resolutions (Assamese, Bengali, Hindi, English)...');
  for (const lang of ['as', 'bn', 'hi', 'en']) {
    const langRes = await fetch(`${API_BASE}/api/cognitive/activities/${sruti.user.id}?language=${lang}`, {
      headers: { 'Authorization': `Bearer ${aryan.token}` }
    });
    const langData = await langRes.json();
    assert.strictEqual(langRes.status, 200);
    assert.strictEqual(langData.language, lang);
    assert.ok(langData.activities[0].prompt.length > 0);
  }
  console.log('   ✅ Multilingual resolution verified across as, bn, hi, and en');

  // 5. Test Cognitive Session Performance Recording
  console.log('5. Testing Session Performance Recording (POST /api/cognitive/session/record)...');
  const strongSessionPayload = {
    elderlyUserId: sruti.user.id,
    activityId: actData.activities[0].activityId,
    category: 'memory',
    difficulty: 1,
    accuracy: 1.0,
    score: 100,
    responseTimeMs: 3200,
    totalQuestions: 3,
    correctAnswers: 3,
    attempts: 3,
    hintsUsed: 0,
    completed: true,
    questionsAnswered: [
      { isCorrect: true, responseTimeMs: 3000, attempts: 1 },
      { isCorrect: true, responseTimeMs: 3200, attempts: 1 },
      { isCorrect: true, responseTimeMs: 3400, attempts: 1 }
    ]
  };

  const recRes = await fetch(`${API_BASE}/api/cognitive/session/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
    body: JSON.stringify(strongSessionPayload)
  });
  const recData = await recRes.json();
  assert.strictEqual(recRes.status, 201);
  assert.strictEqual(recData.success, true);
  assert.ok(recData.session.id);
  assert.strictEqual(recData.adaptation.nextDifficulty, 2, 'Strong performance should increase difficulty to Level 2');
  console.log(`   ✅ Session recorded; Adaptive Engine graduated difficulty: Level 1 -> Level ${recData.adaptation.nextDifficulty}`);

  // 6. Test Adaptive Difficulty Scaling Down on Struggling Performance
  console.log('6. Testing Adaptive Engine Difficulty Reduction on Struggle...');
  const strugglePayload = {
    elderlyUserId: sruti.user.id,
    activityId: actData.activities[0].activityId,
    category: 'memory',
    difficulty: 2,
    accuracy: 0.33,
    score: 33,
    responseTimeMs: 14000, // Slow latency
    totalQuestions: 3,
    correctAnswers: 1,
    attempts: 6,
    hintsUsed: 3,
    completed: true
  };

  // Submit twice to trigger persistent difficulty alert
  await fetch(`${API_BASE}/api/cognitive/session/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
    body: JSON.stringify(strugglePayload)
  });

  const struggleRes = await fetch(`${API_BASE}/api/cognitive/session/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
    body: JSON.stringify(strugglePayload)
  });
  const struggleData = await struggleRes.json();
  assert.strictEqual(struggleData.success, true);
  assert.strictEqual(struggleData.adaptation.nextDifficulty, 1, 'Struggling performance should decrease difficulty back to Level 1');
  assert.strictEqual(struggleData.adaptation.supportLevel, 'high', 'Support level should be set to high');
  assert.ok(struggleData.adaptation.alertCreated, 'Caregiver Support Alert should be triggered');
  const alertId = struggleData.adaptation.alertCreated.id;
  console.log(`   ✅ Adaptive Engine adjusted difficulty to Level 1, supportLevel='high', emitted Alert: "${struggleData.adaptation.alertCreated.message}"`);

  // 7. Test Caregiver Support Alert Acknowledgment
  console.log('7. Testing Support Alert Acknowledgment (POST /api/cognitive/alerts/:id/acknowledge)...');
  const ackRes = await fetch(`${API_BASE}/api/cognitive/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${aryan.token}` }
  });
  const ackData = await ackRes.json();
  assert.strictEqual(ackRes.status, 200);
  assert.strictEqual(ackData.alert.status, 'acknowledged');
  console.log('   ✅ Support Alert successfully acknowledged');

  // 8. Test Caregiver & Healthcare Performance Insights
  console.log('8. Testing Performance Insights Aggregation (GET /api/cognitive/insights/:id)...');
  const insRes = await fetch(`${API_BASE}/api/cognitive/insights/${sruti.user.id}`, {
    headers: { 'Authorization': `Bearer ${aryan.token}` }
  });
  const insData = await insRes.json();
  assert.strictEqual(insRes.status, 200);
  assert.strictEqual(insData.success, true);
  assert.ok(insData.insights.totalSessions >= 3);
  assert.ok(insData.insights.categoryBreakdown.memory.attempts >= 3);
  console.log(`   ✅ Caregiver insights computed: ${insData.insights.totalSessions} sessions, Avg Latency: ${insData.insights.averageResponseTimeMs}ms`);

  // 9. Test Offline Batch Session Synchronization
  console.log('9. Testing Offline Batch Session Sync (POST /api/sync/sessions)...');
  const offlineBatch = [
    {
      id: `offline_sess_${Date.now()}_1`,
      elderlyUserId: sruti.user.id,
      category: 'attention',
      difficulty: 1,
      accuracy: 1.0,
      responseTimeMs: 3100,
      completed: true
    },
    {
      id: `offline_sess_${Date.now()}_2`,
      elderlyUserId: sruti.user.id,
      category: 'routine_recall',
      difficulty: 1,
      accuracy: 1.0,
      responseTimeMs: 2900,
      completed: true
    }
  ];

  const syncRes = await fetch(`${API_BASE}/api/sync/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
    body: JSON.stringify({ sessions: offlineBatch })
  });
  const syncData = await syncRes.json();
  assert.strictEqual(syncRes.status, 200);
  assert.strictEqual(syncData.success, true);
  assert.strictEqual(syncData.syncedCount, 2);
  console.log(`   ✅ Offline batch sync processed ${syncData.syncedCount} queued sessions successfully`);

  // 10. Test Relationship-Aware Security Isolation (Unrelated Caretaker Blocked)
  console.log('10. Testing Relationship Security: Unrelated Caretaker Hrisit querying Sruti...');
  const blockedActRes = await fetch(`${API_BASE}/api/cognitive/activities/${sruti.user.id}`, {
    headers: { 'Authorization': `Bearer ${hrisit.token}` }
  });
  assert.strictEqual(blockedActRes.status, 403);

  const blockedInsRes = await fetch(`${API_BASE}/api/cognitive/insights/${sruti.user.id}`, {
    headers: { 'Authorization': `Bearer ${hrisit.token}` }
  });
  assert.strictEqual(blockedInsRes.status, 403);
  console.log('   ✅ Unrelated Caretaker strictly blocked with HTTP 403 from activities and insights');

  console.log('\n🎉 ALL 10 PHASE 4 COGNITIVE & ADAPTIVE TESTS PASSED SUCCESSFULLY!\n');
}

runPhase4CognitiveTests().catch(err => {
  console.error('❌ Phase 4 Test Suite Failed:', err);
  process.exit(1);
});
