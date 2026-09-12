/**
 * SMRITI MEDICAL SPECIALIST CLINICAL WORKFLOW TEST SUITE
 * 
 * Comprehensive automated verification for:
 * 1. Specialist Authentication, Medical Registration Profile & Verification Status
 * 2. RBAC Security Guards & Clinical Data Scoping (Specialist Scoped vs Memory Vault Isolated)
 * 3. Two-Way Clinician-Patient Linking (Direct Invite & Caretaker Code Redemption)
 * 4. Rule-Based Medical Safety Layer (Allergy Cross-Reference & Class Overlap Checks)
 * 5. Prescription Lifecycle with Immutable Medical Audit Logging (Create, Update, Discontinue)
 * 6. Caretaker Dosage Change Request Queue & Specialist Response Loop
 * 7. Unified Clinical Adherence & Cognitive Trajectory Timeline Aggregation
 * 8. Clinical Medical Alerts Resolution
 */

import assert from 'assert';
import http from 'http';
import app from '../src/app.js';
import { medicalSafety } from '../src/services/medical-safety.service.js';
import { specialistService } from '../src/services/specialist-service.js';

let serverInstance = null;
let API_BASE = 'http://localhost:3000';

async function startTestServer() {
  await new Promise((resolve) => {
    serverInstance = app.listen(0, () => {
      const port = serverInstance.address().port;
      API_BASE = `http://127.0.0.1:${port}`;
      console.log(`[Test Server] Live on isolated ephemeral port ${port}`);
      resolve();
    });
  });
}

