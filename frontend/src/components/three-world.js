/**
 * SMRITI 3D MEMORY WORLD (Optimized Three.js WebGL Engine)
 * High-performance, battery-friendly 3D celestial orbit:
 * - Viewport-aware rendering (pauses render loop when hero is off-screen)
 * - Capped DPR (max 1.5) to eliminate GPU fill-rate bottlenecks
 * - Lightweight geometry & particle allocations
 * - Reduced motion support & zero layout thrashing
 */

class Smriti3DWorld {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.targetMouse = { x: 0, y: 0 };
    this.currentMouse = { x: 0, y: 0 };

    this.memoryObjects = [];
    this.filamentCurves = [];
    this.particleMesh = null;
    this.coreGroup = null;
    this.ambientLight = null;
    this.dirLight = null;
    this.fillLight = null;
    this.corePointLight = null;
    this.selectedObject = null;
    this.isInspecting = false;
    this.isTwilight = false;
    this.isVisible = true;
    this.rafId = null;
    this.clock = new THREE.Clock();

    // Check reduced motion preference
    this.prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Default Camera State (Framed to show narrative on left, 3D orbit on right)
    this.defaultCameraPos = new THREE.Vector3(0, 0, 19.5);
    this.defaultCameraLookAt = new THREE.Vector3(0, 0, 0);

