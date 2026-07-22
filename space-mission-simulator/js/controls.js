/**
 * controls.js — First-person player movement, pointer lock, WASD + mouse look
 */

import * as THREE from 'three';

export class PlayerControls {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.enabled = false;

    // Movement state
    this.keys = { w: false, a: false, s: false, d: false, q: false, e_held: false };
    this.yaw = 0;   // horizontal rotation
    this.pitch = 0; // vertical rotation
    this.speed = 3;
    this.sensitivity = 0.002;
    this.invertY = false;
    this.zeroG = false;

    // Zero-G floating physics
    this.velocity = new THREE.Vector3();
    this.floatAmplitude = 0.04;
    this.floatTime = 0;

    // Bounds (interior room)
    this.bounds = { minX: -5.5, maxX: 5.5, minY: 0.8, maxY: 3.6, minZ: -7.5, maxZ: 7.5 };

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onKeyDown   = this._onKeyDown.bind(this);
    this._onKeyUp     = this._onKeyUp.bind(this);
    this._onLockChange = this._onLockChange.bind(this);
    this._onClick     = this._onClick.bind(this);

    this.onInteract = null;
    this.onViewChange = null;
    this.viewMode = 'fps'; // 'fps' | 'free'
    this.clock = new THREE.Clock();
  }

  enable(canvas) {
    this.canvas = canvas;
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('pointerlockchange', this._onLockChange);
    canvas.addEventListener('click', this._onClick);
    this.enabled = true;
  }

  disable() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    if (this.canvas) this.canvas.removeEventListener('click', this._onClick);
    if (document.pointerLockElement) document.exitPointerLock();
    this.enabled = false;
  }

  _onClick() {
    if (!this.enabled) return;
    if (!document.pointerLockElement) {
      this.canvas.requestPointerLock();
    }
  }

  _onLockChange() {
    if (document.pointerLockElement) {
      this.locked = true;
    } else {
      this.locked = false;
    }
  }

  _onMouseMove(e) {
    if (!this.locked || !this.enabled) return;
    const dx = e.movementX * this.sensitivity;
    const dy = e.movementY * this.sensitivity * (this.invertY ? -1 : 1);
    this.yaw -= dx;
    this.pitch -= dy;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  _onKeyDown(e) {
    if (!this.enabled) return;
    switch (e.code) {
      case 'KeyW': this.keys.w = true; break;
      case 'KeyA': this.keys.a = true; break;
      case 'KeyS': this.keys.s = true; break;
      case 'KeyD': this.keys.d = true; break;
      case 'Space': this.keys.q = true; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.e_held = true; break;
      case 'KeyE':
        if (this.onInteract) this.onInteract();
        break;
      case 'KeyV':
        this._toggleView();
        break;
      case 'Escape':
        if (this.onEscape) this.onEscape();
        break;
      case 'KeyI':
        if (this.onInventory) this.onInventory();
        break;
      case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
        if (this.onSlotSelect) this.onSlotSelect(parseInt(e.code.replace('Digit', '')) - 1);
        break;
    }
  }

  _onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': this.keys.w = false; break;
      case 'KeyA': this.keys.a = false; break;
      case 'KeyS': this.keys.s = false; break;
      case 'KeyD': this.keys.d = false; break;
      case 'Space': this.keys.q = false; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.e_held = false; break;
    }
  }

  _toggleView() {
    this.viewMode = this.viewMode === 'fps' ? 'free' : 'fps';
    const indicator = document.getElementById('view-mode-indicator');
    if (indicator) indicator.textContent = this.viewMode.toUpperCase();
    if (this.onViewChange) this.onViewChange(this.viewMode);
  }

  update(delta) {
    if (!this.enabled) return;

    // Camera quaternion from yaw/pitch
    const qYaw   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), this.yaw);
    const qPitch  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), this.pitch);
    this.camera.quaternion.copy(qYaw).multiply(qPitch);

    // Move direction from camera forward/right
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(qYaw);
    const right   = new THREE.Vector3(1, 0, 0).applyQuaternion(qYaw);

    const moveSpeed = this.speed * delta;
    const move = new THREE.Vector3();

    if (this.keys.w) move.addScaledVector(forward, moveSpeed);
    if (this.keys.s) move.addScaledVector(forward, -moveSpeed);
    if (this.keys.a) move.addScaledVector(right, -moveSpeed);
    if (this.keys.d) move.addScaledVector(right, moveSpeed);
    if (this.keys.q) move.y += moveSpeed;
    if (this.keys.e_held) move.y -= moveSpeed;

    let newPos = this.camera.position.clone().add(move);

    // Zero-G floating effect
    if (this.zeroG) {
      this.floatTime += delta;
      newPos.y += Math.sin(this.floatTime * 0.8) * this.floatAmplitude * delta * 10;
    }

    // Clamp to bounds
    newPos.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, newPos.x));
    newPos.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, newPos.y));
    newPos.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, newPos.z));

    this.camera.position.copy(newPos);
  }

  setSpeed(v) { this.speed = v; }
  setSensitivity(v) { this.sensitivity = v * 0.0004; }
  setInvertY(v) { this.invertY = v; }
  setZeroG(v) { this.zeroG = v; this.floatTime = 0; }

  setExteriorBounds() {
    this.bounds = { minX: -30, maxX: 30, minY: -20, maxY: 20, minZ: -50, maxZ: 20 };
  }

  setInteriorBounds() {
    this.bounds = { minX: -5.5, maxX: 5.5, minY: 0.8, maxY: 3.6, minZ: -7.5, maxZ: 7.5 };
  }
}

export default PlayerControls;
