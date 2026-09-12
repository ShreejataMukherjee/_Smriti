/**
 * SMRITI ACTIVITY GENERATOR SERVICE
 * Dynamically synthesizes personalized cognitive tasks from real elderly profile data,
 * family dataset, face associations from Vision API, daily routines, media vault, and NER cultural anchors.
 * Supports personalized "Who Is This?", "Remember This Photo", "What Comes Next?", and core games.
 */

import { familyService } from './family-service.js';
import { routineService } from './routine-service.js';
import { mediaService } from './media-service.js';
import { profileService } from './profile-service.js';
import { faceAssociationService } from './face-association.service.js';
import { createCognitiveActivityModel } from '../models/cognitive-activity.model.js';
import { CULTURAL_ANCHORS, LOCALIZED_STRINGS } from '../utils/cultural-dataset.js';
import { logger } from '../utils/logger.js';

export const activityGeneratorService = {
  /**
   * Generates a complete personalized pack of cognitive activities for an elderly user
   */
  async generateActivityPack(elderlyUserId, callerId, options = {}) {
    logger.info('Generating personalized activity pack', { elderlyUserId });

    // 1. Fetch real elderly profile, family members, face associations, routines, and media
    let profile = null;
    try {
      profile = await profileService.getProfile(elderlyUserId, callerId);
    } catch (e) {
      logger.warn('Profile fetch fallback in activity generator', { error: e.message });
      profile = { preferredLanguage: options.language || 'as' };
    }

    const lang = options.language || profile?.preferredLanguage || 'as';
    const activeLang = LOCALIZED_STRINGS[lang] ? lang : 'en';
    const i18n = LOCALIZED_STRINGS[activeLang] || LOCALIZED_STRINGS.en;

    let familyMembers = [];
    let faceAssociations = [];
    let routines = [];
    let memories = [];

    try {
      familyMembers = await familyService.getFamilyForElderly(elderlyUserId);
    } catch (e) {
      logger.warn('Failed to fetch family members for activity generation', { error: e.message });
    }

    try {
      faceAssociations = await faceAssociationService.getAssociationsForElderly(elderlyUserId, callerId);
    } catch (e) {
      logger.warn('Failed to fetch face associations for activity generation', { error: e.message });
    }

    try {
      routines = await routineService.getRoutineForElderly(elderlyUserId);
    } catch (e) {
      logger.warn('Failed to fetch routines for activity generation', { error: e.message });
    }

    try {
      memories = await mediaService.getMemoriesForElderly(elderlyUserId, callerId);
    } catch (e) {
      logger.warn('Failed to fetch memories for activity generation', { error: e.message });
    }

    const difficulty = typeof options.difficulty === 'number' ? options.difficulty : 1;
    const activities = [];

    // =========================================================================
    // 1. MEMORY: Who Is This? (Personalized Face Detection & Family Recognition)
    // =========================================================================
    if (faceAssociations.length > 0) {
      // Pick a real face association labeled by the caretaker
      const targetFace = faceAssociations[Math.floor(Math.random() * faceAssociations.length)];
      const matchingMemory = memories.find(m => m.id === targetFace.photoId);

      // Build real family distractors
      const otherFamily = familyMembers.filter(m => m.id !== targetFace.personId && m.name !== targetFace.personName);
      const otherFaces = faceAssociations.filter(f => f.personName !== targetFace.personName);

      let wrongChoices = [];
      if (otherFamily.length > 0) {
        wrongChoices = otherFamily.map(m => `${m.name}${m.relationship ? ` (${m.relationship})` : ''}`);
      } else if (otherFaces.length > 0) {
        wrongChoices = Array.from(new Set(otherFaces.map(f => `${f.personName}${f.relationship ? ` (${f.relationship})` : ''}`)));
      } else {
        wrongChoices = [
          activeLang === 'as' ? 'হৃষিত (নাতি)' : activeLang === 'hi' ? 'हृषित (पोता)' : 'Hrisit (Grandson)',
          activeLang === 'as' ? 'শ্ৰীজাতা (কন্যা)' : activeLang === 'hi' ? 'श्रीजाता (बेटी)' : 'Shreejata (Daughter)',
          activeLang === 'as' ? 'হৃতিক (পৰিয়াল)' : activeLang === 'hi' ? 'ऋतिक (परिवार)' : 'Hrithik (Family)'
        ];
      }

      const correctText = `${targetFace.personName}${targetFace.relationship ? ` (${targetFace.relationship})` : ''}`;
      const optionCount = difficulty > 2 ? 3 : 2;

      const optionsList = [
        { id: 'opt_face_c', text: correctText, isCorrect: true },
        ...wrongChoices.slice(0, optionCount).map((text, idx) => ({
          id: `opt_face_w_${idx}`,
          text,
          isCorrect: false
        }))
      ].sort(() => Math.random() - 0.5);

      activities.push(createCognitiveActivityModel({
        activityId: `act_face_${targetFace.id}`,
        category: 'memory',
        subType: 'who_is_this',
        difficulty,
        language: activeLang,
        prompt: i18n.prompts.whoIsThis || (activeLang === 'as' ? 'এই ফটোত থকা ব্যক্তিগৰাকী কোন হয়?' : activeLang === 'hi' ? 'इस तस्वीर में मौजूद व्यक्ति कौन हैं?' : 'Who is this beloved person?'),
        instructions: i18n.instructions.family_recognition,
        media: {
          type: 'photo',
          url: matchingMemory?.runtimeUrl || null,
          boundingBox: targetFace.boundingBox,
          symbol: '📸',
          caption: targetFace.personName
        },
        options: optionsList,
        correctAnswer: correctText,
        hints: targetFace.relationship ? [`Think about your ${targetFace.relationship}.`] : ['A beloved family member in your album.'],
        metadata: {
          source: 'face_association',
          faceId: targetFace.id,
          photoId: targetFace.photoId,
          personId: targetFace.personId,
          personName: targetFace.personName,
          relationship: targetFace.relationship,
          boundingBox: targetFace.boundingBox
        }
      }));
    } else if (familyMembers.length > 0) {
      // Fallback to family member avatar/photo if no face associations exist yet
      const targetMember = familyMembers[Math.floor(Math.random() * familyMembers.length)];
      const distractorMembers = familyMembers.filter(m => m.id !== targetMember.id);
      
      const wrongNames = distractorMembers.length > 0
        ? distractorMembers.map(m => `${m.name} (${m.relationship})`)
        : [
            activeLang === 'as' ? 'হৃষিত (নাতি)' : activeLang === 'hi' ? 'हृषित (पोता)' : 'Hrisit (Grandson)',
            activeLang === 'as' ? 'শ্ৰীজাতা (কন্যা)' : activeLang === 'hi' ? 'श्रीजाता (बेटी)' : 'Shreejata (Daughter)',
            activeLang === 'as' ? 'হৃতিক (পৰিয়াল)' : activeLang === 'hi' ? 'ऋतिक (परिवार)' : 'Hrithik (Family)'
          ];

      const optionsList = [
        { id: 'opt_correct', text: `${targetMember.name} (${targetMember.relationship})`, isCorrect: true },
        ...wrongNames.slice(0, difficulty > 2 ? 3 : 2).map((nameText, idx) => ({
          id: `opt_dist_${idx}`,
          text: nameText,
          isCorrect: false
        }))
      ].sort(() => Math.random() - 0.5);

      activities.push(createCognitiveActivityModel({
        activityId: `act_fam_${targetMember.id}`,
        category: 'memory',
        subType: 'who_is_this',
        difficulty,
        language: activeLang,
        prompt: i18n.prompts.whoIsThis,
        instructions: i18n.instructions.family_recognition,
        media: {
          type: targetMember.avatarUrl ? 'photo' : 'avatar',
          url: targetMember.avatarUrl || null,
          symbol: targetMember.avatar || '👵',
          caption: targetMember.relationship
        },
        options: optionsList,
        correctAnswer: `${targetMember.name} (${targetMember.relationship})`,
        hints: targetMember.personalNotes ? [targetMember.personalNotes] : [`Think about your ${targetMember.relationship}.`],
        metadata: { source: 'family_dataset', targetId: targetMember.id, personId: targetMember.id, name: targetMember.name, relationship: targetMember.relationship }
      }));
    } else {
      // Missing data state when no family members or face tags exist yet
      activities.push(createCognitiveActivityModel({
        activityId: `act_who_empty_${Date.now()}`,
        category: 'memory',
        subType: 'who_is_this',
        difficulty: 1,
        language: activeLang,
        prompt: activeLang === 'as' ? 'পৰিয়ালৰ চিনাকি খেল আৰম্ভ কৰিবলৈ পৰিয়ালৰ সদস্য যোগ কৰক।' : activeLang === 'hi' ? 'पहचान खेल शुरू करने के लिए परिवार के सदस्य जोड़ें।' : 'Add family members to create personalized recognition games.',
        instructions: activeLang === 'as' ? 'আপোনাৰ যত্নলোঁতাই কেয়াৰটেকাৰ ষ্টুডিঅ\'ত পৰিয়ালৰ সদস্য যোগ কৰিব পাৰে।' : activeLang === 'hi' ? 'आपके देखभालकर्ता केयरटेकर स्टूडियो में परिवार के सदस्य जोड़ सकते हैं।' : 'Your caretaker can add beloved family members in Caretaker Studio.',
        media: {
          type: 'icon',
          symbol: '👨‍👩‍👧‍👦',
          caption: 'Family Recognition'
        },
        options: [
          { id: 'opt_who_ack', text: activeLang === 'as' ? 'বুজি পালোঁ 🌸' : activeLang === 'hi' ? 'समझ गया 🌸' : 'Understood 🌸', isCorrect: true }
        ],
        correctAnswer: 'Understood',
        hints: ['Ask your caretaker to add family members in Caretaker Studio.']
      }));
    }

    // =========================================================================
    // 2. MEMORY: Remember This Photo (Photo Recall with real metadata & people)
    // =========================================================================
    const photos = memories.filter(m => m.type === 'photo');
    if (photos.length > 0) {
      const targetPhoto = photos[Math.floor(Math.random() * photos.length)];
      const photoFaces = faceAssociations.filter(fa => fa.photoId === targetPhoto.id);
      
      if (photoFaces.length > 0) {
        const taggedPerson = photoFaces[0];
        const otherFamily = familyMembers.filter(m => m.name !== taggedPerson.personName);

        const wrongChoices = otherFamily.length > 0
          ? otherFamily.map(m => `${m.name}${m.relationship ? ` (${m.relationship})` : ''}`)
          : [
              activeLang === 'as' ? 'হৃষিত (নাতি)' : activeLang === 'hi' ? 'हृषित (पोता)' : 'Hrisit (Grandson)',
              activeLang === 'as' ? 'শ্ৰীজাতা (কন্যা)' : activeLang === 'hi' ? 'श्रीजाता (बेटी)' : 'Shreejata (Daughter)'
            ];

        const correctAns = `${taggedPerson.personName}${taggedPerson.relationship ? ` (${taggedPerson.relationship})` : ''}`;

        activities.push(createCognitiveActivityModel({
          activityId: `act_photo_person_${targetPhoto.id}`,
          category: 'memory',
          subType: 'remember_photo',
          difficulty,
          language: activeLang,
          prompt: activeLang === 'as' ? 'এই স্মৃতিৰ ছবিখনত কোন আছে?' : activeLang === 'hi' ? 'इस स्मृति चित्र में आपके साथ कौन हैं?' : 'Who was with you in this cherished memory photo?',
          instructions: i18n.instructions.photo_recall,
          media: {
            type: 'photo',
            url: targetPhoto.runtimeUrl,
            symbol: '📸',
            caption: targetPhoto.title
          },
          options: [
            { id: 'opt_c', text: correctAns, isCorrect: true },
            ...wrongChoices.slice(0, difficulty > 2 ? 3 : 2).map((w, idx) => ({
              id: `opt_w_${idx}`,
              text: w,
              isCorrect: false
            }))
          ].sort(() => Math.random() - 0.5),
          correctAnswer: correctAns,
          hints: [`Look closely at the photo taken during "${targetPhoto.title}".`]
        }));
      } else {
        activities.push(createCognitiveActivityModel({
          activityId: `act_photo_${targetPhoto.id}`,
          category: 'memory',
          subType: 'remember_photo',
          difficulty,
          language: activeLang,
          prompt: i18n.prompts.photoRecall || (activeLang === 'as' ? 'এই ছবিখন মনত পেলাই চাওক — ই কিহৰ স্মৃতি?' : activeLang === 'hi' ? 'इस तस्वीर को याद करें — यह किस अवसर की है?' : 'Recall this cherished moment — what event is this?'),
          instructions: i18n.instructions.photo_recall,
          media: {
            type: 'photo',
            url: targetPhoto.runtimeUrl,
            symbol: '📸',
            caption: targetPhoto.title
          },
          options: [
            { id: 'opt_c', text: targetPhoto.title || 'Family Celebration', isCorrect: true },
            { id: 'opt_d1', text: activeLang === 'as' ? 'বজাৰৰ যাত্ৰা' : activeLang === 'hi' ? 'बाज़ार का सफर' : 'Market Visit', isCorrect: false },
            { id: 'opt_d2', text: activeLang === 'as' ? 'পুৰণি কাৰ্যালয়' : activeLang === 'hi' ? 'पुराना कार्यालय' : 'Old Office', isCorrect: false },
            ...(difficulty > 2 ? [{ id: 'opt_d3', text: activeLang === 'as' ? 'বিদ্যালয়ৰ অনুষ্ঠান' : activeLang === 'hi' ? 'स्कूल का कार्यक्रम' : 'School Event', isCorrect: false }] : [])
          ].sort(() => Math.random() - 0.5),
          correctAnswer: targetPhoto.title || 'Family Celebration',
          hints: [targetPhoto.description || 'A cherished personal memory from your vault.']
        }));
      }
    } else {
      // Missing data state when no photos exist in media vault
      activities.push(createCognitiveActivityModel({
        activityId: `act_photo_empty_${Date.now()}`,
        category: 'memory',
        subType: 'remember_photo',
        difficulty: 1,
        language: activeLang,
        prompt: activeLang === 'as' ? 'আপোনাৰ স্মৃতি ভঁৰালত কোনো ফটো এতিয়ালৈকে যোগ কৰা হোৱা নাই।' : activeLang === 'hi' ? 'आपकी फोटो वॉल्ट में अभी तक कोई फोटो नहीं जोड़ी गई है।' : 'No photo memories have been added to your vault yet.',
        instructions: activeLang === 'as' ? 'আপোনাৰ যত্নলোঁতাই স্মৃতি ভঁৰালত ফটো তুলিব পাৰে।' : activeLang === 'hi' ? 'आपके देखभालकर्ता आपकी फोटो वॉल्ट में तस्वीरें जोड़ सकते हैं।' : 'Your caretaker can upload cherished photos in Caretaker Studio.',
        media: {
          type: 'icon',
          symbol: '📸',
          caption: 'Photo Memories'
        },
        options: [
          { id: 'opt_photo_ack', text: activeLang === 'as' ? 'বুজি পালোঁ 🌸' : activeLang === 'hi' ? 'समझ गया 🌸' : 'Understood 🌸', isCorrect: true }
        ],
        correctAnswer: 'Understood',
        hints: ['Ask your caretaker to upload photos in Caretaker Studio.']
      }));
    }

    // =========================================================================
    // 3. MEMORY: Memory Match (Interactive Person ↔ Relationship Matching)
    // =========================================================================
    if (familyMembers.length >= 2) {
      const mem1 = familyMembers[0];
      const mem2 = familyMembers[1];
      activities.push(createCognitiveActivityModel({
        activityId: `act_match_${mem1.id}_${mem2.id}`,
        category: 'memory',
        subType: 'memory_match',
        difficulty,
        language: activeLang,
        prompt: activeLang === 'as' ? `${mem1.name}ৰ সৈতে তেওঁৰ সম্পৰ্ক মিলাওক` : activeLang === 'hi' ? `${mem1.name} के साथ उनके रिश्ते का सही मिलान करें` : `Match ${mem1.name} with their relationship`,
        instructions: i18n.instructions.memory_match,
        media: {
          type: 'avatar',
          url: mem1.avatarUrl || null,
          symbol: mem1.avatar || '👨‍👩‍👧',
          caption: mem1.name
        },
        options: [
          { id: 'opt_match_c', text: `${mem1.name} ➔ ${mem1.relationship}`, isCorrect: true },
          { id: 'opt_match_w1', text: `${mem1.name} ➔ ${mem2.relationship}`, isCorrect: false },
          { id: 'opt_match_w2', text: `${mem1.name} ➔ ${activeLang === 'as' ? 'চুবুৰীয়া' : activeLang === 'hi' ? 'पड़ोसी' : 'Neighbor'}`, isCorrect: false }
        ].sort(() => Math.random() - 0.5),
        correctAnswer: `${mem1.name} ➔ ${mem1.relationship}`,
        hints: [`${mem1.name} is your ${mem1.relationship}.`]
      }));
    }

    // =========================================================================
    // 4. ATTENTION: Find the Odd One (Visual discrimination)
    // =========================================================================
    const oddSets = [
      { set: ['🍃', '🍃', '🍃', '🌸', '🍃'], odd: '🌸', nameOdd: activeLang === 'as' ? 'ফুল 🌸' : activeLang === 'hi' ? 'फूल 🌸' : 'Flower 🌸' },
      { set: ['☕', '☕', '🍵', '☕', '☕'], odd: '🍵', nameOdd: activeLang === 'as' ? 'সেউজ চাহ 🍵' : activeLang === 'hi' ? 'हरी चाय 🍵' : 'Green Bowl 🍵' },
      { set: ['🍎', '🍎', '🍐', '🍎', '🍎'], odd: '🍐', nameOdd: activeLang === 'as' ? 'নাশপতি 🍐' : activeLang === 'hi' ? 'नाशपाती 🍐' : 'Pear 🍐' },
      { set: ['●', '●', '▲', '●', '●'], odd: '▲', nameOdd: activeLang === 'as' ? 'ত্ৰিভুজ ▲' : activeLang === 'hi' ? 'त्रिकोण ▲' : 'Triangle ▲' }
    ];
    const selectedOdd = oddSets[Math.floor(Math.random() * oddSets.length)];
    
    activities.push(createCognitiveActivityModel({
      activityId: `act_odd_${Date.now()}`,
      category: 'attention',
      subType: 'odd_one_out',
      difficulty,
      language: activeLang,
      prompt: activeLang === 'as' ? 'কোনটো বস্তু আনবোৰতকৈ পৃথক?' : activeLang === 'hi' ? 'इनमें से कौन सा प्रतीक अलग है?' : 'Which item is different from the rest?',
      instructions: i18n.instructions.distractor_spotting || i18n.instructions.visual_attention,
      media: {
        type: 'icon',
        symbol: selectedOdd.set.join('  '),
        caption: selectedOdd.set.join(' ')
      },
      options: [
        { id: 'opt_odd_c', text: selectedOdd.nameOdd, isCorrect: true },
        { id: 'opt_odd_w1', text: selectedOdd.set[0] + ' ' + (activeLang === 'as' ? 'আনবোৰ' : activeLang === 'hi' ? 'अन्य' : 'Normal item'), isCorrect: false }
      ].sort(() => Math.random() - 0.5),
      correctAnswer: selectedOdd.nameOdd,
      hints: ['Look closely for the single shape or color that does not match.']
    }));

    // =========================================================================
    // 5. ATTENTION: Complete the Pattern
    // =========================================================================
    const patterns = [
      { pattern: '🌸 🍃 🌸 🍃 ?', answer: '🌸', name: activeLang === 'as' ? 'ফুল 🌸' : activeLang === 'hi' ? 'फूल 🌸' : 'Flower 🌸' },
      { pattern: '☀️ 🌙 ☀️ 🌙 ?', answer: '☀️', name: activeLang === 'as' ? 'সূৰ্য ☀️' : activeLang === 'hi' ? 'सूरज ☀️' : 'Sun ☀️' },
      { pattern: '🔴 🔵 🔴 🔵 ?', answer: '🔴', name: activeLang === 'as' ? 'ৰঙা 🔴' : activeLang === 'hi' ? 'लाल 🔴' : 'Red Circle 🔴' }
    ];
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];

    activities.push(createCognitiveActivityModel({
      activityId: `act_pat_${Date.now()}`,
      category: 'attention',
      subType: 'pattern_completion',
      difficulty,
      language: activeLang,
      prompt: activeLang === 'as' ? 'আৰ্হিটো সম্পূৰ্ণ কৰিবলৈ কি বহিব?' : activeLang === 'hi' ? 'पैटर्न पूरा करने के लिए अगला क्या आएगा?' : 'What comes next to complete the pattern?',
      instructions: i18n.instructions.pattern_recognition,
      media: {
        type: 'icon',
        symbol: selectedPattern.pattern,
        caption: selectedPattern.pattern
      },
      options: [
        { id: 'opt_pat_c', text: selectedPattern.name, isCorrect: true },
        { id: 'opt_pat_w1', text: activeLang === 'as' ? 'বেলেগ বস্তু ⭐' : activeLang === 'hi' ? 'तारा ⭐' : 'Star ⭐', isCorrect: false }
      ].sort(() => Math.random() - 0.5),
      correctAnswer: selectedPattern.name,
      hints: ['Notice the repeating order from left to right.']
    }));

    // =========================================================================
    // 6. ROUTINE RECALL: What Comes Next? (Sequential routine recall with real routine data)
    // =========================================================================
    if (routines.length >= 2) {
      const idx = Math.floor(Math.random() * (routines.length - 1));
      const firstRoutine = routines[idx];
      const secondRoutine = routines[idx + 1];

      activities.push(createCognitiveActivityModel({
        activityId: `act_rout_${firstRoutine.id}`,
        category: 'routine_recall',
        subType: 'what_comes_next',
        difficulty,
        language: activeLang,
        prompt: `${activeLang === 'as' ? `"${firstRoutine.activityName || firstRoutine.title}" ৰ পিছত কি নিয়ম আছে?` : activeLang === 'hi' ? `"${firstRoutine.activityName || firstRoutine.title}" के बाद आपकी क्या दिनचर्या है?` : `What comes after "${firstRoutine.activityName || firstRoutine.title}"?`}`,
        instructions: i18n.instructions.routine_recall,
        media: {
          type: 'icon',
          symbol: firstRoutine.icon || '⏰',
          caption: `${firstRoutine.time} - ${firstRoutine.activityName || firstRoutine.title}`
        },
        options: [
          { id: 'opt_next', text: `${secondRoutine.time} - ${secondRoutine.activityName || secondRoutine.title}`, isCorrect: true },
          { id: 'opt_fake1', text: activeLang === 'as' ? '১১:০০ নিশাৰ শোৱা' : activeLang === 'hi' ? '11:00 रात की नींद' : '11:00 PM - Night Sleep', isCorrect: false },
          ...(difficulty > 2 ? [{ id: 'opt_fake2', text: activeLang === 'as' ? '০৩:০০ পুৱাৰ খোজ' : activeLang === 'hi' ? '03:00 सुबह की सैर' : '03:00 AM - Midnight Walk', isCorrect: false }] : [])
        ].sort(() => Math.random() - 0.5),
        correctAnswer: `${secondRoutine.time} - ${secondRoutine.activityName || secondRoutine.title}`,
        hints: [`It happens at ${secondRoutine.time}.`]
      }));
    } else if (routines.length === 1) {
      const singleRoutine = routines[0];
      activities.push(createCognitiveActivityModel({
        activityId: `act_rout_${singleRoutine.id}`,
        category: 'routine_recall',
        subType: 'what_comes_next',
        difficulty,
        language: activeLang,
        prompt: `${activeLang === 'as' ? `${singleRoutine.time} বজাত আপোনাৰ কি কাৰ্যসূচী আছে?` : activeLang === 'hi' ? `${singleRoutine.time} पर आपकी कौन सी दिनचर्या है?` : `What is scheduled at ${singleRoutine.time}?`}`,
        instructions: i18n.instructions.routine_recall,
        media: {
          type: 'icon',
          symbol: singleRoutine.icon || '⏰',
          caption: singleRoutine.time
        },
        options: [
          { id: 'opt_rout_c', text: singleRoutine.activityName || singleRoutine.title, isCorrect: true },
          { id: 'opt_rout_w1', text: activeLang === 'as' ? 'নিশাৰ শুই থকা' : activeLang === 'hi' ? 'रात की नींद' : 'Night Sleep', isCorrect: false }
        ].sort(() => Math.random() - 0.5),
        correctAnswer: singleRoutine.activityName || singleRoutine.title,
        hints: [`A daily routine activity planned for ${singleRoutine.time}.`]
      }));
    } else {
      // Gentle notice when no routine exists without fabricating false routines
      activities.push(createCognitiveActivityModel({
        activityId: `act_rout_empty_${Date.now()}`,
        category: 'routine_recall',
        subType: 'what_comes_next',
        difficulty: 1,
        language: activeLang,
        prompt: activeLang === 'as' ? 'আপোনাৰ যত্নলোঁতাই এতিয়ালৈকে কোনো নিয়মসূচী যোগ কৰা নাই।' : activeLang === 'hi' ? 'आपके देखभालकर्ता ने अभी तक कोई दिनचर्या नहीं जोड़ी है।' : 'Your caretaker has not added a routine yet.',
        instructions: activeLang === 'as' ? 'যত্নলোঁতাই দিনচৰ্যা যোগ কৰিলে ইয়াত অনুশীলন দেখিব।' : activeLang === 'hi' ? 'देखभालकर्ता द्वारा दिनचर्या जोड़ने पर अभ्यास दिखाई देगा।' : 'Routine exercises will appear once your caretaker sets up your schedule.',
        media: {
          type: 'icon',
          symbol: '🌅',
          caption: 'Daily Routine'
        },
        options: [
          { id: 'opt_rout_ack', text: activeLang === 'as' ? 'বুজি পালোঁ 🌸' : activeLang === 'hi' ? 'समझ गया 🌸' : 'Understood 🌸', isCorrect: true }
        ],
        correctAnswer: 'Understood',
        hints: ['Ask your caretaker to schedule your daily activities in Caretaker Studio.']
      }));
    }

    // =========================================================================
    // 7. RECOGNITION: Familiar Objects (NER Cultural & daily objects)
    // =========================================================================
    const objItem = CULTURAL_ANCHORS.objects[Math.floor(Math.random() * CULTURAL_ANCHORS.objects.length)];
    const otherObjs = CULTURAL_ANCHORS.objects.filter(o => o.id !== objItem.id);

    activities.push(createCognitiveActivityModel({
      activityId: `act_obj_${objItem.id}`,
      category: 'pattern_recognition',
      subType: 'familiar_objects',
      difficulty,
      language: activeLang,
      prompt: i18n.prompts.whichObjectIsThis,
      instructions: i18n.instructions.object_recognition,
      media: {
        type: 'icon',
        symbol: objItem.symbol,
        caption: objItem.names[activeLang] || objItem.names.en
      },
      options: [
        { id: 'opt_obj_c', text: objItem.names[activeLang] || objItem.names.en, isCorrect: true },
        { id: 'opt_obj_w1', text: otherObjs[0]?.names[activeLang] || otherObjs[0]?.names.en || 'Television', isCorrect: false },
        ...(difficulty > 2 ? [{ id: 'opt_obj_w2', text: activeLang === 'as' ? 'মটৰ গাড়ী' : activeLang === 'hi' ? 'मोटर गाड़ी' : 'Motor Car', isCorrect: false }] : [])
      ].sort(() => Math.random() - 0.5),
      correctAnswer: objItem.names[activeLang] || objItem.names.en,
      hints: ['A traditional heritage object used across North Eastern homes.']
    }));

    // =========================================================================
    // 8. RECOGNITION: Recognize the Place (NER Landscapes & memory locations)
    // =========================================================================
    const landmark = CULTURAL_ANCHORS.landmarks[Math.floor(Math.random() * CULTURAL_ANCHORS.landmarks.length)];
    const wrongLandmarks = CULTURAL_ANCHORS.landmarks.filter(l => l.id !== landmark.id);

    activities.push(createCognitiveActivityModel({
      activityId: `act_place_${landmark.id}`,
      category: 'pattern_recognition',
      subType: 'recognize_place',
      difficulty,
      language: activeLang,
      prompt: i18n.prompts.whichPlaceIsThis,
      instructions: i18n.instructions.place_recognition,
      media: {
        type: 'icon',
        symbol: landmark.symbol,
        caption: landmark.names[activeLang] || landmark.names.en
      },
      options: [
        { id: 'opt_l_corr', text: landmark.names[activeLang] || landmark.names.en, isCorrect: true },
        { id: 'opt_l_w1', text: wrongLandmarks[0]?.names[activeLang] || wrongLandmarks[0]?.names.en || 'Desert Dunes', isCorrect: false },
        ...(difficulty > 2 ? [{ id: 'opt_l_w2', text: wrongLandmarks[1]?.names[activeLang] || wrongLandmarks[1]?.names.en || 'Snow Glacier', isCorrect: false }] : [])
      ].sort(() => Math.random() - 0.5),
      correctAnswer: landmark.names[activeLang] || landmark.names.en,
      hints: [landmark.hint[activeLang] || landmark.hint.en]
    }));

    // =========================================================================
    // 9. MUSIC & MEMORY: Which Song Is This? (Audio snippet recall)
    // =========================================================================
    const audios = memories.filter(m => m.type === 'audio');
    if (audios.length > 0) {
      const audioTrack = audios[0];
      const songName = audioTrack.title || 'Regional Melody';

      activities.push(createCognitiveActivityModel({
        activityId: `act_song_${audioTrack.id}`,
        category: 'emotional_engagement',
        subType: 'which_song',
        difficulty: 1,
        language: activeLang,
        prompt: activeLang === 'as' ? 'এই সুৰটো কি গীতৰ হয়?' : activeLang === 'hi' ? 'यह कौन सी धुन या गीत है?' : 'Which song or melody is this?',
        instructions: activeLang === 'as' ? 'সুৰটো শুনক আৰু সঠিক নাম বাছক' : activeLang === 'hi' ? 'धुन सुनें और सही नाम चुनें' : 'Listen to the audio and choose the song title',
        media: {
          type: 'audio',
          url: audioTrack.runtimeUrl,
          symbol: '🎵',
          caption: songName
        },
        options: [
          { id: 'opt_song_c', text: songName, isCorrect: true },
          { id: 'opt_song_w1', text: activeLang === 'as' ? 'আধুনিক ডিস্কো গীত' : activeLang === 'hi' ? 'आधुनिक डिस्को गीत' : 'Modern Disco Song', isCorrect: false },
          { id: 'opt_song_w2', text: activeLang === 'as' ? 'দ্ৰুত ৰক বেণ্ড' : activeLang === 'hi' ? 'रॉक बैंड संगीत' : 'Fast Rock Band', isCorrect: false }
        ].sort(() => Math.random() - 0.5),
        correctAnswer: songName,
        hints: ['A soothing, nostalgic regional tune.']
      }));
    } else {
      activities.push(createCognitiveActivityModel({
        activityId: `act_song_empty_${Date.now()}`,
        category: 'emotional_engagement',
        subType: 'which_song',
        difficulty: 1,
        language: activeLang,
        prompt: activeLang === 'as' ? 'এতিয়ালৈকে কোনো গীত যোগ কৰা হোৱা নাই।' : activeLang === 'hi' ? 'अभी तक कोई गाना नहीं जोड़ा गया है।' : 'No songs have been added yet.',
        instructions: activeLang === 'as' ? 'আপোনাৰ যত্নলোঁতাই প্ৰিয় গীত যোগ কৰিব পাৰে।' : activeLang === 'hi' ? 'देखभालकर्ता पसंदीदा गाने जोड़ सकते हैं।' : 'Your caretaker can add favorite regional songs in Caretaker Studio.',
        media: {
          type: 'icon',
          symbol: '🎵',
          caption: 'Music Vault'
        },
        options: [
          { id: 'opt_song_ack', text: activeLang === 'as' ? 'বুজি পালোঁ 🌸' : activeLang === 'hi' ? 'समझ गया 🌸' : 'Understood 🌸', isCorrect: true }
        ],
        correctAnswer: 'Understood',
        hints: ['Ask your caretaker to upload nostalgic regional songs in Caretaker Studio.']
      }));
    }

    // =========================================================================
    // 10. EMOTIONAL / REMINISCENCE: Recall & Remember (Gentle conversation prompt)
    // =========================================================================
    activities.push(createCognitiveActivityModel({
      activityId: `act_reminisce_${Date.now()}`,
      category: 'emotional_engagement',
      subType: 'recall_remember',
      difficulty: 1,
      language: activeLang,
      prompt: activeLang === 'as' ? 'আপোনাৰ এই সময়ছোৱাৰ স্মৃতি মনত আছেনে?' : activeLang === 'hi' ? 'क्या आपको इस खूबसूरत पल की याद है?' : 'Do you remember this cherished moment?',
      instructions: i18n.instructions.emotional_engagement,
      media: {
        type: photos.length > 0 ? 'photo' : 'icon',
        url: photos.length > 0 ? photos[0].runtimeUrl : null,
        symbol: '🏡',
        caption: activeLang === 'as' ? 'পৰিয়ালৰ মৰমৰ স্মৃতি' : activeLang === 'hi' ? 'पारिवारिक सुखद स्मृति' : 'Cherished Family Moments'
      },
      options: [
        { id: 'opt_rem_yes', text: activeLang === 'as' ? 'হয়, মনত আছে ❤️' : activeLang === 'hi' ? 'हाँ, मुझे याद है ❤️' : 'Yes, I remember ❤️', isCorrect: true },
        { id: 'opt_rem_tell', text: activeLang === 'as' ? 'মোক আৰু জনাওক 📖' : activeLang === 'hi' ? 'मुझे और बताएं 📖' : 'Tell me more 📖', isCorrect: true },
        { id: 'opt_rem_maybe', text: activeLang === 'as' ? 'অলপ মনত আছে 🌸' : activeLang === 'hi' ? 'थोड़ा याद है 🌸' : 'A little bit 🌸', isCorrect: true }
      ],
      correctAnswer: 'Yes, I remember',
      hints: ['Take all the time you need. Every memory is a treasure.']
    }));

    return {
      elderlyUserId,
      language: activeLang,
      difficulty,
      totalActivities: activities.length,
      activities
    };
  }
};
