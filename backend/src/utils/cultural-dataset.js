/**
 * SMRITI NER CULTURAL DATASET & MULTILINGUAL LOCALIZATION DICTIONARY
 * Provides cultural assets (NER landmarks, traditional festivals, folk tunes, tea gardens)
 * and translations for prompts, questions, instructions, and positive reinforcement.
 */

export const CULTURAL_ANCHORS = {
  landmarks: [
    {
      id: 'brahmaputra_ghat',
      symbol: '🌊',
      names: {
        as: 'ব্ৰহ্মপুত্ৰৰ ঘাট (গুৱাহাটী)',
        bn: 'ব্রহ্মপুত্র ঘাট (গুয়াহাটি)',
        hi: 'ब्रह्मपुत्र घाट (गुवाहाटी)',
        en: 'Brahmaputra River Ghat (Guwahati)'
      },
      hint: {
        as: 'মহা শক্তিশালী লুইত নদীৰ শান্ত পাৰ',
        bn: 'শক্তিশালী ব্রহ্মপুত্র নদের শান্ত তীর',
        hi: 'विशाल ब्रह्मपुत्र नदी का शांत किनारा',
        en: 'The serene banks of the mighty Brahmaputra river'
      }
    },
    {
      id: 'majuli_island',
      symbol: '🏝️',
      names: {
        as: 'মাজুলী নদী দ্বীপ',
        bn: 'মাজুলি নদী দ্বীপ',
        hi: 'माजुली नदी द्वीप',
        en: 'Majuli River Island'
      },
      hint: {
        as: 'বিশ্বৰ সৰ্ববৃহৎ নদী দ্বীপ আৰু সত্ৰীয়া সংস্কৃতিৰ কেন্দ্ৰ',
        bn: 'বিশ্বের বৃহত্তম নদী দ্বীপ ও সত্রীয়া সংস্কৃতি',
        hi: 'विश्व का सबसे बड़ा नदी द्वीप और सांस्कृतिक केंद्र',
        en: 'World largest river island and center of Satra culture'
      }
    },
    {
      id: 'kaziranga_park',
      symbol: '🦏',
      names: {
        as: 'কাজিৰঙা ৰাষ্ট্ৰীয় উদ্যান',
        bn: 'কাজিরাঙা জাতীয় উদ্যান',
        hi: 'काजीरंगा राष्ट्रीय उद्यान',
        en: 'Kaziranga National Park'
      },
      hint: {
        as: 'এশিঙীয়া গঁড়ৰ গৌৰৱময় বাসভূমি',
        bn: 'একশৃঙ্গ গণ্ডারের গৌরবময় বাসস্থান',
        hi: 'एक सींग वाले गैंडे का प्रसिद्ध घर',
        en: 'Home to the famous one-horned rhinoceros'
      }
    },
    {
      id: 'tezpur_tea_gardens',
      symbol: '🍃',
      names: {
        as: 'তেজপুৰৰ সেউজীয়া চাহ বাগান',
        bn: 'তেজপুরের সবুজ চা বাগান',
        hi: 'तेजपुर के हरे-भरे चाय बागान',
        en: 'Tezpur Lush Green Tea Gardens'
      },
      hint: {
        as: 'পুৱাৰ সতেজ বতাহ আৰু সুগন্ধি চাহ পাত',
        bn: 'সকালের সতেজ বাতাস ও সুবাসিত চা পাতা',
        hi: 'सुबह की ताज़ी हवा और खुशबूदार चाय की पत्तियां',
        en: 'Fresh morning breeze and fragrant tea leaves'
      }
    },
    {
      id: 'shillong_peak',
      symbol: '⛰️',
      names: {
        as: 'শ্বিলং শিখৰ (মেঘালয়)',
        bn: 'শিলং পিক (মেঘালয়)',
        hi: 'शिलांग पीक (मेघालय)',
        en: 'Shillong Peak (Meghalaya)'
      },
      hint: {
        as: 'মেঘৰ দেশৰ সুন্দৰ সেউজ পাহাৰ',
        bn: 'মেঘের দেশের সুন্দর সবুজ পাহাড়',
        hi: 'बादलों के घर की सुंदर हरी पहाड़ियां',
        en: 'Scenic green hills in the abode of clouds'
      }
    }
  ],
  festivals: [
    {
      id: 'rongali_bihu',
      symbol: '🌸',
      names: {
        as: 'ৰঙালী বিহু (বসন্ত উৎসৱ)',
        bn: 'রঙালি বিহু (বসন্ত উৎসব)',
        hi: 'रोंगाली बिहू (वसंत उत्सव)',
        en: 'Rongali Bihu (Spring Festival)'
      },
      association: 'dhol_pepa'
    },
    {
      id: 'durga_puja',
      symbol: '🪔',
      names: {
        as: 'শাৰদীয় দুৰ্গোৎসৱ',
        bn: 'শারদীয়া দুর্গোৎসব',
        hi: 'शारदीय दुर्गा पूजा',
        en: 'Sharadiya Durga Puja'
      },
      association: 'dhak_aarti'
    }
  ],
  objects: [
    {
      id: 'jaapi',
      symbol: '👒',
      names: {
        as: 'অসমীয়া জাপি',
        bn: 'অসমীয়া জাপি',
        hi: 'पारंपरिक असमिया जापी',
        en: 'Traditional Assamese Jaapi'
      }
    },
    {
      id: 'gamosa',
      symbol: '🧣',
      names: {
        as: 'ফুলাম গামোচা',
        bn: 'ফুলম গামোচা',
        hi: 'पारंपरिक गमोसा',
        en: 'Traditional Phulam Gamosa'
      }
    },
    {
      id: 'pepa_instrument',
      symbol: '🎺',
      names: {
        as: "ম'হৰ শিঙৰ পেঁপা",
        bn: 'মহিষের শিংয়ের পেঁপা',
        hi: 'पारंपरिक पेपा वाद्य',
        en: 'Traditional Buffalo Horn Pepa'
      }
    },
    {
      id: 'brass_sarai',
      symbol: '🏆',
      names: {
        as: 'পিতলৰ শৰাই',
        bn: 'পিতলের শরাই',
        hi: 'पीतल की सराई',
        en: 'Traditional Brass Xorai'
      }
    }
  ]
};

