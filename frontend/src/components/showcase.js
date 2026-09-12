/**
 * SMRITI PERSONALIZATION SHOWCASE
 * Manages interactive chips and live caretaker preview panels.
 */

document.addEventListener('DOMContentLoaded', () => {
  const chips = document.querySelectorAll('.personalization-chip');
  const panels = {
    grandson: document.getElementById('view-grandson'),
    song: document.getElementById('view-song'),
    place: document.getElementById('view-place'),
    routine: document.getElementById('view-routine')
  };

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const target = chip.dataset.target;
      if (!target || !panels[target]) return;

      // Update chip active states
      chips.forEach(c => {
        c.classList.remove('active');
        const status = c.querySelector('.chip-status');
        if (status) {
          status.textContent = 'View';
          status.className = 'chip-status text-xs text-slate-400';
        }
      });

      chip.classList.add('active');
      const activeStatus = chip.querySelector('.chip-status');
      if (activeStatus) {
        activeStatus.textContent = 'Active';
        activeStatus.className = 'chip-status text-xs font-bold text-amber-700';
      }

      // Show target panel
      Object.values(panels).forEach(p => {
        if (p) p.classList.add('hidden');
      });
      panels[target].classList.remove('hidden');

      if (window.smritiAudio) {
        window.smritiAudio.playSoftTap();
      }
    });
  });

  // Audio Buttons
  const voiceBtn = document.querySelector('.play-voice-note-btn');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      if (window.smritiAudio) {
        window.smritiAudio.speakText("Namaste Dadi! Kaisi ho aap? Aryan here from Delhi. Missing your Kaju Katli!");
      }
    });
  }

  const melodyBtn = document.querySelector('.play-melody-snippet-btn');
  if (melodyBtn) {
    melodyBtn.addEventListener('click', () => {
      if (window.smritiAudio) {
        window.smritiAudio.playMelodySnippet();
      }
    });
  }
});