async function runSpecialistWorkflowTests() {
  console.log('\n========================================================================');
  console.log('🩺 SMRITI MEDICAL SPECIALIST & CLINICAL WORKFLOW AUTOMATED TEST SUITE');
  console.log('========================================================================\n');

  if (specialistService._resetLocalStores) {
    specialistService._resetLocalStores();
  }

  await startTestServer();

  // Helper for Google OAuth simulation
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
    assert.strictEqual(data.success, true, `Auth failed for ${email}`);
    return { token: data.sessionToken, user: data.user };
  };

  // ---------------------------------------------------------------------------
  // 1. SETUP AUTHENTICATED ROLES
  // ---------------------------------------------------------------------------
  console.log('1. Authenticating test users across roles...');
  const specialist = await authUser('dr_barua_oauth', 'Dr. Barua', 'dr_barua@example.com', 'medical_specialist', '🩺');
  const unverifiedDoc = await authUser('dr_unverified_oauth', 'Dr. Trainee', 'dr_trainee@example.com', 'medical_specialist', '🩺');
  const caretaker = await authUser('aryan_caretaker_oauth', 'Aryan', 'aryan@example.com', 'caretaker', '🧑‍💻');
  const elderly = await authUser('sruti_elderly_oauth', 'Sruti', 'sruti@example.com', 'elderly_user', '👵');
  const unrelatedSpecialist = await authUser('dr_unrelated_oauth', 'Dr. Outsider', 'dr_outsider@example.com', 'medical_specialist', '🩺');

  assert.strictEqual(specialist.user.role, 'medical_specialist');
  assert.strictEqual(caretaker.user.role, 'caretaker');
  assert.strictEqual(elderly.user.role, 'elderly_user');
  console.log('   ✅ Authenticated: Specialist Dr. Barua, Caretaker Aryan, Elderly Sruti, Unverified Specialist, and Dr. Outsider');

  // ---------------------------------------------------------------------------
  // 2. SPECIALIST PROFILE & VERIFICATION STATUS
  // ---------------------------------------------------------------------------
  console.log('\n2. Testing Specialist Profile & Verification Management...');
  
  // Set Dr. Barua as verified with clinical registration details
  const updateProfRes = await fetch(`${API_BASE}/api/specialist/profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${specialist.token}` },
    body: JSON.stringify({
      title: 'Dr.',
      specialization: 'Geriatric Neurology',
      hospitalClinic: 'Guwahati Neurological Institute',
      licenseNumber: 'NMC-NER-2024-8842',
      phone: '+91 98765 43210',
      yearsOfExperience: 14,
      verified: true // Verified clinical status
    })
  });
  const updateProfData = await updateProfRes.json();
  assert.strictEqual(updateProfRes.status, 200);
  assert.strictEqual(updateProfData.success, true);
  assert.strictEqual(updateProfData.profile.verified, true);
  assert.strictEqual(updateProfData.profile.licenseNumber, 'NMC-NER-2024-8842');

  // Set Dr. Trainee as unverified
  await fetch(`${API_BASE}/api/specialist/profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${unverifiedDoc.token}` },
    body: JSON.stringify({
      title: 'Dr.',
      specialization: 'Resident',
      licenseNumber: 'PENDING-001',
      verified: false
    })
  });

  // Verify Specialist Dashboard Summary
  const summaryRes = await fetch(`${API_BASE}/api/users/specialist-dashboard/summary`, {
    headers: { 'Authorization': `Bearer ${specialist.token}` }
  });
  const summaryData = await summaryRes.json();
  assert.strictEqual(summaryRes.status, 200);
  assert.strictEqual(summaryData.role, 'medical_specialist');
  assert.strictEqual(summaryData.specialistProfile.licenseNumber, 'NMC-NER-2024-8842');
  console.log('   ✅ Specialist profile updated and dashboard summary verified');

  // ---------------------------------------------------------------------------
  // 3. RBAC & CLINICAL PRIVACY BOUNDARY GUARDS
  // ---------------------------------------------------------------------------
  console.log('\n3. Testing RBAC Security Guards & Clinical Vault Scoping...');

  // 3a. Elderly User blocked from Specialist Roster
  const elderlyBlockedRes = await fetch(`${API_BASE}/api/specialist/patients`, {
    headers: { 'Authorization': `Bearer ${elderly.token}` }
  });
  assert.strictEqual(elderlyBlockedRes.status, 403);
  console.log('   ✅ RBAC correctly blocked Elderly User from Specialist Clinical API (403)');

  // 3b. Caretaker blocked from Specialist Profile Management
  const caretakerBlockedRes = await fetch(`${API_BASE}/api/specialist/profile/me`, {
    headers: { 'Authorization': `Bearer ${caretaker.token}` }
  });
  assert.strictEqual(caretakerBlockedRes.status, 403);
  console.log('   ✅ RBAC correctly blocked Caretaker from Specialist Profile Endpoint (403)');

  // 3c. Specialist blocked from Personal Family Photo Vault (Clinical Scoping Isolation)
  const vaultScopingRes = await fetch(`${API_BASE}/api/media/${elderly.user.id}`, {
    headers: { 'Authorization': `Bearer ${specialist.token}` }
  });
  assert.strictEqual(vaultScopingRes.status, 403);
  const vaultData = await vaultScopingRes.json();
  assert.strictEqual(vaultData.clinicalPrivacyScoping, true);
  console.log(`   ✅ Privacy Scope Guard correctly isolated Personal Vault from Clinician (403: ${vaultData.error})`);

  // 3d. Unverified specialist blocked from writing clinical prescriptions
  const unverifiedPrescribeRes = await fetch(`${API_BASE}/api/specialist/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${unverifiedDoc.token}` },
    body: JSON.stringify({
      elderlyUserId: elderly.user.id,
      medicationName: 'Donepezil',
      dosage: '5mg'
    })
  });
  assert.strictEqual(unverifiedPrescribeRes.status, 403);
  console.log('   ✅ Verification Middleware correctly blocked Unverified Specialist from Prescribing (403)');

  // ---------------------------------------------------------------------------
  // 4. TWO-WAY CLINICIAN-PATIENT LINKING WORKFLOW
  // ---------------------------------------------------------------------------
  console.log('\n4. Testing Two-Way Clinician-Patient Linking Workflows...');

  // 4a. Direct Link Request: Dr. Barua invites Elderly Sruti
  const linkReqRes = await fetch(`${API_BASE}/api/specialist/link/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${specialist.token}` },
    body: JSON.stringify({ elderlyTarget: 'sruti@example.com' })
  });
  const linkReqData = await linkReqRes.json();
  assert.strictEqual(linkReqRes.status, 201);
  assert.strictEqual(linkReqData.success, true);
  assert.strictEqual(linkReqData.relationship.status, 'pending');
  const relationshipId = linkReqData.relationship.id;

  // 4b. Caretaker Aryan responds & approves link
  const approveRes = await fetch(`${API_BASE}/api/specialist/link/${relationshipId}/respond`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${caretaker.token}` },
    body: JSON.stringify({ decision: 'accepted' })
  });
  const approveData = await approveRes.json();
  assert.strictEqual(approveRes.status, 200);
  assert.strictEqual(approveData.relationship.status, 'accepted');

  // 4c. Verify Dr. Barua sees Elderly Sruti in Active Patients Roster
  const patientsRes = await fetch(`${API_BASE}/api/specialist/patients`, {
    headers: { 'Authorization': `Bearer ${specialist.token}` }
  });
  const patientsData = await patientsRes.json();
  assert.strictEqual(patientsRes.status, 200);
  const foundSruti = patientsData.patients.find(p => p.elderlyUserId === elderly.user.id);
  assert.ok(foundSruti, 'Elderly Sruti must appear in specialist patient roster');
  assert.strictEqual(foundSruti.relationshipStatus, 'accepted');
  console.log('   ✅ Two-Way Relationship created, approved by Caretaker, and linked in Patient Roster');

  // 4d. Caretaker generates Invite Code and Specialist redeems
  const inviteRes = await fetch(`${API_BASE}/api/specialist/link/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${caretaker.token}` },
    body: JSON.stringify({
      elderlyUserId: elderly.user.id,
      specialistTargetEmail: 'dr_outsider@example.com'
    })
  });
  const inviteData = await inviteRes.json();
  assert.strictEqual(inviteRes.status, 201);
  assert.ok(inviteData.relationship.inviteCode, 'Invite code must be generated');

  const redeemRes = await fetch(`${API_BASE}/api/specialist/link/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${unrelatedSpecialist.token}` },
    body: JSON.stringify({ inviteCode: inviteData.relationship.inviteCode })
  });
  const redeemData = await redeemRes.json();
  assert.strictEqual(redeemRes.status, 200);
  assert.strictEqual(redeemData.relationship.status, 'accepted');
  console.log(`   ✅ Passcode Redeem Workflow verified (Invite Code: ${inviteData.relationship.inviteCode})`);

  // ---------------------------------------------------------------------------
  // 5. RULE-BASED MEDICAL SAFETY LAYER
  // ---------------------------------------------------------------------------
  console.log('\n5. Testing Rule-Based Medical Safety Engine...');

  // Setup profile allergies for Sruti
  await fetch(`${API_BASE}/api/profile/${elderly.user.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${caretaker.token}` },
    body: JSON.stringify({
      displayName: 'Sruti',
      allergies: ['donepezil', 'penicillin'],
      medicalNotes: 'Mild Cognitive Impairment'
    })
  });

  // Check 5a: Allergy Conflict Detection
  const allergyCheck = medicalSafety.validatePrescriptionSafety({
    prescription: { drugName: 'Donepezil HCL', dosage: '10mg' },
    profile: { allergies: ['donepezil', 'penicillin'] }
  });
  assert.strictEqual(allergyCheck.safe, false);
  assert.strictEqual(allergyCheck.hasAllergyConflict, true);
  console.log('   ✅ Safety Layer detected Allergy Conflict (Donepezil flagged against profile allergy)');

  // Check 5b: Drug Class Duplicate Overlap Detection
  const classCheck = medicalSafety.checkClassConflicts(
    { drugName: 'Memantine', dosage: '10mg' },
    [{ id: 'namenda_prev', drugName: 'Namenda', dosage: '10mg', status: 'active' }]
  );
  assert.strictEqual(classCheck.warnings.length > 0, true);
  assert.ok(classCheck.warnings[0].includes('DRUG CLASS OVERLAP'));
  console.log('   ✅ Safety Layer detected Duplicate Drug Class Overlap (Memantine & Namenda NMDA Antagonists)');

  // ---------------------------------------------------------------------------
  // 6. PRESCRIPTION LIFECYCLE & IMMUTABLE MEDICAL AUDIT LOGS
  // ---------------------------------------------------------------------------
  console.log('\n6. Testing Prescription Lifecycle & Immutable Audit Logging...');

  // 6a. Create Valid Prescription: Rivastigmine 4.6mg Patch
  const createRxRes = await fetch(`${API_BASE}/api/specialist/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${specialist.token}` },
    body: JSON.stringify({
      elderlyUserId: elderly.user.id,
      medicationName: 'Rivastigmine',
      dosage: '4.6mg / 24hr',
      frequency: 'Daily',
      route: 'Transdermal Patch',
      timing: 'Morning',
      instructions: 'Apply 1 patch daily to clean, dry skin on upper back or chest.'
    })
  });
  const createRxData = await createRxRes.json();
  assert.strictEqual(createRxRes.status, 201);
  assert.strictEqual(createRxData.success, true);
  assert.strictEqual(createRxData.prescription.medicationName, 'Rivastigmine');
  assert.strictEqual(createRxData.prescription.status, 'active');
  const prescriptionId = createRxData.prescription.id;
  console.log(`   ✅ Prescription created (ID: ${prescriptionId})`);

  // 6b. Verify Medical Audit Log was recorded
  const auditRes1 = await fetch(`${API_BASE}/api/specialist/audit-logs/${elderly.user.id}`, {
    headers: { 'Authorization': `Bearer ${specialist.token}` }
  });
  const auditData1 = await auditRes1.json();
  assert.strictEqual(auditRes1.status, 200);
  const createLog = auditData1.logs.find(l => l.action === 'PRESCRIPTION_CREATED' && l.prescriptionId === prescriptionId);
  assert.ok(createLog, 'PRESCRIPTION_CREATED audit log must exist');
  assert.strictEqual(createLog.specialistId, specialist.user.id);
  assert.strictEqual(createLog.specialistName, 'Dr. Barua');
  console.log('   ✅ Immutable Medical Audit Log verified for PRESCRIPTION_CREATED');

  // 6c. Update Prescription Dosage (Dr. Barua titrates to 9.5mg)
  const updateRxRes = await fetch(`${API_BASE}/api/specialist/prescriptions/${prescriptionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${specialist.token}` },
    body: JSON.stringify({
      dosage: '9.5mg / 24hr',
      clinicalNotes: 'Titrated up after 4 weeks of good tolerance.'
    })
  });
  const updateRxData = await updateRxRes.json();
  assert.strictEqual(updateRxRes.status, 200);
  assert.strictEqual(updateRxData.prescription.dosage, '9.5mg / 24hr');

  // Verify Audit Log for Update
  const auditRes2 = await fetch(`${API_BASE}/api/specialist/audit-logs/${elderly.user.id}`, {
    headers: { 'Authorization': `Bearer ${specialist.token}` }
  });
  const auditData2 = await auditRes2.json();
  const updateLog = auditData2.logs.find(l => l.action === 'PRESCRIPTION_UPDATED' && l.prescriptionId === prescriptionId);
  assert.ok(updateLog, 'PRESCRIPTION_UPDATED audit log must exist');
  assert.strictEqual(updateLog.changes.newValues.dosage, '9.5mg / 24hr');
  console.log('   ✅ Prescription updated and titrate change audit logged');

  // ---------------------------------------------------------------------------
  // 7. CARETAKER CHANGE REQUEST QUEUE & SPECIALIST RESOLUTION
  // ---------------------------------------------------------------------------
  console.log('\n7. Testing Caretaker Change Request Queue & Specialist Approval...');

  // 7a. Caretaker Aryan submits dosage change request
  const submitReqRes = await fetch(`${API_BASE}/api/specialist/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${caretaker.token}` },
    body: JSON.stringify({
      elderlyUserId: elderly.user.id,
      prescriptionId: prescriptionId,
      requestType: 'dosage_change',
      requestedDosage: '4.6mg / 24hr maintenance',
      symptomNotes: 'Patient experiencing mild nausea and erythema at patch site.',
      urgency: 'high'
    })
  });
  const submitReqData = await submitReqRes.json();
  assert.strictEqual(submitReqRes.status, 201);
  assert.strictEqual(submitReqData.request.status, 'pending');
  assert.strictEqual(submitReqData.request.urgency, 'high');
  const requestId = submitReqData.request.id;
  console.log(`   ✅ Caretaker Request submitted to Clinical Queue (Request ID: ${requestId})`);

  // 7b. Specialist Dr. Barua fetches queue and reviews
  const queueRes = await fetch(`${API_BASE}/api/specialist/requests/${elderly.user.id}?status=pending`, {
    headers: { 'Authorization': `Bearer ${specialist.token}` }
  });
  const queueData = await queueRes.json();
  assert.strictEqual(queueRes.status, 200);
  const foundReq = queueData.requests.find(r => r.id === requestId);
  assert.ok(foundReq, 'Request must be present in pending queue');

  // 7c. Specialist approves request and updates prescription
  const respondReqRes = await fetch(`${API_BASE}/api/specialist/requests/${requestId}/respond`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${specialist.token}` },
    body: JSON.stringify({
      decision: 'approved',
      clinicalNotes: 'Approved return to 4.6mg patch to alleviate skin irritation.',
      newDosage: '4.6mg / 24hr'
    })
  });
  const respondReqData = await respondReqRes.json();
  assert.strictEqual(respondReqRes.status, 200);
  assert.strictEqual(respondReqData.success, true);
  assert.strictEqual(respondReqData.request.status, 'approved');
  assert.strictEqual(respondReqData.prescription.dosage, '4.6mg / 24hr');
  console.log('   ✅ Specialist reviewed, approved request, and dosage automatically updated');

  // ---------------------------------------------------------------------------
  // 8. UNIFIED CLINICAL & COGNITIVE TIMELINE AGGREGATION
  // ---------------------------------------------------------------------------
  console.log('\n8. Testing Unified Adherence & Cognitive Trajectory Timeline...');

  const timelineRes = await fetch(`${API_BASE}/api/specialist/timeline/${elderly.user.id}`, {
    headers: { 'Authorization': `Bearer ${specialist.token}` }
  });
  const timelineData = await timelineRes.json();
  assert.strictEqual(timelineRes.status, 200);
  assert.strictEqual(timelineData.success, true);
  assert.ok(typeof timelineData.adherenceRate === 'number', 'Adherence rate must be a number');
  assert.ok(Array.isArray(timelineData.timeline), 'Timeline items must be an array');
  assert.ok(timelineData.cognitiveTrajectory !== undefined, 'Cognitive trajectory must be included');

  const hasRxEvent = timelineData.timeline.some(item => item.eventType === 'PRESCRIPTION_CREATED' || item.eventType === 'PRESCRIPTION_UPDATED');
  assert.ok(hasRxEvent, 'Timeline must contain prescription clinical events');
  console.log(`   ✅ Unified Timeline aggregated successfully (${timelineData.timeline.length} events, Adherence: ${timelineData.adherenceRate}%)`);

  // ---------------------------------------------------------------------------
  // 9. MEDICAL ALERTS & PRESCRIPTION DISCONTINUATION
  // ---------------------------------------------------------------------------
  console.log('\n9. Testing Clinical Medical Alerts & Discontinuation...');

  // 9a. Retrieve / Trigger Alerts
  const alertsRes = await fetch(`${API_BASE}/api/specialist/alerts/${elderly.user.id}`, {
    headers: { 'Authorization': `Bearer ${specialist.token}` }
  });
  const alertsData = await alertsRes.json();
  assert.strictEqual(alertsRes.status, 200);
  assert.ok(Array.isArray(alertsData.alerts));
  console.log(`   ✅ Clinical Alerts endpoint active (${alertsData.alerts.length} alerts on record)`);

  // 9b. Test automated missed_dose_streak trigger
  const dose1 = await fetch(`${API_BASE}/api/specialist/alerts/record-dose-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${specialist.token}` },
    body: JSON.stringify({
      elderlyUserId: elderly.user.id,
      drugName: 'Rivastigmine',
      status: 'missed',
      missedCountThreshold: 2
    })
  });
  const dose1Data = await dose1.json();
  assert.strictEqual(dose1.status, 200);
  assert.strictEqual(dose1Data.alertGenerated, false, '1st missed dose should not generate streak alert yet');

  const dose2 = await fetch(`${API_BASE}/api/specialist/alerts/record-dose-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${specialist.token}` },
    body: JSON.stringify({
      elderlyUserId: elderly.user.id,
      drugName: 'Rivastigmine',
      status: 'missed',
      missedCountThreshold: 2
    })
  });
  const dose2Data = await dose2.json();
  assert.strictEqual(dose2.status, 200);
  assert.strictEqual(dose2Data.alertGenerated, true, '2nd consecutive missed dose must generate streak alert');
  assert.strictEqual(dose2Data.alert.alertType, 'missed_dose_streak');
  console.log('   ✅ Automated missed_dose_streak alert generated on consecutive missed doses');

  // 9b. Discontinue Prescription with Reason
  const discontinueRes = await fetch(`${API_BASE}/api/specialist/prescriptions/${prescriptionId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${specialist.token}` },
    body: JSON.stringify({
      reason: 'Course completed, transitioning to oral formulation.'
    })
  });
  const discontinueData = await discontinueRes.json();
  assert.strictEqual(discontinueRes.status, 200);
  assert.strictEqual(discontinueData.prescription.status, 'discontinued');

  // Verify Discontinuation Audit Log
  const finalAuditRes = await fetch(`${API_BASE}/api/specialist/audit-logs/${elderly.user.id}`, {
    headers: { 'Authorization': `Bearer ${specialist.token}` }
  });
  const finalAuditData = await finalAuditRes.json();
  const disLog = finalAuditData.logs.find(l => l.action === 'PRESCRIPTION_DISCONTINUED' && l.prescriptionId === prescriptionId);
  assert.ok(disLog, 'PRESCRIPTION_DISCONTINUED audit log must exist');
  console.log('   ✅ Prescription successfully discontinued with recorded audit trail');

  console.log('\n========================================================================');
  console.log('🎉 ALL 9 SPECIALIST CLINICAL WORKFLOW TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================================\n');

  if (serverInstance) {
    serverInstance.close();
  }
}

runSpecialistWorkflowTests().catch((err) => {
  console.error('\n❌ Specialist Workflow Test Suite Failed:', err);
  if (serverInstance) serverInstance.close();
  process.exit(1);
});
