/**
 * Audio Manager using Web Audio API
 * Generates ambient soundscapes, celebratory chimes, scratching sounds,
 * candle blowing, and fanfares without requiring external files.
 */

class SoundController {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;
    this.ambientGain = null;
    this.ambientInterval = null;
    this.noiseBuffer = null;
    this.lastScratchTime = 0;
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

      // Pre-create 1 second of white noise for scratching & blowing
      const bufferSize = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

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
    const chimeFreqs = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    
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
   * Scratching sound for lottery card
   */
  playScratchSound() {
    this.resume();
    if (!this.ctx || this.isMuted || !this.noiseBuffer) return;

    const now = performance.now();
    if (now - this.lastScratchTime < 70) return; // throttle
    this.lastScratchTime = now;

    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 + Math.random() * 800, t);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.08);
  }

  /**
   * Triumphant Jackpot Fanfare
   */
  playJackpotFanfare() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    // C5, E5, G5, C6, E6 triumph chord fanfare
    const notes = [
      { f: 523.25, time: 0, dur: 0.25 },
      { f: 659.25, time: 0.18, dur: 0.25 },
      { f: 783.99, time: 0.36, dur: 0.25 },
      { f: 1046.50, time: 0.54, dur: 0.7 },
      { f: 1318.51, time: 0.75, dur: 1.4 }
    ];

    notes.forEach(({ f, time, dur }) => {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(f, t + time);
      osc2.frequency.setValueAtTime(f * 2, t + time);

      gain.gain.setValueAtTime(0, t + time);
      gain.gain.linearRampToValueAtTime(0.08, t + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + time + dur);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t + time);
      osc2.start(t + time);
      osc1.stop(t + time + dur);
      osc2.stop(t + time + dur);
    });
  }

  /**
   * Soft candle puff / extinguish sound
   */
  playBlowCandleSound() {
    this.resume();
    if (!this.ctx || this.isMuted || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.35);
  }

  /**
   * Celebration cheer and party popper sound
   */
  playCelebrationCheer() {
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Popper "POP!"
    if (this.noiseBuffer) {
      const popNoise = this.ctx.createBufferSource();
      popNoise.buffer = this.noiseBuffer;
      const popFilter = this.ctx.createBiquadFilter();
      popFilter.type = 'bandpass';
      popFilter.frequency.setValueAtTime(1400, t);
      popFilter.Q.setValueAtTime(1.5, t);

      const popGain = this.ctx.createGain();
      popGain.gain.setValueAtTime(0.18, t);
      popGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

      popNoise.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(this.ctx.destination);

      popNoise.start(t);
      popNoise.stop(t + 0.18);
    }

    // 2. Harmonious celebration bells
    const bells = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    bells.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + 0.08 + idx * 0.1);

      gain.gain.setValueAtTime(0, t + 0.08 + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.12 + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 + idx * 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + 0.08 + idx * 0.1);
      osc.stop(t + 1.8 + idx * 0.1);
    });
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