export const LOCALIZED_STRINGS = {
  as: {
    greeting: 'নমস্কাৰ, আপোনাৰ দিনটো শুভ হওক ❤️',
    instructions: {
      family_recognition: 'তলৰ ছবিখন মন দি চাওক আৰু চিনাকি পৰিয়ালৰ সদস্যজন বাছনি কৰক।',
      name_recall: 'এই মৰমৰ মানুহজনৰ নাম কি হয় বাছনি কৰক।',
      memory_match: 'সঠিক সম্পৰ্ক বা নামৰ সৈতে মিলাওক।',
      photo_recall: 'এই পুৰণি স্মৃতিখন মনত পেলাই সঠিক উত্তৰটো বাছনি কৰক।',
      visual_attention: 'তলৰ বস্তুবোৰৰ মাজৰ পৰা সঠিক বস্তুটো বাছনি কৰক।',
      distractor_spotting: 'অন্যবোৰৰ তুলনাত পৃথক বস্তুটো চিনাক্ত কৰক।',
      routine_recall: 'আপোনাৰ দৈনন্দিন নিয়ম অনুযায়ী পৰৱৰ্তী কামটো কি হ’ব?',
      pattern_recognition: 'নিখুঁত আৰ্হিটো সম্পূৰ্ণ কৰিবলৈ উপযুক্ত টুকুৰাটো বাছক।',
      object_recognition: 'এই চিনাকি পৰম্পৰাগত বস্তুটো কি হয় চিনাক্ত কৰক।',
      place_recognition: 'এই ঐতিহাসিক বা চিনাকি ঠাইডোখৰ চিনাক্ত কৰক।',
      emotional_engagement: 'এই মায়াময় গানটো বা ছবিখন শুনি আপোনাৰ মনলৈ কি ভাব আহিল?'
    },
    feedback: {
      correct: ['বৰ সুন্দৰ! অতি নিখুঁত হৈছে! 🌟', 'অতিকৈ শলাগিবলগীয়া! আপুনি বহুত ভাল কৰিলে! 👏', 'অপূৰ্ব! আপোনাৰ স্মৃতিশক্তি প্রশংসনীয়! ❤️'],
      encouraging: ['বৰ ভাল চেষ্টা! আহক আমি আৰু এবাৰ চাওঁ। 🌸', 'কোনো চিন্তা নাই, আমি একেলগে শিকি আছোঁ। 🌿']
    },
    prompts: {
      whoIsThis: 'এই মৰমৰ পৰিয়ালৰ সদস্যজন কোন হয়?',
      whatComesNext: 'ইয়াৰ পিছত আপোনাৰ দিনটোৰ কি নিয়ম থাকে?',
      whichPlaceIsThis: 'এই সুন্দৰ চিনাকি ঠাইডোখৰ কি হয়?',
      whichObjectIsThis: 'এই পৰম্পৰাগত বস্তুটো কি হয়?',
      songRecall: 'এই সুৰটো আপোনাৰ কোনটো উৎসৱৰ কথা মনত পেলায়?'
    }
  },
  bn: {
    greeting: 'নমস্কার, আপনার দিনটি আনন্দময় হোক ❤️',
    instructions: {
      family_recognition: 'নিচের ছবিটি মন দিয়ে দেখুন এবং পরিবারের প্রিয় সদস্যকে বেছে নিন।',
      name_recall: 'এই প্রিয় মানুষটির সঠিক নামটি বেছে নিন।',
      memory_match: 'সঠিক সম্পর্ক বা নামের সাথে মিলিয়ে নিন।',
      photo_recall: 'এই পুরোনো ছবিটি দেখে সঠিক স্মৃতিটি বেছে নিন।',
      visual_attention: 'নিচের জিনিসগুলোর মধ্য থেকে সঠিক জিনিসটি বেছে নিন।',
      distractor_spotting: 'অন্যগুলোর থেকে আলাদা বস্তুটি চিহ্নিত করুন।',
      routine_recall: 'আপনার দৈনিক নিয়ম অনুযায়ী এর পরের কাজটি কী হবে?',
      pattern_recognition: 'সঠিক প্যাটার্নটি সম্পূর্ণ করতে উপযুক্ত অংশটি বাছুন।',
      object_recognition: 'এই পরিচিত ঐতিহ্যবাহী বস্তুটি কী তা চিহ্নিত করুন।',
      place_recognition: 'এই সুন্দর পরিচিত স্থানটি চিহ্নিত করুন।',
      emotional_engagement: 'এই চমৎকার গান বা স্মৃতিটি আপনার কেমন লাগছে?'
    },
    feedback: {
      correct: ['দারুণ! খুব সুন্দর হয়েছে! 🌟', 'খুব ভালো! আপনি চমৎকার করেছেন! 👏', 'অপূর্ব! আপনার স্মৃতিশক্তি প্রশংসনীয়! ❤️'],
      encouraging: ['সুন্দর চেষ্টা! আসুন আমরা আরেকবার চেষ্টা করি। 🌸', 'কোনো চিন্তা নেই, আমরা একসাথে অনুশীলন করছি। 🌿']
    },
    prompts: {
      whoIsThis: 'পরিবারের এই প্রিয় সদস্যটি কে?',
      whatComesNext: 'এর পর আপনার দিনের কোন কাজটি থাকে?',
      whichPlaceIsThis: 'এই সুন্দর পরিচিত স্থানটি কোনটি?',
      whichObjectIsThis: 'এই ঐতিহ্যবাহী বস্তুটি কী?',
      songRecall: 'এই সুন্দর সুরটি কোন উৎসবের স্মৃতি মনে করিয়ে দেয়?'
    }
  },
  hi: {
    greeting: 'नमस्ते, आपका दिन मंगलमय हो ❤️',
    instructions: {
      family_recognition: 'कृपया तस्वीर को ध्यान से देखें और सही पारिवारिक सदस्य को चुनें।',
      name_recall: 'इस प्रिय व्यक्ति का सही नाम चुनें।',
      memory_match: 'सही रिश्ते या नाम का सही मिलान करें।',
      photo_recall: 'इस प्यारी याद को देखकर सही उत्तर चुनें।',
      visual_attention: 'दिए गए विकल्पों में से सही वस्तु को पहचानें।',
      distractor_spotting: 'अन्य वस्तुओं से भिन्न वस्तु को पहचानें।',
      routine_recall: 'आपकी दैनिक दिनचर्या के अनुसार इसके बाद क्या आता है?',
      pattern_recognition: 'सही पैटर्न पूरा करने के लिए सही टुकड़ा चुनें।',
      object_recognition: 'इस जाने-पहचाने पारंपरिक सामान को पहचानें।',
      place_recognition: 'इस प्रसिद्ध व सुंदर स्थान को पहचानें।',
      emotional_engagement: 'इस मधुर गीत या याद को सुनकर आपको कैसा लगा?'
    },
    feedback: {
      correct: ['शाबाश! बहुत ही बढ़िया! 🌟', 'अति सुंदर! आपने बहुत अच्छा किया! 👏', 'लाजवाब! आपकी याददाश्त बहुत अच्छी है! ❤️'],
      encouraging: ['बहुत अच्छा प्रयास! चलिए एक बार फिर देखते हैं। 🌸', 'कोई बात नहीं, हम मिलकर सीख रहे हैं। 🌿']
    },
    prompts: {
      whoIsThis: 'परिवार के यह प्रिय सदस्य कौन हैं?',
      whatComesNext: 'इसके बाद आपकी दिनचर्या में क्या होता है?',
      whichPlaceIsThis: 'यह सुंदर और प्रसिद्ध स्थान कौन सा है?',
      whichObjectIsThis: 'यह पारंपरिक वस्तु क्या है?',
      songRecall: 'यह मधुर धुन आपको किस त्योहार की याद दिलाती है?'
    }
  },
  en: {
    greeting: 'Welcome! Wishing you a peaceful and wonderful day ❤️',
    instructions: {
      family_recognition: 'Look closely at the photo and select the beloved family member.',
      name_recall: 'Select the correct name of this familiar person.',
      memory_match: 'Match the correct person with their relationship or memory.',
      photo_recall: 'Recall this cherished moment and choose the best matching option.',
      visual_attention: 'Spot and select the requested object among the options.',
      distractor_spotting: 'Find the item that is different from the others.',
      routine_recall: 'According to your daily routine, what usually comes next?',
      pattern_recognition: 'Choose the matching piece to complete the pattern.',
      object_recognition: 'Identify this familiar traditional object.',
      place_recognition: 'Identify this beautiful and familiar place.',
      emotional_engagement: 'How does listening to this familiar tune make you feel?'
    },
    feedback: {
      correct: ['Wonderful! Spot on! 🌟', 'Great job! You did fantastic! 👏', 'Brilliant! Your recall is amazing! ❤️'],
      encouraging: ['Great attempt! Let us take a gentle look together. 🌸', 'Take your time, we are practicing together. 🌿']
    },
    prompts: {
      whoIsThis: 'Who is this beloved family member?',
      whatComesNext: 'What usually comes next in your daily routine?',
      whichPlaceIsThis: 'Which familiar and scenic place is this?',
      whichObjectIsThis: 'What is this traditional object?',
      songRecall: 'Which festival or memory does this melody bring to mind?'
    }
  }
};
