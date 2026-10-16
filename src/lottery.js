import { soundCtrl } from './audio.js';
import confetti from 'canvas-confetti';

export class ScratchLottery {
  constructor(container, onComplete) {
    this.container = container;
    this.onComplete = onComplete;
    this.gridElement = null;
    this.modalElement = null;
    this.cells = [];
    this.isWon = false;

    // 3x3 layout symbols: Winning horizontal row in middle (indices 3, 4, 5)
    this.symbolData = [
      { icon: '👑', label: 'Корона', isJackpot: false },
      { icon: '💎', label: 'Бриллиант', isJackpot: false },
      { icon: '🍀', label: 'Удача', isJackpot: false },
      { icon: '🏆', label: 'СУПЕР КУБОК', isJackpot: true },
      { icon: '🏆', label: 'СУПЕР КУБОК', isJackpot: true },
      { icon: '🏆', label: 'СУПЕР КУБОК', isJackpot: true },
      { icon: '💖', label: 'Любовь', isJackpot: false },
      { icon: '👑', label: 'Корона', isJackpot: false },
      { icon: '💎', label: 'Бриллиант', isJackpot: false }
    ];
  }

  init() {
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="lottery-ticket-wrapper">
        <div class="lottery-ticket" id="lottery-ticket">
          <!-- Ticket Header -->
          <div class="ticket-header">
            <div class="ticket-watermark">777</div>
            <div class="ticket-badge">СЕМЕЙНАЯ МОМЕНТАЛЬНАЯ ЛОТЕРЕЯ • ТИРАЖ № 1</div>
            <h2 class="ticket-title">СЧАСТЛИВЫЙ БИЛЕТ 777</h2>
            <div class="ticket-serial">Серия: ЛУЧШИЙ-ПАПА • № 777-2026</div>
          </div>

          <div class="ticket-instruction">
            <span>✨ Сотрите монеткой защитный слой в ячейках. Соберите 3 кубка в ряд для победы!</span>
          </div>

          <!-- Scratch Grid 3x3 -->
          <div class="scratch-grid-wrap">
            <div class="scratch-grid" id="scratch-grid"></div>
            <div class="jackpot-win-line" id="jackpot-win-line"></div>
          </div>

          <!-- Helper Controls -->
          <div class="ticket-controls">
            <button id="btn-scratch-all" class="btn btn-outline ticket-scratch-all-btn">
              <span>Стереть всё монеткой ✨</span>
            </button>
          </div>

          <!-- Ticket Footer with Barcode -->
          <div class="ticket-footer">
            <div class="ticket-barcode" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
            <div class="ticket-security-code">100% ВЫИГРЫШ • ГАРАНТИЯ СЧАСТЬЯ СЕМЬИ</div>
          </div>
        </div>

        <!-- Jackpot Celebration Modal -->
        <div class="jackpot-modal" id="jackpot-modal">
          <div class="jackpot-card">
            <div class="jackpot-glow-ring"></div>
            <div class="jackpot-crown">🎰 🏆 🏆 🏆 🎰</div>
            <h3 class="jackpot-title">СУПЕР-ДЖЕКПОТ 777!</h3>
            <div class="jackpot-divider"></div>
            <p class="jackpot-text">
              Вы выиграли <strong>любовь, заботу и безграничную гордость всей семьи</strong> на 100 лет вперёд!
            </p>
            <div class="jackpot-note">
              (Выигрыш не облагается налогом и выплачивается ежедневно в виде тёплых объятий ❤️)
            </div>
            <button id="btn-lottery-claim" class="btn btn-luxury jackpot-claim-btn">
              <span>Забрать выигрыш и перейти к поздравлениям ✨</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.gridElement = this.container.querySelector('#scratch-grid');
    this.modalElement = this.container.querySelector('#jackpot-modal');
    this.winLine = this.container.querySelector('#jackpot-win-line');

    this.setupCells();

    // Instant reveal button
    const btnScratchAll = this.container.querySelector('#btn-scratch-all');
    btnScratchAll.addEventListener('click', () => {
      this.revealAll();
    });

    // Claim win button
    const btnClaim = this.container.querySelector('#btn-lottery-claim');
    btnClaim.addEventListener('click', () => {
      this.modalElement.classList.remove('active');
      if (this.onComplete) this.onComplete();
    });
  }

  setupCells() {
    this.cells = [];
    this.gridElement.innerHTML = '';

    this.symbolData.forEach((data, index) => {
      const cellWrap = document.createElement('div');
      cellWrap.className = `scratch-cell ${data.isJackpot ? 'is-jackpot-symbol' : ''}`;
      cellWrap.dataset.index = index;

      // Hidden prize content underneath
      const symbolElem = document.createElement('div');
      symbolElem.className = 'cell-symbol-content';
      symbolElem.innerHTML = `
        <span class="cell-icon">${data.icon}</span>
        <span class="cell-label">${data.label}</span>
      `;
      cellWrap.appendChild(symbolElem);

      // Scratch canvas layer on top
      const canvas = document.createElement('canvas');
      canvas.className = 'scratch-canvas';
      cellWrap.appendChild(canvas);

      const cellObj = {
        index,
        data,
        wrap: cellWrap,
        canvas,
        ctx: null,
        isCleared: false,
        isDrawing: false
      };

      this.cells.push(cellObj);
      this.gridElement.appendChild(cellWrap);

      // Initialize canvas after mounting to obtain accurate client dimensions
      requestAnimationFrame(() => {
        this.initCellCanvas(cellObj);
      });
    });
  }

