# Smriti Design System (DESIGN.md)

> **Design Brief**: "A warm, editorial, cinematic landing page for a memory-care product for elderly users and their families. Cream/ivory base, warm gold and burnt-orange accents, soft pink and sage highlights — the palette already used on the current site. Rounded cards, soft shadows, generous whitespace, a gentle orbiting/constellation motif for photos and memories. Calm and reassuring, not clinical, not futuristic-neon. Think a cozy, cinematic scrollytelling site (Igloo Inc-style editorial motion) rather than a tech-startup dashboard."

---

## 1. Brand Philosophy & Aesthetic Core

* **Emotional Tone**: Compassionate, nostalgic, reassuring, tactile, and dignified. Never clinical, never sterile, and never high-tech neon.
* **Visual Motif**: Celestial orbits and constellations — memories, voices, photos, and loved ones orbiting around the senior like warm stars.
* **Accessibility Invariant**: Senior-first readability. Large touch targets (minimum 48px), high-contrast text modes, zero clutter, and clear feedback.

---

## 2. Color Palettes & Token Architecture

### 2.1. Day Mode (Default — Warm Alabaster)

| Token Name | Hex Code | HSL / CSS Equivalent | Purpose |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#FDFBF7` | `hsl(40, 50%, 98%)` | Main canvas, soft cream ivory |
| `--bg-surface` | `#FAF7F2` | `hsl(38, 33%, 96%)` | Subtle section backgrounds & recessed cards |
| `--bg-card` | `#FFFFFF` | `hsl(0, 0%, 100%)` | Elevated content cards & floating modules |
| `--bg-card-hover` | `#FFFDF9` | `hsl(40, 60%, 99%)` | Interactive hover state |
| `--border-subtle` | `rgba(15, 23, 42, 0.08)` | `#E2E8F0` | Default card and section dividers |
| `--border-accent` | `rgba(217, 119, 6, 0.30)` | `#FCD34D` | Active / highlighted elements |
| `--text-primary` | `#0F172A` | `hsl(222, 47%, 11%)` | High-contrast headline & body ink |
| `--text-secondary` | `#475569` | `hsl(215, 19%, 35%)` | Subheadings & supporting paragraphs |
| `--text-tertiary` | `#64748B` | `hsl(215, 16%, 47%)` | Captions, dates, metadata |
| `--accent-gold` | `#D97706` | `hsl(38, 92%, 44%)` | Primary brand gold / amber |
| `--accent-orange` | `#C2410C` | `hsl(18, 89%, 40%)` | Chai & routine highlights |
| `--accent-rose` | `#E11D48` | `hsl(347, 77%, 50%)` | Family members, love, memory triggers |
| `--accent-sage` | `#059669` | `hsl(160, 84%, 39%)` | Places, cognitive growth, verified badges |
| `--accent-indigo` | `#4338CA` | `hsl(244, 58%, 51%)` | Music, auditory nostalgia |
| `--shadow-soft` | `0 10px 30px -5px rgba(15, 23, 42, 0.06), 0 4px 6px -2px rgba(15, 23, 42, 0.03)` | — | Elevated cards |
| `--shadow-glow` | `0 20px 40px -10px rgba(217, 119, 6, 0.15)` | — | Warm focal glows |

### 2.2. Twilight Mode (Evening Tranquility — Sundowning Anchor)

Tied directly to Smriti's "Twilight Anchor" memory-care narrative. It calms anxiety during evening hours by shifting to warm charcoal and dark midnight navy with glowing starlight accents.

| Token Name | Hex Code | HSL / CSS Equivalent | Purpose |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#13161F` | `hsl(224, 24%, 10%)` | Deep twilight canvas, cozy midnight |
| `--bg-surface` | `#1A1D27` | `hsl(226, 20%, 13%)` | Secondary recessed surfaces |
| `--bg-card` | `#222634` | `hsl(227, 20%, 17%)` | Elevated dark cards |
| `--bg-card-hover` | `#2A2F40` | `hsl(227, 20%, 21%)` | Card hover state |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | — | Subtle card boundaries |
| `--border-accent` | `rgba(245, 158, 11, 0.40)` | `#F59E0B` | Highlighted borders |
| `--text-primary` | `#F8FAFC` | `hsl(210, 40%, 98%)` | Crisp readable text |
| `--text-secondary` | `#CBD5E1` | `hsl(214, 32%, 84%)` | Secondary body text |
| `--text-tertiary` | `#94A3B8` | `hsl(215, 20%, 65%)` | Metadata, tags |
| `--accent-gold` | `#FBBF24` | `hsl(41, 96%, 56%)` | Warmed starlight gold |
| `--accent-orange` | `#FB923C` | `hsl(27, 96%, 61%)` | Warm hearth orange |
| `--accent-rose` | `#FDA4AF` | `hsl(351, 95%, 82%)` | Soft blossom rose |
| `--accent-sage` | `#6EE7B7` | `hsl(156, 73%, 67%)` | Luminescent sage green |
| `--accent-indigo` | `#A5B4FC` | `hsl(228, 93%, 82%)` | Twilight lavender melody |
| `--shadow-soft` | `0 15px 35px -5px rgba(0, 0, 0, 0.45)` | — | Dark mode depth |
| `--shadow-glow` | `0 20px 45px -10px rgba(245, 158, 11, 0.18)` | — | Starlight orbital glow |

