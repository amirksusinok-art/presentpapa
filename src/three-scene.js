import * as THREE from 'three';
import { soundCtrl } from './audio.js';

export class GiftScene {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animId = null;

    // Objects
    this.boxGroup = null;
    this.lidGroup = null;
    this.ribbonParts = [];
    this.innerLight = null;
    this.glowMesh = null;
    this.openingGlow = null;
    this.lightBeam = null;
    this.beamSideMat = null;
    this.innerBed = null;
    this.particles = null;
    this.particleData = [];

    // State
    this.isOpen = false;
    this.isOpening = false;
    this.openProgress = 0;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.clock = new THREE.Clock();

    // Camera settings
    this.camInitDist = 7.2;
    this.camTargetPos = { x: 0, y: 0.6, z: 7.2 };
    this.camLookAt = new THREE.Vector3(0, -0.2, 0);

    // Initial lid pos
    this.lidInitY = 0.76;
  }

  isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }

  init() {
    if (!this.isWebGLAvailable()) {
      return false;
    }

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x07090e, 0.07);

    // Camera
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    this.updateCameraDistance();
    this.camera.position.set(0, 0.6, this.camInitDist);
    this.camera.lookAt(this.camLookAt);

    // Renderer
    const isMobile = window.innerWidth < 768;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.isPaused = false;

    // Components
    this.createLighting();
    this.createGiftBox();
    this.createParticles();
    this.createShadowPlane();

    // Listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));

    this.animate();
    return true;
  }

  pause() {
    this.isPaused = true;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.clock.getDelta();
    if (!this.animId) {
      this.animate();
    }
  }

  updateCameraDistance() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / height;

    // Mobile / Portrait ergonomics: pull back proportionally so the box never cramps typography
    if (aspect < 0.8) {
      this.camInitDist = Math.max(7.8, 4.4 / aspect);
    } else if (aspect < 1.2) {
      this.camInitDist = 7.4;
    } else {
      this.camInitDist = 6.6;
    }

    if (!this.isOpen && !this.isOpening) {
      this.camTargetPos.z = this.camInitDist;
    }
  }

  createLighting() {
    // Ambient soft blue-gray fill
    const ambientLight = new THREE.AmbientLight(0x242d3d, 1.3);
    this.scene.add(ambientLight);

    // Key light (warm golden key light)
    const keyLight = new THREE.DirectionalLight(0xfff1cf, 2.2);
    keyLight.position.set(4, 6, 5);
    this.scene.add(keyLight);

    // Rim light (cool backlight)
    const rimLight = new THREE.DirectionalLight(0x6382aa, 1.4);
    rimLight.position.set(-4, 3.5, -4);
    this.scene.add(rimLight);

    // Subtle front bounce
    const fillLight = new THREE.PointLight(0xd9b35b, 0.9, 8);
    fillLight.position.set(0, -1, 3.5);
    this.scene.add(fillLight);
  }

  createShadowPlane() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 15, 128, 128, 115);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.28)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(4.2, 4.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.1;
    this.scene.add(shadow);
  }

  createGiftBox() {
    this.boxGroup = new THREE.Group();
    // Position box slightly lower in the scene to provide generous breathing space for title above
    this.boxGroup.position.set(0, -0.32, 0);
    this.scene.add(this.boxGroup);

    // Materials:
    // Box body: Luxurious deep obsidian navy with matte velvet reflection
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x121724,
      roughness: 0.42,
      metalness: 0.12
    });

    // Ribbon: Lustrous satin champagne gold
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xe6c56e,
      emissive: 0x221a07,
      roughness: 0.26,
      metalness: 0.85
    });

    // 1. Hollow Box Base: Outer dimensions 1.7 x 1.4 x 1.7 with open top
    const baseW = 1.7;
    const baseH = 1.4;
    const baseD = 1.7;
    const wt = 0.07; // wall thickness
    const ft = 0.08; // floor thickness

    // Bottom floor
    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(baseW, ft, baseD), boxMat);
    floorMesh.position.y = -baseH / 2 + ft / 2;
    this.boxGroup.add(floorMesh);

    // Front & Back walls
    const wallH = baseH - ft;
    const wallY = -baseH / 2 + ft + wallH / 2;

    const wallFront = new THREE.Mesh(new THREE.BoxGeometry(baseW, wallH, wt), boxMat);
    wallFront.position.set(0, wallY, baseD / 2 - wt / 2);
    this.boxGroup.add(wallFront);

    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(baseW, wallH, wt), boxMat);
    wallBack.position.set(0, wallY, -(baseD / 2 - wt / 2));
    this.boxGroup.add(wallBack);

    // Left & Right walls
    const sideDepth = baseD - 2 * wt;
    const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(wt, wallH, sideDepth), boxMat);
    wallLeft.position.set(-(baseW / 2 - wt / 2), wallY, 0);
    this.boxGroup.add(wallLeft);

    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(wt, wallH, sideDepth), boxMat);
    wallRight.position.set(baseW / 2 - wt / 2, wallY, 0);
    this.boxGroup.add(wallRight);

    // 2. Outer Ribbons on Box Base
    const ribW = 0.26;
    const ribThick = 0.016;

    const ribFront = new THREE.Mesh(new THREE.BoxGeometry(ribW, baseH, ribThick), goldMat);
    ribFront.position.set(0, 0, baseD / 2 + ribThick / 2);
    this.boxGroup.add(ribFront);

    const ribBack = new THREE.Mesh(new THREE.BoxGeometry(ribW, baseH, ribThick), goldMat);
    ribBack.position.set(0, 0, -(baseD / 2 + ribThick / 2));
    this.boxGroup.add(ribBack);

    const ribLeft = new THREE.Mesh(new THREE.BoxGeometry(ribThick, baseH, ribW), goldMat);
    ribLeft.position.set(-(baseW / 2 + ribThick / 2), 0, 0);
    this.boxGroup.add(ribLeft);

    const ribRight = new THREE.Mesh(new THREE.BoxGeometry(ribThick, baseH, ribW), goldMat);
    ribRight.position.set(baseW / 2 + ribThick / 2, 0, 0);
    this.boxGroup.add(ribRight);

    const ribFloorX = new THREE.Mesh(new THREE.BoxGeometry(baseW, ribThick, ribW), goldMat);
    ribFloorX.position.set(0, -(baseH / 2 + ribThick / 2), 0);
    this.boxGroup.add(ribFloorX);

    const ribFloorZ = new THREE.Mesh(new THREE.BoxGeometry(ribW, ribThick, baseD), goldMat);
    ribFloorZ.position.set(0, -(baseH / 2 + ribThick / 2), 0);
    this.boxGroup.add(ribFloorZ);

    // 3. Lid Group (Separately animatable)
    this.lidGroup = new THREE.Group();
    this.lidGroup.position.set(0, this.lidInitY, 0);
    this.boxGroup.add(this.lidGroup);

    // Lid geometry (slightly wider than base, thickness 0.26)
    const lidW = 1.78;
    const lidH = 0.26;
    const lidD = 1.78;

    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(lidW, lidH, lidD), boxMat);
    this.lidGroup.add(lidMesh);

    // Ribbons on Lid
    const ribLidX = new THREE.Mesh(new THREE.BoxGeometry(lidW + ribThick, lidH + ribThick, ribW), goldMat);
    this.lidGroup.add(ribLidX);

    const ribLidZ = new THREE.Mesh(new THREE.BoxGeometry(ribW, lidH + ribThick, lidD + ribThick), goldMat);
    this.lidGroup.add(ribLidZ);

    // 4. Realistic, Elegant Satin Bow on top of Lid
    // A delicate flattened knot in the center
    const knotMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), goldMat);
    knotMesh.scale.set(1.1, 0.7, 1.1);
    knotMesh.position.y = 0.16;
    this.lidGroup.add(knotMesh);
    this.ribbonParts.push(knotMesh);

    // 4 graceful flattened ribbon loops (thin flat ribbon profile, NOT bulky donuts)
    const loopAngles = [
      { ang: 0.35, rotZ: -0.4, scaleX: 1.15 },
      { ang: Math.PI * 0.5 + 0.35, rotZ: -0.4, scaleX: 1.15 },
      { ang: Math.PI + 0.35, rotZ: -0.4, scaleX: 1.15 },
      { ang: Math.PI * 1.5 + 0.35, rotZ: -0.4, scaleX: 1.15 }
    ];

    const loopGeo = new THREE.TorusGeometry(0.24, 0.032, 14, 28, Math.PI * 1.55);

    loopAngles.forEach(({ ang, rotZ, scaleX }) => {
      const loop = new THREE.Mesh(loopGeo, goldMat);
      // Flatten the loop to mimic realistic flat silk ribbon
      loop.scale.set(scaleX, 0.42, 0.95);
      loop.position.set(Math.cos(ang) * 0.14, 0.22, Math.sin(ang) * 0.14);
      loop.rotation.x = Math.PI / 2;
      loop.rotation.y = ang;
      loop.rotation.z = rotZ;
      this.lidGroup.add(loop);
      this.ribbonParts.push(loop);
    });

    // 2 Elegant flowing ribbon tails draped over the edge
    const tailGeo = new THREE.BoxGeometry(0.2, 0.42, 0.012);
    const tail1 = new THREE.Mesh(tailGeo, goldMat);
    tail1.position.set(0.24, 0.08, 0.35);
    tail1.rotation.set(0.3, 0.2, -0.35);
    this.lidGroup.add(tail1);
    this.ribbonParts.push(tail1);

    const tail2 = new THREE.Mesh(tailGeo, goldMat);
    tail2.position.set(-0.28, 0.08, 0.32);
    tail2.rotation.set(0.28, -0.25, 0.4);
    this.lidGroup.add(tail2);
    this.ribbonParts.push(tail2);

    // 5. Inside Light (warm golden PointLight)
    this.innerLight = new THREE.PointLight(0xffdf80, 0, 7.5);
    this.innerLight.position.set(0, 0.35, 0);
    this.boxGroup.add(this.innerLight);

    // 6. SQUARE LIGHT SYSTEM: strictly square geometry, never exceeds the 1.7x1.7 box footprint
    const sqSize = 1.52; // Fits strictly inside the 1.56 cavity and within the 1.7 box walls

    // (A) Glowing square bed in the bottom of the cavity
    const bedGeo = new THREE.BoxGeometry(sqSize, 0.18, sqSize);
    const bedMat = new THREE.MeshBasicMaterial({
      color: 0xffdf80,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.innerBed = new THREE.Mesh(bedGeo, bedMat);
    this.innerBed.position.set(0, -0.35, 0);
    this.boxGroup.add(this.innerBed);

    // (B) Glowing square opening plate at top rim of the box (y = 0.69)
    const openGeo = new THREE.PlaneGeometry(sqSize, sqSize);
    const openCanvas = document.createElement('canvas');
    openCanvas.width = 128;
    openCanvas.height = 128;
    const oCtx = openCanvas.getContext('2d');
    oCtx.fillStyle = '#fff6cc';
    oCtx.fillRect(0, 0, 128, 128);
    const oGrad = oCtx.createRadialGradient(64, 64, 15, 64, 64, 64);
    oGrad.addColorStop(0, 'rgba(255, 255, 240, 1)');
    oGrad.addColorStop(0.75, 'rgba(255, 225, 120, 0.9)');
    oGrad.addColorStop(1, 'rgba(240, 185, 50, 0.6)');
    oCtx.fillStyle = oGrad;
    oCtx.fillRect(0, 0, 128, 128);

    const openTex = new THREE.CanvasTexture(openCanvas);
    const openMat = new THREE.MeshBasicMaterial({
      map: openTex,
      color: 0xfff0aa,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.openingGlow = new THREE.Mesh(openGeo, openMat);
    this.openingGlow.rotation.x = -Math.PI / 2;
    this.openingGlow.position.set(0, 0.69, 0);
    this.boxGroup.add(this.openingGlow);
    this.glowMesh = this.openingGlow;

    // (C) Vertical Square Column / Beam of light rising straight out of the box opening
    const beamH = 2.4;
    const beamGeo = new THREE.BoxGeometry(sqSize, beamH, sqSize);
    beamGeo.translate(0, beamH / 2, 0); // Pin base to y = 0 so vertical scale stretches upward

    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 64;
    beamCanvas.height = 256;
    const bCtx = beamCanvas.getContext('2d');
    const bGrad = bCtx.createLinearGradient(0, 256, 0, 0); // bottom to top
    bGrad.addColorStop(0, 'rgba(255, 248, 205, 0.95)');
    bGrad.addColorStop(0.12, 'rgba(255, 230, 140, 0.70)');
    bGrad.addColorStop(0.38, 'rgba(255, 210, 85, 0.32)');
    bGrad.addColorStop(0.72, 'rgba(255, 190, 50, 0.08)');
    bGrad.addColorStop(1.0, 'rgba(240, 160, 30, 0.0)');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(0, 0, 64, 256);
    const beamTex = new THREE.CanvasTexture(beamCanvas);

    this.beamSideMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });
    const beamMaterials = [
      this.beamSideMat, // +X
      this.beamSideMat, // -X
      invisibleMat,     // +Y (top open)
      invisibleMat,     // -Y (bottom)
      this.beamSideMat, // +Z
      this.beamSideMat  // -Z
    ];
    this.lightBeam = new THREE.Mesh(beamGeo, beamMaterials);
    this.lightBeam.position.set(0, 0.69, 0);
    this.lightBeam.scale.set(1, 0, 1);
    this.boxGroup.add(this.lightBeam);

    // Isometric presentation tilt
    this.boxGroup.rotation.y = -Math.PI / 6;
    this.boxGroup.rotation.x = 0.1;
  }

  createParticles() {
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 45 : 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this.particleData = [];

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 1.1;
      const y = (Math.random() - 0.5) * 0.4 + 0.6;
      const z = (Math.random() - 0.5) * 1.1;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.particleData.push({
        origX: x,
        origY: y,
        origZ: z,
        speedY: 0.35 + Math.random() * 0.55,
        swaySpeed: 1.2 + Math.random() * 2,
        swayRadius: 0.04 + Math.random() * 0.10,
        phase: Math.random() * Math.PI * 2,
        active: false
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle sprite: fine warm stardust
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d');
    const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    pGrad.addColorStop(0, 'rgba(255, 245, 205, 1)');
    pGrad.addColorStop(0.35, 'rgba(235, 195, 95, 0.7)');
    pGrad.addColorStop(0.8, 'rgba(215, 160, 45, 0.15)');
    pGrad.addColorStop(1, 'rgba(200, 140, 20, 0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 64, 64);

    const pTex = new THREE.CanvasTexture(pCanvas);

    const material = new THREE.PointsMaterial({
      size: 0.14,
      map: pTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.boxGroup.add(this.particles);
  }

  onPointerMove(e) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.mouse.targetX = x * 0.25;
    this.mouse.targetY = y * 0.18;
  }

  onWindowResize() {
    if (!this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.updateCameraDistance();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Refined, Tactile & Smooth Box Opening Animation
   */
  openBox(onComplete) {
    if (this.isOpen || this.isOpening) return;
    this.isOpening = true;

    soundCtrl.playRibbonWhoosh();
    setTimeout(() => {
      soundCtrl.playBoxOpeningChime();
      soundCtrl.startAmbientMusic();
    }, 750);

    const duration = 2000; // 2.0s responsive, smooth opening
    const startTime = performance.now();
    const startCamZ = this.camera.position.z;

    const animateOpen = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      this.openProgress = t;

      // 1. Tactile Box Wobble / Anticipation on tap (0.0 to 0.16)
      if (t < 0.16) {
        const wobbleProgress = t / 0.16;
        // Gentle dynamic wobble response to tap
        const wobbleAngle = Math.sin(wobbleProgress * Math.PI * 3) * 0.045 * (1 - wobbleProgress);
        this.boxGroup.rotation.z = wobbleAngle;
        this.boxGroup.position.y = -0.32 - Math.sin(wobbleProgress * Math.PI) * 0.025;
      } else {
        this.boxGroup.rotation.z = 0;
      }

      // 2. Subtle Camera ease (gentle zoom in, then settles into background view)
      if (t < 0.4) {
        const p1 = t / 0.4;
        this.camTargetPos.z = startCamZ - 0.55 * (1 - Math.pow(1 - p1, 2));
      } else {
        const p2 = (t - 0.4) / 0.6;
        const easeP2 = 1 - Math.pow(1 - p2, 3);
        this.camTargetPos.z = (startCamZ - 0.55) + 0.75 * easeP2;
        this.camTargetPos.y = 0.6 + 0.2 * easeP2;
      }

      // 3. Ribbon bow loops dissolve and untie gracefully (0.12 to 0.42)
      if (t >= 0.12 && t <= 0.42) {
        const bowT = (t - 0.12) / 0.30;
        const bowScale = Math.max(0.001, 1 - bowT);
        this.ribbonParts.forEach(part => {
          part.scale.set(bowScale, bowScale, bowScale);
        });
      } else if (t > 0.42) {
        this.ribbonParts.forEach(part => {
          part.scale.set(0.001, 0.001, 0.001);
        });
      }

      // 4. Lid slowly and smoothly lifts up and tilts backward (0.22 to 0.82)
      if (t >= 0.20) {
        const lidT = Math.min((t - 0.20) / 0.62, 1);
        const lidEase = 1 - Math.pow(1 - lidT, 3);

        this.lidGroup.position.y = this.lidInitY + lidEase * 1.85;
        this.lidGroup.position.z = -lidEase * 1.05;
        this.lidGroup.position.x = -lidEase * 0.42;
        this.lidGroup.rotation.x = -lidEase * 0.62;
        this.lidGroup.rotation.z = lidEase * 0.22;
      }

      // 5. Inner warm golden glow and rising particles (0.28 to 0.90)
      if (t >= 0.26) {
        const lightT = Math.min((t - 0.26) / 0.48, 1);
        const lightEase = Math.sin(lightT * Math.PI * 0.5);

        this.innerLight.intensity = lightEase * 4.4;

        if (this.openingGlow) {
          this.openingGlow.material.opacity = lightEase * 0.92;
        }

        if (this.innerBed) {
          this.innerBed.material.opacity = lightEase * 0.65;
        }

        if (this.lightBeam && this.beamSideMat) {
          this.beamSideMat.opacity = lightEase * 0.88;
          this.lightBeam.scale.y = lightEase;
        }

        if (this.particles) {
          this.particles.material.opacity = Math.min(lightEase * 0.95, 0.9);
          this.particleData.forEach(p => p.active = true);
        }
      }

      if (t < 1) {
        requestAnimationFrame(animateOpen);
      } else {
        this.isOpen = true;
        this.isOpening = false;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animateOpen);
  }

  resetBox() {
    this.isOpen = false;
    this.isOpening = false;
    this.openProgress = 0;

    this.updateCameraDistance();
    this.camTargetPos = { x: 0, y: 0.6, z: this.camInitDist };

    if (this.boxGroup) {
      this.boxGroup.rotation.z = 0;
      this.boxGroup.position.y = -0.32;
    }

    this.lidGroup.position.set(0, this.lidInitY, 0);
    this.lidGroup.rotation.set(0, 0, 0);

    this.ribbonParts.forEach(part => {
      part.scale.set(1, 1, 1);
    });

    this.innerLight.intensity = 0;
    if (this.openingGlow) {
      this.openingGlow.material.opacity = 0;
    }
    if (this.innerBed) {
      this.innerBed.material.opacity = 0;
    }
    if (this.lightBeam && this.beamSideMat) {
      this.beamSideMat.opacity = 0;
      this.lightBeam.scale.y = 0;
    }
    if (this.particles) {
      this.particles.material.opacity = 0;
      this.particleData.forEach(p => {
        p.active = false;
      });
    }
  }

  animate() {
    if (this.isPaused) return;
    this.animId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Smooth subtle mouse parallax
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.04;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.04;

    // Idle gentle hover (only when not opened and not opening)
    if (this.boxGroup && !this.isOpening && !this.isOpen) {
      const hoverY = -0.32 + Math.sin(elapsedTime * 1.2) * 0.04;
      this.boxGroup.position.y = hoverY;

      const baseRotY = -Math.PI / 6;
      this.boxGroup.rotation.y = baseRotY + this.mouse.x * 0.25 + Math.sin(elapsedTime * 0.5) * 0.025;
      this.boxGroup.rotation.x = 0.1 - this.mouse.y * 0.15;
    }

    // Camera ease
    this.camera.position.x += (this.camTargetPos.x - this.camera.position.x) * 0.05;
    this.camera.position.y += (this.camTargetPos.y - this.camera.position.y) * 0.05;
    this.camera.position.z += (this.camTargetPos.z - this.camera.position.z) * 0.05;
    this.camera.lookAt(this.camLookAt);

    // Particles ascend
    if (this.particles && this.particles.material.opacity > 0.01) {
      const posAttr = this.particles.geometry.attributes.position;
      const positions = posAttr.array;

      for (let i = 0; i < this.particleData.length; i++) {
        const p = this.particleData[i];
        if (!p.active) continue;

        positions[i * 3 + 1] += p.speedY * delta;
        positions[i * 3] = p.origX + Math.sin(elapsedTime * p.swaySpeed + p.phase) * p.swayRadius;
        positions[i * 3 + 2] = p.origZ + Math.cos(elapsedTime * p.swaySpeed + p.phase) * p.swayRadius;

        if (positions[i * 3 + 1] > 3.0) {
          positions[i * 3 + 1] = p.origY;
        }
      }
      posAttr.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
    }
  }
}
