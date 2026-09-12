/**
 * SMRITI CANONICAL COGNITIVE ACTIVITY MODEL
 * Unified activity schema driving all cognitive exercises across Memory, Attention, Routine, Recognition, and Emotional Engagement.
 */

export function createCognitiveActivityModel(data = {}) {
  return {
    activityId: data.activityId || `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    category: data.category || 'memory', // 'memory' | 'attention' | 'routine_recall' | 'pattern_recognition' | 'emotional_engagement'
    subType: data.subType || 'family_recognition',
    difficulty: data.difficulty || 1, // 1 to 5
    language: data.language || 'as', // 'as' | 'bn' | 'hi' | 'en'
    prompt: data.prompt || 'Who is this beloved family member?',
    instructions: data.instructions || 'Look carefully and choose the matching name below.',
    media: data.media || {
      type: 'avatar', // 'avatar' | 'photo' | 'video' | 'audio' | 'icon'
      url: null,
      symbol: '👵',
      caption: ''
    },
    options: Array.isArray(data.options) ? data.options : [
      { id: 'opt_1', text: 'Family Member', isCorrect: true },
      { id: 'opt_2', text: 'Family Friend', isCorrect: false }
    ],
    correctAnswer: data.correctAnswer || 'Family Member',
    hints: Array.isArray(data.hints) ? data.hints : ['Think about your morning tea moments together.'],
    supportLevel: data.supportLevel || 'standard', // 'high' | 'standard' | 'minimal'
    metadata: data.metadata || {
      source: 'family_dataset', // 'family_dataset' | 'routine_schedule' | 'media_vault' | 'cultural_dataset'
      targetId: null,
      context: ''
    },
    createdAt: data.createdAt || new Date().toISOString()
  };
}
