/**
 * SMRITI MANY-TO-MANY RELATIONSHIP TEST SUITE
 * Tests 1 Caretaker <-> Many Elderly and 1 Elderly <-> Many Caretakers,
 * duplicate prevention, request acceptance, and revocation.
 */

import assert from 'assert';

const API_BASE = 'http://localhost:3000';

async function runRelationshipTests() {
  console.log('🧪 Starting Smriti Many-to-Many Relationship Test Suite...\n');

  // 1. Setup Users: Caretaker Aryan, Caretaker Hrisit, Elderly Sruti, Elderly Nahida
  console.log('1. Setting up authenticated test accounts...');

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

  const aryanToken = await authUser('google_oauth_caretaker_aryan', 'Aryan', 'aryan@example.com', 'caretaker', '🧑‍💻');
  const hrisitToken = await authUser('google_oauth_caretaker_hrisit', 'Hrisit', 'hrisit@example.com', 'caretaker', '👨‍💼');
  const srutiToken = await authUser('google_oauth_elderly_sruti', 'Sruti', 'sruti@example.com', 'elderly_user', '👵');
  const nahidaToken = await authUser('google_oauth_elderly_nahida', 'Nahida', 'nahida@example.com', 'elderly_user', '👵');

  // Pre-test cleanup: revoke any old relationships from prior runs for idempotency
  for (const token of [aryanToken, hrisitToken]) {
    const prevRes = await fetch(`${API_BASE}/api/relationships/caretaker`, { headers: { 'Authorization': `Bearer ${token}` } });
    const prevData = await prevRes.json();
    if (prevData.relationships) {
      for (const rel of prevData.relationships) {
        if (['pending', 'accepted'].includes(rel.status)) {
          await fetch(`${API_BASE}/api/relationships/${rel.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        }
      }
    }
  }

  console.log('   ✅ Test accounts ready and test relationships reset (Aryan, Hrisit, Sruti, Nahida)');

  // 2. Caretaker Aryan invites Elderly Sruti
  console.log('2. Testing Caretaker Aryan inviting Elderly Sruti...');
  const inv1Res = await fetch(`${API_BASE}/api/relationships/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryanToken}` },
    body: JSON.stringify({ elderlyTarget: 'sruti@example.com' })
  });
  const inv1Data = await inv1Res.json();
  assert.strictEqual(inv1Res.status, 201);
  assert.strictEqual(inv1Data.success, true);
  assert.strictEqual(inv1Data.relationship.status, 'pending');
  assert.strictEqual(inv1Data.relationship.caretakerName, 'Aryan');
  assert.strictEqual(inv1Data.relationship.elderlyName, 'Sruti');
  const relAryanSrutiId = inv1Data.relationship.id;
  console.log(`   ✅ Invitation sent (ID: ${relAryanSrutiId}, Status: pending)`);

  // 3. Caretaker Aryan invites Elderly Nahida (1 Caretaker -> Multiple Elderly)
  console.log('3. Testing Caretaker Aryan inviting Elderly Nahida (1 -> N Caretaker to Elderly)...');
  const inv2Res = await fetch(`${API_BASE}/api/relationships/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryanToken}` },
    body: JSON.stringify({ elderlyTarget: 'nahida@example.com' })
  });
  const inv2Data = await inv2Res.json();
  assert.strictEqual(inv2Res.status, 201);
  assert.strictEqual(inv2Data.relationship.elderlyName, 'Nahida');
  const relAryanNahidaId = inv2Data.relationship.id;
  console.log(`   ✅ 1 -> N Verified: Aryan connected to both Sruti and Nahida`);

  // 4. Caretaker Hrisit invites Elderly Sruti (1 Elderly -> Multiple Caretakers)
  console.log('4. Testing Caretaker Hrisit inviting Elderly Sruti (1 -> N Elderly to Caretakers)...');
  const inv3Res = await fetch(`${API_BASE}/api/relationships/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hrisitToken}` },
    body: JSON.stringify({ elderlyTarget: 'sruti@example.com' })
  });
  const inv3Data = await inv3Res.json();
  assert.strictEqual(inv3Res.status, 201);
  assert.strictEqual(inv3Data.relationship.caretakerName, 'Hrisit');
  const relHrisitSrutiId = inv3Data.relationship.id;
  console.log(`   ✅ 1 -> N Verified: Sruti received invitations from both Aryan and Hrisit`);

  // 5. Prevent Duplicate Connection
  console.log('5. Testing Duplicate Connection Request Prevention...');
  const dupRes = await fetch(`${API_BASE}/api/relationships/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryanToken}` },
    body: JSON.stringify({ elderlyTarget: 'sruti@example.com' })
  });
  assert.strictEqual(dupRes.status, 400);
  const dupData = await dupRes.json();
  assert.strictEqual(dupData.success, false);
  console.log(`   ✅ Duplicate correctly blocked (HTTP 400: ${dupData.error})`);

  // 6. Elderly Sruti accepts Aryan's Request
  console.log('6. Testing Elderly Sruti accepting Aryan\'s Request...');
  const acceptRes = await fetch(`${API_BASE}/api/relationships/${relAryanSrutiId}/respond`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${srutiToken}` },
    body: JSON.stringify({ decision: 'accept' })
  });
  const acceptData = await acceptRes.json();
  assert.strictEqual(acceptRes.status, 200);
  assert.strictEqual(acceptData.relationship.status, 'accepted');
  assert.ok(acceptData.relationship.acceptedAt);
  console.log('   ✅ Relationship status transitioned: pending -> accepted');

  // 7. Elderly Nahida rejects Aryan's Request
  console.log('7. Testing Elderly Nahida rejecting Aryan\'s Request...');
  const rejectRes = await fetch(`${API_BASE}/api/relationships/${relAryanNahidaId}/respond`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${nahidaToken}` },
    body: JSON.stringify({ decision: 'reject' })
  });
  const rejectData = await rejectRes.json();
  assert.strictEqual(rejectRes.status, 200);
  assert.strictEqual(rejectData.relationship.status, 'rejected');
  console.log('   ✅ Relationship status transitioned: pending -> rejected');

  // 8. Elderly Sruti accepts Hrisit's Request then Revokes it
  console.log('8. Testing Connection Revocation...');
  await fetch(`${API_BASE}/api/relationships/${relHrisitSrutiId}/respond`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${srutiToken}` },
    body: JSON.stringify({ decision: 'accept' })
  });

  const revokeRes = await fetch(`${API_BASE}/api/relationships/${relHrisitSrutiId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${srutiToken}` }
  });
  const revokeData = await revokeRes.json();
  assert.strictEqual(revokeRes.status, 200);
  assert.strictEqual(revokeData.relationship.status, 'revoked');
  console.log('   ✅ Relationship status transitioned: accepted -> revoked');

  // 9. Query Connections for Caretaker Aryan
  console.log('9. Querying active connections for Caretaker Aryan...');
  const aryanRelsRes = await fetch(`${API_BASE}/api/relationships/caretaker`, {
    headers: { 'Authorization': `Bearer ${aryanToken}` }
  });
  const aryanRelsData = await aryanRelsRes.json();
  assert.strictEqual(aryanRelsRes.status, 200);
  const activeForAryan = aryanRelsData.relationships.filter(r => r.status === 'accepted');
  assert.strictEqual(activeForAryan.length, 1);
  assert.strictEqual(activeForAryan[0].elderlyName, 'Sruti');
  console.log(`   ✅ Aryan has 1 active accepted relationship: ${activeForAryan[0].elderlyName}`);

  console.log('\n🎉 ALL 9 MANY-TO-MANY RELATIONSHIP TESTS PASSED SUCCESSFULLY!\n');
}

runRelationshipTests().catch(err => {
  console.error('\n❌ Relationship Test Suite Failed:', err);
  process.exit(1);
});