    this.init();
  }

  init() {
    try {
      this.setupScene();
      this.setupLighting();
      this.createAtmosphere();
      this.createMemoryCore();
      this.createMemoryObjects();
      this.createFilaments();
      this.updateCameraFraming();
      this.setupVisibilityObserver();
      this.addEventListeners();
      this.setupHUD();
      this.startAnimation();
    } catch (err) {
      console.warn('Smriti 3D WebGL fallback triggered:', err);
    }
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xFDFBF7, 0.022);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(this.defaultCameraLookAt);

    // Performance Cap: DPR capped at 1.5 to prevent 3x/4x mobile GPU fill-rate thrashing
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: dpr <= 1.5,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'mediump'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(dpr);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xFFFBEB, 1.4);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.8);
    this.dirLight.position.set(14, 18, 16);
    this.scene.add(this.dirLight);

    this.corePointLight = new THREE.PointLight(0xF59E0B, 3.8, 32);
    this.corePointLight.position.set(6.8, 0.2, 0);
    this.scene.add(this.corePointLight);

    this.fillLight = new THREE.PointLight(0xE11D48, 1.2, 22);
    this.fillLight.position.set(-6, -6, 8);
    this.scene.add(this.fillLight);
  }

  setTwilightMode(isTwilight) {
    this.isTwilight = isTwilight;
    if (!this.scene) return;

    if (this.scene.fog) {
      this.scene.fog.color.setHex(isTwilight ? 0x13161F : 0xFDFBF7);
      this.scene.fog.density = isTwilight ? 0.028 : 0.022;
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(isTwilight ? 0x1E2438 : 0xFFFBEB);
      this.ambientLight.intensity = isTwilight ? 1.6 : 1.4;
    }
    if (this.dirLight) {
      this.dirLight.color.setHex(isTwilight ? 0xE2E8F0 : 0xFFFFFF);
    }
    if (this.corePointLight) {
      this.corePointLight.intensity = isTwilight ? 4.8 : 3.8;
    }
  }

  createAtmosphere() {
    // Lightweight count: 180 particles (lightweight, zero frame drops)
    const count = window.innerWidth < 768 ? 90 : 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.28) * 44;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 1)');
    gradient.addColorStop(0.4, 'rgba(253, 230, 138, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.38,
      map: texture,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleMesh = new THREE.Points(geometry, material);
    this.scene.add(this.particleMesh);
  }

  createMemoryCore() {
    this.coreGroup = new THREE.Group();
    this.coreGroup.position.set(6.8, 0.2, 0);

    // 1. Inner core sphere (enlarged for rich, premium visual presence)
    const innerGeo = new THREE.SphereGeometry(1.4, 24, 24);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xF59E0B,
      emissive: 0xD97706,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.1
    });
    const innerCore = new THREE.Mesh(innerGeo, innerMat);
    this.coreGroup.add(innerCore);

    // 2. Translucent outer shell
    const outerGeo = new THREE.SphereGeometry(1.9, 24, 24);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xFEF3C7,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2
    });
    const outerShell = new THREE.Mesh(outerGeo, outerMat);
    this.coreGroup.add(outerShell);

    // 3. Expanded orbit tracks filling the right-hand spatial area
    this.orbitRings = [];
    const ringConfigs = [
      { radius: 3.8, tube: 0.024, rotX: Math.PI / 4.5, rotY: 0.1, color: 0xD97706 },
      { radius: 5.4, tube: 0.020, rotX: -Math.PI / 5, rotY: Math.PI / 3.5, color: 0xF59E0B },
      { radius: 7.0, tube: 0.016, rotX: Math.PI / 3.2, rotY: -Math.PI / 4, color: 0xE11D48 }
    ];

    ringConfigs.forEach((cfg) => {
      const ringGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 12, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.45,
        roughness: 0.3,
        metalness: 0.3
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.set(cfg.rotX, cfg.rotY, 0);
      this.coreGroup.add(ring);
      this.orbitRings.push(ring);

      const beadGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const beadMat = new THREE.MeshBasicMaterial({ color: 0xFFFBEB });
      const bead = new THREE.Mesh(beadGeo, beadMat);
      bead.position.set(cfg.radius, 0, 0);
      ring.add(bead);
    });

    this.scene.add(this.coreGroup);
  }

  createCanvasTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (type === 'aryan') {
      const grad = ctx.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, '#FFE4E6');
      grad.addColorStop(1, '#FECDD3');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = '#E11D48';
      ctx.beginPath();
      ctx.arc(128, 90, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(128, 155, 55, 35, 0, 0, Math.PI, true);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Aryan (Grandson)', 128, 195);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 12px sans-serif';
      ctx.fillText('Delhi Visit • Voice Note', 128, 220);
    } else if (type === 'varanasi') {
      const grad = ctx.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, '#D1FAE5');
      grad.addColorStop(1, '#A7F3D0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = '#059669';
      ctx.fillRect(78, 110, 100, 35);
      ctx.fillRect(93, 90, 70, 20);
      ctx.beginPath();
      ctx.arc(128, 75, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Varanasi Ghats', 128, 195);

      ctx.fillStyle = '#64748B';
      ctx.font = '600 12px sans-serif';
      ctx.fillText('Ganga Aarti • 1978', 128, 220);
    } else if (type === 'vinyl-label') {
      ctx.fillStyle = '#D97706';
      ctx.fillRect(0, 0, 256, 256);

      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(128, 128, 105, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(110, 110, 12, 0, Math.PI * 2);
      ctx.arc(146, 100, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(119, 60, 8, 50);
      ctx.fillRect(155, 50, 8, 50);
      ctx.fillRect(119, 50, 44, 12);

      ctx.font = 'bold 19px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Lag Jaa Gale', 128, 160);

      ctx.font = '600 12px sans-serif';
      ctx.fillText('Vintage Classic • 1964', 128, 185);
    }

    return new THREE.CanvasTexture(canvas);
  }

  createMemoryObjects() {
    const frameGeo = new THREE.BoxGeometry(2.6, 3.2, 0.15);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.25,
      metalness: 0.05
    });

    // Object 1: Polaroid Frame (Aryan) — Positioned at the inner-left arc of constellation (clear of text)
    const aryanGroup = new THREE.Group();
    aryanGroup.position.set(3.4, 2.8, 3.4);
    aryanGroup.rotation.set(0.08, 0.22, -0.04);

    const frameMesh1 = new THREE.Mesh(frameGeo, frameMat);
    aryanGroup.add(frameMesh1);

    const photoGeo = new THREE.PlaneGeometry(2.2, 2.2);
    const photoMat1 = new THREE.MeshBasicMaterial({ map: this.createCanvasTexture('aryan') });
    const photoMesh1 = new THREE.Mesh(photoGeo, photoMat1);
    photoMesh1.position.set(0, 0.3, 0.08);
    aryanGroup.add(photoMesh1);

    const pinGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xE11D48, roughness: 0.2 });
    const pin1 = new THREE.Mesh(pinGeo, pinMat);
    pin1.position.set(0, 1.45, 0.1);
    aryanGroup.add(pin1);

    aryanGroup.userData = {
      id: 'aryan',
      title: 'Aryan',
      subtitle: 'Grandson (Age 19)',
      badge: 'Family Memory',
      quote: '"Family is where the familiar moments live. Aryan called yesterday from college."',
      actionText: 'Play Voice Greeting (0:14)',
      actionType: 'voice',
      initialPos: aryanGroup.position.clone(),
      initialRot: aryanGroup.rotation.clone()
    };

    this.scene.add(aryanGroup);
    this.memoryObjects.push(aryanGroup);

    // Object 2: 3D Vinyl Record Disc — Positioned at the upper-right flank of constellation
    const vinylGroup = new THREE.Group();
    vinylGroup.position.set(11.2, 3.2, 0.4);
    vinylGroup.rotation.set(0.35, -0.25, 0.15);

    const vinylGeo = new THREE.CylinderGeometry(1.7, 1.7, 0.08, 32);
    const vinylMat = new THREE.MeshStandardMaterial({
      color: 0x0F172A,
      roughness: 0.4,
      metalness: 0.7
    });
    const vinylDisc = new THREE.Mesh(vinylGeo, vinylMat);
    vinylDisc.rotation.x = Math.PI / 2;
    vinylGroup.add(vinylDisc);

    const labelGeo = new THREE.CircleGeometry(0.8, 24);
    const labelMat = new THREE.MeshBasicMaterial({ map: this.createCanvasTexture('vinyl-label') });
    const labelFront = new THREE.Mesh(labelGeo, labelMat);
    labelFront.position.set(0, 0, 0.05);
    vinylGroup.add(labelFront);

    vinylGroup.userData = {
      id: 'song',
      title: 'Lag Jaa Gale (1964)',
      subtitle: 'Retro Classic Melody • 1964',
      badge: 'Retro Melody',
      quote: '"Playing this wedding song during evening twilight calms anxiety and brings instant smiles."',
      actionText: 'Play Chime Melody Snippet',
      actionType: 'melody',
      initialPos: vinylGroup.position.clone(),
      initialRot: vinylGroup.rotation.clone()
    };

    this.scene.add(vinylGroup);
    this.memoryObjects.push(vinylGroup);

    // Object 3: Heritage Varanasi Photo — Positioned at the lower-mid quadrant (clear of CTAs)
    const placeGroup = new THREE.Group();
    placeGroup.position.set(4.2, -3.2, 2.6);
    placeGroup.rotation.set(-0.12, 0.18, 0.08);

    const placeFrame = new THREE.Mesh(frameGeo, frameMat);
    placeGroup.add(placeFrame);

    const placePhotoMat = new THREE.MeshBasicMaterial({ map: this.createCanvasTexture('varanasi') });
    const placePhoto = new THREE.Mesh(photoGeo, placePhotoMat);
    placePhoto.position.set(0, 0.3, 0.08);
    placeGroup.add(placePhoto);

    const pin2 = new THREE.Mesh(pinGeo, new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.2 }));
    pin2.position.set(0, 1.45, 0.1);
    placeGroup.add(pin2);

    placeGroup.userData = {
      id: 'place',
      title: 'Dashashwamedh Ghat',
      subtitle: 'Varanasi, Uttar Pradesh • 1978',
      badge: 'Childhood Home',
      quote: '"Hometown river steps where Maa walked every morning before moving to Delhi."',
      actionText: 'Play River Ambient Chimes',
      actionType: 'chime',
      initialPos: placeGroup.position.clone(),
      initialRot: placeGroup.rotation.clone()
    };

    this.scene.add(placeGroup);
    this.memoryObjects.push(placeGroup);

    // Object 4: Ginger Chai Cup — Positioned at the lower-right flank
    const chaiGroup = new THREE.Group();
    chaiGroup.position.set(10.6, -2.6, 2.0);
    chaiGroup.rotation.set(0.2, -0.15, 0.05);

    const cupGeo = new THREE.CylinderGeometry(0.85, 0.65, 1.1, 20);
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xFFFBEB, roughness: 0.25 });
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.y = 0.55;
    chaiGroup.add(cup);

    const saucerGeo = new THREE.CylinderGeometry(1.3, 1.1, 0.12, 20);
    const saucerMat = new THREE.MeshStandardMaterial({ color: 0xD97706, roughness: 0.35, metalness: 0.3 });
    const saucer = new THREE.Mesh(saucerGeo, saucerMat);
    chaiGroup.add(saucer);

    const teaGeo = new THREE.CircleGeometry(0.8, 20);
    const teaMat = new THREE.MeshStandardMaterial({ color: 0x92400E, roughness: 0.15 });
    const tea = new THREE.Mesh(teaGeo, teaMat);
    tea.rotation.x = -Math.PI / 2;
    tea.position.set(0, 1.05, 0);
    chaiGroup.add(tea);

    chaiGroup.userData = {
      id: 'routine',
      title: 'Morning Ginger Chai',
      subtitle: '7:00 AM Verandah Ritual',
      badge: 'Daily Comfort',
      quote: '"A warm cup of ginger tea with fresh Tulsi leaves to start every calm morning."',
      actionText: 'View Morning Routine',
      actionType: 'routine',
      initialPos: chaiGroup.position.clone(),
      initialRot: chaiGroup.rotation.clone()
    };

    this.scene.add(chaiGroup);
    this.memoryObjects.push(chaiGroup);
  }

  createFilaments() {
    const corePos = new THREE.Vector3(6.8, 0.2, 0);

    this.memoryObjects.forEach((obj, index) => {
      const start = obj.position.clone();
      const mid = new THREE.Vector3(
        (start.x + corePos.x) / 2,
        (start.y + corePos.y) / 2,
        (start.z + corePos.z) / 2
      );

      const curve = new THREE.CatmullRomCurve3([start, mid, corePos]);
      const points = curve.getPoints(24); // 24 points instead of 50
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.LineDashedMaterial({
        color: index % 2 === 0 ? 0xF59E0B : 0xE11D48,
        dashSize: 0.4,
        gapSize: 0.2,
        transparent: true,
        opacity: 0.3,
        linewidth: 1
      });

      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      this.scene.add(line);
      this.filamentCurves.push(line);
    });
  }

  updateCameraFraming() {
    if (!this.camera) return;
    const width = window.innerWidth;
    if (width >= 1024) {
      this.defaultCameraPos.set(0, 0, 19.5);
      this.defaultCameraLookAt.set(0, 0, 0);
    } else if (width >= 768) {
      this.defaultCameraPos.set(3.5, -0.6, 23);
      this.defaultCameraLookAt.set(3.5, -0.6, 0);
    } else {
      this.defaultCameraPos.set(4.5, -1.0, 25);
      this.defaultCameraLookAt.set(4.5, -1.0, 0);
    }

    if (!this.isInspecting) {
      this.camera.position.copy(this.defaultCameraPos);
      this.camera.lookAt(this.defaultCameraLookAt);
    }
  }

  // BOTTLENECK FIX: Viewport Intersection Observer (Pauses 3D RAF loop when scrolled past Hero)
  setupVisibilityObserver() {
    const heroSection = document.getElementById('hero');
    if (!heroSection || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!this.isVisible) {
            this.isVisible = true;
            this.startAnimation();
          }
        } else {
          this.isVisible = false;
          if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
          }
        }
      });
    }, {
      root: null,
      threshold: 0.05
    });

    observer.observe(heroSection);
  }

  addEventListeners() {
    // Debounced Resize
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.onResize(), 150);
    }, { passive: true });

    // Subtle Cursor Parallax with Damping (Desktop Only)
    if (!this.prefersReducedMotion && window.innerWidth > 768) {
      window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.targetMouse.x = x;
        this.targetMouse.y = y;
      }, { passive: true });
    }

    // 3D Object Click Raycasting
    this.container.addEventListener('click', (e) => {
      if (this.isInspecting) return;

      const rect = this.container.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const clickY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera({ x: clickX, y: clickY }, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      if (intersects.length > 0) {
        let hitGroup = null;
        let current = intersects[0].object;
        while (current.parent && current.parent !== this.scene) {
          if (current.userData && current.userData.id) {
            hitGroup = current;
            break;
          }
          current = current.parent;
        }

        if (hitGroup && hitGroup.userData && hitGroup.userData.id) {
          this.inspectMemory(hitGroup);
        }
      }
    });
  }

  setupHUD() {
    this.hud = document.getElementById('memory-inspect-hud');
    this.hudClose = document.getElementById('hud-close-btn');
    this.hudBadge = document.getElementById('hud-badge');
    this.hudTitle = document.getElementById('hud-title');
    this.hudSubtitle = document.getElementById('hud-subtitle');
    this.hudQuote = document.getElementById('hud-quote');
    this.hudAction = document.getElementById('hud-action-btn');

    if (this.hudClose) {
      this.hudClose.addEventListener('click', () => this.resetView());
    }

    if (this.hudAction) {
      this.hudAction.addEventListener('click', () => {
        if (this.selectedObject && window.smritiAudio) {
          const type = this.selectedObject.userData.actionType;
          if (type === 'voice') {
            window.smritiAudio.speakText("Namaste Dadi! Kaisi ho aap? Aryan here from Delhi.");
          } else if (type === 'melody') {
            window.smritiAudio.playMelodySnippet();
          } else {
            window.smritiAudio.playSuccessChord();
          }
        }
      });
    }
  }

  inspectMemory(objectGroup) {
    this.isInspecting = true;
    this.selectedObject = objectGroup;

    if (window.smritiAudio) {
      window.smritiAudio.playChime(659.25, 0.6, 'sine');
    }

    const data = objectGroup.userData;
    if (this.hudTitle) this.hudTitle.textContent = data.title;
    if (this.hudSubtitle) this.hudSubtitle.textContent = data.subtitle;
    if (this.hudBadge) this.hudBadge.textContent = data.badge;
    if (this.hudQuote) this.hudQuote.textContent = data.quote;
    if (this.hudAction) this.hudAction.innerHTML = `<span>▶ ${data.actionText}</span>`;

    if (this.hud) {
      this.hud.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
      this.hud.classList.add('opacity-100', 'translate-y-0');
    }

    if (window.gsap && !this.prefersReducedMotion) {
      const targetPos = objectGroup.position.clone().add(new THREE.Vector3(0, 0, 4.5));
      gsap.to(this.camera.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: 0.9,
        ease: 'power2.out'
      });

      this.memoryObjects.forEach((obj) => {
        if (obj !== objectGroup) {
          gsap.to(obj.scale, { x: 0.8, y: 0.8, z: 0.8, duration: 0.6 });
        } else {
          gsap.to(obj.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.6 });
        }
      });
    }
  }

  resetView() {
    this.isInspecting = false;
    this.selectedObject = null;

    if (this.hud) {
      this.hud.classList.remove('opacity-100', 'translate-y-0');
      this.hud.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
    }

    if (window.smritiAudio) {
      window.smritiAudio.playSoftTap();
    }

    if (window.gsap && !this.prefersReducedMotion) {
      gsap.to(this.camera.position, {
        x: this.defaultCameraPos.x,
        y: this.defaultCameraPos.y,
        z: this.defaultCameraPos.z,
        duration: 0.9,
        ease: 'power2.out'
      });

      this.memoryObjects.forEach((obj) => {
        gsap.to(obj.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.6 });
      });
    }
  }

  onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.updateCameraFraming();
  }

  startAnimation() {
    if (this.rafId) return;
    const loop = () => {
      if (!this.isVisible) return;
      this.renderFrame();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  renderFrame() {
    if (this.prefersReducedMotion) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const elapsedTime = this.clock.getElapsedTime();

    // Lerp mouse coordinates
    this.currentMouse.x += (this.targetMouse.x - this.currentMouse.x) * 0.05;
    this.currentMouse.y += (this.targetMouse.y - this.currentMouse.y) * 0.05;

    // 1. Camera Parallax Tilt (when not inspecting)
    if (!this.isInspecting && window.innerWidth > 768) {
      this.camera.position.x = this.defaultCameraPos.x + this.currentMouse.x * 1.0;
      this.camera.position.y = this.defaultCameraPos.y + this.currentMouse.y * 0.8;
      this.camera.lookAt(this.defaultCameraLookAt);
    }

    // 2. Core Breathing Scale & Rotation
    if (this.coreGroup) {
      this.coreGroup.rotation.y = elapsedTime * 0.1;
      const coreScale = 1.0 + Math.sin(elapsedTime * 1.2) * 0.03;
      this.coreGroup.scale.set(coreScale, coreScale, coreScale);

      if (this.orbitRings) {
        this.orbitRings[0].rotation.z += 0.004;
        this.orbitRings[1].rotation.z -= 0.003;
        this.orbitRings[2].rotation.z += 0.002;
      }
    }

    // 3. Floating 3D Memory Objects Wave Motion
    this.memoryObjects.forEach((obj, idx) => {
      const time = elapsedTime + idx * 1.5;
      obj.position.y = obj.userData.initialPos.y + Math.sin(time * 0.6) * 0.12;
      obj.rotation.y = obj.userData.initialRot.y + Math.cos(time * 0.4) * 0.05;

      if (obj.userData.id === 'song') {
        obj.rotation.z += 0.006;
      }
    });

    // 4. Stardust Particle Atmosphere Rotation
    if (this.particleMesh) {
      this.particleMesh.rotation.y = elapsedTime * 0.008;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize 3D World on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.smriti3D = new Smriti3DWorld('three-hero-viewport');
});
