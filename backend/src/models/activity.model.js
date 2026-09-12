/**
 * SMRITI COGNITIVE ACTIVITY MODEL (FUTURE SIH FOUNDATION)
 * Prepares the schema foundation for adaptive cognitive games, attention tracking, and recall scoring.
 */

export function createCognitiveSessionModel(data = {}) {
  return {
    id: data.id || `cog_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    elderlyId: data.elderlyId,
    gameType: data.gameType || 'face_recall', // 'face_recall' | 'music_recognition' | 'landmark_recall' | 'daily_pattern'
    difficultyLevel: data.difficultyLevel || 1, // 1 to 5 adaptive
    score: data.score || 0,
    reactionTimeMs: data.reactionTimeMs || 0,
    emotionalResponse: data.emotionalResponse || 'calm',
    completedAt: data.completedAt || new Date().toISOString()
  };
}
