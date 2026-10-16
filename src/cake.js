import { soundCtrl } from './audio.js';
import confetti from 'canvas-confetti';

export class BirthdayCake {
  constructor(container, onComplete) {
    this.container = container;
    this.onComplete = onComplete;
    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.isListening = false;
    this.isExtinguished = false;
    this.animFrameId = null;

    this.candleCount = 5;
    this.extinguishedCount = 0;
    this.touchStartY = 0;
  }

  init() {
    this.render();
    this.setupListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="cake-scene-wrap" id="cake-scene-wrap">
        <!-- Room Dim Vignette Overlay -->
        <div class="cake-room-vignette" id="cake-vignette"></div>

        <div class="cake-content">
          <!-- Text Prompt Sequence -->
          <div class="cake-prompt-box">
            <h2 class="cake-prompt-title" id="cake-prompt-title">
              Папа, закрой глаза и загадай самое заветное желание...
            </h2>
            <div class="cake-mic-status" id="cake-mic-status"></div>
          </div>

          <!-- Masterpiece Gourmet Cake Stage -->
          <div class="cake-stage" id="cake-stage">
            
            <!-- Metallic Gold Pedestal Cake Stand -->
            <div class="cake-pedestal">
              <div class="platter-top"></div>
              <div class="platter-rim"></div>
              <div class="platter-base"></div>
              <div class="platter-shadow"></div>
            </div>

            <!-- The Gourmet Cake Layers -->
            <div class="cake-body">
              
              <!-- Upper Tier: Mirror Glaze & Fruit Toppings -->
              <div class="cake-tier-top">
                <div class="cake-glaze-surface">
                  <div class="glaze-reflection"></div>
                </div>

                <!-- Piped Buttercream Rosettes with Gold Sugar Pearls -->
                <div class="cake-rosettes">
                  <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                </div>

                <!-- Rich Gourmet Fruits: Strawberries & Blueberries -->
                <div class="cake-fresh-fruits">
                  <div class="fruit-item berry-strawberry s1">
                    <div class="berry-leaf"></div>
                    <div class="berry-core"></div>
                  </div>
                  <div class="fruit-item berry-blueberry b1">
                    <div class="blue-shine"></div>
                  </div>
                  <div class="fruit-item berry-strawberry s2">
                    <div class="berry-leaf"></div>
                    <div class="berry-core"></div>
                  </div>
                  <div class="fruit-item berry-blueberry b2">
                    <div class="blue-shine"></div>
                  </div>
                  <div class="fruit-item berry-strawberry s3">
                    <div class="berry-leaf"></div>
                    <div class="berry-core"></div>
                  </div>
                </div>

                <!-- Organic Rich Chocolate Ganache Drips -->
                <div class="cake-glaze-drips">
                  <span class="drip d1"></span>
                  <span class="drip d2"></span>
                  <span class="drip d3"></span>
                  <span class="drip d4"></span>
                  <span class="drip d5"></span>
                  <span class="drip d6"></span>
                  <span class="drip d7"></span>
                </div>
              </div>

              <!-- Lower Tier: Rich Sponge with Velvety Cream Layer -->
              <div class="cake-tier-bottom">
                <div class="tier-cream-line"></div>
                <div class="tier-chocolate-base"></div>
              </div>
            </div>

            <!-- 5 Luxurious Golden Candles with Realistic Multi-Layer Flames -->
            <div class="cake-candles" id="cake-candles">
              ${Array.from({ length: this.candleCount }).map((_, i) => `
                <div class="candle" data-index="${i}">
                  <!-- Pulsating Candle Light Glow onto cake -->
                  <div class="flame-ambient-aura" id="aura-${i}"></div>
                  
                  <div class="flame" id="flame-${i}">
                    <div class="flame-blue"></div>
                    <div class="flame-core"></div>
                    <div class="flame-glow"></div>
                  </div>
                  
                  <!-- Curling smoke wisps after extinguish -->
                  <div class="smoke-wisp" id="smoke-${i}">
                    <span class="smoke-puff s1"></span>
                    <span class="smoke-puff s2"></span>
                  </div>
                  
                  <div class="wick"></div>
                  <div class="candle-wax-socket"></div>
                  <div class="candle-stem"></div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Alternative Controls / Fallback Button -->
          <div class="cake-actions" id="cake-actions">
            <button id="btn-blow-candles" class="btn btn-luxury cake-blow-btn">
              <span>Задуть свечи 💨</span>
            </button>
            <div class="cake-swipe-hint">Или смахните вверх по экрану 👆</div>
          </div>

          <!-- Success Message after Blowing Out Candles -->
          <div class="cake-wish-card" id="cake-wish-card">
            <h3 class="wish-card-title">ЖЕЛАНИЕ ОБЯЗАТЕЛЬНО СБУДЕТСЯ!</h3>
            <p class="wish-card-text">
              Крепкого здоровья, радости и безграничного счастья, наш любимый Папа! ❤️
            </p>
            <button id="btn-cake-next" class="btn btn-luxury wish-next-btn">
              <span>Открыть баночку CokaCola 🥤</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.vignette = this.container.querySelector('#cake-vignette');
    this.promptTitle = this.container.querySelector('#cake-prompt-title');
    this.micStatus = this.container.querySelector('#cake-mic-status');
    this.actionsBox = this.container.querySelector('#cake-actions');
    this.wishCard = this.container.querySelector('#cake-wish-card');

    // Prompt change after 3.2 seconds
    setTimeout(() => {
      if (!this.isExtinguished && this.promptTitle) {
        this.promptTitle.classList.add('fade-transition');
        this.promptTitle.textContent = 'А теперь подуй в экран, чтобы оно сбылось! 💨';
        this.promptTitle.classList.remove('fade-transition');
      }
    }, 3200);
  }

  setupListeners() {
    // Blow button click
    const btnBlow = this.container.querySelector('#btn-blow-candles');
    if (btnBlow) {
      btnBlow.addEventListener('click', () => {
        this.extinguishAllCandles();
      });
    }

    // Next button: leads to CokaCola screen
    const btnNext = this.container.querySelector('#btn-cake-next');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (this.onComplete) this.onComplete();
      });
    }

    // Touch swipe up on cake stage
    const stage = this.container.querySelector('#cake-stage');
    if (stage) {
      stage.addEventListener('touchstart', (e) => {
        if (e.touches[0]) {
          this.touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      stage.addEventListener('touchend', (e) => {
        if (e.changedTouches[0]) {
          const deltaY = this.touchStartY - e.changedTouches[0].clientY;
          if (deltaY > 40 && !this.isExtinguished) {
            this.extinguishAllCandles();
          }
        }
      }, { passive: true });
    }
  }

  startListening() {
    if (!this.isExtinguished && !this.isListening) {
      this.initMicrophoneBlowDetection();
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  async initMicrophoneBlowDetection() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (this.micStatus) {
        this.micStatus.textContent = 'Поддерживается задувание кнопкой или свайпом 💨';
      }
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Lowpass filter 400Hz to isolate turbulent breath & blowing air
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.audioContext.currentTime);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.3;

      source.connect(filter);
      filter.connect(this.analyser);

      this.isListening = true;
      if (this.micStatus) {
        this.micStatus.innerHTML = '<span class="mic-live-dot"></span> Микрофон активен: подуйте в микрофон!';
      }
      this.listenForBlow();
    } catch {
      // Permission denied or mic unavailable - gracefully fallback
      if (this.micStatus) {
        this.micStatus.textContent = 'Используйте кнопку «Задуть свечи» или смахните вверх!';
      }
    }
  }

  listenForBlow() {
    if (!this.isListening || this.isExtinguished) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    let blowStreak = 0;

    const checkAudio = () => {
      if (!this.isListening || this.isExtinguished) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate low frequency breath energy
      let lowEnergy = 0;
      const count = Math.min(30, dataArray.length);
      for (let i = 0; i < count; i++) {
        lowEnergy += dataArray[i];
      }
      const avg = lowEnergy / count;

      // Candle flame deflection reaction
      this.flickerFlames(avg);

      // If breath volume is high enough
      if (avg > 70) {
        blowStreak++;
        if (blowStreak >= 3) {
          this.extinguishAllCandles();
          return;
        }
      } else {
        blowStreak = Math.max(0, blowStreak - 1);
      }

      this.animFrameId = requestAnimationFrame(checkAudio);
    };

    checkAudio();
  }

  flickerFlames(energy) {
    const flames = this.container.querySelectorAll('.flame');
    const factor = Math.min(energy / 55, 2.0);
    flames.forEach((flame, i) => {
      if (flame.classList.contains('extinguished')) return;
      const tilt = (i - 2) * 6 + factor * (Math.random() * 30 - 15);
      const scaleY = Math.max(0.35, 1 - factor * 0.45);
      flame.style.transform = `rotate(${tilt}deg) scaleY(${scaleY})`;
    });
  }

  extinguishAllCandles() {
    if (this.isExtinguished) return;
    this.isExtinguished = true;
    this.isListening = false;

    // Stop microphone stream to release hardware
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    // Extinguish each candle in quick succession
    for (let i = 0; i < this.candleCount; i++) {
      setTimeout(() => {
        const flame = this.container.querySelector(`#flame-${i}`);
        const smoke = this.container.querySelector(`#smoke-${i}`);
        const aura = this.container.querySelector(`#aura-${i}`);
        
        if (flame) {
          flame.classList.add('extinguished');
          soundCtrl.playBlowCandleSound();
        }
        if (aura) {
          aura.classList.add('extinguished');
        }
        if (smoke) {
          smoke.classList.add('active');
        }
      }, i * 160);
    }