---

## 3. Typography Hierarchy

* **Primary Sans**: `Plus Jakarta Sans`, system-ui, -apple-system, sans-serif
* **Editorial Serif**: `Lora`, Georgia, serif (used for emotional quotes, Hindi/Sanskrit translations, and reflective headings)
* **Monospace Accent**: `ui-monospace`, SFMono-Regular, Menlo, Monaco, Consolas, monospace (for numbers `01`, `02`, timestamps)

### Scale & Hierarchy
* **Display H1**: `font-extrabold text-4xl sm:text-5xl lg:text-[3.25rem] tracking-tight leading-[1.12]`
* **Section H2**: `font-extrabold text-3xl sm:text-4xl tracking-tight text-[var(--text-primary)]`
* **Card H3 / Titles**: `font-bold text-xl sm:text-2xl`
* **Feature Subtitles**: `font-semibold text-sm sm:text-base text-[var(--text-secondary)]`
* **Body**: `font-normal text-base sm:text-lg leading-relaxed text-[var(--text-secondary)]`
* **Eyebrows / Badges**: `font-bold text-[11px] sm:text-xs uppercase tracking-widest`

---

## 4. Iconography Standards

* **Icon Set**: Lucide Icons SVG library (clean, rounded 2px stroke, harmonious bounding boxes).
* **Rule**: Zero raw text emojis used as primary UI button or card icons.
* **Role Color Tinting**:
  * Family / Grandchildren: Lucide `Heart` / `Users` / `Sparkles` with Rose tint (`#E11D48` / `#FDA4AF`)
  * Nostalgic Melodies: Lucide `Music` / `Disc` / `Volume-2` with Amber/Indigo tint
  * Heritage Places: Lucide `Compass` / `MapPin` / `Landmark` with Sage tint (`#059669` / `#6EE7B7`)
  * Daily Routines & Chai: Lucide `Clock` / `Coffee` / `Sun` with Orange tint (`#C2410C` / `#FB923C`)
  * Voice Recall / Audio: Lucide `Mic` / `Radio` / `MessageCircle` with Gold tint (`#D97706` / `#FBBF24`)
  * Accessibility & Senior Mode: Lucide `Eye` / `Type` / `Sliders` with Emerald tint

---

## 5. Motion & Scrollytelling System (Igloo Inc-Inspired)

* **Scroll Engine**: Lenis smooth inertia scrolling (`duration: 1.2, easing: cubic-bezier(0.16, 1, 0.3, 1)`).
* **Viewport Reveal**: GSAP / CSS Intersection Observer with soft slide-up (`translateY: 28px -> 0px`, `opacity: 0 -> 1`, duration `0.85s`).
* **3D Constellation Motion**:
  * Floating orbit elements gently breathe with continuous sinusoidal phase offsets (`Math.sin(t * 0.7)`).
  * Smooth mouse parallax with damping (`lerp: 0.05`).
  * Layered orbit tracks with distinct Z-depth spacing to prevent overlapping clutter.
* **Mode Transition**: Slow 500ms crossfade between Day and Twilight, fading starlight background dots from subtle sand grains to luminous stars.
* **Side Rail Scroll-Progress**: Floating dot nav indicating the active section with smooth expansion and title tooltips.

---

## 6. Senior Tablet Accessibility Guidelines

1. **Touch Target Size**: Every action card minimum `140px` height with generous padding (`24px`).
2. **Font Scaling**: Instant one-tap switch to `Large (24px)` type without layout breakage.
3. **Contrast Guarantee**: WCAG AAA compliance. In High-Contrast Mode: `#000000` deep black background, `#FCD34D` warm amber text, `#FFFFFF` crisp subtitles.
4. **Interactive Validation**: Every card triggers a tactile visual reaction, audible confirmation chime, and contextual reassurance modal/toast.