  initCellCanvas(cell) {
    const canvas = cell.canvas;
    const w = canvas.offsetWidth || 90;
    const h = canvas.offsetHeight || 90;

    canvas.width = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    cell.ctx = ctx;

    // Draw luxury metallic gold scratch layer
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#f2d07e');
    grad.addColorStop(0.3, '#d4a843');
    grad.addColorStop(0.7, '#f7db91');
    grad.addColorStop(1, '#be8e28');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle star watermark pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', w / 2, h / 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    // Attach mouse & touch scratching handlers
    this.attachScratchEvents(cell, canvas, ctx, w, h);
  }

  attachScratchEvents(cell, canvas, ctx, w, h) {
    const scratchAt = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();

      soundCtrl.playScratchSound();
      this.checkClearing(cell, ctx, w, h);
    };

    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
      if (cell.isCleared) return;
      cell.isDrawing = true;
      scratchAt(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (!cell.isDrawing || cell.isCleared) return;
      scratchAt(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      cell.isDrawing = false;
    });

    // Touch events (with passive: false to prevent scrolling while scratching)
    canvas.addEventListener('touchstart', (e) => {
      if (cell.isCleared) return;
      e.preventDefault();
      cell.isDrawing = true;
      if (e.touches[0]) {
        scratchAt(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (!cell.isDrawing || cell.isCleared) return;
      e.preventDefault();
      if (e.touches[0]) {
        scratchAt(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      cell.isDrawing = false;
    });
  }

  checkClearing(cell, ctx, w, h) {
    if (cell.isCleared) return;

    // Check pixel alpha channel samples
    const dPixelRatio = window.devicePixelRatio || 1;
    const realW = Math.floor(w * dPixelRatio);
    const realH = Math.floor(h * dPixelRatio);

    try {
      const imgData = ctx.getImageData(0, 0, realW, realH);
      const data = imgData.data;
      let transparentCount = 0;
      const step = 28; // Sample every 28th pixel for smooth performance
      const totalSamples = Math.floor(data.length / step);

      for (let i = 3; i < data.length; i += step) {
        if (data[i] < 128) {
          transparentCount++;
        }
      }

      const percent = transparentCount / totalSamples;
      if (percent > 0.48) {
        this.clearCell(cell);
      }
    } catch {
      // If getImageData fails due to any reason, clear on interaction
      this.clearCell(cell);
    }
  }

  clearCell(cell) {
    if (cell.isCleared) return;
    cell.isCleared = true;
    cell.canvas.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
    cell.canvas.style.opacity = '0';
    cell.canvas.style.pointerEvents = 'none';

    // Check win condition
    this.checkJackpotProgress();
  }

  revealAll() {
    this.cells.forEach((cell, idx) => {
      setTimeout(() => {
        this.clearCell(cell);
      }, idx * 60);
    });
  }

  checkJackpotProgress() {
    if (this.isWon) return;

    // The winning line is row 1 (indices 3, 4, 5)
    const winningRow = [this.cells[3], this.cells[4], this.cells[5]];
    const allRowCleared = winningRow.every(c => c && c.isCleared);

    if (allRowCleared) {
      this.isWon = true;
      this.triggerJackpotWin();
    }
  }

  triggerJackpotWin() {
    // 1. Show glowing golden winning streak line
    if (this.winLine) {
      this.winLine.classList.add('active');
    }

    // 2. Play celebratory sound & fanfare
    setTimeout(() => {
      soundCtrl.playJackpotFanfare();
    }, 200);

    // 3. Golden Confetti Fireworks
    try {
      confetti({
        particleCount: 90,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#f5d78e', '#dcb355', '#ffffff', '#e5a528']
      });
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 60,
          origin: { x: 0.1, y: 0.55 },
          colors: ['#ffd700', '#f5d78e', '#ffffff']
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 60,
          origin: { x: 0.9, y: 0.55 },
          colors: ['#ffd700', '#f5d78e', '#ffffff']
        });
      }, 400);
    } catch (e) {
      console.warn('Confetti error:', e);
    }

    // 4. Slide in the celebratory modal
    setTimeout(() => {
      if (this.modalElement) {
        this.modalElement.classList.add('active');
      }
    }, 1100);
  }

  reset() {
    this.isWon = false;
    if (this.winLine) this.winLine.classList.remove('active');
    if (this.modalElement) this.modalElement.classList.remove('active');
    this.setupCells();
  }
}