    // Once all are extinguished, trigger the celebration!
    setTimeout(() => {
      this.triggerCelebration();
    }, this.candleCount * 160 + 400);
  }

  triggerCelebration() {
    // 1. Room lights turn on (vignette disappears)
    if (this.vignette) {
      this.vignette.classList.add('lights-on');
    }

    // 2. Play party popper & celebration chime fanfare
    soundCtrl.playCelebrationCheer();

    // 3. Hide blow action button
    if (this.actionsBox) {
      this.actionsBox.style.display = 'none';
    }
    if (this.promptTitle) {
      this.promptTitle.style.display = 'none';
    }
    if (this.micStatus) {
      this.micStatus.style.display = 'none';
    }

    // 4. Massive Golden & Rainbow Confetti Burst
    try {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.55 },
        colors: ['#ffd700', '#f5d78e', '#ff6b6b', '#4ecdc4', '#ffffff']
      });
      setTimeout(() => {
        confetti({
          particleCount: 70,
          angle: 60,
          spread: 70,
          origin: { x: 0.15, y: 0.6 },
          colors: ['#ffd700', '#f5d78e', '#ffffff']
        });
        confetti({
          particleCount: 70,
          angle: 120,
          spread: 70,
          origin: { x: 0.85, y: 0.6 },
          colors: ['#ffd700', '#f5d78e', '#ffffff']
        });
      }, 350);
    } catch (e) {
      console.warn('Confetti error:', e);
    }

    // 5. Reveal the wish-accepted card
    if (this.wishCard) {
      this.wishCard.classList.add('active');
    }
  }

  reset() {
    this.stopListening();
    this.isExtinguished = false;
    this.render();
    this.setupListeners();
  }
}
