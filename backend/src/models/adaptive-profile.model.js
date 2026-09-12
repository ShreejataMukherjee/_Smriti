/**
 * SMRITI ADAPTIVE PROFILE MODEL
 * Maintains dynamic task difficulty levels, moving performance averages, and support tier per cognitive category.
 */

export function createAdaptiveProfileModel(data = {}) {
  return {
    elderlyUserId: data.elderlyUserId || '',
    currentDifficulty: typeof data.currentDifficulty === 'number' ? data.currentDifficulty : 1, // Global baseline 1-5
    categoryDifficulties: data.categoryDifficulties || {
      memory: 1,
      attention: 1,
      routine_recall: 1,
      pattern_recognition: 1,
      emotional_engagement: 1
    },
    consecutiveSuccesses: data.consecutiveSuccesses || {
      memory: 0,
      attention: 0,
      routine_recall: 0,
      pattern_recognition: 0,
      emotional_engagement: 0
    },
    consecutiveFailures: data.consecutiveFailures || {
      memory: 0,
      attention: 0,
      routine_recall: 0,
      pattern_recognition: 0,
      emotional_engagement: 0
    },
    recentAccuracyAverage: typeof data.recentAccuracyAverage === 'number' ? data.recentAccuracyAverage : 0.85,
    recentResponseTimeAverage: typeof data.recentResponseTimeAverage === 'number' ? data.recentResponseTimeAverage : 4000,
    supportLevel: data.supportLevel || 'standard', // 'high' | 'standard' | 'minimal'
    adjustmentReason: data.adjustmentReason || 'Initial baseline difficulty established',
    recommendedCategories: data.recommendedCategories || ['memory', 'routine_recall', 'emotional_engagement'],
    lastAdjustedAt: data.lastAdjustedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
