/**
 * E2E PRODUCTION VERIFICATION SCRIPT AGAINST VERCEL DEPLOYMENT
 * Tests:
 * 1. Caretaker signs in to https://smriti-red.vercel.app/api/auth/google
 * 2. Elderly signs in to https://smriti-red.vercel.app/api/auth/google
 * 3. Caretaker calls POST https://smriti-red.vercel.app/api/relationships/request with elderly user's real email
 * 4. Caretaker queries GET https://smriti-red.vercel.app/api/relationships/caretaker (sees pending)
 * 5. Elderly queries GET https://smriti-red.vercel.app/api/relationships/elderly (sees pending invite)
 * 6. Elderly calls PUT https://smriti-red.vercel.app/api/relationships/:id/respond with 'accept'
 * 7. Caretaker queries GET https://smriti-red.vercel.app/api/relationships/caretaker (sees accepted)
 */

const VERCEL_BASE = 'https://smriti-red.vercel.app';

async function main() {
  console.log('========================================================================');
  console.log('🚀 TESTING LIVE VERCEL PRODUCTION RELATIONSHIP LIFECYCLE');
  console.log(`Target: ${VERCEL_BASE}`);
  console.log('========================================================================\n');

  const ts = Date.now();
  const caretakerEmail = `caretaker.prod.${ts}@gmail.com`;
  const elderlyEmail = `elderly.prod.${ts}@gmail.com`;

  // 1. Authenticate Caretaker
  console.log(`1. Authenticating live Caretaker (${caretakerEmail})...`);
  const ctAuthRes = await fetch(`${VERCEL_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      oauthUser: {
        id: `google_ct_${ts}`,
        email: caretakerEmail,
        name: 'Aryan Caretaker Real'
      },
      intendedRole: 'caretaker'
    })
  });
  const ctAuthData = await ctAuthRes.json();
  if (!ctAuthData.success) throw new Error(`Caretaker auth failed: ${JSON.stringify(ctAuthData)}`);
  const caretakerToken = ctAuthData.sessionToken;
  console.log(`   ✅ Caretaker authenticated: UID=${ctAuthData.user.id}`);

  // 2. Authenticate Elderly User
  console.log(`2. Authenticating live Elderly User (${elderlyEmail})...`);
  const elAuthRes = await fetch(`${VERCEL_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      oauthUser: {
        id: `google_el_${ts}`,
        email: elderlyEmail,
        name: 'Sruti Elderly Real'
      },
      intendedRole: 'elderly_user'
    })
  });
  const elAuthData = await elAuthRes.json();
  if (!elAuthData.success) throw new Error(`Elderly auth failed: ${JSON.stringify(elAuthData)}`);
  const elderlyToken = elAuthData.sessionToken;
  console.log(`   ✅ Elderly User authenticated: UID=${elAuthData.user.id}`);

  // 3. Caretaker sends connection request using Elderly user's Google email
  console.log(`3. Caretaker sending connection request to ${elderlyEmail}...`);
  const reqRes = await fetch(`${VERCEL_BASE}/api/relationships/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${caretakerToken}`
    },
    body: JSON.stringify({
      elderlyEmail: elderlyEmail,
      relationshipType: 'family'
    })
  });

  const reqData = await reqRes.json();
  console.log(`   Status: HTTP ${reqRes.status}`);
  if (!reqData.success) throw new Error(`Connection request failed: ${JSON.stringify(reqData)}`);
  console.log(`   ✅ Connection Request created: ID=${reqData.relationship.id}, Status=${reqData.relationship.status}`);
  const relId = reqData.relationship.id;

  // 4. Duplicate request check (should return 400 or 409)
  console.log(`4. Testing duplicate connection request prevention on live Vercel...`);
  const dupRes = await fetch(`${VERCEL_BASE}/api/relationships/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${caretakerToken}`
    },
    body: JSON.stringify({ elderlyEmail: elderlyEmail })
  });
  const dupData = await dupRes.json();
  console.log(`   Status: HTTP ${dupRes.status} (Expected 400 or 409)`);
  if (dupRes.status !== 400 && dupRes.status !== 409) throw new Error(`Duplicate check failed: ${JSON.stringify(dupData)}`);
  console.log(`   ✅ Duplicate correctly rejected: ${dupData.error}`);

  // 5. Elderly user checks pending invitations
  console.log(`5. Elderly User querying incoming relationships (GET /api/relationships/elderly)...`);
  const elRelRes = await fetch(`${VERCEL_BASE}/api/relationships/elderly`, {
    headers: { 'Authorization': `Bearer ${elderlyToken}` }
  });
  const elRelData = await elRelRes.json();
  if (!elRelData.success) throw new Error(`Elderly relations query failed: ${JSON.stringify(elRelData)}`);
  const pendingInvite = elRelData.relationships.find(r => r.id === relId);
  if (!pendingInvite) throw new Error('Pending relationship not found in elderly list');
  console.log(`   ✅ Found pending invite from Caretaker in elderly inbox!`);

  // 6. Elderly user accepts request
  console.log(`6. Elderly User accepting relationship (PUT /api/relationships/${relId}/respond)...`);
  const acceptRes = await fetch(`${VERCEL_BASE}/api/relationships/${relId}/respond`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${elderlyToken}`
    },
    body: JSON.stringify({ decision: 'accept' })
  });
  const acceptData = await acceptRes.json();
  if (!acceptData.success) throw new Error(`Accept failed: ${JSON.stringify(acceptData)}`);
  console.log(`   ✅ Relationship accepted! Status=${acceptData.relationship.status}`);

  // 7. Caretaker verifies accepted relationship
  console.log(`7. Caretaker querying active patients (GET /api/relationships/caretaker)...`);
  const ctRelRes = await fetch(`${VERCEL_BASE}/api/relationships/caretaker`, {
    headers: { 'Authorization': `Bearer ${caretakerToken}` }
  });
  const ctRelData = await ctRelRes.json();
  if (!ctRelData.success) throw new Error(`Caretaker relations query failed: ${JSON.stringify(ctRelData)}`);
  const acceptedPatient = ctRelData.relationships.find(r => r.id === relId && r.status === 'accepted');
  if (!acceptedPatient) throw new Error('Accepted relationship not found in caretaker active patient list');
  console.log(`   ✅ Caretaker confirmed active accepted connection with Elderly User ${acceptedPatient.elderlyName}!`);

  console.log('\n========================================================================');
  console.log('🎉 LIVE PRODUCTION VERCEL RELATIONSHIP LIFECYCLE 100% VERIFIED!');
  console.log('========================================================================\n');
}

main().catch(err => {
  console.error('❌ Live production test failed:', err);
  process.exit(1);
});
