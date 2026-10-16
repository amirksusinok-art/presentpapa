import * as THREE from 'three';
import { haptics } from './haptics.js';

/**
 * Web Audio Procedural Synthesizer for Space Rocket Launch
 */
class RocketAudioEngine {
  constructor() {
    this.ctx = null;
    this.rumbleNode = null;
    this.rumbleGain = null;
    this.ambientNodes = [];
    this.isPlayingRumble = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Double NASA radio link beep (Quindar tone)
  playRadioBeep() {
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2525, t);
    osc.frequency.setValueAtTime(2475, t + 0.12);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
    gain.gain.setValueAtTime(0.14, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.24);
  }

  // Pre-ignition turbine purge & cryo hiss
  playPreIgnitionHiss(duration = 2.5) {
    this.ensureContext();
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + duration);
    filter.Q.value = 3.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.2, t + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // Continuous deep rocket engine rumble with low-frequency oscillators & brown noise
  startRocketRumble() {
    if (this.isPlayingRumble) return;
    this.ensureContext();
    this.isPlayingRumble = true;

    const t = this.ctx.currentTime;

    // Sub-bass oscillator
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(42, t);

    // Brown noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, t);
    filter.frequency.linearRampToValueAtTime(320, t + 1.5);
    filter.Q.value = 4.0;

    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.setValueAtTime(0.01, t);
    this.rumbleGain.gain.linearRampToValueAtTime(0.55, t + 1.2);

    osc.connect(filter);
    noise.connect(filter);
    filter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.ctx.destination);

    osc.start(t);
    noise.start(t);

    this.rumbleNode = { osc, noise, filter };
  }

  // Smoothly fade out engine roar as rocket escapes into space
  fadeRocketRumble(duration = 2.0) {
    if (!this.isPlayingRumble || !this.rumbleGain) return;
    const t = this.ctx.currentTime;
    this.rumbleGain.gain.linearRampToValueAtTime(0.0001, t + duration);
    setTimeout(() => {
      try {
        if (this.rumbleNode) {
          this.rumbleNode.osc.stop();
          this.rumbleNode.noise.stop();
        }
      } catch {}
      this.isPlayingRumble = false;
    }, duration * 1000);
  }

  // Ethereal deep space synth ambient chord
  playSpaceAmbient() {
    this.ensureContext();
    const t = this.ctx.currentTime;
    // Frequencies for a grand, warm chord (C maj9: C3, G3, B3, D4, E4)
    const freqs = [130.81, 196.00, 246.94, 293.66, 329.63];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450 + idx * 80, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.045 / freqs.length, t + 2.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      this.ambientNodes.push({ osc, gain });
    });
  }

  stopSpaceAmbient(duration = 1.0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.ambientNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.linearRampToValueAtTime(0.0001, t + duration);
        setTimeout(() => osc.stop(), duration * 1000);
      } catch {}
    });
    this.ambientNodes = [];
  }

  // Heavy industrial mechanical relay switch click
  playRelayClick() {
    this.ensureContext();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // CRT Screen implosion sound (vintage cathode power-down)
  playCrtPowerDown() {
    this.ensureContext();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(8000, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.65);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.72);
  }
}

/**
 * Main Cinematic Interactive 3D Rocket Launch Screen
 */
export class CosmicRocketModule {
  constructor(container, onRestart) {
    this.container = container;
    this.onRestart = onRestart;
    this.audio = new RocketAudioEngine();

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animFrameId = null;
    this.clock = new THREE.Clock();

    // 3D Model Elements
    this.rocketGroup = null;
    this.boosterMesh = null;
    this.fairingLeft = null;
    this.fairingRight = null;
    this.payloadCapsule = null;
    this.capsulePetals = [];
    this.hologramProjector = null;
    this.flameCore = null;
    this.flamePlume = null;
    this.flameLight = null;
    this.groundSmoke = null;
    this.cryoParticles = null;
    this.flameParticles = null;
    this.flameParticleData = [];
    this.earthGroup = null;
    this.starfield = null;
    this.launchPadGroup = null;

    // States: 'idle' | 'countdown' | 'liftoff' | 'orbit' | 'off'
    this.phase = 'idle';
    this.liftoffTime = 0;
    this.altitude = 0;
    this.shakeIntensity = 0;

    // Camera control targets
    this.cameraTargetPos = new THREE.Vector3(0, 3.8, 11);
    this.cameraLookTarget = new THREE.Vector3(0, 3.2, 0);
  }

  init() {
    this.renderUI();
    this.initThree();
    this.setupListeners();
  }

