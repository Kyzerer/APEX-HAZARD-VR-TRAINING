/**
 * VR Electrical Safety Simulator - App & Audio Controller
 */

// Web Audio API Synthesizer
class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.ambientNodes = {};
    this.buzzOscillators = [];
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  }

  // Safe call wrapper to ensure user interaction has resumed the AudioContext
  resumeContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getVolume() {
    return window.ScoringSystem ? window.ScoringSystem.settings.volume * window.ScoringSystem.settings.sfxVolume : 0.5;
  }

  getAmbientVolume() {
    return window.ScoringSystem ? window.ScoringSystem.settings.volume * window.ScoringSystem.settings.ambientVolume : 0.3;
  }

  // Synthesize a quick UI button click
  playClick() {
    this.resumeContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(this.getVolume() * 0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Synthesize a correct answer chime
  playSuccess() {
    this.resumeContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (major arpeggio)
    const duration = 0.12;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + (idx * 0.08));

      gain.gain.setValueAtTime(0, now + (idx * 0.08));
      gain.gain.linearRampToValueAtTime(this.getVolume() * 0.4, now + (idx * 0.08) + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.08) + duration + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + (idx * 0.08));
      osc.stop(now + (idx * 0.08) + duration + 0.2);
    });
  }

  // Synthesize a wrong/danger answer buzz
  playDanger() {
    this.resumeContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(130, now);
    osc1.frequency.linearRampToValueAtTime(110, now + 0.4);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(131.5, now);
    osc2.frequency.linearRampToValueAtTime(111.5, now + 0.4);

    gain.gain.setValueAtTime(this.getVolume() * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    // Apply lowpass filter for an industrial muffled feel
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  // Play constant background electrical hum (buzz)
  startElectricalHum() {
    this.resumeContext();
    if (!this.ctx || this.ambientNodes.hum) return;

    const now = this.ctx.currentTime;
    
    // Main 50Hz hum
    const humOsc = this.ctx.createOscillator();
    humOsc.type = 'sine';
    humOsc.frequency.value = 50;

    // Harmonic 100Hz buzz
    const buzzOsc = this.ctx.createOscillator();
    buzzOsc.type = 'sawtooth';
    buzzOsc.frequency.value = 100;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    const humGain = this.ctx.createGain();
    const buzzGain = this.ctx.createGain();
    const masterGain = this.ctx.createGain();

    humGain.gain.value = 0.8;
    buzzGain.gain.value = 0.15;
    masterGain.gain.value = this.getAmbientVolume() * 0.3;

    humOsc.connect(filter);
    buzzOsc.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    humOsc.start();
    buzzOsc.start();

    this.ambientNodes.hum = {
      oscillators: [humOsc, buzzOsc],
      masterGain: masterGain
    };
  }

  stopElectricalHum() {
    if (this.ambientNodes.hum) {
      this.ambientNodes.hum.oscillators.forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      delete this.ambientNodes.hum;
    }
  }

  // Synthesize a looping alarm siren
  startAlarm() {
    this.resumeContext();
    if (!this.ctx || this.ambientNodes.alarm) return;

    const alarmOsc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const alarmGain = this.ctx.createGain();

    alarmOsc.type = 'sawtooth';
    alarmOsc.frequency.value = 800; // Base siren frequency

    lfo.frequency.value = 2.5; // Wobble speed (2.5Hz)
    lfoGain.gain.value = 200;  // Pitch wobble range (600Hz to 1000Hz)

    alarmGain.gain.value = this.getVolume() * 0.4;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    lfo.connect(lfoGain);
    lfoGain.connect(alarmOsc.frequency); // Modulate oscillator frequency
    alarmOsc.connect(filter);
    filter.connect(alarmGain);
    alarmGain.connect(this.ctx.destination);

    lfo.start();
    alarmOsc.start();

    this.ambientNodes.alarm = {
      oscillators: [alarmOsc, lfo],
      gainNode: alarmGain
    };
  }

  stopAlarm() {
    if (this.ambientNodes.alarm) {
      this.ambientNodes.alarm.oscillators.forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      delete this.ambientNodes.alarm;
    }
  }

  // Generate white noise for fire crackling
  generateNoiseBuffer() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // Synthesize fire sounds
  startFireCrackle() {
    this.resumeContext();
    if (!this.ctx || this.ambientNodes.fire) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.generateNoiseBuffer();
    noise.loop = true;

    // Filter white noise to sound like rushing wind/rumble
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 250;
    bandpass.Q.value = 1.0;

    const gain = this.ctx.createGain();
    gain.gain.value = this.getVolume() * 0.45;

    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();

    // Crackle pops
    const crackleInterval = setInterval(() => {
      if (!this.ctx) return;
      this.playCracklePop();
    }, 120);

    this.ambientNodes.fire = {
      source: noise,
      interval: crackleInterval
    };
  }

  playCracklePop() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(Math.random() * 1500 + 400, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(this.getVolume() * (Math.random() * 0.2 + 0.05), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.015);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.02);
  }

  stopFireCrackle() {
    if (this.ambientNodes.fire) {
      try { this.ambientNodes.fire.source.stop(); } catch (e) {}
      clearInterval(this.ambientNodes.fire.interval);
      delete this.ambientNodes.fire;
    }
  }

  // Update volume levels on existing loop nodes dynamically
  updateVolumes() {
    if (!this.ctx) return;
    const sfxVol = this.getVolume();
    const ambVol = this.getAmbientVolume();

    if (this.ambientNodes.hum) {
      this.ambientNodes.hum.masterGain.gain.setValueAtTime(ambVol * 0.3, this.ctx.currentTime);
    }
    if (this.ambientNodes.alarm) {
      this.ambientNodes.alarm.gainNode.gain.setValueAtTime(sfxVol * 0.4, this.ctx.currentTime);
    }
  }
}

// Global instances
window.AudioSynth = new SoundSynthesizer();

document.addEventListener('DOMContentLoaded', () => {
  // Bind simple buttons for click sounds
  document.querySelectorAll('button, .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.AudioSynth.playClick();
    });
  });
});
