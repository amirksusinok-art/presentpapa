import { soundCtrl } from './audio.js';
import confetti from 'canvas-confetti';

export class CokaColaCan {
  constructor(container, onComplete) {
    this.container = container;
    this.onComplete = onComplete;
    this.isOpened = false;
    this.isOpening = false;
    this.touchStartY = 0;
  }

  init() {
    this.render();
    this.setupListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="cola-scene-wrap" id="cola-scene-wrap">
        <!-- Ambient Red-Gold Soda Glow Vignette -->
        <div class="cola-ambient-glow" aria-hidden="true"></div>

        <div class="cola-content">
          <!-- Text Hint Sequence -->
          <div class="cola-prompt-box">
            <h2 class="cola-prompt-title" id="cola-prompt-title">
              Потяни за ключ вверх, чтобы открыть CokaCola!
            </h2>
          </div>

          <!-- Realistic CokaCola Can Stage -->
          <div class="cola-stage" id="cola-stage">
            
            <!-- Fizzy Spray Fountain (bursts out upon opening) -->
            <div class="cola-fizz-fountain" id="cola-fizz-fountain" aria-hidden="true">
              <div class="fizz-mist"></div>
              ${Array.from({ length: 24 }).map((_, i) => `
                <span class="fizz-bubble" style="--i: ${i}; --dx: ${(Math.random() - 0.5) * 110}px; --dy: -${70 + Math.random() * 120}px; --delay: ${Math.random() * 0.4}s; --size: ${4 + Math.random() * 7}px;"></span>
              `).join('')}
            </div>

            <!-- The 3D Aluminum Can -->
            <div class="cola-can" id="cola-can">
              
              <!-- Can Top Rim & Metallic Lid -->
              <div class="can-top-lid">
                <div class="can-lid-inner">
                  <!-- Stamped opening hole seal (depresses when tab is pulled) -->
                  <div class="can-mouth-hole" id="can-mouth"></div>

                  <!-- Realistic Metal Pull-Tab Key -->
                  <div class="can-pull-tab" id="can-tab" tabindex="0" role="button" aria-label="Открыть банку CokaCola">
                    <div class="tab-metal-ring">
                      <div class="tab-finger-hole"></div>
                      <div class="tab-rivet"></div>
                    </div>
                    <div class="tab-press-lever"></div>
                  </div>
                </div>
              </div>

              <!-- Main Glossy Red Can Cylinder -->
              <div class="can-body">
                <!-- Metallic Specular Cylindrical Shading -->
                <div class="can-metallic-shine"></div>
                <div class="can-highlight-strip"></div>
                <div class="can-shadow-rim"></div>

                <!-- Clean Iconic Spencerian Script Brand & Wave Ribbon -->
                <div class="can-brand-wrap">
                  <div class="can-logo-text">Coca-Cola</div>
                  <div class="can-dynamic-wave"></div>
                </div>

                <!-- Clean bottom aluminum rim reflection -->
                <div class="can-bottom-rim"></div>
              </div>

              <!-- Can Platter Shadow on table -->
              <div class="can-shadow"></div>
            </div>
          </div>

          <!-- Success Reveal Card after Opening -->
          <div class="cola-success-card" id="cola-success-card">
            <h3 class="cola-success-title">ЗА САМОГО ЛУЧШЕГО ПАПУ!</h3>
            <p class="cola-success-text">
              За твоё здоровье, улыбки и счастье всей нашей семьи! ❤️
            </p>
            <button id="btn-cola-finish" class="btn btn-luxury cola-finish-btn">
              <span>Запустить ракету для папы 🚀</span>
            </button>
          </div>

        </div>
      </div>
    `;

    this.tabElement = this.container.querySelector('#can-tab');
    this.mouthElement = this.container.querySelector('#can-mouth');
    this.fountainElement = this.container.querySelector('#cola-fizz-fountain');
    this.promptBox = this.container.querySelector('.cola-prompt-box');
    this.successCard = this.container.querySelector('#cola-success-card');
    this.canElement = this.container.querySelector('#cola-can');
  }

  setupListeners() {
    if (!this.tabElement) return;

    // Click / Enter interaction on pull tab
    this.tabElement.addEventListener('click', (e) => {
      e.preventDefault();
      this.triggerOpen();
    });

    this.tabElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.triggerOpen();
      }
    });

    // Touch swipe upward on the can / tab
    const stage = this.container.querySelector('#cola-stage');
    if (stage) {
      stage.addEventListener('touchstart', (e) => {
        if (e.touches[0]) {
          this.touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      stage.addEventListener('touchend', (e) => {
        if (e.changedTouches[0]) {
          const deltaY = this.touchStartY - e.changedTouches[0].clientY;
          // Swiped upward by > 30px
          if (deltaY > 30 && !this.isOpened && !this.isOpening) {
            this.triggerOpen();
          }
        }
      }, { passive: true });
    }

    // Success button: leads to Finale screen
    const btnFinish = this.container.querySelector('#btn-cola-finish');
    if (btnFinish) {
      btnFinish.addEventListener('click', () => {
        if (this.onComplete) this.onComplete();
      });
    }
  }

  triggerOpen() {
    if (this.isOpened || this.isOpening) return;
    this.isOpening = true;

    // Step 1: Initial tab tension / lift
    this.tabElement.classList.add('tab-lifting');
    soundCtrl.playCanTabClick();
    if (navigator.vibrate) {
      try { navigator.vibrate(20); } catch { /* ignore */ }
    }

    // Step 2: Pop / Metal puncture after 140ms
    setTimeout(() => {
      this.tabElement.classList.add('tab-popped');
      this.mouthElement.classList.add('mouth-open');
      this.canElement.classList.add('can-opened');

      soundCtrl.playCanOpenFizz();
      if (navigator.vibrate) {
        try { navigator.vibrate(80); } catch { /* ignore */ }
      }

      // Step 3: Carbonation gas hiss & fizzy bubble vibration after 80ms
      setTimeout(() => {
        if (navigator.vibrate) {
          try {
            navigator.vibrate([15, 10, 15, 10, 15, 10, 20, 10, 15, 10, 15, 10]);
          } catch { /* ignore */ }
        }

        // Step 4: Fizz fountain eruption
        if (this.fountainElement) {
          this.fountainElement.classList.add('active');
        }

        // Soft celebratory party confetti sparkles
        try {
          confetti({
            particleCount: 55,
            spread: 60,
            origin: { y: 0.45 },
            colors: ['#ffffff', '#e61c24', '#ffd700', '#f5d78e', '#ff6b6b']
          });
        } catch (e) {
          console.warn('Confetti error:', e);
        }
      }, 90);

      // Step 5: Reveal success message & navigation button after 1.2s
      setTimeout(() => {
        this.isOpened = true;
        this.isOpening = false;

        if (this.promptBox) {
          this.promptBox.style.display = 'none';
        }
        if (this.successCard) {
          this.successCard.classList.add('active');
        }
      }, 1300);

    }, 140);
  }

  reset() {
    this.isOpened = false;
    this.isOpening = false;
    this.render();
    this.setupListeners();
  }
}