  renderUI() {
    this.container.innerHTML = `
      <div class="rocket-viewport" id="rocket-viewport">
        <!-- 3D Canvas Mount -->
        <div class="rocket-canvas-container" id="rocket-canvas-container"></div>

        <!-- Clean Cinematic Overlay -->
        <div class="rocket-hud" id="rocket-hud">

          <!-- Center Massive Countdown Display -->
          <div class="rocket-countdown-overlay" id="rocket-countdown-overlay" aria-hidden="true">
            <div class="countdown-digit" id="countdown-digit">3</div>
            <div class="countdown-subtext" id="countdown-subtext">СИСТЕМЫ ГОТОВЫ К ЗАПУСКУ</div>
          </div>

          <!-- Hologram Message Card (Deploys in Orbit) -->
          <div class="rocket-hologram-wrap" id="rocket-hologram-wrap">
            <div class="hologram-card">
              <div class="hologram-beam-ring"></div>
              <div class="hologram-header">
                <span class="hologram-icon">★</span>
                <span class="hologram-badge">ОРБИТАЛЬНОЕ ПОСЛАНИЕ // ОФИЦИАЛЬНО</span>
              </div>
              
              <h2 class="hologram-title">ПАПА, С ДНЁМ РОЖДЕНИЯ!</h2>
              <div class="hologram-divider"></div>
              
              <p class="hologram-text">
                Ты — наш главный ориентир, наша надёжная опора и капитан всей нашей семьи.
                Спасибо за твою безграничную мудрость, силу, доброту и веру в нас.
              </p>
              
              <p class="hologram-signature">
                С бесконечной любовью и гордостью — твоя семья! ❤️
              </p>

              <!-- Final Controls in Orbit -->
              <div class="hologram-controls">
                <button id="btn-rocket-repeat" class="btn btn-luxury rocket-action-btn">
                  <span>Повторить запуск ↺</span>
                </button>

                <!-- Clean emergency power cutoff button -->
                <button id="btn-breaker-lever" class="emergency-power-btn" aria-label="Завершить миссию и погасить свет">
                  <span class="power-glow-dot" aria-hidden="true"></span>
                  <span class="power-btn-text">ЗАВЕРШИТЬ МИССИЮ И ПОГАСИТЬ СВЕТ</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Bottom Action Bar (Phase 1 launch trigger) -->
          <div class="rocket-bottom-controls" id="rocket-bottom-controls">
            <button id="btn-activate-launch" class="btn-launch-activation" aria-label="Активировать запуск ракеты" autofocus>
              <span class="launch-btn-halo" aria-hidden="true"></span>
              <span class="launch-btn-inner">
                <span class="launch-beacon-dot" aria-hidden="true"></span>
                <span class="launch-btn-text">АКТИВИРОВАТЬ ЗАПУСК</span>
                <svg class="launch-btn-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </button>
          </div>
        </div>

        <!-- CRT Screen Off Collapse Effect Layer -->
        <div class="crt-off-overlay" id="crt-off-overlay">
          <div class="crt-white-dot" id="crt-white-dot"></div>
        </div>

        <!-- Post-Credits Warm Message Layer ("Сцена после титров: Иди обниматься!") -->
        <div class="post-credits-overlay" id="post-credits-overlay">
          <div class="post-credits-heart">❤️</div>
          <div class="post-credits-box">
            <p class="post-credits-code">БОРТОВОЙ КОМПЬЮТЕР ПЕРЕВЕДЁН В СПЯЩИЙ РЕЖИМ.<br/>МИССИЯ ВЫПОЛНЕНА НА 100%.</p>
            <h3 class="post-credits-title">
              А теперь отложи телефон и обними тех,<br/>кто сидит рядом с тобой!
            </h3>
            <button id="btn-post-restart" class="btn btn-luxury post-restart-btn">
              <span>Вернуться в начало ↺</span>
            </button>
          </div>
        </div>

      </div>
    `;

    // Cache UI Elements
    this.btnActivate = this.container.querySelector('#btn-activate-launch');
    this.countdownOverlay = this.container.querySelector('#rocket-countdown-overlay');
    this.countdownDigit = this.container.querySelector('#countdown-digit');
    this.countdownSubtext = this.container.querySelector('#countdown-subtext');
    this.hologramWrap = this.container.querySelector('#rocket-hologram-wrap');
    this.bottomControls = this.container.querySelector('#rocket-bottom-controls');
    this.btnBreakerLever = this.container.querySelector('#btn-breaker-lever');
    this.btnRocketRepeat = this.container.querySelector('#btn-rocket-repeat');
    this.crtOverlay = this.container.querySelector('#crt-off-overlay');
    this.postCreditsOverlay = this.container.querySelector('#post-credits-overlay');
    this.btnPostRestart = this.container.querySelector('#btn-post-restart');
  }

  createSoftParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.75)');
    grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.25)');
    grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  initThree() {
    const mount = this.container.querySelector('#rocket-canvas-container');
    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    this.softTexture = this.createSoftParticleTexture();

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.022);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 1000);
    this.camera.position.copy(this.cameraTargetPos);
    this.camera.lookAt(this.cameraLookTarget);

    // 3. Renderer
    const isMobile = window.innerWidth < 768;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    mount.appendChild(this.renderer.domElement);

    // 4. Construct 3D Elements in strict order: Rocket first so parented lights & effects bind reliably
    this.createRocket();
    this.createLaunchPad();
    this.createEarth();
    this.createStarfield();
    this.createLights();
    this.createCryoSteam();
    this.createFlameAndSmoke();

    // Do NOT run render loop until rocket screen is active
    this.isPaused = true;
  }

  startRendering() {
    if (!this.isPaused && this.animFrameId) return;
    this.isPaused = false;
    this.clock.getDelta();
    this.onWindowResize();
    requestAnimationFrame(() => {
      this.onWindowResize();
    });
    setTimeout(() => {
      this.onWindowResize();
    }, 60);
    this.animate();
  }

  stopRendering() {
    this.isPaused = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  createLights() {
    // 1. Ambient night sky blue fill
    const ambient = new THREE.AmbientLight(0x283b58, 2.4);
    this.scene.add(ambient);

    // 2. Main Spaceport Key Xenon Floodlight (Front-Right)
    const keyLight = new THREE.DirectionalLight(0xe0f2fe, 4.0);
    keyLight.position.set(6, 14, 10);
    this.scene.add(keyLight);

    // 3. Secondary Fill Floodlight (Front-Left)
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 2.4);
    fillLight.position.set(-8, 10, 8);
    this.scene.add(fillLight);

    // 4. Golden Rim Light (from behind)
    const rimLight = new THREE.DirectionalLight(0xfcd34d, 3.4);
    rimLight.position.set(-6, 12, -10);
    this.scene.add(rimLight);

    // 5. Upward Ground Launchpad Floodlights (aimed at rocket booster core)
    this.padSpot1 = new THREE.SpotLight(0xffedd5, 4.5, 25, Math.PI / 3, 0.4);
    this.padSpot1.position.set(3.2, 0.2, 3.2);
    this.padSpot1.target.position.set(0, 4, 0);
    this.scene.add(this.padSpot1);
    this.scene.add(this.padSpot1.target);

    this.padSpot2 = new THREE.SpotLight(0xdbeafe, 4.0, 25, Math.PI / 3, 0.4);
    this.padSpot2.position.set(-3.2, 0.2, 3.2);
    this.padSpot2.target.position.set(0, 4, 0);
    this.scene.add(this.padSpot2);
    this.scene.add(this.padSpot2.target);

    // 6. Tower red aviation warning beacon
    this.beaconLight = new THREE.PointLight(0xff2222, 2.0, 15);
    this.beaconLight.position.set(-3.2, 11.6, -1.2);
    this.scene.add(this.beaconLight);

    // 7. Engine Flame PointLight (dynamic intensity, moves with rocket)
    this.flameLight = new THREE.PointLight(0xff7700, 0, 50);
    this.flameLight.position.set(0, -0.6, 0);
    if (this.rocketGroup) {
      this.rocketGroup.add(this.flameLight);
    } else {
      this.scene.add(this.flameLight);
    }
  }

  createStarfield() {
    const isMobile = window.innerWidth < 768;
    const starCount = isMobile ? 450 : 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 250 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      transparent: true,
      opacity: 0.85
    });

    this.starfield = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starfield);
  }

  createEarth() {
    this.earthGroup = new THREE.Group();
    this.earthGroup.position.set(28, -65, -80);
    this.scene.add(this.earthGroup);

    // Planet sphere
    const earthGeo = new THREE.SphereGeometry(45, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x1b4d8f,
      roughness: 0.8,
      metalness: 0.15
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.earthGroup.add(earthMesh);

    // Atmospheric rim glow
    const atmosGeo = new THREE.SphereGeometry(46.3, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    this.earthGroup.add(atmosMesh);

    this.earthGroup.visible = false;
  }

  createLaunchPad() {
    this.launchPadGroup = new THREE.Group();
    this.launchPadGroup.position.set(0, 0, 0);
    this.scene.add(this.launchPadGroup);

    // Ground platform - detailed metallic spaceport concrete and steel
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x242d3c,
      roughness: 0.72,
      metalness: 0.45
    });
    const padGeo = new THREE.CylinderGeometry(7.0, 8.2, 0.9, 32);
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = -0.45;
    this.launchPadGroup.add(pad);

    // Inner flame trench rim ring
    const trenchMat = new THREE.MeshStandardMaterial({
      color: 0x141a24,
      roughness: 0.85,
      metalness: 0.2
    });
    const trenchGeo = new THREE.TorusGeometry(1.4, 0.15, 16, 32);
    trenchGeo.rotateX(Math.PI / 2);
    const trench = new THREE.Mesh(trenchGeo, trenchMat);
    trench.position.y = 0.02;
    this.launchPadGroup.add(trench);

    // Launch Gantry Tower (SpaceX / NASA red steel truss)
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.55,
      metalness: 0.5
    });
    const towerGeo = new THREE.BoxGeometry(0.85, 12.5, 0.85);
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(-3.2, 5.8, -1.2);
    this.launchPadGroup.add(tower);

    // Red warning beacon sphere on tower top
    const beaconGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(-3.2, 12.0, -1.2);
    this.launchPadGroup.add(beaconMesh);

    // Tower Service Arms
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.6
    });
    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 0.4), armMat);
    arm1.position.set(-1.8, 7.5, -0.6);
    this.launchPadGroup.add(arm1);

    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.35), armMat);
    arm2.position.set(-1.9, 4.4, -0.6);
    this.launchPadGroup.add(arm2);
  }

  createRocket() {
    this.rocketGroup = new THREE.Group();
    this.rocketGroup.position.set(0, 0, 0);
    this.scene.add(this.rocketGroup);

    // PBR Materials
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x3d495c,
      roughness: 0.35,
      metalness: 0.72
    });

    const polishedMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.28,
      metalness: 0.42
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf5d78e,
      roughness: 0.22,
      metalness: 0.92
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x1e2736,
      roughness: 0.45,
      metalness: 0.7
    });

    // 1. Booster Stage (Lower Cylinder)
    const boosterGeo = new THREE.CylinderGeometry(0.72, 0.72, 4.2, 32);
    this.boosterMesh = new THREE.Mesh(boosterGeo, titaniumMat);
    this.boosterMesh.position.y = 2.1;
    this.rocketGroup.add(this.boosterMesh);

    // Decorative aerodynamic raceway lines
    const racewayGeo = new THREE.BoxGeometry(0.06, 3.8, 0.08);
    const raceway1 = new THREE.Mesh(racewayGeo, darkTrimMat);
    raceway1.position.set(0.72, 2.1, 0);
    this.rocketGroup.add(raceway1);
    const raceway2 = new THREE.Mesh(racewayGeo, darkTrimMat);
    raceway2.position.set(-0.72, 2.1, 0);
    this.rocketGroup.add(raceway2);

    // Engine Skirt Ring & Nozzles
    const skirtGeo = new THREE.CylinderGeometry(0.74, 0.78, 0.4, 32);
    const skirt = new THREE.Mesh(skirtGeo, darkTrimMat);
    skirt.position.y = 0.2;
    this.rocketGroup.add(skirt);

    // 3 Rocket Engine Nozzles at base
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const nozzleGeo = new THREE.CylinderGeometry(0.12, 0.26, 0.5, 24, 1, true);
      const nozzle = new THREE.Mesh(nozzleGeo, darkTrimMat);
      nozzle.position.set(Math.cos(angle) * 0.32, -0.15, Math.sin(angle) * 0.32);
      this.rocketGroup.add(nozzle);
    }

    // 4 Base Stabilizer Fins with Gold Edge
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const finGroup = new THREE.Group();
      finGroup.rotation.y = angle;

      const finGeo = new THREE.BoxGeometry(0.05, 0.9, 0.7);
      const fin = new THREE.Mesh(finGeo, darkTrimMat);
      fin.position.set(0, 0.5, 0.85);
      finGroup.add(fin);

      const finTipGeo = new THREE.BoxGeometry(0.07, 0.1, 0.7);
      const finTip = new THREE.Mesh(finTipGeo, goldMat);
      finTip.position.set(0, 0.92, 0.85);
      finGroup.add(finTip);

      this.rocketGroup.add(finGroup);
    }

    // 2. Interstage Ring (Gold Accent)
    const interstageGeo = new THREE.CylinderGeometry(0.73, 0.73, 0.25, 32);
    const interstage = new THREE.Mesh(interstageGeo, goldMat);
    interstage.position.y = 4.3;
    this.rocketGroup.add(interstage);

    // 3. Second Stage Core (Polished Titanium / White)
    const secondStageGeo = new THREE.CylinderGeometry(0.72, 0.72, 2.6, 32);
    const secondStage = new THREE.Mesh(secondStageGeo, polishedMat);
    secondStage.position.y = 5.7;
    this.rocketGroup.add(secondStage);

    // Grid Fins (Gold Titanium)
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const gridGeo = new THREE.BoxGeometry(0.04, 0.32, 0.35);
      const gridFin = new THREE.Mesh(gridGeo, goldMat);
      gridFin.position.set(Math.cos(angle) * 0.88, 6.8, Math.sin(angle) * 0.88);
      gridFin.rotation.y = angle;
      this.rocketGroup.add(gridFin);
    }

    // 4. Payload Capsule (Inner Gold Core)
    const capsuleGeo = new THREE.CylinderGeometry(0.38, 0.44, 1.1, 32);
    this.payloadCapsule = new THREE.Mesh(capsuleGeo, goldMat);
    this.payloadCapsule.position.y = 7.45;
    this.rocketGroup.add(this.payloadCapsule);

    // Capsule Petals (4 hinged petals)
    this.capsulePetals = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const petalHinge = new THREE.Group();
      petalHinge.position.set(Math.cos(angle) * 0.36, 7.8, Math.sin(angle) * 0.36);
      petalHinge.rotation.y = angle;

      const petalGeo = new THREE.ConeGeometry(0.18, 0.65, 16);
      petalGeo.rotateZ(Math.PI);
      const petalMesh = new THREE.Mesh(petalGeo, goldMat);
      petalMesh.position.y = 0.32;
      petalHinge.add(petalMesh);

      this.rocketGroup.add(petalHinge);
      this.capsulePetals.push({ mesh: petalHinge, baseAngle: angle });
    }

    // Hologram Projector Beam Cone (Semi-transparent additive)
    const holoGeo = new THREE.ConeGeometry(1.6, 4.0, 32, 1, true);
    holoGeo.translate(0, 2.0, 0);
    const holoMat = new THREE.MeshBasicMaterial({
      color: 0xf5d78e,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.hologramProjector = new THREE.Mesh(holoGeo, holoMat);
    this.hologramProjector.position.y = 8.0;
    this.rocketGroup.add(this.hologramProjector);

    // 5. Payload Fairing Cones (Split Left and Right halves)
    // Fairing Left
    const fairingGeoL = new THREE.ConeGeometry(0.72, 1.8, 32, 1, false, 0, Math.PI);
    this.fairingLeft = new THREE.Mesh(fairingGeoL, polishedMat);
    this.fairingLeft.position.set(0, 7.9, 0);
    this.rocketGroup.add(this.fairingLeft);

    // Fairing Right
    const fairingGeoR = new THREE.ConeGeometry(0.72, 1.8, 32, 1, false, Math.PI, Math.PI);
    this.fairingRight = new THREE.Mesh(fairingGeoR, polishedMat);
    this.fairingRight.position.set(0, 7.9, 0);
    this.rocketGroup.add(this.fairingRight);
  }

  createCryoSteam() {
    const pCount = 50;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);
    this.cryoParticleData = [];

    for (let i = 0; i < pCount; i++) {
      const isLeft = i % 2 === 0;
      const startX = isLeft ? -0.74 : 0.74;
      const startY = 4.2 + (Math.random() - 0.5) * 0.3;
      const startZ = (Math.random() - 0.5) * 0.3;

      pos[i * 3] = startX;
      pos[i * 3 + 1] = startY - Math.random() * 2.5;
      pos[i * 3 + 2] = startZ;

      this.cryoParticleData.push({
        origX: startX,
        origY: startY,
        origZ: startZ,
        driftX: (isLeft ? -1 : 1) * (0.25 + Math.random() * 0.45),
        speedY: 0.6 + Math.random() * 0.8
      });
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xc8e2ff,
      size: 0.95,
      map: this.softTexture,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.cryoParticles = new THREE.Points(pGeo, pMat);
    this.rocketGroup.add(this.cryoParticles);
  }

  createFlameAndSmoke() {
    // 1. Inner Mach Diamond Plasma Core Flame (Cyan-White)
    const coreGeo = new THREE.ConeGeometry(0.3, 2.6, 24);
    coreGeo.translate(0, -1.3, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x93e6ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    this.flameCore = new THREE.Mesh(coreGeo, coreMat);
    this.flameCore.position.y = -0.15;
    this.rocketGroup.add(this.flameCore);

    // 2. Outer Supersonic Fire Plume (Orange-Gold)
    const plumeGeo = new THREE.ConeGeometry(0.8, 5.4, 24);
    plumeGeo.translate(0, -2.7, 0);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    this.flamePlume = new THREE.Mesh(plumeGeo, plumeMat);
    this.flamePlume.position.y = -0.15;
    this.rocketGroup.add(this.flamePlume);

    // 3. Shockwave ring at ignition
    const ringGeo = new THREE.RingGeometry(0.6, 1.4, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.shockwaveRing = new THREE.Mesh(ringGeo, ringMat);
    this.shockwaveRing.position.y = 0.05;
    this.launchPadGroup.add(this.shockwaveRing);

    // 4. Trailing Soft Fire & Smoke Particles (Soft round texture, NO square artifacts)
    const isMobile = window.innerWidth < 768;
    const fireCount = isMobile ? 45 : 100;
    const fireGeo = new THREE.BufferGeometry();
    const firePos = new Float32Array(fireCount * 3);
    this.flameParticleData = [];

    for (let i = 0; i < fireCount; i++) {
      firePos[i * 3] = (Math.random() - 0.5) * 0.4;
      firePos[i * 3 + 1] = -0.2 - Math.random() * 5.0;
      firePos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

      this.flameParticleData.push({
        origY: -0.2,
        speedY: 6 + Math.random() * 8,
        driftX: (Math.random() - 0.5) * 1.2,
        driftZ: (Math.random() - 0.5) * 1.2
      });
    }

    fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
    const fireMat = new THREE.PointsMaterial({
      color: 0xff9922,
      size: 1.4,
      map: this.softTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.flameParticles = new THREE.Points(fireGeo, fireMat);
    this.rocketGroup.add(this.flameParticles);
  }

  setupListeners() {
    // Launch button click
    const handleLaunch = () => {
      haptics.heavy();
      this.startCountdown();
    };
    this.btnActivate.addEventListener('click', handleLaunch);
    this.btnActivate.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleLaunch();
    }, { passive: false });

    // Emergency power-off lever
    this.btnBreakerLever.addEventListener('click', () => {
      haptics.heavy();
      this.triggerPowerOff();
    });

    // Repeat launch button
    this.btnRocketRepeat.addEventListener('click', () => {
      haptics.medium();
      this.resetToStandby();
    });

    // Restart from post-credits
    this.btnPostRestart.addEventListener('click', () => {
      haptics.medium();
      if (this.onRestart) this.onRestart();
    });

    // Window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  onWindowResize() {
    const mount = this.container.querySelector('#rocket-canvas-container');
    if (!mount || !this.renderer || !this.camera) return;

    const width = (mount.clientWidth > 0 ? mount.clientWidth : window.innerWidth) || 360;
    const height = (mount.clientHeight > 0 ? mount.clientHeight : window.innerHeight) || 640;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * PHASE 2: Countdown & Ignition
   */
  startCountdown() {
    if (this.phase !== 'idle') return;
    this.phase = 'countdown';

    this.bottomControls.style.opacity = '0';
    this.bottomControls.style.pointerEvents = 'none';

    this.audio.playRadioBeep();
    this.audio.playPreIgnitionHiss(3.8);

    // Speak or radio countdown voice
    this.triggerVoiceAnnouncement();

    this.countdownOverlay.classList.add('active');

    let count = 3;
    this.countdownDigit.textContent = count;

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        haptics.medium();
        this.countdownDigit.textContent = count;
        this.countdownDigit.style.transform = 'scale(1.35)';
        setTimeout(() => {
          if (this.countdownDigit) this.countdownDigit.style.transform = 'scale(1)';
        }, 150);
        this.audio.playRadioBeep();
      } else {
        clearInterval(timer);
        haptics.heavy();
        this.countdownDigit.textContent = 'ПУСК!';
        this.countdownSubtext.textContent = 'ТЯГА 100% // ЗАЖИГАНИЕ';
        this.countdownDigit.classList.add('ignite-fire');

        setTimeout(() => {
          this.countdownOverlay.classList.remove('active');
          this.triggerLiftoff();
        }, 750);
      }
    }, 1000);
  }

  triggerVoiceAnnouncement() {
    try {
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance('Системы готовы. Три. Два. Один. Пуск.');
        utter.lang = 'ru-RU';
        utter.pitch = 0.82;
        utter.rate = 0.92;
        window.speechSynthesis.speak(utter);
      }
    } catch {}
  }

  /**
   * PHASE 3: Liftoff & Atmospheric Ascent
   */
  triggerLiftoff() {
    this.phase = 'liftoff';
    this.liftoffTime = this.clock.getElapsedTime();

    // Start engine rumble synthesizer
    this.audio.startRocketRumble();

    // Physical haptic engine rumble
    haptics.rocketRumble();

    // Flame & lights visible
    this.flameCore.material.opacity = 0.95;
    this.flamePlume.material.opacity = 0.90;
    this.flameParticles.material.opacity = 0.85;
    this.flameLight.intensity = 14.0;

    // Shake camera
    this.shakeIntensity = 0.45;
  }

  /**
   * PHASE 4: Orbital Insertion & Payload Deployment
   */
  triggerOrbit() {
    this.phase = 'orbit';

    // Fade engine roar into quiet and launch space synth ambient
    this.audio.fadeRocketRumble(2.2);
    setTimeout(() => {
      this.audio.playSpaceAmbient();
    }, 1200);

    // Extinguish flames
    this.flameCore.material.opacity = 0;
    this.flamePlume.material.opacity = 0;
    this.flameParticles.material.opacity = 0;
    this.flameLight.intensity = 0;
    this.shakeIntensity = 0;

    // Show Earth & Stars
    this.earthGroup.visible = true;
    if (this.scene.background) this.scene.background.setHex(0x020306);
    this.scene.fog.color.setHex(0x020306);
    this.scene.fog.density = 0.001;

    // Reposition camera for grand cinematic orbital vista
    this.cameraTargetPos.set(0, 7.8, 8.2);
    this.cameraLookTarget.set(0, 6.8, 0);

    // Deploy payload sequence after 1.4s
    setTimeout(() => {
      this.deployPayloadCapsule();
    }, 1400);
  }

  deployPayloadCapsule() {
    // 1. Fairing halves separate & drift outwards
    const startTime = performance.now();
    const animFairing = (curr) => {
      const p = Math.min((curr - startTime) / 2200, 1);
      const ease = 1 - Math.pow(1 - p, 3);

      this.fairingLeft.position.x = -ease * 2.8;
      this.fairingLeft.position.z = -ease * 1.4;
      this.fairingLeft.rotation.z = -ease * 0.45;

      this.fairingRight.position.x = ease * 2.8;
      this.fairingRight.position.z = -ease * 1.4;
      this.fairingRight.rotation.z = ease * 0.45;

      // 2. Petals open
      if (p > 0.4) {
        const petalP = (p - 0.4) / 0.6;
        this.capsulePetals.forEach(({ mesh }) => {
          mesh.rotation.x = petalP * 1.1;
        });

        // 3. Hologram cone glows
        this.hologramProjector.material.opacity = petalP * 0.45;
      }

      if (p < 1) {
        requestAnimationFrame(animFairing);
      } else {
        // Reveal hologram message card
        this.hologramWrap.classList.add('active');
        haptics.success();
      }
    };
    requestAnimationFrame(animFairing);
  }

  /**
   * PHASE 5: Power-Off Breaker & Post-Credits Hug Message
   */
  triggerPowerOff() {
    this.phase = 'off';

    this.audio.playRelayClick();
    this.audio.stopSpaceAmbient(0.4);

    setTimeout(() => {
      this.audio.playCrtPowerDown();
      // Trigger CRT collapse animation
      this.crtOverlay.classList.add('active');

      setTimeout(() => {
        // Show post-credits hugging scene
        this.postCreditsOverlay.classList.add('active');
      }, 1100);
    }, 180);
  }

  resetToStandby() {
    this.phase = 'idle';
    this.shakeIntensity = 0;
    this.audio.stopSpaceAmbient(0.5);

    // Reset 3D
    this.rocketGroup.position.set(0, 0, 0);
    this.rocketGroup.rotation.set(0, 0, 0);
    this.launchPadGroup.position.set(0, 0, 0);

    if (this.shockwaveRing) {
      this.shockwaveRing.scale.set(1, 1, 1);
      this.shockwaveRing.material.opacity = 0;
    }

    this.fairingLeft.position.set(0, 7.9, 0);
    this.fairingLeft.rotation.set(0, 0, 0);

    this.fairingRight.position.set(0, 7.9, 0);
    this.fairingRight.rotation.set(0, 0, 0);

    this.capsulePetals.forEach(({ mesh }) => {
      mesh.rotation.x = 0;
    });

    this.hologramProjector.material.opacity = 0;
    this.earthGroup.visible = false;
    if (this.scene.background) this.scene.background.setHex(0x060913);
    this.scene.fog.color.setHex(0x060913);
    this.scene.fog.density = 0.022;

    // Reset Camera
    this.cameraTargetPos.set(0, 3.8, 11);
    this.cameraLookTarget.set(0, 3.2, 0);

    // Reset UI
    this.hologramWrap.classList.remove('active');
    this.bottomControls.style.opacity = '1';
    this.bottomControls.style.pointerEvents = 'auto';

    this.crtOverlay.classList.remove('active');
    this.postCreditsOverlay.classList.remove('active');
  }

  animate() {
    if (this.isPaused) return;
    this.animFrameId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Tower aviation red beacon blink
    if (this.beaconLight) {
      this.beaconLight.intensity = (Math.sin(elapsed * 5.0) > 0.3) ? 2.2 : 0.2;
    }

    // Cryo steam billowing from oxygen bleed valves
    if (this.cryoParticles && this.phase === 'idle') {
      const pos = this.cryoParticles.geometry.attributes.position.array;
      for (let i = 0; i < this.cryoParticleData.length; i++) {
        const d = this.cryoParticleData[i];
        pos[i * 3] += d.driftX * delta;
        pos[i * 3 + 1] -= d.speedY * delta;
        if (pos[i * 3 + 1] < 0.2) {
          pos[i * 3] = d.origX;
          pos[i * 3 + 1] = d.origY;
          pos[i * 3 + 2] = d.origZ + (Math.random() - 0.5) * 0.2;
        }
      }
      this.cryoParticles.geometry.attributes.position.needsUpdate = true;
    }

    // State machine animation transitions
    if (this.phase === 'liftoff') {
      const ascentDuration = elapsed - this.liftoffTime;

      // Realistic rocket ascent physics:
      // Heavy initial inertia: slow lift-off, then accelerating climb
      const speed = Math.pow(ascentDuration, 1.6) * 2.2;
      this.rocketGroup.position.y += speed * delta;
      this.launchPadGroup.position.y -= speed * 0.7 * delta;

      // Expand shockwave ring
      if (this.shockwaveRing && ascentDuration < 1.8) {
        const ringP = ascentDuration / 1.8;
        this.shockwaveRing.scale.set(1 + ringP * 8, 1 + ringP * 8, 1);
        this.shockwaveRing.material.opacity = (1 - ringP) * 0.8;
      } else if (this.shockwaveRing) {
        this.shockwaveRing.material.opacity = 0;
      }

      // Dynamic flame length & turbulence
      const flameScaleY = 1.0 + Math.min(ascentDuration * 0.5, 2.0) + Math.sin(elapsed * 55) * 0.15;
      this.flameCore.scale.set(1, flameScaleY, 1);
      this.flamePlume.scale.set(1, flameScaleY * 1.15, 1);

      // Trailing fire & smoke particles
      if (this.flameParticles) {
        const fPos = this.flameParticles.geometry.attributes.position.array;
        for (let i = 0; i < this.flameParticleData.length; i++) {
          const p = this.flameParticleData[i];
          fPos[i * 3 + 1] -= (p.speedY + speed * 0.4) * delta;
          fPos[i * 3] += p.driftX * delta;
          fPos[i * 3 + 2] += p.driftZ * delta;
          if (fPos[i * 3 + 1] < -8.5) {
            fPos[i * 3 + 1] = p.origY;
            fPos[i * 3] = (Math.random() - 0.5) * 0.35;
            fPos[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
          }
        }
        this.flameParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Camera smoothly tracks rocket with upward cinematic pitch
      this.cameraTargetPos.y = this.rocketGroup.position.y + 1.4;
      this.cameraLookTarget.y = this.rocketGroup.position.y + 3.2;

      // Camera shake: heavy at liftoff, decaying as rocket clears atmosphere
      this.shakeIntensity = Math.max(0, 0.42 - ascentDuration * 0.065);

      // Transition to orbit once altitude target is reached (~5.5 seconds of ascent)
      if (ascentDuration > 5.5) {
        this.triggerOrbit();
      }
    }

    if (this.phase === 'orbit') {
      // Gentle orbital micro-rotation
      this.rocketGroup.rotation.y += delta * 0.08;
      this.rocketGroup.rotation.x = Math.sin(elapsed * 0.4) * 0.03;

      // Slowly rotate Earth below
      if (this.earthGroup) {
        this.earthGroup.rotation.y += delta * 0.02;
      }

      // Hologram light pulse
      if (this.hologramProjector && this.hologramProjector.material.opacity > 0.01) {
        this.hologramProjector.material.opacity = 0.42 + Math.sin(elapsed * 3.5) * 0.1;
      }
    }

    // Camera shake physics
    let camShakeX = 0;
    let camShakeY = 0;
    if (this.shakeIntensity > 0.01) {
      camShakeX = (Math.random() - 0.5) * this.shakeIntensity;
      camShakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }

    // Camera smooth damping
    this.camera.position.x += (this.cameraTargetPos.x + camShakeX - this.camera.position.x) * 0.06;
    this.camera.position.y += (this.cameraTargetPos.y + camShakeY - this.camera.position.y) * 0.06;
    this.camera.position.z += (this.cameraTargetPos.z - this.camera.position.z) * 0.06;
    this.camera.lookAt(this.cameraLookTarget);

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.audio.stopSpaceAmbient(0.1);
    this.audio.fadeRocketRumble(0.1);
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
    }
  }
}
