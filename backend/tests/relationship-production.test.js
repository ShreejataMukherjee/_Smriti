/**
 * SMRITI PRODUCTION RELATIONSHIP ENDPOINTS & LIFECYCLE TEST SUITE
 * Validates connection request initiation, real email lookups, duplicate checks, RBAC authorization, and acceptance flows via Express API router.
 */

import { userService } from '../src/services/user-service.js';
import { authService } from '../src/auth/auth-service.js';
import { relationshipService } from '../src/services/relationship-service.js';

const API_BASE = 'http://localhost:3000';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`   ❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  }
  console.log(`   ✅ ${message}`);
  passed++;
}

async function runRelationshipProductionTests() {
  console.log('========================================================================');
  console.log('🧪 SMRITI PRODUCTION RELATIONSHIP & CONNECTION LIFECYCLE TEST SUITE');
  console.log('========================================================================\n');

  try {
    const timestamp = Date.now();
    // 1. Setup fresh isolated test users
    console.log('1. Setting up real authenticated test users (Caretaker Aryan, Elderly Sruti, Caretaker Hrisit)...');
    const caretakerUser = await userService.syncOAuthUser({
      id: `rel_prod_caretaker_${timestamp}`,
      email: `aryan.prod.${timestamp}@smriti.local`,
      name: 'Aryan Caretaker',
      intendedRole: 'caretaker'
    });

    const elderlyUser = await userService.syncOAuthUser({
      id: `rel_prod_elderly_${timestamp}`,
      email: `sruti.prod.${timestamp}@smriti.local`,
      name: 'Sruti Elderly User',
      intendedRole: 'elderly_user'
    });

    const secondCaretaker = await userService.syncOAuthUser({
      id: `rel_prod_caretaker_second_${timestamp}`,
      email: `hrisit.prod.${timestamp}@smriti.local`,
      name: 'Hrisit Caretaker',
      intendedRole: 'caretaker'
    });

    // Generate real session tokens
    const caretakerToken = authService.generateSessionToken(caretakerUser);
    const elderlyToken = authService.generateSessionToken(elderlyUser);
    const secondCaretakerToken = authService.generateSessionToken(secondCaretaker);

    assert(caretakerToken && elderlyToken, 'Authentication session tokens generated successfully');

    // 2. Test Unauthenticated Request Blocked (HTTP 401)
    console.log('2. Testing Unauthenticated Request Rejection (HTTP 401)...');
    const unauthRes = await fetch(`${API_BASE}/api/relationships/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elderlyEmail: elderlyUser.email })
    });
    const unauthData = await unauthRes.json();

    assert(unauthRes.status === 401, 'Unauthenticated request correctly rejected with HTTP 401');
    assert(unauthData.success === false, 'Returns structured error JSON');

    // 3. Test Elderly User cannot send connection request (HTTP 403)
    console.log('3. Testing Elderly User attempting to initiate connection (HTTP 403)...');
    const elderlyRes = await fetch(`${API_BASE}/api/relationships/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${elderlyToken}`
      },
      body: JSON.stringify({ elderlyEmail: 'other@example.com' })
    });
    const elderlyData = await elderlyRes.json();

    assert(elderlyRes.status === 403, 'Elderly role blocked from initiating requests (HTTP 403)');

    // 4. Test Non-Existent Elderly Account (HTTP 404)
    console.log('4. Testing Request with Non-Existent Elderly Email (HTTP 404)...');
    const notFoundRes = await fetch(`${API_BASE}/api/relationships/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${caretakerToken}`
      },
      body: JSON.stringify({ elderlyEmail: 'nonexistent.user.12345@smriti.local' })
    });
    const notFoundData = await notFoundRes.json();

    assert(notFoundRes.status === 404, 'Non-existent elderly email returns HTTP 404');
    assert(notFoundData.error?.includes('No registered elderly user found'), 'Error specifies no registered elderly account');

    // 5. Test Target is Not Elderly Role (HTTP 400)
    console.log('5. Testing Connection to Non-Elderly User (Caretaker -> Caretaker) (HTTP 400)...');
    const wrongRoleRes = await fetch(`${API_BASE}/api/relationships/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${caretakerToken}`
      },
      body: JSON.stringify({ elderlyEmail: secondCaretaker.email })
    });
    const wrongRoleData = await wrongRoleRes.json();

    assert(wrongRoleRes.status === 400, 'Connecting to non-elderly account rejected with HTTP 400');

    // 6. Test Successful Connection Request by Real Email (HTTP 201)
    console.log('6. Testing Successful Connection Request by Real Elderly Email (HTTP 201)...');
    const successRes = await fetch(`${API_BASE}/api/relationships/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${caretakerToken}`
      },
      body: JSON.stringify({ elderlyEmail: elderlyUser.email, relationshipType: 'family' })
    });
    const successData = await successRes.json();

    assert(successRes.status === 201, 'Connection request created with HTTP 201');
    assert(successData.success === true, 'Success flag is true');
    assert(successData.relationship?.status === 'pending', 'Relationship status is "pending"');
    assert(successData.relationship?.elderlyUserId === elderlyUser.id, 'Mapped to real elderly UID');

    const createdRelId = successData.relationship.id;

    // 7. Test Duplicate Connection Request Prevention (HTTP 400 / 409)
    console.log('7. Testing Duplicate Connection Request Prevention (HTTP 400/409)...');
    const dupRes = await fetch(`${API_BASE}/api/relationships/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${caretakerToken}`
      },
      body: JSON.stringify({ elderlyEmail: elderlyUser.email })
    });
    const dupData = await dupRes.json();

    assert([400, 409].includes(dupRes.status), 'Duplicate connection request rejected with HTTP 400/409');
    assert(dupData.error?.includes('already pending') || dupData.error?.includes('already exists'), 'Duplicate error message clear');

    // 8. Test Elderly User Querying Incoming Requests
    console.log('8. Testing Elderly User Querying Incoming Requests (GET /api/relationships/elderly)...');
    const elderlyListRes = await fetch(`${API_BASE}/api/relationships/elderly`, {
      headers: { 'Authorization': `Bearer ${elderlyToken}` }
    });
    const elderlyListData = await elderlyListRes.json();

    assert(elderlyListRes.status === 200, 'Elderly relationships query returned HTTP 200');
    const pendingFound = elderlyListData.relationships?.find(r => r.id === createdRelId);
    assert(Boolean(pendingFound), 'Created relationship present in elderly user pending inbox');

    // 9. Test Elderly User Accepting Request (PUT /api/relationships/:id/respond)
    console.log('9. Testing Elderly User Accepting Request (PUT /api/relationships/:id/respond)...');
    const acceptRes = await fetch(`${API_BASE}/api/relationships/${createdRelId}/respond`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${elderlyToken}`
      },
      body: JSON.stringify({ decision: 'accept' })
    });
    const acceptData = await acceptRes.json();

    assert(acceptRes.status === 200, 'Accept request returned HTTP 200');
    assert(acceptData.relationship?.status === 'accepted', 'Relationship status transitioned to "accepted"');

    // 10. Test Caretaker Querying Connected Patients (GET /api/relationships/caretaker)
    console.log('10. Testing Caretaker Querying Active Connected Patients (GET /api/relationships/caretaker)...');
    const caretakerListRes = await fetch(`${API_BASE}/api/relationships/caretaker`, {
      headers: { 'Authorization': `Bearer ${caretakerToken}` }
    });
    const caretakerListData = await caretakerListRes.json();

    assert(caretakerListRes.status === 200, 'Caretaker relationships query returned HTTP 200');
    const connectedFound = caretakerListData.relationships?.find(r => r.id === createdRelId && r.status === 'accepted');
    assert(Boolean(connectedFound), 'Accepted connection listed in caretaker patient directory');

    console.log('\n========================================================================');
    console.log(`🎉 ALL ${passed} PRODUCTION RELATIONSHIP TESTS PASSED! (0 FAILURES)`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('❌ Production Relationship Test Suite Failed:', err);
    process.exit(1);
  }
}

runRelationshipProductionTests();
