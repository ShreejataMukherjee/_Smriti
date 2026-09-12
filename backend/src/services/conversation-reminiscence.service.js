/**
 * SMRITI AI CONVERSATION & REMINISCENCE COMPANION SERVICE
 * Powers the interactive "Talk & Recall" voice reminiscence companion.
 * Integrates real family members, daily routines, photo memories, and cultural anchors.
 * Provides warm, slow-paced, empathetic, non-judgmental conversational flow for elderly seniors.
 */

import { familyService } from './family-service.js';
import { routineService } from './routine-service.js';
import { profileService } from './profile-service.js';
import { mediaService } from './media-service.js';
import { relationshipService } from './relationship-service.js';
import { userService } from './user-service.js';
import { logger } from '../utils/logger.js';

function resolveSeniorStyledName(user, profile) {
  let realName = '';
  if (user?.name && user.name !== 'Smriti User' && user.name !== 'Elderly User') {
    realName = user.name.trim();
  } else if (profile?.displayName && profile.displayName !== 'Elderly User' && profile.displayName !== 'Smriti User') {
    realName = profile.displayName.trim();
  } else if (user?.email) {
    const emailPrefix = user.email.split('@')[0];
    realName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  } else {
    realName = 'Senior';
  }

  const gender = (profile?.gender || user?.gender || '').toLowerCase().trim();
  const explicitTitle = (profile?.title || user?.title || '').trim();
  let styledName = realName;
  if (gender === 'male') {
    styledName = `${realName} Baba`;
  } else if (gender === 'female') {
    styledName = `${realName} Maa`;
  } else if (explicitTitle) {
    styledName = `${realName} ${explicitTitle}`;
  }

  return styledName.trim();
}

