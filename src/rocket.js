import * as THREE from 'three';

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

        <!-- Futuristic Aerospace HUD Overlay -->
        <div class="rocket-hud" id="rocket-hud">
          
          <!-- Top Left Telemetry Panel -->
          <div class="hud-panel hud-top-left">
            <div class="hud-tag">MISSION: PAPA-2026 // FLIGHT 777</div>
            <div class="hud-metric"><span class="hud-label">PROPULSION:</span> <span id="hud-fuel" class="hud-val">100% [READY]</span></div>
            <div class="hud-metric"><span class="hud-label">VECTOR:</span> <span class="hud-val text-green">CALIBRATED</span></div>
            <div class="hud-metric"><span class="hud-label">PAYLOAD:</span> <span class="hud-val text-gold">GOLD CAPSULE #1</span></div>
          </div>

          <!-- Top Right Orbit Readout -->
          <div class="hud-panel hud-top-right">
            <div class="hud-tag">ORBITAL METRICS</div>
            <div class="hud-metric"><span class="hud-label">ALTITUDE:</span> <span id="hud-alt" class="hud-val">0.0 KM</span></div>
            <div class="hud-metric"><span class="hud-label">VELOCITY:</span> <span id="hud-spd" class="hud-val">0.0 KM/S</span></div>
            <div class="hud-metric"><span class="hud-label">STATUS:</span> <span id="hud-status" class="hud-val text-gold">STANDBY</span></div>
          </div>

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

                <!-- Power-off Breaker Toggle Lever with Safety Cover -->
                <div class="breaker-switch-wrap">
                  <div class="breaker-cover" id="breaker-cover" role="button" tabindex="0" title="Откинуть защитную крышку">
                    <span class="cover-stripe"></span>
                    <span class="cover-label">ОТКРЫТЬ</span>
                  </div>
                  <button id="btn-breaker-lever" class="breaker-lever-btn" aria-label="Рычаг обесточивания" disabled>
                    <span class="lever-handle"></span>
                    <span class="lever-text">ЗАВЕРШИТЬ МИССИЮ И ПОГАСИТЬ СВЕТ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Bar (Phase 1 launch trigger) -->
          <div class="rocket-bottom-controls" id="rocket-bottom-controls">
            <button id="btn-activate-launch" class="btn btn-luxury launch-trigger-btn">
              <span class="launch-icon">🚀</span>
              <span class="launch-text">АКТИВИРОВАТЬ ЗАПУСК</span>
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
    this.hudAlt = this.container.querySelector('#hud-alt');
    this.hudSpd = this.container.querySelector('#hud-spd');
    this.hudStatus = this.container.querySelector('#hud-status');
    this.hudFuel = this.container.querySelector('#hud-fuel');
    this.bottomControls = this.container.querySelector('#rocket-bottom-controls');
    this.breakerCover = this.container.querySelector('#breaker-cover');
    this.btnBreakerLever = this.container.querySelector('#btn-breaker-lever');
    this.btnRocketRepeat = this.container.querySelector('#btn-rocket-repeat');
    this.crtOverlay = this.container.querySelector('#crt-off-overlay');
    this.postCreditsOverlay = this.container.querySelector('#post-credits-overlay');
    this.btnPostRestart = this.container.querySelector('#btn-post-restart');
  }

  initThree() {
    const mount = this.container.querySelector('#rocket-canvas-container');
    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060913, 0.025);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 1000);
    this.camera.position.copy(this.cameraTargetPos);
    this.camera.lookAt(this.cameraLookTarget);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    mount.appendChild(this.renderer.domElement);

    // 4. Construct 3D Elements
    this.createLights();
    this.createStarfield();
    this.createEarth();
    this.createLaunchPad();
    this.createRocket();
    this.createCryoSteam();
    this.createFlameAndSmoke();

    // 5. Start Render Loop
    this.animate();
  }

  createLights() {
    // Ambient night sky blue
    const ambient = new THREE.AmbientLight(0x1a2436, 1.2);
    this.scene.add(ambient);

    // Main Spaceport Key Floodlight
    const keySpot = new THREE.SpotLight(0xdbeafe, 3.5);
    keySpot.position.set(12, 16, 12);
    keySpot.angle = Math.PI / 4;
    keySpot.penumbra = 0.5;
    this.scene.add(keySpot);

    // Golden Rim Light
    const rimLight = new THREE.DirectionalLight(0xf5d78e, 2.0);
    rimLight.position.set(-10, 8, -8);
    this.scene.add(rimLight);

    // Engine Flame PointLight (dynamic intensity)
    this.flameLight = new THREE.PointLight(0xff6600, 0, 35);
    this.flameLight.position.set(0, -0.6, 0);
    this.scene.add(this.flameLight);
  }

  createStarfield() {
    const starCount = 1200;
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
    // Position Earth so curvature is dramatic on orbit
    this.earthGroup.position.set(28, -65, -80);
    this.scene.add(this.earthGroup);

    // Planet sphere
    const earthGeo = new THREE.SphereGeometry(45, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x1a4b8c,
      roughness: 0.8,
      metalness: 0.1
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.earthGroup.add(earthMesh);

    // Atmospheric rim glow
    const atmosGeo = new THREE.SphereGeometry(46.2, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    this.earthGroup.add(atmosMesh);

    this.earthGroup.visible = false; // Becomes visible upon orbital insertion
  }

  createLaunchPad() {
    this.launchPadGroup = new THREE.Group();
    this.launchPadGroup.position.set(0, 0, 0);
    this.scene.add(this.launchPadGroup);

    // Ground platform
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1e2533,
      roughness: 0.8,
      metalness: 0.4
    });
    const padGeo = new THREE.CylinderGeometry(6.5, 7.5, 0.8, 8);
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = -0.4;
    this.launchPadGroup.add(pad);

    // Launch Gantry Tower
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x8b1e1e, // NASA/SpaceX red tower steel
      roughness: 0.6,
      metalness: 0.5
    });
    const towerGeo = new THREE.BoxGeometry(0.8, 12, 0.8);
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(-3.2, 5.6, -1.2);
    this.launchPadGroup.add(tower);

    // Tower Service Arm
    const armGeo = new THREE.BoxGeometry(2.5, 0.4, 0.5);
    const arm = new THREE.Mesh(armGeo, towerMat);
    arm.position.set(-1.8, 7.5, -0.6);
    this.launchPadGroup.add(arm);
  }

  createRocket() {
    this.rocketGroup = new THREE.Group();
    this.rocketGroup.position.set(0, 0, 0);
    this.scene.add(this.rocketGroup);

    // PBR Materials
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x242b38,
      roughness: 0.32,
      metalness: 0.88
    });

    const polishedMat = new THREE.MeshStandardMaterial({
      color: 0xdde5f0,
      roughness: 0.2,
      metalness: 0.95
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf5d78e,
      roughness: 0.25,
      metalness: 0.85
    });

    // 1. Booster Stage (Lower Cylinder)
    const boosterGeo = new THREE.CylinderGeometry(0.72, 0.72, 4.2, 32);
    this.boosterMesh = new THREE.Mesh(boosterGeo, titaniumMat);
    this.boosterMesh.position.y = 2.1;
    this.rocketGroup.add(this.boosterMesh);

    // Engine Skirt Ring & Nozzles
    const skirtGeo = new THREE.CylinderGeometry(0.74, 0.76, 0.4, 32);
    const skirt = new THREE.Mesh(skirtGeo, titaniumMat);
    skirt.position.y = 0.2;
    this.rocketGroup.add(skirt);

    // 3 Rocket Engine Nozzles at base
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const nozzleGeo = new THREE.CylinderGeometry(0.12, 0.24, 0.45, 16, 1, true);
      const nozzle = new THREE.Mesh(nozzleGeo, titaniumMat);
      nozzle.position.set(Math.cos(angle) * 0.32, -0.15, Math.sin(angle) * 0.32);
      this.rocketGroup.add(nozzle);
    }

    // 4 Base Stabilizer Fins with Gold Edge
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const finGeo = new THREE.BoxGeometry(0.08, 0.9, 0.65);
      const fin = new THREE.Mesh(finGeo, goldMat);
      fin.position.set(Math.cos(angle) * 0.92, 0.7, Math.sin(angle) * 0.92);
      fin.rotation.y = angle;
      this.rocketGroup.add(fin);
    }

    // 2. Second Stage (Upper Cylinder)
    const upperGeo = new THREE.CylinderGeometry(0.68, 0.70, 2.8, 32);
    const upperStage = new THREE.Mesh(upperGeo, polishedMat);
    upperStage.position.y = 5.6;
    this.rocketGroup.add(upperStage);

    // Interstage Ring
    const interRing = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.25, 32), goldMat);
    interRing.position.y = 4.25;
    this.rocketGroup.add(interRing);

    // Gold Mission Emblem
    const emblemGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.05, 16);
    const emblem = new THREE.Mesh(emblemGeo, goldMat);
    emblem.position.set(0, 5.8, 0.7);
    emblem.rotation.x = Math.PI / 2;
    this.rocketGroup.add(emblem);

    // 3. Payload Capsule (Inside Nose Cone)
    this.payloadCapsule = new THREE.Group();
    this.payloadCapsule.position.set(0, 7.3, 0);
    this.rocketGroup.add(this.payloadCapsule);

    // Gold Capsule Base
    const capGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.8, 16);
    const capMesh = new THREE.Mesh(capGeo, goldMat);
    this.payloadCapsule.add(capMesh);

    // 4 Deployable Petals
    this.capsulePetals = [];
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const petalGeo = new THREE.BoxGeometry(0.22, 0.5, 0.04);
      petalGeo.translate(0, 0.25, 0);
      const petal = new THREE.Mesh(petalGeo, goldMat);
      petal.position.set(Math.cos(ang) * 0.35, 0.35, Math.sin(ang) * 0.35);
      petal.rotation.y = ang;
      this.payloadCapsule.add(petal);
      this.capsulePetals.push({ mesh: petal, baseAngle: ang });
    }

    // Volumetric Hologram Cone Projector Light
    const holoConeGeo = new THREE.ConeGeometry(2.4, 4.5, 32, 1, true);
    holoConeGeo.translate(0, 2.25, 0);
    const holoConeMat = new THREE.MeshBasicMaterial({
      color: 0xf5d78e,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.hologramProjector = new THREE.Mesh(holoConeGeo, holoConeMat);
    this.hologramProjector.position.set(0, 0.8, 0);
    this.payloadCapsule.add(this.hologramProjector);

    // 4. Dual Fairing Clamshell Halves
    // Fairing Left
    const fairingGeoL = new THREE.ConeGeometry(0.7, 1.8, 32, 1, false, 0, Math.PI);
    this.fairingLeft = new THREE.Mesh(fairingGeoL, polishedMat);
    this.fairingLeft.position.set(0, 7.9, 0);
    this.rocketGroup.add(this.fairingLeft);

    // Fairing Right
    const fairingGeoR = new THREE.ConeGeometry(0.7, 1.8, 32, 1, false, Math.PI, Math.PI);
    this.fairingRight = new THREE.Mesh(fairingGeoR, polishedMat);
    this.fairingRight.position.set(0, 7.9, 0);
    this.rocketGroup.add(this.fairingRight);
  }

  createCryoSteam() {
    const pCount = 90;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 1.8;
      pos[i * 3 + 1] = Math.random() * 4.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xdbeafe,
      size: 0.35,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    this.cryoParticles = new THREE.Points(pGeo, pMat);
    this.rocketGroup.add(this.cryoParticles);
  }

  createFlameAndSmoke() {
    // 1. Inner Plasma Core Flame (Cyan-White)
    const coreGeo = new THREE.ConeGeometry(0.25, 2.2, 16);
    coreGeo.translate(0, -1.1, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xd6f4ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    this.flameCore = new THREE.Mesh(coreGeo, coreMat);
    this.flameCore.position.y = -0.15;
    this.rocketGroup.add(this.flameCore);

    // 2. Outer Supersonic Fire Plume (Orange-Gold)
    const plumeGeo = new THREE.ConeGeometry(0.65, 4.8, 16);
    plumeGeo.translate(0, -2.4, 0);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    this.flamePlume = new THREE.Mesh(plumeGeo, plumeMat);
    this.flamePlume.position.y = -0.15;
    this.rocketGroup.add(this.flamePlume);

    // 3. Trailing Fire & Smoke Particles
    const fireCount = 140;
    const fireGeo = new THREE.BufferGeometry();
    const firePos = new Float32Array(fireCount * 3);
    this.flameParticleData = [];

    for (let i = 0; i < fireCount; i++) {
      firePos[i * 3] = (Math.random() - 0.5) * 0.4;
      firePos[i * 3 + 1] = -0.2 - Math.random() * 4;
      firePos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

      this.flameParticleData.push({
        origY: firePos[i * 3 + 1],
        speedY: 4 + Math.random() * 6,
        life: Math.random()
      });
    }

    fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
    const fireMat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.55,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    this.flameParticles = new THREE.Points(fireGeo, fireMat);
    this.rocketGroup.add(this.flameParticles);
  }

  setupListeners() {
    // Launch button click
    this.btnActivate.addEventListener('click', () => {
      this.startCountdown();
    });

    // Flip safety breaker cover
    this.breakerCover.addEventListener('click', () => {
      this.breakerCover.classList.add('flipped');
      this.btnBreakerLever.removeAttribute('disabled');
      this.audio.playRadioBeep();
    });

    // Flip breaker power-off lever
    this.btnBreakerLever.addEventListener('click', () => {
      this.triggerPowerOff();
    });

    // Repeat launch button
    this.btnRocketRepeat.addEventListener('click', () => {
      this.resetToStandby();
    });

    // Restart from post-credits
    this.btnPostRestart.addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });

    // Window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  onWindowResize() {
    const mount = this.container.querySelector('#rocket-canvas-container');
    if (!mount || !this.renderer || !this.camera) return;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

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
    this.hudStatus.textContent = 'IGNITION SEQ';
    this.hudStatus.classList.remove('text-gold');
    this.hudStatus.classList.add('text-orange');

    let count = 3;
    this.countdownDigit.textContent = count;

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        this.countdownDigit.textContent = count;
        this.countdownDigit.style.transform = 'scale(1.35)';
        setTimeout(() => this.countdownDigit.style.transform = 'scale(1)', 150);
        this.audio.playRadioBeep();
      } else {
        clearInterval(timer);
        this.countdownDigit.textContent = 'ПУСК!';
        this.countdownSubtext.textContent = 'ТЯГА 100% // LIFTOFF';
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

    // Haptic feedback burst on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 40, 150, 40, 200, 50, 250, 60, 300]);
    }

    // Flame & lights visible
    this.flameCore.material.opacity = 0.95;
    this.flamePlume.material.opacity = 0.90;
    this.flameParticles.material.opacity = 0.85;
    this.flameLight.intensity = 8.5;

    this.hudStatus.textContent = 'ASCENT // MAX-Q';
    this.hudStatus.classList.remove('text-orange');
    this.hudStatus.classList.add('text-red');
    this.hudFuel.textContent = '92% [PROPULSION FULL]';

    // Shake camera
    this.shakeIntensity = 0.38;
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
    this.scene.fog.color.setHex(0x020306);
    this.scene.fog.density = 0.001;

    // Reposition camera for grand cinematic orbital vista
    this.cameraTargetPos.set(0, 8.2, 7.8);
    this.cameraLookTarget.set(0, 7.0, 0);

    this.hudStatus.textContent = 'PARKING ORBIT';
    this.hudStatus.classList.remove('text-red');
    this.hudStatus.classList.add('text-green');
    this.hudAlt.textContent = '412.5 KM';
    this.hudSpd.textContent = '7.78 KM/S';
    this.hudFuel.textContent = '35% [ORBIT INSERTION OK]';

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
        this.capsulePetals.forEach(({ mesh, baseAngle }) => {
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
        if ('vibrate' in navigator) {
          navigator.vibrate([80, 50, 80]);
        }
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
    this.altitude = 0;
    this.shakeIntensity = 0;
    this.audio.stopSpaceAmbient(0.5);

    // Reset 3D
    this.rocketGroup.position.set(0, 0, 0);
    this.rocketGroup.rotation.set(0, 0, 0);
    this.launchPadGroup.position.set(0, 0, 0);

    this.fairingLeft.position.set(0, 7.9, 0);
    this.fairingLeft.rotation.set(0, 0, 0);

    this.fairingRight.position.set(0, 7.9, 0);
    this.fairingRight.rotation.set(0, 0, 0);

    this.capsulePetals.forEach(({ mesh }) => {
      mesh.rotation.x = 0;
    });

    this.hologramProjector.material.opacity = 0;
    this.earthGroup.visible = false;
    this.scene.fog.color.setHex(0x060913);
    this.scene.fog.density = 0.025;

    // Reset Camera
    this.cameraTargetPos.set(0, 3.8, 11);
    this.cameraLookTarget.set(0, 3.2, 0);

    // Reset UI
    this.hologramWrap.classList.remove('active');
    this.bottomControls.style.opacity = '1';
    this.bottomControls.style.pointerEvents = 'auto';

    this.hudStatus.textContent = 'STANDBY';
    this.hudStatus.classList.remove('text-green', 'text-red', 'text-orange');
    this.hudStatus.classList.add('text-gold');
    this.hudAlt.textContent = '0.0 KM';
    this.hudSpd.textContent = '0.0 KM/S';
    this.hudFuel.textContent = '100% [READY]';

    this.breakerCover.classList.remove('flipped');
    this.btnBreakerLever.setAttribute('disabled', 'true');
    this.crtOverlay.classList.remove('active');
    this.postCreditsOverlay.classList.remove('active');
  }

  animate() {
    this.animFrameId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Cryo steam billowing
    if (this.cryoParticles && this.phase === 'idle') {
      const pos = this.cryoParticles.geometry.attributes.position.array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 1] -= delta * 0.9;
        if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 4.2;
      }
      this.cryoParticles.geometry.attributes.position.needsUpdate = true;
    }

    // State machine animation transitions
    if (this.phase === 'liftoff') {
      const ascentDuration = elapsed - this.liftoffTime;

      // Vertical climb with acceleration
      this.altitude += delta * (8 + ascentDuration * 14);
      this.rocketGroup.position.y += delta * (4 + ascentDuration * 6.5);
      this.launchPadGroup.position.y -= delta * (3 + ascentDuration * 4);

      // Camera smoothly tracks rocket
      this.cameraTargetPos.y = this.rocketGroup.position.y + 1.8;
      this.cameraLookTarget.y = this.rocketGroup.position.y + 3.2;

      // Flame flickering
      const flameScaleY = 1 + Math.sin(elapsed * 45) * 0.15;
      this.flameCore.scale.set(1, flameScaleY, 1);
      this.flamePlume.scale.set(1, flameScaleY, 1);

      // Trailing fire particles
      if (this.flameParticles) {
        const fPos = this.flameParticles.geometry.attributes.position.array;
        for (let i = 0; i < this.flameParticleData.length; i++) {
          const p = this.flameParticleData[i];
          fPos[i * 3 + 1] -= p.speedY * delta;
          if (fPos[i * 3 + 1] < -6.5) {
            fPos[i * 3 + 1] = -0.2;
          }
        }
        this.flameParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Update telemetry display
      if (this.hudAlt && this.hudSpd) {
        this.hudAlt.textContent = `${this.altitude.toFixed(1)} KM`;
        const speed = (this.altitude * 0.08).toFixed(2);
        this.hudSpd.textContent = `${speed} KM/S`;
      }

      // Transition to orbit once altitude target is reached (~5.5 seconds of ascent)
      if (ascentDuration > 5.5) {
        this.triggerOrbit();
      }
    }

    if (this.phase === 'orbit') {
      // Gentle orbital micro-rotation
      this.rocketGroup.rotation.y += delta * 0.06;
      this.rocketGroup.rotation.x = Math.sin(elapsed * 0.4) * 0.04;

      // Slowly rotate Earth below
      if (this.earthGroup) {
        this.earthGroup.rotation.y += delta * 0.02;
      }

      // Hologram light pulse
      if (this.hologramProjector && this.hologramProjector.material.opacity > 0.01) {
        this.hologramProjector.material.opacity = 0.38 + Math.sin(elapsed * 3.5) * 0.08;
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
