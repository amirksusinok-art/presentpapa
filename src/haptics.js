/**
 * Universal Haptics Engine for Mobile Devices & Telegram Mini Apps
 * Combines Telegram WebApp HapticFeedback, Navigator Vibration API,
 * and Web Audio Acoustic Sub-Bass micro-pulses (which physically vibrate
 * the device's bottom speaker chamber on iOS Safari and mobile browsers).
 */

class HapticsManager {
  constructor() {
    this.audioCtx = null;
    this.hasVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  getTelegramHaptics() {
    return window.Telegram?.WebApp?.HapticFeedback || null;
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = new AudioCtx();
        }
      } catch {
        // Audio context unavailable
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Generates a brief sub-bass physical kick (42-55 Hz) through the speaker.
   * On iPhones and smartphones, this physically resonates the speaker diaphragm
   * and chassis, giving a clear tactile haptic sensation in the palm.
   */
  acousticThump(freq = 48, duration = 0.035, gainLevel = 0.7) {
    try {
      const ctx = this.ensureAudioContext();
      if (!ctx || ctx.state !== 'running') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(24, t + duration);

      gain.gain.setValueAtTime(gainLevel, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + duration);
    } catch {
      // Ignore audio glitches
    }
  }

  /**
   * Light haptic tap for list navigation, photo swiping, scratching
   */
  light() {
    const tg = this.getTelegramHaptics();
    if (tg) {
      try { tg.impactOccurred('light'); } catch {}
    }
    if (this.hasVibrate) {
      try { navigator.vibrate(12); } catch {}
    }
    this.acousticThump(52, 0.025, 0.4);
  }

  /**
   * Medium haptic tap for buttons, selections, candle blow
   */
  medium() {
    const tg = this.getTelegramHaptics();
    if (tg) {
      try { tg.impactOccurred('medium'); } catch {}
    }
    if (this.hasVibrate) {
      try { navigator.vibrate(28); } catch {}
    }
    this.acousticThump(46, 0.04, 0.65);
  }

  /**
   * Heavy haptic tap for can opening, rocket launch, major actions
   */
  heavy() {
    const tg = this.getTelegramHaptics();
    if (tg) {
      try { tg.impactOccurred('heavy'); } catch {}
    }
    if (this.hasVibrate) {
      try { navigator.vibrate(55); } catch {}
    }
    this.acousticThump(38, 0.065, 0.9);
  }

  /**
   * Selection tick for photo albums and sliders
   */
  selection() {
    const tg = this.getTelegramHaptics();
    if (tg) {
      try { tg.selectionChanged(); } catch {}
    }
    if (this.hasVibrate) {
      try { navigator.vibrate(8); } catch {}
    }
    this.acousticThump(60, 0.018, 0.35);
  }

  /**
   * Success fanfare pattern for winning lottery, candle complete, orbit reveal
   */
  success() {
    const tg = this.getTelegramHaptics();
    if (tg) {
      try { tg.notificationOccurred('success'); } catch {}
    }
    if (this.hasVibrate) {
      try { navigator.vibrate([40, 40, 70, 50, 110]); } catch {}
    }
    this.acousticThump(50, 0.05, 0.7);
    setTimeout(() => this.acousticThump(58, 0.06, 0.8), 90);
  }

  /**
   * Continuous rocket liftoff rumble sequence
   */
  rocketRumble() {
    const tg = this.getTelegramHaptics();
    if (this.hasVibrate) {
      try {
        navigator.vibrate([60, 30, 80, 30, 100, 40, 120, 40, 160, 50, 200]);
      } catch {}
    }
    if (tg) {
      try { tg.impactOccurred('heavy'); } catch {}
      setTimeout(() => { try { tg.impactOccurred('heavy'); } catch {} }, 180);
      setTimeout(() => { try { tg.impactOccurred('medium'); } catch {} }, 380);
    }
    this.acousticThump(36, 0.12, 0.95);
  }

  /**
   * Fizzy soda vibration bursts
   */
  fizz() {
    const tg = this.getTelegramHaptics();
    if (this.hasVibrate) {
      try {
        navigator.vibrate([15, 12, 18, 12, 22, 14, 15, 12]);
      } catch {}
    }
    if (tg) {
      try { tg.impactOccurred('soft'); } catch {}
      setTimeout(() => { try { tg.impactOccurred('light'); } catch {} }, 90);
      setTimeout(() => { try { tg.impactOccurred('light'); } catch {} }, 180);
    }
    this.acousticThump(75, 0.02, 0.25);
  }
}

export const haptics = new HapticsManager();
