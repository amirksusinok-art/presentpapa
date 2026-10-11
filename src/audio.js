/**
 * Audio Manager using Web Audio API
 * Generates warm, ambient emotional soundscapes and celebratory chimes
 * without requiring external sound files (zero latency, zero 404 risk).
 */

class SoundController {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;
    this.ambientGain = null;
    this.ambientInterval = null;
    this.notes = [146.83, 185.0, 220.0, 293.66, 369.99, 440.0, 587.33]; // D major pentatonic: D3, F#3, A3, D4, F#4, A4, D5
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);
      this.ambientGain.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext initialization failed or blocked:', e);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.resume();
    this.isMuted = !this.isMuted;
    if (this.ambientGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : 0.08;
      this.ambientGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.2);
    }
    return this.isMuted;
  }

  /**
   * Magical opening chime when the gift box lid lifts
   */
  playBoxOpeningChime() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const chimeFreqs = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // A major sparkle
    
    chimeFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      const startTime = t + idx * 0.12;
      const duration = 1.8;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.09, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      if (pan) {
        pan.pan.setValueAtTime((idx / chimeFreqs.length) * 1.2 - 0.6, startTime);
        osc.connect(pan);
        pan.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  /**
   * Ribbon untie swoosh sound
   */
  playRibbonWhoosh() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.9);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.9);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.9);
  }

  /**
   * Start warm ambient emotional soundscape (soft drone & soothing chord shifts)
   */
  startAmbientMusic() {
    this.resume();
    if (!this.ctx || this.ambientInterval) return;

    const chords = [
      [146.83, 220.0, 293.66, 369.99], // D maj
      [164.81, 246.94, 293.66, 392.00], // G/E
      [130.81, 196.0, 261.63, 329.63], // C maj9
      [146.83, 220.0, 329.63, 440.00]  // D sus2
    ];

    let chordIdx = 0;

    const playChord = () => {
      if (!this.ctx || this.isMuted) return;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;

      const t = this.ctx.currentTime;
      currentChord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const chordDuration = 5.5;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.02, t + 1.8);
        gain.gain.linearRampToValueAtTime(0.02, t + 3.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + chordDuration);

        osc.connect(gain);
        gain.connect(this.ambientGain);

        osc.start(t);
        osc.stop(t + chordDuration);
      });
    };

    playChord();
    this.ambientInterval = setInterval(playChord, 5200);
  }

  stopAmbientMusic() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }
}

export const soundCtrl = new SoundController();
