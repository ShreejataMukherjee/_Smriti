/**
 * SMRITI COGNITIVE ACTIVITIES CONTROLLER
 * Handles interactive product demos with instant celebratory feedback.
 */

document.addEventListener('DOMContentLoaded', () => {
  const quizButtons = document.querySelectorAll('.quiz-btn');

  quizButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const quizId = btn.dataset.quiz;
      const isCorrect = btn.dataset.correct === 'true';
      const container = btn.closest('.space-y-2');
      const feedback = document.getElementById(`quiz-feedback-${quizId}`);

      // Reset options in this quiz
      if (container) {
        container.querySelectorAll('.quiz-btn').forEach(b => {
          b.classList.remove('quiz-correct', 'quiz-wrong');
          const badge = b.querySelector('.quiz-badge');
          if (badge) badge.textContent = '';
        });
      }

      const badge = btn.querySelector('.quiz-badge');

      if (isCorrect) {
        btn.classList.add('quiz-correct');
        if (badge) badge.textContent = '✓ Correct';
        if (feedback) feedback.classList.remove('hidden');

        if (window.smritiAudio) {
          window.smritiAudio.playSuccessChord();
        }
      } else {
        btn.classList.add('quiz-wrong');
        if (badge) badge.textContent = 'Try again';

        if (window.smritiAudio) {
          window.smritiAudio.playChime(330, 0.4, 'triangle');
        }
      }
    });
  });

  // Melody Quiz Play Button
  const playMelodyBtn = document.getElementById('play-quiz-melody-btn');
  if (playMelodyBtn) {
    playMelodyBtn.addEventListener('click', () => {
      if (window.smritiAudio) {
        window.smritiAudio.playMelodySnippet();
      }
    });
  }
});
