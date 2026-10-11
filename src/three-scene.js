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
    this.ribbonLoops = [];
    this.innerLight = null;
    this.glowMesh = null;
    this.particles = null;
    this.particleData = [];

    // State
    this.isOpen = false;
    this.isOpening = false;
    this.openProgress = 0; // 0 to 1
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.clock = new THREE.Clock();

    // Initial camera
    this.camInitPos = { x: 0, y: 1.0, z: 6.0 };
    this.camTargetPos = { x: 0, y: 1.0, z: 6.0 };
    this.camLookAt = new THREE.Vector3(0, 0, 0);

    // Initial lid pos
    this.lidInitY = 0.96;
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
    this.scene.fog = new THREE.FogExp2(0x0a0d14, 0.08);

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    this.camera.position.set(this.camInitPos.x, this.camInitPos.y, this.camInitPos.z);
    this.camera.lookAt(this.camLookAt);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // Build scene components
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

  createLighting() {
    // Ambient soft dark-blue fill
    const ambientLight = new THREE.AmbientLight(0x2d3a4e, 1.4);
    this.scene.add(ambientLight);

    // Key light (warm golden top-front)
    const keyLight = new THREE.DirectionalLight(0xfff3db, 2.4);
    keyLight.position.set(4, 7, 5);
    this.scene.add(keyLight);

    // Rim light (cool backlight)
    const rimLight = new THREE.DirectionalLight(0x7397c8, 1.8);
    rimLight.position.set(-5, 4, -4);
    this.scene.add(rimLight);

    // Front soft gold bounce
    const fillLight = new THREE.PointLight(0xe8c77b, 1.2, 10);
    fillLight.position.set(0, -1, 3.5);
    this.scene.add(fillLight);
  }

  createShadowPlane() {
    // Soft radial ground shadow
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(5, 5);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.15;
    this.scene.add(shadow);
  }

  createGiftBox() {
    this.boxGroup = new THREE.Group();
    this.scene.add(this.boxGroup);

    // Materials
    // Box body: Deep luxury navy-slate with fine satin finish
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x141b2a,
      roughness: 0.35,
      metalness: 0.15
    });

    // Box inside: Dark warm gold lining
    const insideMat = new THREE.MeshStandardMaterial({
      color: 0x241d10,
      roughness: 0.5,
      metalness: 0.2,
      side: THREE.BackSide
    });

    // Ribbon: Lustrous satin gold
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf0c85d,
      emissive: 0x4a360a,
      roughness: 0.22,
      metalness: 0.82
    });

    // 1. Box Base (height 1.8, width 2.2, depth 2.2)
    const baseGeo = new THREE.BoxGeometry(2.2, 1.8, 2.2);
    const baseMesh = new THREE.Mesh(baseGeo, boxMat);
    baseMesh.position.y = 0;
    this.boxGroup.add(baseMesh);

    // 2. Ribbons on base
    const ribW = 0.32;
    const ribThick = 0.02;

    // Vertical ribbon X
    const ribBaseX = new THREE.Mesh(new THREE.BoxGeometry(2.2 + ribThick, 1.8 + ribThick, ribW), goldMat);
    this.boxGroup.add(ribBaseX);

    // Vertical ribbon Z
    const ribBaseZ = new THREE.Mesh(new THREE.BoxGeometry(ribW, 1.8 + ribThick, 2.2 + ribThick), goldMat);
    this.boxGroup.add(ribBaseZ);

    // 3. Lid Group (Separately animatable)
    this.lidGroup = new THREE.Group();
    this.lidGroup.position.set(0, this.lidInitY, 0);
    this.boxGroup.add(this.lidGroup);

    // Lid geometry (slightly larger than base)
    const lidGeo = new THREE.BoxGeometry(2.32, 0.35, 2.32);
    const lidMesh = new THREE.Mesh(lidGeo, boxMat);
    this.lidGroup.add(lidMesh);

    // Ribbons on Lid
    const ribLidX = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.37, ribW), goldMat);
    this.lidGroup.add(ribLidX);

    const ribLidZ = new THREE.Mesh(new THREE.BoxGeometry(ribW, 0.37, 2.34), goldMat);
    this.lidGroup.add(ribLidZ);

    // 4. Elegant Bow on top of Lid
    const bowKnotGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const bowKnot = new THREE.Mesh(bowKnotGeo, goldMat);
    bowKnot.position.y = 0.22;
    this.lidGroup.add(bowKnot);
    this.ribbonLoops.push(bowKnot);

    // 4 Bow loops
    const loopGeo = new THREE.TorusGeometry(0.32, 0.09, 12, 24, Math.PI * 1.5);
    const loopAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

    loopAngles.forEach((ang) => {
      const loop = new THREE.Mesh(loopGeo, goldMat);
      loop.position.set(Math.cos(ang) * 0.18, 0.3, Math.sin(ang) * 0.18);
      loop.rotation.x = Math.PI / 2;
      loop.rotation.y = ang + 0.3;
      loop.rotation.z = -0.4;
      this.lidGroup.add(loop);
      this.ribbonLoops.push(loop);
    });

    // 5. Inside Light (intensifies on opening)
    this.innerLight = new THREE.PointLight(0xffd566, 0, 7);
    this.innerLight.position.set(0, 0.4, 0);
    this.boxGroup.add(this.innerLight);

    // 6. Inside golden aura mesh
    const glowGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffe680,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.glowMesh.position.set(0, 0.4, 0);
    this.boxGroup.add(this.glowMesh);

    // Box tilt initial angle for pleasing isometric perspective
    this.boxGroup.rotation.y = -Math.PI / 6;
    this.boxGroup.rotation.x = 0.12;
  }

  createParticles() {
    const particleCount = 220;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    this.particleData = [];

    for (let i = 0; i < particleCount; i++) {
      // Spawn inside the box area
      const x = (Math.random() - 0.5) * 1.2;
      const y = (Math.random() - 0.5) * 0.8 + 0.2;
      const z = (Math.random() - 0.5) * 1.2;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      scales[i] = Math.random() * 0.8 + 0.3;

      this.particleData.push({
        origX: x,
        origY: y,
        origZ: z,
        speedY: 0.4 + Math.random() * 0.7,
        swaySpeed: 1 + Math.random() * 2,
        swayRadius: 0.1 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
        active: false
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // Particle texture (soft radial golden star)
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d');
    const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    pGrad.addColorStop(0, 'rgba(255, 240, 180, 1)');
    pGrad.addColorStop(0.3, 'rgba(255, 205, 90, 0.8)');
    pGrad.addColorStop(0.8, 'rgba(255, 170, 40, 0.15)');
    pGrad.addColorStop(1, 'rgba(255, 150, 0, 0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 64, 64);

    const pTex = new THREE.CanvasTexture(pCanvas);

    const material = new THREE.PointsMaterial({
      size: 0.25,
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
    this.mouse.targetX = x * 0.35;
    this.mouse.targetY = y * 0.25;
  }

  onWindowResize() {
    if (!this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Cinematic Box Opening Animation (5 - 7 seconds)
   */
  openBox(onComplete) {
    if (this.isOpen || this.isOpening) return;
    this.isOpening = true;

    // Trigger audio effects
    soundCtrl.playRibbonWhoosh();
    setTimeout(() => {
      soundCtrl.playBoxOpeningChime();
      soundCtrl.startAmbientMusic();
    }, 1800);

    const duration = 6500; // 6.5s smooth cinematic sequence
    const startTime = performance.now();

    const animateOpen = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      this.openProgress = t;

      // Easing functions
      const easeInOutCubic = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const easeOutQuad = 1 - (1 - t) * (1 - t);

      // Phase 1: Camera zooms closer gently (0.0 to 0.3)
      if (t < 0.35) {
        const p1 = t / 0.35;
        this.camTargetPos.z = 6.0 - 1.6 * (1 - Math.pow(1 - p1, 2));
      } else {
        // Phase 4: Camera frames back gently to comfortably reveal greeting
        const p2 = (t - 0.35) / 0.65;
        const easeP2 = 1 - Math.pow(1 - p2, 3);
        this.camTargetPos.z = 4.4 + 1.1 * easeP2;
        this.camTargetPos.y = 1.0 + 0.3 * easeP2;
      }

      // Phase 1 & 2: Ribbon unties and bow scales down (0.1 to 0.45)
      if (t >= 0.1 && t <= 0.45) {
        const bowT = (t - 0.1) / 0.35;
        const bowScale = Math.max(0.001, 1 - bowT);
        this.ribbonLoops.forEach(loop => {
          loop.scale.set(bowScale, bowScale, bowScale);
        });
      } else if (t > 0.45) {
        this.ribbonLoops.forEach(loop => {
          loop.scale.set(0.001, 0.001, 0.001);
        });
      }

      // Phase 2: Lid lifts and glides aside (0.28 to 0.75)
      if (t >= 0.25) {
        const lidT = Math.min((t - 0.25) / 0.5, 1);
        const lidEase = 1 - Math.pow(1 - lidT, 3);

        // Rise up
        this.lidGroup.position.y = this.lidInitY + lidEase * 2.3;
        // Glide backwards and slightly to the left
        this.lidGroup.position.z = -lidEase * 1.2;
        this.lidGroup.position.x = -lidEase * 0.6;
        // Tilt back and rotate
        this.lidGroup.rotation.x = -lidEase * 0.75;
        this.lidGroup.rotation.z = lidEase * 0.35;
      }

      // Phase 3: Inner golden light & aura surge (0.35 to 0.85)
      if (t >= 0.32) {
        const lightT = Math.min((t - 0.32) / 0.4, 1);
        const lightEase = Math.sin(lightT * Math.PI * 0.5);

        this.innerLight.intensity = lightEase * 4.8;
        if (this.glowMesh) {
          this.glowMesh.material.opacity = lightEase * 0.65;
          const s = 1 + lightEase * 1.5;
          this.glowMesh.scale.set(s, s, s);
        }

        // Activate particle emission
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

  /**
   * Reset the gift box to closed state smoothly
   */
  resetBox() {
    this.isOpen = false;
    this.isOpening = false;
    this.openProgress = 0;

    // Reset camera target
    this.camTargetPos = { x: 0, y: 1.0, z: 6.0 };

    // Reset lid
    this.lidGroup.position.set(0, this.lidInitY, 0);
    this.lidGroup.rotation.set(0, 0, 0);

    // Reset ribbon loops
    this.ribbonLoops.forEach(loop => {
      loop.scale.set(1, 1, 1);
    });

    // Reset lights & particles
    this.innerLight.intensity = 0;
    if (this.glowMesh) {
      this.glowMesh.material.opacity = 0;
      this.glowMesh.scale.set(1, 1, 1);
    }
    if (this.particles) {
      this.particles.material.opacity = 0;
      this.particleData.forEach(p => {
        p.active = false;
      });
    }
  }

  animate() {
    this.animId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Smooth mouse inertia
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    // Idle gentle floating oscillation
    if (this.boxGroup) {
      const hoverY = Math.sin(elapsedTime * 1.4) * 0.07;
      this.boxGroup.position.y = hoverY;

      // Subtle responsive yaw
      const baseRotY = -Math.PI / 6;
      this.boxGroup.rotation.y = baseRotY + this.mouse.x * 0.4 + Math.sin(elapsedTime * 0.6) * 0.04;
      this.boxGroup.rotation.x = 0.12 - this.mouse.y * 0.3;
    }

    // Camera smoothing
    this.camera.position.x += (this.camTargetPos.x - this.camera.position.x) * 0.05;
    this.camera.position.y += (this.camTargetPos.y - this.camera.position.y) * 0.05;
    this.camera.position.z += (this.camTargetPos.z - this.camera.position.z) * 0.05;
    this.camera.lookAt(this.camLookAt);

    // Particles upward drift
    if (this.particles && this.particles.material.opacity > 0.01) {
      const posAttr = this.particles.geometry.attributes.position;
      const positions = posAttr.array;

      for (let i = 0; i < this.particleData.length; i++) {
        const p = this.particleData[i];
        if (!p.active) continue;

        // Ascend gently
        positions[i * 3 + 1] += p.speedY * delta;

        // Soft sinusoidal sway
        positions[i * 3] = p.origX + Math.sin(elapsedTime * p.swaySpeed + p.phase) * p.swayRadius;
        positions[i * 3 + 2] = p.origZ + Math.cos(elapsedTime * p.swaySpeed + p.phase) * p.swayRadius;

        // Reset particle if it floats too high
        if (positions[i * 3 + 1] > 3.6) {
          positions[i * 3 + 1] = p.origY;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Glow mesh pulse
    if (this.glowMesh && this.glowMesh.material.opacity > 0) {
      const pulse = 1 + Math.sin(elapsedTime * 3) * 0.08;
      this.innerLight.intensity = (this.openProgress > 0.8 ? 4.2 : this.innerLight.intensity) + Math.sin(elapsedTime * 4) * 0.2;
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
