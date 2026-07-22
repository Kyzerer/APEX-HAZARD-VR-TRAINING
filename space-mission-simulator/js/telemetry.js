/**
 * telemetry.js — Live spacecraft systems telemetry management
 */

export class TelemetrySystem {
  constructor() {
    this.values = {
      o2: 100,
      pressure: 101,
      co2: 0.04,
      temp: 22,
      hull: 100,
      battery: 100,
      hr: 72,
      suit: 100,
    };

    this.targets = { ...this.values };
    this.changes = {};
    this.tickInterval = null;
    this.callbacks = [];
    this.alarmCallbacks = [];
  }

  start(scenario) {
    this.reset();
    this.changes = scenario.telemetryChanges || {};
    this.tickInterval = setInterval(() => this._tick(), 1000);
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  reset() {
    this.values = {
      o2: 100, pressure: 101, co2: 0.04,
      temp: 22, hull: 100, battery: 100, hr: 72, suit: 100,
    };
    this.changes = {};
  }

  _tick() {
    // Apply drift from scenario
    if (this.changes.o2)       this.values.o2       = Math.max(0, Math.min(100, this.values.o2 + this.changes.o2 * 0.05));
    if (this.changes.pressure) this.values.pressure = Math.max(0, Math.min(120, this.values.pressure + this.changes.pressure * 0.04));
    if (this.changes.co2)      this.values.co2      = Math.max(0, Math.min(10, this.values.co2 + this.changes.co2 * 0.03));
    if (this.changes.temp)     this.values.temp     = Math.max(-50, Math.min(80, this.values.temp + this.changes.temp * 0.02));
    if (this.changes.hull)     this.values.hull     = Math.max(0, Math.min(100, this.values.hull + this.changes.hull * 0.01));
    if (this.changes.battery)  this.values.battery  = Math.max(0, Math.min(100, this.values.battery + this.changes.battery * 0.03));
    if (this.changes.hr)       this.values.hr       = Math.max(40, Math.min(180, this.values.hr + this.changes.hr * 0.05));
    if (this.changes.suit)     this.values.suit     = Math.max(0, Math.min(100, this.values.suit + this.changes.suit * 0.04));

    // Add small noise
    this.values.hr += (Math.random() - 0.5) * 2;
    this.values.hr = Math.max(50, Math.min(180, this.values.hr));

    this._notifyCallbacks();
    this._checkAlarms();
  }

  _notifyCallbacks() {
    for (const cb of this.callbacks) cb({ ...this.values });
  }

  _checkAlarms() {
    const alarms = [];
    if (this.values.o2 < 30)       alarms.push({ type: 'critical', msg: 'OXYGEN CRITICAL' });
    if (this.values.o2 < 60)       alarms.push({ type: 'warning', msg: 'OXYGEN LOW' });
    if (this.values.pressure < 70) alarms.push({ type: 'critical', msg: 'PRESSURE CRITICAL' });
    if (this.values.co2 > 3)       alarms.push({ type: 'critical', msg: 'CO₂ DANGEROUSLY HIGH' });
    if (this.values.hull < 30)     alarms.push({ type: 'critical', msg: 'HULL INTEGRITY CRITICAL' });
    if (this.values.battery < 20)  alarms.push({ type: 'warning', msg: 'BATTERY LOW' });
    if (this.values.suit < 20)     alarms.push({ type: 'critical', msg: 'SUIT OXYGEN CRITICAL' });
    if (this.values.hr > 140)      alarms.push({ type: 'warning', msg: 'HEART RATE ELEVATED' });

    for (const cb of this.alarmCallbacks) cb(alarms);
  }

  onUpdate(cb) { this.callbacks.push(cb); }
  onAlarm(cb)  { this.alarmCallbacks.push(cb); }

  // Called when player completes an objective
  improve(type, amount = 20) {
    switch (type) {
      case 'seal_leak':
        this.changes.o2 = 0;
        this.changes.pressure = 0;
        break;
      case 'restore_o2':
        this.values.o2 = Math.min(100, this.values.o2 + amount);
        this.values.pressure = Math.min(101, this.values.pressure + amount * 0.3);
        break;
      case 'extinguish':
        this.changes.co2 = 0;
        this.changes.temp = 0;
        this.values.co2 = Math.max(0.04, this.values.co2 - 1);
        break;
      case 'restore_power':
        this.changes.battery = 0;
        this.values.battery = Math.min(100, this.values.battery + amount);
        break;
      case 'fix_hull':
        this.changes.hull = 0;
        this.values.hull = Math.min(100, this.values.hull + amount);
        break;
      case 'calm_hr':
        this.values.hr = Math.max(72, this.values.hr - 30);
        this.changes.hr = 0;
        break;
    }
  }

  getStatusClass(key) {
    const v = this.values[key];
    if (key === 'o2' || key === 'suit') {
      if (v < 30) return 'critical';
      if (v < 60) return 'warning';
      return 'ok';
    }
    if (key === 'pressure') {
      if (v < 70) return 'critical';
      if (v < 85) return 'warning';
      return 'ok';
    }
    if (key === 'co2') {
      if (v > 3) return 'critical';
      if (v > 1) return 'warning';
      return 'ok';
    }
    if (key === 'hull' || key === 'battery') {
      if (v < 30) return 'critical';
      if (v < 60) return 'warning';
      return 'ok';
    }
    if (key === 'hr') {
      if (v > 150 || v < 50) return 'critical';
      if (v > 120) return 'warning';
      return 'ok';
    }
    return 'ok';
  }

  getBar(key) {
    const v = this.values[key];
    if (key === 'pressure') return Math.min(100, Math.max(0, (v / 101) * 100));
    if (key === 'co2') return Math.min(100, (v / 5) * 100);
    if (key === 'temp') return Math.min(100, Math.max(0, ((v + 50) / 130) * 100));
    if (key === 'hr') return Math.min(100, (v / 200) * 100);
    return Math.min(100, Math.max(0, v));
  }

  getDisplay(key) {
    const v = this.values[key];
    switch (key) {
      case 'o2':      return `${Math.round(v)}%`;
      case 'pressure':return `${Math.round(v)} kPa`;
      case 'co2':     return `${v.toFixed(2)}%`;
      case 'temp':    return `${Math.round(v)}°C`;
      case 'hull':    return `${Math.round(v)}%`;
      case 'battery': return `${Math.round(v)}%`;
      case 'hr':      return `${Math.round(v)} BPM`;
      case 'suit':    return `${Math.round(v)}%`;
      default: return v;
    }
  }

  isCritical() {
    return this.values.o2 < 20 || this.values.pressure < 60 ||
      this.values.hull < 15 || this.values.co2 > 5 || this.values.suit < 10;
  }
}

export default TelemetrySystem;
