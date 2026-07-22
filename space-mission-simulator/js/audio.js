/**
 * audio.js — Web Audio API sound engine
 * Generates procedural sounds without external files
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.masterVolume = 0.7;
    this.sfxVolume = 0.8;
    this.nodes = new Map();
    this.ambience = null;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.warn('AudioContext not available');
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _osc(freq, type = 'sine', duration = 0.5, gain = 0.3) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _noise(duration = 0.5, gain = 0.2, freq = 200) {
    if (!this.enabled || !this.ctx) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start();
  }

  click() { this._osc(800, 'square', 0.05, 0.15); }

  beep(freq = 880, duration = 0.3) { this._osc(freq, 'sine', duration, 0.2); }

  success() {
    this._osc(523, 'sine', 0.2, 0.3);
    setTimeout(() => this._osc(659, 'sine', 0.2, 0.3), 150);
    setTimeout(() => this._osc(783, 'sine', 0.4, 0.4), 300);
  }

  failure() {
    this._osc(300, 'sawtooth', 0.3, 0.4);
    setTimeout(() => this._osc(200, 'sawtooth', 0.5, 0.4), 200);
  }

  alarm() {
    if (!this.enabled || !this.ctx) return;
    const play = () => {
      this._osc(880, 'square', 0.2, 0.2);
      setTimeout(() => this._osc(660, 'square', 0.2, 0.2), 250);
    };
    play();
    const id = setInterval(play, 600);
    this.nodes.set('alarm', id);
  }

  stopAlarm() {
    const id = this.nodes.get('alarm');
    if (id) { clearInterval(id); this.nodes.delete('alarm'); }
  }

  pressureHiss() {
    this._noise(2, 0.15, 3000);
  }

  firecrackle() {
    this._noise(0.3, 0.1, 800);
    this._noise(0.3, 0.08, 1200);
  }

  buttonClick() { this._osc(1000, 'sine', 0.08, 0.12); }

  interactSuccess() {
    this._osc(440, 'sine', 0.1, 0.2);
    setTimeout(() => this._osc(660, 'sine', 0.15, 0.25), 80);
  }

  warning() {
    this._osc(440, 'sawtooth', 0.3, 0.3);
  }

  countdownBeep() { this._osc(1200, 'sine', 0.15, 0.3); }

  startAmbience() {
    if (!this.enabled || !this.ctx || this.ambience) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    const g2 = this.ctx.createGain();
    osc1.type = 'sine'; osc1.frequency.value = 60;
    osc2.type = 'sine'; osc2.frequency.value = 120;
    g1.gain.value = 0.04; g2.gain.value = 0.02;
    osc1.connect(g1); g1.connect(this.masterGain);
    osc2.connect(g2); g2.connect(this.masterGain);
    osc1.start(); osc2.start();
    this.ambience = { osc1, osc2, g1, g2 };
  }

  stopAmbience() {
    if (this.ambience) {
      try {
        this.ambience.osc1.stop();
        this.ambience.osc2.stop();
      } catch {}
      this.ambience = null;
    }
  }

  setMasterVolume(v) {
    this.masterVolume = v;
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  setSFXVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  mute() {
    this.enabled = false;
    if (this.masterGain) this.masterGain.gain.value = 0;
  }

  unmute() {
    this.enabled = true;
    if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
  }
}

export default AudioEngine;
