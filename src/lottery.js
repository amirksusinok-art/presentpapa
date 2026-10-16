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
        <!-- Authentic Retro Paper Lottery Ticket -->
        <div class="lottery-ticket vintage-ticket" id="lottery-ticket">
          
          <!-- Perforated Tear Notches (authentic retro tear-off stub effect) -->
          <div class="ticket-tear-edge left" aria-hidden="true"></div>
          <div class="ticket-tear-edge right" aria-hidden="true"></div>

          <!-- Guilloche Ornamental Corner Rosettes -->
          <div class="guilloche-corner top-left" aria-hidden="true"></div>
          <div class="guilloche-corner top-right" aria-hidden="true"></div>
          <div class="guilloche-corner bottom-left" aria-hidden="true"></div>
          <div class="guilloche-corner bottom-right" aria-hidden="true"></div>

          <!-- Ticket Header -->
          <div class="ticket-header">
            <!-- Vintage Official Family Seal Stamp -->
            <div class="ticket-retro-seal" aria-hidden="true">
              <span>★ ОТК ★</span>
              <small>СЕМЬЯ</small>
            </div>

            <div class="ticket-badge">СЕМЕЙНАЯ МОМЕНТАЛЬНАЯ ЛОТЕРЕЯ • ТИРАЖ № 1</div>
            <h2 class="ticket-title">СЧАСТЛИВЫЙ БИЛЕТ 777</h2>
            
            <!-- Red Vintage Rubber-Stamped Serial Box -->
            <div class="ticket-serial-box">
              <span class="serial-label">СЕРИЯ: ЛУЧШИЙ-ПАПА</span>
              <span class="serial-num">№ 777-2026</span>
            </div>
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

          <!-- Ticket Footer with Guilloche Security Barcode & Guarantee -->
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
            <h3 class="jackpot-title">СУПЕР-ДЖЕКПОТ!</h3>
            <div class="jackpot-divider"></div>
            <p class="jackpot-text">
              Любовь, забота и гордость всей семьи — для самого лучшего папы!
            </p>
            <button id="btn-lottery-claim" class="btn btn-luxury jackpot-claim-btn">
              <span>Перейти к поздравлениям ✨</span>
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

    // Draw authentic metallic scratch foil layer (rich brass/gold gradient)
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#f5d98b');
    grad.addColorStop(0.25, '#d4a843');
    grad.addColorStop(0.5, '#fae19c');
    grad.addColorStop(0.75, '#c9962b');
    grad.addColorStop(1, '#edd082');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle guilloche security hatch pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1;
    for (let i = -w; i < w * 2; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
    }

    // Vintage star watermark pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = 'bold 20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ 777 ★', w / 2, h / 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
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

    // Touch events ({ passive: false } prevents unwanted viewport scroll during scratching)
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
      const step = 28; // Sample every 28th pixel for fast 60fps performance
      const totalSamples = Math.floor(data.length / step);

      for (let i = 3; i < data.length; i += step) {
        if (data[i] < 128) {
          transparentCount++;
        }
      }

      const percent = transparentCount / totalSamples;
      // Auto-clear threshold > 55%
      if (percent > 0.55) {
        this.clearCell(cell);
      }
    } catch {
      // If getImageData is restricted or fails, clear on user interaction
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
