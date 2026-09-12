/**
 * SMRITI COGNITIVE PERFORMANCE SESSION MODEL
 * Structured performance record capturing task attempts, accuracy, latency, and hint usage.
 * Non-diagnostic care-support data model.
 */

export function createCognitiveSessionModel(data = {}) {
  return {
    id: data.id || `cog_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    elderlyUserId: data.elderlyUserId || '',
    activityId: data.activityId || '',
    category: data.category || 'memory',
    subType: data.subType || 'family_recognition',
    difficulty: typeof data.difficulty === 'number' ? data.difficulty : 1,
    language: data.language || 'as',
    startedAt: data.startedAt || new Date().toISOString(),
    completedAt: data.completedAt || new Date().toISOString(),
    accuracy: typeof data.accuracy === 'number' ? data.accuracy : 1.0, // 0.0 to 1.0
    score: typeof data.score === 'number' ? data.score : 100,
    responseTimeMs: typeof data.responseTimeMs === 'number' ? data.responseTimeMs : 3500,
    totalQuestions: typeof data.totalQuestions === 'number' ? data.totalQuestions : 1,
    correctAnswers: typeof data.correctAnswers === 'number' ? data.correctAnswers : 1,
    attempts: typeof data.attempts === 'number' ? data.attempts : 1,
    hintsUsed: typeof data.hintsUsed === 'number' ? data.hintsUsed : 0,
    skips: typeof data.skips === 'number' ? data.skips : 0,
    completed: data.completed ?? true,
    syncStatus: data.syncStatus || 'synced', // 'synced' | 'offline_queued'
    questionsAnswered: Array.isArray(data.questionsAnswered) ? data.questionsAnswered : [],
    createdAt: data.createdAt || new Date().toISOString()
  };
}