export const conversationReminiscenceService = {
  /**
   * Generates a personalized opening reminiscence prompt for an elderly user
   */
  async getOpeningPrompt(elderlyUserId, callerId, language = 'as') {
    if (callerId !== elderlyUserId) {
      const isAuth = await relationshipService.hasActiveRelationship(callerId, elderlyUserId);
      if (!isAuth) throw new Error('Unauthorized: You cannot access conversation for this senior.');
    }

    const [user, profile, family, routines, memories] = await Promise.all([
      userService.getUserById(elderlyUserId).catch(() => null),
      profileService.getProfile(elderlyUserId).catch(() => null),
      familyService.getFamilyForElderly(elderlyUserId).catch(() => []),
      routineService.getRoutineForElderly(elderlyUserId).catch(() => []),
      mediaService.getMemoriesForElderly(elderlyUserId, callerId).catch(() => [])
    ]);

    const seniorName = resolveSeniorStyledName(user, profile);
    const lang = language || profile?.preferredLanguage || 'as';

    // Pick top personalized anchors
    const favFamily = family.find(f => f.isFavorite) || family[0];
    const morningRoutine = routines.find(r => r.order === 1 || /tea|walk|morning/i.test(r.activityName)) || routines[0];
    const topMemory = memories.find(m => m.type === 'photo');

    let promptText = '';
    let suggestedReplies = [];

    if (lang === 'as') {
      if (favFamily && morningRoutine) {
        promptText = `নমস্কাৰ ${seniorName}! আজিৰ দিনটো কেনে লাগিছে? আপোনাৰ ${morningRoutine.activityName} বা ${favFamily.name} (${favFamily.relationship || 'পৰিয়াল'}) ৰ কথা মনত পৰিছে নেকি? মোক কওকচোন!`;
        suggestedReplies = [
          `মই ভালে আছোঁ`,
          `${favFamily.name}ৰ কথা কওঁ`,
          `${morningRoutine.activityName}ৰ বিষয়ে কওঁ`
        ];
      } else if (favFamily) {
        promptText = `নমস্কাৰ ${seniorName}! ${favFamily.name} (${favFamily.relationship || 'পৰিয়াল'}) ৰ লগত কটোৱা কোনো ভাল স্মৃতি মনত পেলাওকচোন। আপোনাৰ কি মনত পৰিছে?`;
        suggestedReplies = [`${favFamily.name}ৰ কথা কওঁ`, `মই আজি ভাল অনুভৱ কৰিছোঁ`];
      } else {
        promptText = `নমস্কাৰ ${seniorName}! আজি আপোনাৰ কেনে লাগিছে? চাহ খাই ভাল লাগিলনে নাইবা কোনো পুৰণি গান মনত পৰিছে নেকি?`;
        suggestedReplies = [`মই চাহ খালোঁ`, `পুৰণি কথা কওঁ`, `মনটো ভাল লাগিছে`];
      }
    } else if (lang === 'hi') {
      if (favFamily && morningRoutine) {
        promptText = `नमस्ते ${seniorName} जी! आज का दिन कैसा बीत रहा है? क्या आपको ${morningRoutine.activityName} या ${favFamily.name} (${favFamily.relationship || 'परिवार'}) की कोई प्यारी बात याद आ रही है? मुझे बताइए!`;
        suggestedReplies = [
          `मैं बहुत अच्छा महसूस कर रहा हूँ`,
          `${favFamily.name} के बारे में बात करते हैं`,
          `${morningRoutine.activityName} की बात`
        ];
      } else if (favFamily) {
        promptText = `नमस्ते ${seniorName} जी! ${favFamily.name} (${favFamily.relationship || 'परिवार'}) के साथ बिताया कोई खास पल याद करें। आज आप क्या कहना चाहते हैं?`;
        suggestedReplies = [`${favFamily.name} की यादें`, `आज का दिन अच्छा है`];
      } else {
        promptText = `नमस्ते ${seniorName} जी! आज आपका मन कैसा है? क्या आपने सुबह की चाय पी? अपनी कोई मीठी याद मुझसे साझा करें।`;
        suggestedReplies = [`सुबह की चाय पी ली`, `पुरानी यादें बताएं`, `अच्छा महसूस हो रहा है`];
      }
    } else if (lang === 'bn') {
      if (favFamily) {
        promptText = `নমস্কার ${seniorName}! কেমন আছেন আজ? ${favFamily.name} (${favFamily.relationship || 'পরিবার'}) এর সাথে কাটানো সুন্দর স্মৃতির কথা মনে পড়ছে কি? আমাকে বলুন!`;
        suggestedReplies = [`আমি ভালো আছি`, `${favFamily.name}র কথা বলি`, `চায়ের কথা বলি`];
      } else {
        promptText = `নমস্কার ${seniorName}! আজ আপনার দিনটি কেমন যাচ্ছে? কোনো প্রিয় গান বা সুন্দর স্মৃতির কথা মনে পড়ছে কি?`;
        suggestedReplies = [`খুব ভালো লাগছে`, `পুরোনো কথা বলি`];
      }
    } else {
      // English default
      if (favFamily && morningRoutine) {
        promptText = `Hello ${seniorName}! It is so wonderful to talk with you. Are you thinking about your ${morningRoutine.activityName}, or perhaps ${favFamily.name} (${favFamily.relationship || 'Family'})? Tell me what is on your heart today.`;
        suggestedReplies = [
          `I am feeling good today`,
          `Tell me about ${favFamily.name}`,
          `Let's talk about ${morningRoutine.activityName}`
        ];
      } else if (favFamily) {
        promptText = `Hello ${seniorName}! Thinking of ${favFamily.name} (${favFamily.relationship || 'Family'})? Share a fond memory you cherish with them.`;
        suggestedReplies = [`Thinking of ${favFamily.name}`, `Having a peaceful day`];
      } else {
        promptText = `Hello ${seniorName}! It is wonderful to hear your voice. How are you feeling today? Share whatever comes to your mind.`;
        suggestedReplies = [`Feeling peaceful today`, `Tell me a pleasant story`, `Let's chat`];
      }
    }

    return {
      success: true,
      promptText,
      suggestedReplies,
      language: lang,
      seniorName,
      favFamily: favFamily ? { name: favFamily.name, relationship: favFamily.relationship, avatar: favFamily.avatar, avatarUrl: favFamily.avatarUrl } : null
    };
  },

  /**
   * Processes an incoming message from the senior during the Talk & Recall session
   */
  async processUserMessage({ elderlyUserId, callerId, userMessage, conversationHistory = [], language = 'as' }) {
    if (!userMessage || typeof userMessage !== 'string') {
      throw new Error('userMessage is required');
    }

    if (callerId !== elderlyUserId) {
      const isAuth = await relationshipService.hasActiveRelationship(callerId, elderlyUserId);
      if (!isAuth) throw new Error('Unauthorized: You cannot access conversation for this senior.');
    }

    const [user, profile, family, routines, memories] = await Promise.all([
      userService.getUserById(elderlyUserId).catch(() => null),
      profileService.getProfile(elderlyUserId).catch(() => null),
      familyService.getFamilyForElderly(elderlyUserId).catch(() => []),
      routineService.getRoutineForElderly(elderlyUserId).catch(() => []),
      mediaService.getMemoriesForElderly(elderlyUserId, callerId).catch(() => [])
    ]);

    const seniorName = resolveSeniorStyledName(user, profile);
    const lang = language || profile?.preferredLanguage || 'as';
    const textLower = userMessage.toLowerCase();

    // Check if user mentioned any registered family member
    const matchedFamily = family.find(f => textLower.includes(f.name.toLowerCase()) || (f.relationship && textLower.includes(f.relationship.toLowerCase())));

    // Check if user mentioned any routine
    const matchedRoutine = routines.find(r => textLower.includes(r.activityName.toLowerCase()));

    // Sentiment / intent heuristics
    const isHappy = /ভাল|ভালপোৱা|আনন্দ|happy|good|great|nice|love|peace|সুখী|खुश|अच्छा|बढ़िया|प्यार|সুখে/i.test(textLower);
    const isTea = /চাহ|tea|chai|চা|কফি|coffee/i.test(textLower);
    const isWalk = /walk|খোজ|ফুৰা|টহল|घूमना|सैर|garden|বাগান|উদ্যন/i.test(textLower);
    const isMusic = /গান|song|music|গীত|সঙ্গীত|সুর|धुन/i.test(textLower);
    const isTired = /ভাগৰ|tired|pain|দুখ|थकान|उदास|কষ্ট/i.test(textLower);

    let replyText = '';
    let suggestedReplies = [];

    if (lang === 'as') {
      if (isTired) {
        replyText = `মই বুজিছোঁ ${seniorName}। আপুনি অলপ আৰাম কৰক আৰু গভীৰ উশাহ লওক। আপোনাৰ পৰিয়াল সদায় আপোনাৰ কাষতেই আছে। মন শান্ত কৰিবলৈ অলপ মিঠা স্মৃতি মনত পেলাওঁ নেকি?`;
        suggestedReplies = [`অলপ শান্ত সংগীত শুনো`, `পুৰণি কথা পাতিম`];
      } else if (matchedFamily) {
        const memNotes = matchedFamily.personalContext || matchedFamily.shortDescription || '';
        const loc = matchedFamily.location ? ` (${matchedFamily.location})` : '';
        replyText = `কিমান ভাল লগা কথা! ${matchedFamily.name} (${matchedFamily.relationship || 'পৰিয়াল'})${loc} আপোনাৰ অতি মৰমৰ। ${memNotes ? `তেওঁৰ লগত '${memNotes}' কথা মনত পৰে নেকি?` : 'তেওঁৰ লগত থকা মৰমৰ স্মৃতিবোৰে সদায় মন আনন্দিত কৰে।'}`;
        suggestedReplies = [`হয়, খুব মনত পৰে`, `আৰু এটা কথা কওঁ`, `চাহৰ কথা পাতিম`];
      } else if (isTea) {
        replyText = `অসমৰ সুবাসভৰা পুৱাৰ চাহ খোৱাটো এক অপূৰ্ব আনন্দ! চাহৰ কাপ হাতত লৈ পুৱাৰ ৰ'দজাক উপভোগ কৰা স্মৃতি কিমান সুন্দৰ, নহয় জানো?`;
        suggestedReplies = [`হয়, চাহ খাই বৰ ভাল লাগে`, `পৰিয়ালৰ কথা কওঁ`];
      } else if (isWalk) {
        replyText = `খোজ কাঢ়িলে মন আৰু দেহ দুয়োটাই সতেজ হৈ পৰে। নদীৰ পাৰত বা সেউজীয়া বাগানত খোজ কঢ়া স্মৃতিবোৰ বৰ মনোৰম।`;
        suggestedReplies = [`বাগানৰ কথা কওঁ`, `চাহৰ কথা কওঁ`];
      } else if (isMusic) {
        replyText = `গান আৰু সুৰ মনৰ ঔষধৰ দৰে। ভূপেন হাজৰিকাদেৱ বা জ্যোতিপ্ৰসাদৰ মিঠা গীতে আমাৰ মন প্ৰশান্ত কৰে।`;
        suggestedReplies = [`এটা গান শুনাওক`, `মন শান্ত লাগিছে`];
      } else {
        const randomFamily = family[Math.floor(Math.random() * family.length)];
        replyText = `আপোনাৰ কথা শুনি বৰ আনন্দ লাগিল ${seniorName}। ${randomFamily ? `${randomFamily.name} (${randomFamily.relationship || 'পৰিয়াল'}) ৰ কথাও মনত পৰিছে নেকি?` : 'আপোনাৰ স্মৃতিবোৰ শুনি থাকিবলৈ মোৰ খুব ভাল লাগে।'}`;
        suggestedReplies = [`হয়, ভাল লাগিছে`, `আৰু এটা কথা কওঁ`];
      }
    } else if (lang === 'hi') {
      if (isTired) {
        replyText = `मैं समझ सकता हूँ ${seniorName} जी। आप थोड़ा आराम कीजिए और गहरी सांस लीजिए। आपका परिवार आपके साथ है। क्या हम कोई मीठी और शांत याद ताजा करें?`;
        suggestedReplies = [`शांत संगीत सुनते हैं`, `पुरानी बातें करते हैं`];
      } else if (matchedFamily) {
        const loc = matchedFamily.location ? ` जो ${matchedFamily.location} में रहते हैं` : '';
        replyText = `कितनी प्यारी बात है! ${matchedFamily.name} (${matchedFamily.relationship || 'परिवार'})${loc} आपसे बहुत प्यार करते हैं। उनके साथ बिताए खूबसूरत लम्हे हमेशा चेहरे पर मुस्कान लाते हैं।`;
        suggestedReplies = [`हाँ, बहुत याद आती है`, `एक और बात बताते हैं`];
      } else if (isTea) {
        replyText = `सुबह की ताज़ा चाय और अपनों की बातें, दिन को कितना सुंदर बना देती हैं! चाय की चुस्की के साथ बीता कौन सा पल आपको सबसे ज्यादा पसंद है?`;
        suggestedReplies = [`सुबह की चाय बहुत पसंद है`, `परिवार के बारे में बताएं`];
      } else {
        replyText = `आपकी मीठी बातें सुनकर बहुत खुशी हुई ${seniorName} जी। ऐसे ही अपने अनुभव मुझसे साझा करते रहिए।`;
        suggestedReplies = [`अच्छा महसूस हो रहा है`, `एक और याद बताता हूँ`];
      }
    } else if (lang === 'bn') {
      if (matchedFamily) {
        replyText = `খুব সুন্দর কথা! ${matchedFamily.name} (${matchedFamily.relationship || 'পরিবার'}) আপনাকে খুব ভালোবাসেন। ওনার সাথে কাটানো সুন্দর স্মৃতিগুলো মন ভালো করে দেয়।`;
        suggestedReplies = [`হ্যাঁ, ওনার কথা খুব মনে পড়ে`, `আরও কথা বলি`];
      } else {
        replyText = `আপনার কথা শুনে মন ভরে গেল ${seniorName}। আপনার সাথে কথা বলে খুব ভালো লাগছে।`;
        suggestedReplies = [`খুব ভালো লাগছে`, `স্মৃতির কথা বলি`];
      }
    } else {
      // English
      if (isTired) {
        replyText = `I understand completely, ${seniorName}. Take a gentle breath and relax. Your loved ones cherish you dearly. Would you like to listen to some calming melodies or share a gentle memory?`;
        suggestedReplies = [`Let's rest for a moment`, `Tell me a pleasant story`];
      } else if (matchedFamily) {
        const memNotes = matchedFamily.personalContext || matchedFamily.shortDescription || '';
        replyText = `That is wonderful to reflect on! ${matchedFamily.name} (${matchedFamily.relationship || 'Family'}) holds such a special place in your heart. ${memNotes ? `Do you remember when "${memNotes}"?` : 'Cherishing these family bonds brings so much warmth.'}`;
        suggestedReplies = [`Yes, I remember fondly`, `Tell me more about family`];
      } else if (isTea || isWalk) {
        replyText = `Those moments of calm morning tea and pleasant outdoor strolls bring so much peace to the spirit. Who did you enjoy walking or having tea with most?`;
        suggestedReplies = [`With my family`, `In our garden`];
      } else {
        replyText = `Thank you for sharing that with me, ${seniorName}. It is truly a joy to converse with you. What else would you like to reminisce about?`;
        suggestedReplies = [`I feel very happy`, `Let's talk about family memories`];
      }
    }

    return {
      success: true,
      replyText,
      suggestedReplies,
      language: lang,
      seniorName
    };
  }
};
