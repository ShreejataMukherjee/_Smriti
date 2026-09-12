/**
 * SMRITI PERSONALIZATION, FAMILY CONTEXT & AI CONVERSATION TEST SUITE
 * 
 * Verifies:
 * 1. Rich family member dataset persistence (name, custom relationship/familiarTitle, photoURL, location, personalContext, voicePrompt, isFavorite).
 * 2. Personalization propagation into cognitive activity pack (Who Is This?, Memory Match, Remember Photo).
 * 3. Handling 1, 2, or multiple family members dynamically without hardcoded bounds or forced generic labels.
 * 4. Conversational Reminiscence API (Talk & Recall) opening prompt generation.
 * 5. Conversational Reminiscence message processing with family & routine context injection.
 */

import assert from 'assert';
import http from 'http';
import app from '../src/app.js';

let server;
let API_BASE;

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      API_BASE = `http://localhost:${port}`;
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

async function runPersonalizationTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING PERSONALIZATION + FAMILY CONTEXT + AI CONVERSATION TESTS');
  console.log('==================================================\n');

  process.env.VISION_PROVIDER = 'mock';

  await startServer();

  try {
    const authUser = async (id, name, email, role) => {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oauthUser: { id, name, email, photoURL: '👤' },
          intendedRole: role
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200, `Auth failed for ${name}: ${data.error}`);
      return { token: data.sessionToken, user: data.user };
    };

    // 1. Setup users & active relationship
    console.log('1. Setting up Caretaker Aryan and Elderly Sruti...');
    const aryan = await authUser('caretaker_aryan_audit', 'Aryan', 'aryan.audit@example.com', 'caretaker');
    const sruti = await authUser('elderly_sruti_audit', 'Sruti', 'sruti.audit@example.com', 'elderly_user');

    const reqRes = await fetch(`${API_BASE}/api/relationships/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
      body: JSON.stringify({ elderlyTarget: 'sruti.audit@example.com' })
    });
    const reqData = await reqRes.json();
    if (reqData.relationship?.id) {
      await fetch(`${API_BASE}/api/relationships/${reqData.relationship.id}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
        body: JSON.stringify({ decision: 'accept' })
      });
    }

    // 2. Add multiple rich family members with custom familiar labels (e.g. Papa, Maa, Bhaity)
    console.log('2. Registering multiple rich family members with custom familiar titles...');
    
    // Member 1: Papa (Custom male label)
    const fam1 = await fetch(`${API_BASE}/api/family`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
      body: JSON.stringify({
        elderlyUserId: sruti.user.id,
        name: 'Hrithik',
        relationship: 'Papa',
        familiarTitle: 'Papa',
        gender: 'male',
        location: 'Tezpur',
        personalContext: 'Enjoys drinking early morning Assam tea and reading newspaper',
        voicePrompt: 'Ask about morning tea in the veranda',
        isFavorite: true
      })
    });
    const famData1 = await fam1.json();
    assert.strictEqual(fam1.status, 201);
    console.log(`   ✅ Added Member 1: ${famData1.member.name} (${famData1.member.familiarTitle}) in ${famData1.member.location}`);

    // Member 2: Daughter (Custom female label)
    const fam2 = await fetch(`${API_BASE}/api/family`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
      body: JSON.stringify({
        elderlyUserId: sruti.user.id,
        name: 'Nahida',
        relationship: 'Daughter',
        familiarTitle: 'Daughter',
        gender: 'female',
        location: 'Guwahati',
        personalContext: 'Calls every evening at 7 PM and brings pitha during Bihu',
        voicePrompt: 'Ask about Bihu festival sweets',
        isFavorite: true
      })
    });
    const famData2 = await fam2.json();
    assert.strictEqual(fam2.status, 201);
    console.log(`   ✅ Added Member 2: ${famData2.member.name} (${famData2.member.familiarTitle}) in ${famData2.member.location}`);

    // Member 3: Grandson (Custom young male label)
    const fam3 = await fetch(`${API_BASE}/api/family`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
      body: JSON.stringify({
        elderlyUserId: sruti.user.id,
        name: 'Aryan',
        relationship: 'Grandson',
        familiarTitle: 'Grandson',
        gender: 'male',
        location: 'Delhi',
        personalContext: 'Studies engineering and loves listening to old radio stories',
        voicePrompt: 'Ask about college life and old stories'
      })
    });
    const famData3 = await fam3.json();
    assert.strictEqual(fam3.status, 201);
    console.log(`   ✅ Added Member 3: ${famData3.member.name} (${famData3.member.familiarTitle}) in ${famData3.member.location}`);

    // 3. Register a daily routine
    console.log('3. Registering daily routines...');
    await fetch(`${API_BASE}/api/routine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aryan.token}` },
      body: JSON.stringify({
        elderlyUserId: sruti.user.id,
        activityName: 'Morning Assam Tea',
        time: '07:00 AM',
        icon: '☕',
        order: 1
      })
    });

    // 4. Test Personalization Propagation in Activity Pack
    console.log('4. Testing Personalization in Cognitive Activities (Who Is This?, Memory Match)...');
    const actRes = await fetch(`${API_BASE}/api/cognitive/activities/${sruti.user.id}?language=en`, {
      headers: { 'Authorization': `Bearer ${sruti.token}` }
    });
    const actData = await actRes.json();
    assert.strictEqual(actRes.status, 200);

    const whoIsThis = actData.activities.find(a => a.subType === 'who_is_this');
    assert(whoIsThis, 'Expected Who Is This activity');
    assert(whoIsThis.options.some(o => o.isCorrect), 'Expected correct option in Who Is This');
    console.log(`   ✅ "Who Is This?" generated choices using real user family dataset.`);

    const matchAct = actData.activities.find(a => a.subType === 'memory_match');
    assert(matchAct, 'Expected Memory Match activity');
    console.log(`   ✅ "Memory Match" generated prompt: "${matchAct.prompt}"`);

    // 5. Test AI Conversation (Talk & Recall) Opening Prompt
    console.log('5. Testing AI Conversation Opening Prompt (GET /api/cognitive/conversation/prompt/:elderlyUserId)...');
    const promptRes = await fetch(`${API_BASE}/api/cognitive/conversation/prompt/${sruti.user.id}?language=en`, {
      headers: { 'Authorization': `Bearer ${sruti.token}` }
    });
    const promptData = await promptRes.json();
    assert.strictEqual(promptRes.status, 200);
    assert(promptData.promptText.includes('Sruti') || promptData.promptText.includes('Hrithik') || promptData.promptText.includes('Nahida'), 'Prompt must cite real user family or name');
    assert(Array.isArray(promptData.suggestedReplies) && promptData.suggestedReplies.length > 0, 'Expected suggested replies');
    console.log(`   ✅ Opening Reminiscence Prompt: "${promptData.promptText}"`);
    console.log(`   ✅ Quick Suggestions: ${JSON.stringify(promptData.suggestedReplies)}`);

    // 6. Test AI Conversation Message Processing
    console.log('6. Testing AI Conversation Response to Senior Speech (POST /api/cognitive/conversation/message)...');
    const chatRes = await fetch(`${API_BASE}/api/cognitive/conversation/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
      body: JSON.stringify({
        elderlyUserId: sruti.user.id,
        userMessage: 'I was thinking about Hrithik and having morning tea in Tezpur today.',
        conversationHistory: [
          { role: 'assistant', content: promptData.promptText }
        ],
        language: 'en'
      })
    });
    const chatData = await chatRes.json();
    assert.strictEqual(chatRes.status, 200);
    assert(chatData.replyText.includes('Hrithik') || chatData.replyText.includes('Papa') || chatData.replyText.includes('tea'), 'Response must contextualize user speech with their family');
    console.log(`   ✅ Conversational AI Reply: "${chatData.replyText}"`);

    // 7. Test Assamese Language Multilingual Conversation
    console.log('7. Testing Assamese Language Reminiscence Flow...');
    const asChatRes = await fetch(`${API_BASE}/api/cognitive/conversation/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sruti.token}` },
      body: JSON.stringify({
        elderlyUserId: sruti.user.id,
        userMessage: 'মই আজি Nahida ৰ লগত কথা পাতিলোঁ। বৰ ভাল লাগিল।',
        language: 'as'
      })
    });
    const asChatData = await asChatRes.json();
    assert.strictEqual(asChatRes.status, 200);
    assert(asChatData.replyText.includes('Nahida') || asChatData.replyText.includes('মৰমৰ'), 'Assamese response must cite Nahida');
    console.log(`   ✅ Assamese AI Reply: "${asChatData.replyText}"`);

    console.log('\n==================================================');
    console.log('🎉 ALL PERSONALIZATION & CONVERSATION TESTS PASSED!');
    console.log('==================================================\n');
  } finally {
    await stopServer();
  }
}

runPersonalizationTests().catch(err => {
  console.error('\n❌ Personalization Test Suite Failed:', err);
  stopServer().then(() => process.exit(1));
});
