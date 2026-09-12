/**
 * SMRITI SENIOR IDENTITY UNIT TEST (Zero Network / Zero External Calls)
 * 
 * Verifies:
 * 1. [Real Name] Baba for male seniors (e.g., "Aryan Baba")
 * 2. [Real Name] Maa for female seniors (e.g., "Sruti Maa")
 * 3. Exact spelling "Maa" (M-a-a)
 * 4. USER NAME -> TITLE order (Never "Baba [Name]" or "Maa [Name]")
 * 5. Safe neutral fallback when gender is unspecified (No guessing)
 * 6. Dynamic greetings: "Good morning/afternoon/evening, [Real Name] Baba/Maa ❤️"
 * 7. "Elderly User" never appears for authenticated real users
 */

import assert from 'assert';
import { previewService } from '../src/services/preview-service.js';
import { userService } from '../src/services/user-service.js';
import { profileService } from '../src/services/profile-service.js';
import { familyService } from '../src/services/family-service.js';
import { mediaService } from '../src/services/media-service.js';
import { routineService } from '../src/services/routine-service.js';
import { reminderService } from '../src/services/reminder-service.js';
import { conversationReminiscenceService } from '../src/services/conversation-reminiscence.service.js';

async function runUnitTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING SENIOR IDENTITY LOCAL UNIT TESTS');
  console.log('==================================================\n');

  // Save original service methods
  const origGetUserById = userService.getUserById;
  const origGetProfile = profileService.getProfile;
  const origGetFamily = familyService.getFamilyForElderly;
  const origGetMemories = mediaService.getMemoriesForElderly;
  const origGetRoutine = routineService.getRoutineForElderly;
  const origGetReminders = reminderService.getRemindersForElderly;

  try {
    // Mock ancillary sub-datasets with empty arrays
    familyService.getFamilyForElderly = async () => [];
    mediaService.getMemoriesForElderly = async () => [];
    routineService.getRoutineForElderly = async () => [];
    reminderService.getRemindersForElderly = async () => [];

    // Helper to calculate expected time greeting
    const hour = new Date().getHours();
    let expectedTimeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) expectedTimeGreeting = 'Good afternoon';
    else if (hour >= 17 || hour < 5) expectedTimeGreeting = 'Good evening';

    // -------------------------------------------------------------------------
    // TEST 1: Male Senior User -> "[Real Name] Baba"
    // -------------------------------------------------------------------------
    userService.getUserById = async () => ({
      id: 'usr_male_1',
      name: 'Aryan',
      email: 'aryan@example.com',
      gender: 'male'
    });
    profileService.getProfile = async () => ({
      elderlyUserId: 'usr_male_1',
      displayName: 'Aryan',
      gender: 'male',
      preferredLanguage: 'en'
    });

    const maleExp = await previewService.getElderlyExperience('usr_male_1');
    
    assert.strictEqual(maleExp.displayName, 'Aryan Baba', `Expected 'Aryan Baba', got '${maleExp.displayName}'`);
    assert.strictEqual(maleExp.greeting, `${expectedTimeGreeting}, Aryan Baba ❤️`, `Expected '${expectedTimeGreeting}, Aryan Baba ❤️', got '${maleExp.greeting}'`);
    assert(!maleExp.displayName.startsWith('Baba '), 'Title must not precede user name');
    assert(!maleExp.greeting.includes('Elderly User'), 'Must never show generic Elderly User');
    console.log(`✅ 1. Male Senior Identity Test:`);
    console.log(`   - Display Name: "${maleExp.displayName}"`);
    console.log(`   - Greeting: "${maleExp.greeting}"`);

    // -------------------------------------------------------------------------
    // TEST 2: Female Senior User -> "[Real Name] Maa" (Spelling: M-a-a)
    // -------------------------------------------------------------------------
    userService.getUserById = async () => ({
      id: 'usr_female_1',
      name: 'Sruti',
      email: 'sruti@example.com',
      gender: 'female'
    });
    profileService.getProfile = async () => ({
      elderlyUserId: 'usr_female_1',
      displayName: 'Sruti',
      gender: 'female',
      preferredLanguage: 'en'
    });

    const femaleExp = await previewService.getElderlyExperience('usr_female_1');

    assert.strictEqual(femaleExp.displayName, 'Sruti Maa', `Expected 'Sruti Maa', got '${femaleExp.displayName}'`);
    assert.strictEqual(femaleExp.greeting, `${expectedTimeGreeting}, Sruti Maa ❤️`, `Expected '${expectedTimeGreeting}, Sruti Maa ❤️', got '${femaleExp.greeting}'`);
    assert(!femaleExp.displayName.startsWith('Maa '), 'Title must not precede user name');
    assert(!femaleExp.displayName.endsWith('Ma') || femaleExp.displayName.endsWith('Maa'), 'Title must be spelled Maa (M-a-a)');
    assert(!femaleExp.greeting.includes('Elderly User'), 'Must never show generic Elderly User');
    console.log(`\n✅ 2. Female Senior Identity Test:`);
    console.log(`   - Display Name: "${femaleExp.displayName}"`);
    console.log(`   - Greeting: "${femaleExp.greeting}"`);

    // -------------------------------------------------------------------------
    // TEST 3: Unspecified Gender -> Neutral "[Real Name]" (No guessing)
    // -------------------------------------------------------------------------
    userService.getUserById = async () => ({
      id: 'usr_neutral_1',
      name: 'Nahida',
      email: 'nahida@example.com',
      gender: ''
    });
    profileService.getProfile = async () => ({
      elderlyUserId: 'usr_neutral_1',
      displayName: 'Nahida',
      gender: '',
      preferredLanguage: 'en'
    });

    const neutralExp = await previewService.getElderlyExperience('usr_neutral_1');

    assert.strictEqual(neutralExp.displayName, 'Nahida', `Expected neutral 'Nahida', got '${neutralExp.displayName}'`);
    assert.strictEqual(neutralExp.greeting, `${expectedTimeGreeting}, Nahida ❤️`, `Expected '${expectedTimeGreeting}, Nahida ❤️', got '${neutralExp.greeting}'`);
    assert(!neutralExp.displayName.includes('Baba') && !neutralExp.displayName.includes('Maa'), 'Must not guess gender');
    assert(!neutralExp.greeting.includes('Elderly User'), 'Must never show generic Elderly User');
    console.log(`\n✅ 3. Neutral Senior Identity Test (No Guessing):`);
    console.log(`   - Display Name: "${neutralExp.displayName}"`);
    console.log(`   - Greeting: "${neutralExp.greeting}"`);

    // -------------------------------------------------------------------------
    // TEST 4: Email fallback when profile name is generic placeholder
    // -------------------------------------------------------------------------
    userService.getUserById = async () => ({
      id: 'usr_placeholder_1',
      name: 'Elderly User',
      email: 'hrithik@example.com',
      gender: 'male'
    });
    profileService.getProfile = async () => ({
      elderlyUserId: 'usr_placeholder_1',
      displayName: 'Elderly User',
      gender: 'male',
      preferredLanguage: 'en'
    });

    const placeholderExp = await previewService.getElderlyExperience('usr_placeholder_1');

    assert.strictEqual(placeholderExp.displayName, 'Hrithik Baba', `Expected 'Hrithik Baba', got '${placeholderExp.displayName}'`);
    assert(!placeholderExp.greeting.includes('Elderly User'), 'Must discard placeholder Elderly User');
    console.log(`\n✅ 4. Placeholder Discard & Email Fallback Test:`);
    console.log(`   - Display Name: "${placeholderExp.displayName}"`);
    console.log(`   - Greeting: "${placeholderExp.greeting}"`);

    // -------------------------------------------------------------------------
    // TEST 5: Talk & Recall Reminiscence Prompt Greeting Formatting
    // -------------------------------------------------------------------------
    userService.getUserById = async () => ({
      id: 'usr_prompt_1',
      name: 'Aryan',
      email: 'aryan@example.com',
      gender: 'male'
    });
    profileService.getProfile = async () => ({
      elderlyUserId: 'usr_prompt_1',
      displayName: 'Aryan',
      gender: 'male',
      preferredLanguage: 'en'
    });

    const promptRes = await conversationReminiscenceService.getOpeningPrompt('usr_prompt_1', 'usr_prompt_1', 'en');
    assert(promptRes.promptText.includes('Aryan Baba'), `Prompt must include 'Aryan Baba', got: "${promptRes.promptText}"`);
    assert(!promptRes.promptText.includes('Baba Aryan'), `Prompt must NOT say 'Baba Aryan'`);
    console.log(`\n✅ 5. Talk & Recall Prompt Integration Test:`);
    console.log(`   - Prompt Text: "${promptRes.promptText}"`);

    console.log('\n==================================================');
    console.log('🎉 ALL SENIOR IDENTITY UNIT TESTS PASSED 100%!');
    console.log('==================================================\n');
  } finally {
    // Restore original service methods
    userService.getUserById = origGetUserById;
    profileService.getProfile = origGetProfile;
    familyService.getFamilyForElderly = origGetFamily;
    mediaService.getMemoriesForElderly = origGetMemories;
    routineService.getRoutineForElderly = origGetRoutine;
    reminderService.getRemindersForElderly = origGetReminders;
  }
}

runUnitTests().catch(err => {
  console.error('\n❌ Senior Identity Unit Test Failed:', err);
  process.exit(1);
});
