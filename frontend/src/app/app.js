/**
 * SMRITI APPLICATION COORDINATOR (High Performance & Zero-Jank Engine)
 * - Single authoritative scroll driver (Lenis) with RAF synchronization
 * - Zero layout thrashing (pre-cached DOM metrics, zero offsetTop in scroll loops)
 * - GPU-composited progress bar via transform: scaleX()
 * - Viewport-scoped IntersectionObservers for scroll reveals
 * - Full prefers-reduced-motion compliance
 */

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('main-nav');
  const mobileToggle = document.getElementById('mobile-toggle-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const navSoundBtn = document.getElementById('nav-sound-btn');
  const navSoundIcon = document.getElementById('nav-sound-icon');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const progressBar = document.getElementById('scroll-progress-bar');
  const dotNavItems = document.querySelectorAll('.scroll-dot-item');

  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // =========================================================================
  // 1. SINGLE SCROLL DRIVER: LENIS INERTIA ENGINE
  // =========================================================================
  let lenis = null;
  if (typeof Lenis !== 'undefined' && !prefersReducedMotion) {
    lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      touchMultiplier: 1.5,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    window.lenisInstance = lenis;
  }

  // =========================================================================
  // 2. PRE-CACHED METRICS FOR ZERO-LAYOUT-THRASHING
  // =========================================================================
  const sectionIds = ['hero', 'how-it-works', 'personalization', 'senior-experience', 'cognitive-activities', 'trust'];
  let cachedSectionBounds = [];
  let cachedDocLimit = 1;
  let cachedHowItWorks = { top: 0, height: 1 };
  let howItWorksCards = [];

  function measureDOMMetrics() {
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    cachedDocLimit = Math.max(1, docHeight - winHeight);

    const headerOffset = 100;
    cachedSectionBounds = sectionIds.map(id => {
      const el = document.getElementById(id);
      if (!el) return { id, top: 0, bottom: 0 };
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.pageYOffset - headerOffset;
      const bottom = top + el.offsetHeight;
      return { id, top, bottom };
    });

    const hwEl = document.getElementById('how-it-works');
    if (hwEl) {
      const rect = hwEl.getBoundingClientRect();
      const top = rect.top + window.pageYOffset - 180;
      cachedHowItWorks = { top, height: Math.max(1, hwEl.offsetHeight) };
      howItWorksCards = Array.from(hwEl.querySelectorAll('.depth-tilt-card'));
    }
  }

  // Measure initially and on debounced resize only
  measureDOMMetrics();
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(measureDOMMetrics, 200);
  }, { passive: true });

  // State caching to prevent redundant DOM writes
  let currentNavElevated = false;
  let currentActiveSection = 'hero';
  let currentActiveStageIndex = -1;

  // Optimized RAF-driven scroll tick
  function onScrollFrame(currentScrollY, progressRatio) {
    // 1. GPU Composited Top Progress Bar (ScaleX causes 0 layout reflows)
    if (progressBar) {
      const clamped = Math.min(Math.max(progressRatio, 0), 1);
      progressBar.style.transform = `scaleX(${clamped})`;
    }

    // 2. Navigation elevation state toggle
    const isElevated = currentScrollY > 20;
    if (isElevated !== currentNavElevated) {
      currentNavElevated = isElevated;
      if (nav) {
        if (isElevated) nav.classList.add('shadow-sm');
        else nav.classList.remove('shadow-sm');
      }
    }

    // 3. Side rail active dot indicator
    let matchedSection = 'hero';
    for (let i = cachedSectionBounds.length - 1; i >= 0; i--) {
      if (currentScrollY >= cachedSectionBounds[i].top) {
        matchedSection = cachedSectionBounds[i].id;
        break;
      }
    }

    if (matchedSection !== currentActiveSection) {
      currentActiveSection = matchedSection;
      dotNavItems.forEach(dot => {
        if (dot.dataset.target === matchedSection) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }

    // 4. Dynamic Journey Stage Active Indicator in "How It Works"
    if (howItWorksCards.length > 0) {
      const relY = currentScrollY - cachedHowItWorks.top;
      if (relY >= 0 && relY <= cachedHowItWorks.height) {
        const stageProgress = relY / cachedHowItWorks.height;
        let newStageIdx = 0;
        if (stageProgress > 0.65) newStageIdx = 2;
        else if (stageProgress > 0.3) newStageIdx = 1;
        else newStageIdx = 0;

        if (newStageIdx !== currentActiveStageIndex) {
          currentActiveStageIndex = newStageIdx;
          howItWorksCards.forEach((card, idx) => {
            const indicator = card.querySelector('.stage-badge-indicator');
            if (idx === newStageIdx) {
              card.classList.add('active-stage');
              if (indicator) {
                indicator.classList.remove('opacity-0');
                indicator.classList.add('opacity-100');
              }
            } else {
              card.classList.remove('active-stage');
              if (indicator) {
                indicator.classList.add('opacity-0');
                indicator.classList.remove('opacity-100');
              }
            }
          });
        }
      }
    }
  }

  // Hook into single scroll driver
  if (lenis) {
    lenis.on('scroll', ({ scroll, limit, progress }) => {
      onScrollFrame(scroll, progress || (scroll / cachedDocLimit));
    });
  } else {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          onScrollFrame(scrollY, scrollY / cachedDocLimit);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // Side Rail Dot Click
  dotNavItems.forEach(dot => {
    dot.addEventListener('click', () => {
      const targetId = dot.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        if (lenis) {
          lenis.scrollTo(targetEl, { offset: -70, duration: 1.0 });
        } else {
          const targetPosition = targetEl.getBoundingClientRect().top + window.pageYOffset - 70;
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
        if (window.smritiAudio) window.smritiAudio.playSoftTap();
      }
    });
  });

  // Smooth Anchor Navigation Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(targetEl, { offset: -70, duration: 1.0 });
        } else {
          const headerHeight = nav ? nav.offsetHeight : 80;
          const targetPosition = targetEl.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }

        if (window.smritiAudio) window.smritiAudio.playSoftTap();
      }
    });
  });

  // =========================================================================
  // 3. DAY / TWILIGHT SUN-TO-MOON MORPHING TOGGLE
  // =========================================================================
  const applyTheme = (isTwilight) => {
    // Add temporary transitioning class to prevent unwanted transition thrashing during scroll
    document.documentElement.classList.add('theme-transitioning');

    if (isTwilight) {
      document.documentElement.classList.add('twilight-mode');
      document.body.classList.add('twilight-mode');
    } else {
      document.documentElement.classList.remove('twilight-mode');
      document.body.classList.remove('twilight-mode');
    }

    if (window.smriti3D && typeof window.smriti3D.setTwilightMode === 'function') {
      window.smriti3D.setTwilightMode(isTwilight);
    }

    localStorage.setItem('smriti_theme_preference', isTwilight ? 'twilight' : 'day');

    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 500);
  };

  const savedTheme = localStorage.getItem('smriti_theme_preference');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTwilight = savedTheme ? savedTheme === 'twilight' : prefersDark;
  applyTheme(initialTwilight);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isCurrentlyTwilight = document.body.classList.contains('twilight-mode');
      const newTwilight = !isCurrentlyTwilight;
      applyTheme(newTwilight);

      if (window.smritiAudio) {
        window.smritiAudio.playChime(newTwilight ? 440 : 659.25, 0.4, 'sine');
      }
    });
  }

  // =========================================================================
  // 4. SOUND TOGGLE IN NAV BAR
  // =========================================================================
  if (navSoundBtn && window.smritiAudio) {
    navSoundBtn.addEventListener('click', () => {
      const isMuted = window.smritiAudio.toggleMute();
      if (isMuted) {
        navSoundBtn.classList.add('opacity-60');
        if (navSoundIcon) navSoundIcon.setAttribute('data-lucide', 'volume-x');
      } else {
        navSoundBtn.classList.remove('opacity-60');
        if (navSoundIcon) navSoundIcon.setAttribute('data-lucide', 'volume-2');
        window.smritiAudio.playChime(528, 0.4, 'sine');
      }
      if (window.lucide) window.lucide.createIcons();
    });
  }

  // =========================================================================
  // 5. MOBILE DRAWER MENU
  // =========================================================================
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
      if (window.smritiAudio) window.smritiAudio.playSoftTap();
    });

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // =========================================================================
  // 6. SCROLL-TRIGGERED REVEAL ANIMATIONS (INTERSECTION OBSERVER)
  // =========================================================================
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target); // Unobserve once revealed to free observer memory
        }
      });
    }, {
      root: null,
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px'
    });

    revealElements.forEach(el => observer.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('is-revealed'));
  }

  // =========================================================================
  // 7. LUCIDE ICONS
  // =========================================================================
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});
