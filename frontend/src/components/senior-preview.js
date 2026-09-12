/**
 * SMRITI SENIOR TABLET INTERFACE SIMULATOR
 * Demonstrates senior-first accessibility: large tactile targets,
 * high-contrast theme, scalable font sizes, voice greetings, and
 * live interactive screen transitions for all 6 core categories.
 */

document.addEventListener('DOMContentLoaded', () => {
  const tabletBody = document.getElementById('senior-tablet-body');
  const toggleFontBtn = document.getElementById('toggle-font-size-btn');
  const toggleContrastBtn = document.getElementById('toggle-contrast-btn');
  const voiceBtn = document.getElementById('senior-voice-btn');
  const fontLabel = document.getElementById('font-size-label');
  const contrastLabel = document.getElementById('contrast-label');

  const mainGridView = document.getElementById('senior-grid-view');
  const previewView = document.getElementById('senior-preview-view');
  const previewBackBtn = document.getElementById('senior-preview-back-btn');
  const previewContainer = document.getElementById('senior-preview-container');

  const toastMsg = document.getElementById('senior-toast-msg');
  const toastText = document.getElementById('senior-toast-text');

  let isLargeFont = false;
  let isHighContrast = false;

  // Font Size Toggle
  if (toggleFontBtn && tabletBody) {
    toggleFontBtn.addEventListener('click', () => {
      isLargeFont = !isLargeFont;
      tabletBody.classList.toggle('large-font-mode', isLargeFont);
      if (fontLabel) fontLabel.textContent = isLargeFont ? 'Large (24px)' : 'Normal';
      if (window.smritiAudio) window.smritiAudio.playSoftTap();
    });
  }

  // Contrast Mode Toggle
  if (toggleContrastBtn && tabletBody) {
    toggleContrastBtn.addEventListener('click', () => {
      isHighContrast = !isHighContrast;
      tabletBody.classList.toggle('high-contrast-mode', isHighContrast);
      if (contrastLabel) contrastLabel.textContent = isHighContrast ? 'High' : 'Warm';
      if (window.smritiAudio) window.smritiAudio.playSoftTap();
    });
  }

  // Voice Greeting
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      const msg = "Good morning Maa! Today is Tuesday, 25 August. Your warm ginger tea is ready.";
      showToast(`Voice Guidance: "${msg}"`);
      if (window.smritiAudio) window.smritiAudio.speakText(msg);
    });
  }

  // Senior Action Cards Screen Transitions
  const actionCards = document.querySelectorAll('.senior-action-card');
  actionCards.forEach(card => {
    card.addEventListener('click', () => {
      const action = card.dataset.seniorAction;
      openSeniorScreen(action);
    });
  });

  if (previewBackBtn) {
    previewBackBtn.addEventListener('click', () => {
      closeSeniorScreen();
    });
  }

  function openSeniorScreen(action) {
    if (!mainGridView || !previewView || !previewContainer) return;

    let contentHtml = '';
    let toastString = '';

    switch (action) {
      case 'family':
        toastString = "Opening My Family: Photos & Spoken Memories";
        if (window.smritiAudio) window.smritiAudio.playChime(523.25, 0.6, 'sine');
        contentHtml = `
          <div class="senior-preview-card p-6 sm:p-8 rounded-3xl bg-white border-2 border-rose-200 shadow-md space-y-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700">
                  <i data-lucide="heart" class="w-6 h-6"></i>
                </div>
                <div>
                  <h4 class="senior-preview-title text-xl sm:text-2xl font-extrabold text-[#0F172A]">My Family</h4>
                  <p class="senior-preview-sub text-xs sm:text-sm text-slate-500 font-medium">3 Family Members Active</p>
                </div>
              </div>
              <span class="px-3 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-bold border border-rose-200">Family Orbit</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-rose-200 flex items-center justify-center font-bold text-rose-900 text-lg">A</div>
                <div>
                  <h5 class="font-bold text-[#0F172A] text-base">Aryan</h5>
                  <p class="text-xs text-slate-600">Grandson • Age 19</p>
                  <button class="play-voice-note-btn mt-2 px-3 py-1.5 rounded-full bg-[#0F172A] text-white text-xs font-bold flex items-center gap-1.5">
                    <i data-lucide="play" class="w-3 h-3"></i> <span>Play Greeting</span>
                  </button>
                </div>
              </div>

              <div class="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-rose-200 flex items-center justify-center font-bold text-rose-900 text-lg">S</div>
                <div>
                  <h5 class="font-bold text-[#0F172A] text-base">Sruti</h5>
                  <p class="text-xs text-slate-600">Granddaughter • Age 16</p>
                  <button class="play-voice-sruti-btn mt-2 px-3 py-1.5 rounded-full bg-[#0F172A] text-white text-xs font-bold flex items-center gap-1.5">
                    <i data-lucide="play" class="w-3 h-3"></i> <span>Play Voice Note</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        break;

      case 'memories':
        toastString = "Opening Memory Vault: 42 Curated Moments";
        if (window.smritiAudio) window.smritiAudio.playChime(659.25, 0.6, 'sine');
        contentHtml = `
          <div class="senior-preview-card p-6 sm:p-8 rounded-3xl bg-white border-2 border-amber-200 shadow-md space-y-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <i data-lucide="camera" class="w-6 h-6"></i>
                </div>
                <div>
                  <h4 class="senior-preview-title text-xl sm:text-2xl font-extrabold text-[#0F172A]">My Memories</h4>
                  <p class="senior-preview-sub text-xs sm:text-sm text-slate-500 font-medium">Varanasi 1978 Album</p>
                </div>
              </div>
              <span class="px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-bold border border-amber-200">Memory Vault</span>
            </div>

            <div class="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col items-center text-center space-y-3">
              <div class="w-16 h-16 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center">
                <i data-lucide="image" class="w-8 h-8"></i>
              </div>
              <h5 class="text-lg font-bold text-[#0F172A]">Dashashwamedh Ghat Steps</h5>
              <p class="text-xs sm:text-sm text-slate-600 max-w-md">"Every morning at 6 AM, Maa walked the ghat steps with family. Evening bells brought peace."</p>
              <button id="preview-chimes-btn" class="px-5 py-2.5 rounded-full bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors flex items-center gap-2">
                <i data-lucide="volume-2" class="w-4 h-4"></i> <span>Play River Ambient Bells</span>
              </button>
            </div>
          </div>
        `;
        break;

      case 'music':
        toastString = "Playing Nostalgic Melodies: Vintage Radio";
        if (window.smritiAudio) window.smritiAudio.playMelodySnippet();
        contentHtml = `
          <div class="senior-preview-card p-6 sm:p-8 rounded-3xl bg-white border-2 border-indigo-200 shadow-md space-y-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <i data-lucide="music" class="w-6 h-6"></i>
                </div>
                <div>
                  <h4 class="senior-preview-title text-xl sm:text-2xl font-extrabold text-[#0F172A]">My Music</h4>
                  <p class="senior-preview-sub text-xs sm:text-sm text-slate-500 font-medium">Vintage Classics (1960–1980)</p>
                </div>
              </div>
              <span class="px-3 py-1 bg-indigo-50 text-indigo-800 rounded-full text-xs font-bold border border-indigo-200">Twilight Anchor</span>
            </div>

            <div class="p-6 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-full bg-slate-900 border-4 border-indigo-400 flex items-center justify-center text-indigo-300">
                  <i data-lucide="disc" class="w-8 h-8 animate-spin"></i>
                </div>
                <div>
                  <h5 class="text-base font-bold text-[#0F172A]">Lag Jaa Gale (1964)</h5>
                  <p class="text-xs text-slate-500">Madan Mohan • Lata Mangeshkar</p>
                </div>
              </div>
              <button id="preview-play-song-btn" class="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2">
                <i data-lucide="play" class="w-4 h-4"></i> <span>Play Song Snippet</span>
              </button>
            </div>
          </div>
        `;
        break;

      case 'games':
        toastString = "Starting Gentle Activity: Face Recognition";
        if (window.smritiAudio) window.smritiAudio.playSuccessChord();
        contentHtml = `
          <div class="senior-preview-card p-6 sm:p-8 rounded-3xl bg-white border-2 border-emerald-200 shadow-md space-y-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <i data-lucide="puzzle" class="w-6 h-6"></i>
                </div>
                <div>
                  <h4 class="senior-preview-title text-xl sm:text-2xl font-extrabold text-[#0F172A]">Play & Remember</h4>
                  <p class="senior-preview-sub text-xs sm:text-sm text-slate-500 font-medium">Gentle Familiarity Quiz</p>
                </div>
              </div>
              <span class="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">Zero Pressure</span>
            </div>

            <div class="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4 text-center">
              <span class="text-xs font-bold text-emerald-800 uppercase tracking-wider">Question 1 of 3</span>
              <h5 class="text-lg font-bold text-[#0F172A]">Who is visiting you from Delhi next week?</h5>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button class="tablet-quiz-btn p-3.5 rounded-2xl bg-white border-2 border-emerald-300 font-bold text-slate-800 hover:bg-emerald-100 transition-colors" data-correct="true">
                  ✓ Aryan (Grandson)
                </button>
                <button class="tablet-quiz-btn p-3.5 rounded-2xl bg-white border-2 border-slate-200 font-bold text-slate-800 hover:bg-slate-100 transition-colors" data-correct="false">
                  Hrisit (Neighbour)
                </button>
              </div>
              <div id="tablet-quiz-result" class="hidden text-xs font-bold text-emerald-900 pt-2">
                🎉 Wonderful recall, Maa! Aryan loves your homemade sweets.
              </div>
            </div>
          </div>
        `;
        break;

      case 'routine':
        toastString = "Today's Schedule: Chai Time & Verandah Walk";
        if (window.smritiAudio) window.smritiAudio.playChime(440, 0.5, 'sine');
        contentHtml = `
          <div class="senior-preview-card p-6 sm:p-8 rounded-3xl bg-white border-2 border-orange-200 shadow-md space-y-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-700">
                  <i data-lucide="clock" class="w-6 h-6"></i>
                </div>
                <div>
                  <h4 class="senior-preview-title text-xl sm:text-2xl font-extrabold text-[#0F172A]">Today's Routine</h4>
                  <p class="senior-preview-sub text-xs sm:text-sm text-slate-500 font-medium">Tuesday, 25 August</p>
                </div>
              </div>
              <span class="px-3 py-1 bg-orange-50 text-orange-800 rounded-full text-xs font-bold border border-orange-200">Daily Anchors</span>
            </div>

            <div class="space-y-3">
              <div class="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span class="font-bold text-[#0F172A] text-sm">7:00 AM — Morning Ginger Chai</span>
                </div>
                <span class="text-xs text-emerald-700 font-bold">✓ Completed</span>
              </div>

              <div class="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
                  <span class="font-bold text-[#0F172A] text-sm">10:00 AM — Verandah Walk with Son</span>
                </div>
                <span class="text-xs text-amber-800 font-bold">In 20 mins</span>
              </div>

              <div class="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="w-3 h-3 rounded-full bg-slate-300"></span>
                  <span class="font-bold text-slate-700 text-sm">5:30 PM — Twilight Melodies & Relaxation</span>
                </div>
                <span class="text-xs text-slate-400">Scheduled</span>
              </div>
            </div>
          </div>
        `;
        break;

      case 'talk':
        toastString = "Voice Assisted Recall: 'Would you like to hear a story?'";
        if (window.smritiAudio) window.smritiAudio.speakText("Maa, would you like to hear about Diwali in 1984?");
        contentHtml = `
          <div class="senior-preview-card p-6 sm:p-8 rounded-3xl bg-white border-2 border-purple-200 shadow-md space-y-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <i data-lucide="message-circle" class="w-6 h-6"></i>
                </div>
                <div>
                  <h4 class="senior-preview-title text-xl sm:text-2xl font-extrabold text-[#0F172A]">Talk & Recall</h4>
                  <p class="senior-preview-sub text-xs sm:text-sm text-slate-500 font-medium">Voice Companion</p>
                </div>
              </div>
              <span class="px-3 py-1 bg-purple-50 text-purple-800 rounded-full text-xs font-bold border border-purple-200">Listening</span>
            </div>

            <div class="p-6 rounded-2xl bg-purple-50/60 border border-purple-200 text-center space-y-4">
              <div class="w-16 h-16 rounded-full bg-purple-200 text-purple-900 flex items-center justify-center mx-auto animate-pulse">
                <i data-lucide="mic" class="w-8 h-8"></i>
              </div>
              <h5 class="text-lg font-bold text-[#0F172A]">"Maa, would you like to hear about Diwali in 1984?"</h5>
              <p class="text-xs text-slate-600">Speak naturally or press below to replay memory stories.</p>
              <button id="preview-speak-story-btn" class="px-6 py-2.5 rounded-full bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors inline-flex items-center gap-2">
                <i data-lucide="volume-2" class="w-4 h-4"></i> <span>Replay Spoken Story</span>
              </button>
            </div>
          </div>
        `;
        break;
    }

    previewContainer.innerHTML = contentHtml;
    mainGridView.classList.add('hidden');
    previewView.classList.remove('hidden');

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Attach internal event handlers for preview buttons
    const playVoiceBtn = previewContainer.querySelector('.play-voice-note-btn');
    if (playVoiceBtn && window.smritiAudio) {
      playVoiceBtn.addEventListener('click', () => {
        window.smritiAudio.speakText("Namaste Dadi! Kaisi ho aap? Aryan here from Delhi.");
      });
    }

    const playSrutiBtn = previewContainer.querySelector('.play-voice-sruti-btn');
    if (playSrutiBtn && window.smritiAudio) {
      playSrutiBtn.addEventListener('click', () => {
        window.smritiAudio.speakText("Dadi! Sruti here, I made your favorite besan ladoos today.");
      });
    }

    const previewChimes = previewContainer.querySelector('#preview-chimes-btn');
    if (previewChimes && window.smritiAudio) {
      previewChimes.addEventListener('click', () => {
        window.smritiAudio.playChime(659.25, 0.8, 'sine');
      });
    }

    const previewSong = previewContainer.querySelector('#preview-play-song-btn');
    if (previewSong && window.smritiAudio) {
      previewSong.addEventListener('click', () => {
        window.smritiAudio.playMelodySnippet();
      });
    }

    const speakStory = previewContainer.querySelector('#preview-speak-story-btn');
    if (speakStory && window.smritiAudio) {
      speakStory.addEventListener('click', () => {
        window.smritiAudio.speakText("In Diwali 1984, the entire family made 100 clay lamps on the verandah in Varanasi.");
      });
    }

    const tabletQuizBtns = previewContainer.querySelectorAll('.tablet-quiz-btn');
    tabletQuizBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const isCorrect = btn.dataset.correct === 'true';
        const resEl = previewContainer.querySelector('#tablet-quiz-result');
        if (isCorrect) {
          btn.classList.add('bg-emerald-100', 'border-emerald-500');
          if (resEl) resEl.classList.remove('hidden');
          if (window.smritiAudio) window.smritiAudio.playSuccessChord();
        } else {
          btn.classList.add('bg-rose-50', 'border-rose-300');
          if (window.smritiAudio) window.smritiAudio.playSoftTap();
        }
      });
    });

    showToast(toastString);
  }

  function closeSeniorScreen() {
    if (!mainGridView || !previewView) return;
    previewView.classList.add('hidden');
    mainGridView.classList.remove('hidden');
    if (window.smritiAudio) window.smritiAudio.playSoftTap();
    showToast("Returned to Senior Menu");
  }

  function showToast(text) {
    if (!toastMsg || !toastText) return;
    toastText.textContent = text;
    toastMsg.classList.remove('hidden');

    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
      toastMsg.classList.add('hidden');
    }, 4000);
  }
});
