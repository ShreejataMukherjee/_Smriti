/**
 * SMRITI AUTHENTICATION & RBAC AUTOMATED SUITE
 * Tests Google OAuth simulation, session tokens, and strict role boundary enforcement.
 * Uses safe @example.com test emails and strictly approved sample names.
 */

import assert from 'assert';

const API_BASE = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Starting Smriti Phase 2 Auth & RBAC Test Suite...\n');

  // Test 1: Health Endpoint
  console.log('1. Testing Health Endpoint...');
  const healthRes = await fetch(`${API_BASE}/api/health`);
  const health = await healthRes.json();
  assert.strictEqual(health.status, 'healthy');
  console.log('   ✅ Health endpoint OK');

  // Test 2: Elderly User Google Authentication
  console.log('2. Testing Elderly User Google OAuth Sign-in (Sruti)...');
  const elderlyAuthRes = await fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      oauthUser: {
        id: 'google_oauth_elderly_sruti',
        name: 'Sruti',
        email: 'sruti@example.com',
        photoURL: '👵'
      },
      intendedRole: 'elderly_user'
    })
  });
  const elderlyData = await elderlyAuthRes.json();
  assert.strictEqual(elderlyData.success, true);
  assert.strictEqual(elderlyData.user.role, 'elderly_user');
  assert.strictEqual(elderlyData.user.plan, 'basic');
  assert.strictEqual(elderlyData.user.region, 'NER');
  assert.ok(elderlyData.sessionToken);
  const elderlyToken = elderlyData.sessionToken;
  console.log(`   ✅ Elderly User Authenticated (Role: ${elderlyData.user.role}, Plan: ${elderlyData.user.plan})`);

  // Test 3: Caretaker Google Authentication
  console.log('3. Testing Caretaker Google OAuth Sign-in (Aryan)...');
  const caretakerAuthRes = await fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      oauthUser: {
        id: 'google_oauth_caretaker_aryan',
        name: 'Aryan',
        email: 'aryan@example.com',
        photoURL: '🧑‍💻'
      },
      intendedRole: 'caretaker'
    })
  });
  const caretakerData = await caretakerAuthRes.json();
  assert.strictEqual(caretakerData.success, true);
  assert.strictEqual(caretakerData.user.role, 'caretaker');
  assert.strictEqual(caretakerData.user.plan, 'basic');
  assert.ok(caretakerData.sessionToken);
  const caretakerToken = caretakerData.sessionToken;
  console.log(`   ✅ Caretaker Authenticated (Role: ${caretakerData.user.role}, Plan: ${caretakerData.user.plan})`);

  // Test 4: Elderly User Accessing Senior Space Summary (Authorized)
  console.log('4. Testing Elderly User access to /api/users/senior-space/summary...');
  const seniorSpaceRes = await fetch(`${API_BASE}/api/users/senior-space/summary`, {
    headers: { 'Authorization': `Bearer ${elderlyToken}` }
  });
  const seniorSpaceData = await seniorSpaceRes.json();
  assert.strictEqual(seniorSpaceRes.status, 200);
  assert.strictEqual(seniorSpaceData.role, 'elderly_user');
  console.log('   ✅ Elderly User successfully accessed Senior Space summary');

  // Test 5: RBAC Guard - Elderly User attempting to access Caretaker Studio Summary (Blocked!)
  console.log('5. Testing RBAC Guard: Elderly User attempting /api/users/caretaker-studio/summary...');
  const blockedCaretakerRes = await fetch(`${API_BASE}/api/users/caretaker-studio/summary`, {
    headers: { 'Authorization': `Bearer ${elderlyToken}` }
  });
  assert.strictEqual(blockedCaretakerRes.status, 403);
  const blockedCaretakerData = await blockedCaretakerRes.json();
  assert.strictEqual(blockedCaretakerData.success, false);
  console.log(`   ✅ RBAC correctly blocked Elderly User (HTTP 403: ${blockedCaretakerData.error})`);

  // Test 6: Caretaker Accessing Caretaker Studio Summary (Authorized)
  console.log('6. Testing Caretaker access to /api/users/caretaker-studio/summary...');
  const caretakerStudioRes = await fetch(`${API_BASE}/api/users/caretaker-studio/summary`, {
    headers: { 'Authorization': `Bearer ${caretakerToken}` }
  });
  const caretakerStudioData = await caretakerStudioRes.json();
  assert.strictEqual(caretakerStudioRes.status, 200);
  assert.strictEqual(caretakerStudioData.role, 'caretaker');
  console.log('   ✅ Caretaker successfully accessed Caretaker Studio summary');

  // Test 7: RBAC Guard - Caretaker attempting to access Senior Space Summary (Blocked!)
  console.log('7. Testing RBAC Guard: Caretaker attempting /api/users/senior-space/summary...');
  const blockedSeniorRes = await fetch(`${API_BASE}/api/users/senior-space/summary`, {
    headers: { 'Authorization': `Bearer ${caretakerToken}` }
  });
  assert.strictEqual(blockedSeniorRes.status, 403);
  const blockedSeniorData = await blockedSeniorRes.json();
  assert.strictEqual(blockedSeniorData.success, false);
  console.log(`   ✅ RBAC correctly blocked Caretaker (HTTP 403: ${blockedSeniorData.error})`);

  // Test 8: Unauthenticated Request to Protected Route (Blocked!)
  console.log('8. Testing Auth Middleware with Missing Token...');
  const unauthRes = await fetch(`${API_BASE}/api/users/me`);
  assert.strictEqual(unauthRes.status, 401);
  console.log('   ✅ Missing token correctly rejected with HTTP 401');

  // Test 9: Invalid/Malformed Token (Blocked!)
  console.log('9. Testing Auth Middleware with Invalid Token...');
  const invalidRes = await fetch(`${API_BASE}/api/users/me`, {
    headers: { 'Authorization': 'Bearer fake_invalid_token_12345' }
  });
  assert.strictEqual(invalidRes.status, 401);
  console.log('   ✅ Invalid token correctly rejected with HTTP 401');

  console.log('\n🎉 ALL 9 AUTH & RBAC TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
