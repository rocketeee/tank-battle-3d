import * as THREE from 'three';
import type { Settings } from './Settings';
import { remapGyroDelta, screenAngle } from './gyro';

export interface ControlEls {
  moveZone: HTMLElement;
  joystick: HTMLElement;
  knob: HTMLElement;
  aimZone: HTMLElement;
  fireBtn: HTMLElement;
  /** Container of the fire + dynamic skill buttons (event-delegated). */
  btns: HTMLElement;
}

/** Degrees of device tilt -> equivalent look-drag pixels (tuned against LOOK_SENS). */
const GYRO_SCALE = 14;

/**
 * Unified input (third-person / PUBG-style):
 *  - left half = floating joystick -> `move` (scaled by left sensitivity)
 *  - right drag zone -> `lookDelta` (scaled by right sensitivity); optional gyroscope
 *    tilt is folded into the same look stream when enabled in Settings
 *  - fire button (hold) + event-delegated skill buttons (queued, consumed per frame)
 *  - desktop fallbacks: WASD move, mouse-drag look, J fire, Space/1-4 skills, Q/E/R/F look
 */
export class Input {
  move = new THREE.Vector2(0, 0);
  lookDelta = new THREE.Vector2(0, 0);
  fireHeld = false;

  private skillQueue = new Set<string>();
  private els: ControlEls;
  private settings: Settings;
  private keys = new Set<string>();

  private joyId: number | null = null;
  private joyCenter = new THREE.Vector2();
  private joyRadius = 56;

  private lookId: number | null = null;
  private lookLast = new THREE.Vector2();

  // desktop mouse-drag look
  private mouseLook = false;
  private mouseLast = new THREE.Vector2();

  // gyroscope (delta-based, drift-free)
  private gyroDelta = new THREE.Vector2(0, 0);
  private gyroBeta: number | null = null;
  private gyroGamma: number | null = null;
  private gyroAngle: number | null = null;

  constructor(els: ControlEls, settings: Settings) {
    this.els = els;
    this.settings = settings;
    this.bindMove();
    this.bindLook();
    this.bindButtons();
    this.bindKeyboard();
    this.bindMouse();
    this.bindGyro();
    settings.onGyroChange = (enabled) => {
      if (!enabled) {
        this.gyroBeta = null;
        this.gyroGamma = null;
        this.gyroDelta.set(0, 0);
      }
    };
  }

  consumeSkill(name: string): boolean {
    if (this.skillQueue.has(name)) {
      this.skillQueue.delete(name);
      return true;
    }
    return false;
  }

  /** Drop any skill taps that no owned button claimed this frame (avoids stale casts). */
  clearSkillQueue() {
    this.skillQueue.clear();
  }

  keyHeld(code: string): boolean {
    return this.keys.has(code);
  }

  /** Returns accumulated look delta (px-equivalent) and resets it. */
  takeLook(): THREE.Vector2 {
    const s = this.settings.data;
    const d = this.lookDelta.clone().multiplyScalar(s.rightSens);
    this.lookDelta.set(0, 0);
    if (s.lookInvertY) d.y = -d.y;
    if (s.gyroEnabled) {
      const gy = s.gyroInvertY ? -this.gyroDelta.y : this.gyroDelta.y;
      d.x += this.gyroDelta.x * s.gyroSens * GYRO_SCALE;
      d.y += gy * s.gyroSens * GYRO_SCALE;
    }
    this.gyroDelta.set(0, 0);
    return d;
  }

  // ------------------------------------------------------- floating joystick
  private bindMove() {
    const { moveZone, joystick, knob } = this.els;
    moveZone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return; // desktop uses WASD / mouse-look
      e.preventDefault();
      this.joyId = e.pointerId;
      moveZone.setPointerCapture(e.pointerId);
      // spawn the stick centered on the finger and reveal it
      joystick.style.left = `${e.clientX}px`;
      joystick.style.top = `${e.clientY}px`;
      joystick.classList.add('active');
      this.joyCenter.set(e.clientX, e.clientY);
      this.joyRadius = joystick.getBoundingClientRect().width / 2 - 6;
      this.updateJoystick(e.clientX, e.clientY, knob);
    });
    moveZone.addEventListener('pointermove', (e) => {
      if (this.joyId !== e.pointerId) return;
      this.updateJoystick(e.clientX, e.clientY, knob);
    });
    const end = (e: PointerEvent) => {
      if (this.joyId !== e.pointerId) return;
      this.joyId = null;
      this.move.set(0, 0);
      knob.style.transform = 'translate(0px, 0px)';
      joystick.classList.remove('active');
    };
    moveZone.addEventListener('pointerup', end);
    moveZone.addEventListener('pointercancel', end);
  }

  private updateJoystick(cx: number, cy: number, knob: HTMLElement) {
    const dx = cx - this.joyCenter.x;
    const dy = cy - this.joyCenter.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, this.joyRadius);
    const ang = Math.atan2(dy, dx);
    const kx = Math.cos(ang) * clamped;
    const ky = Math.sin(ang) * clamped;
    knob.style.transform = `translate(${kx}px, ${ky}px)`;
    const sens = this.settings.data.leftSens;
    this.move.set(
      ((Math.cos(ang) * clamped) / this.joyRadius) * sens,
      ((Math.sin(ang) * clamped) / this.joyRadius) * sens,
    );
  }

  // --------------------------------------------------------------- look zone
  private bindLook() {
    const { aimZone } = this.els;
    aimZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.lookId = e.pointerId;
      aimZone.setPointerCapture(e.pointerId);
      this.lookLast.set(e.clientX, e.clientY);
    });
    aimZone.addEventListener('pointermove', (e) => {
      if (this.lookId !== e.pointerId) return;
      this.lookDelta.x += e.clientX - this.lookLast.x;
      this.lookDelta.y += e.clientY - this.lookLast.y;
      this.lookLast.set(e.clientX, e.clientY);
    });
    const end = (e: PointerEvent) => {
      if (this.lookId !== e.pointerId) return;
      this.lookId = null;
    };
    aimZone.addEventListener('pointerup', end);
    aimZone.addEventListener('pointercancel', end);
  }

  // ----------------------------------------------------------------- buttons
  private bindButtons() {
    const { fireBtn, btns } = this.els;
    fireBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      fireBtn.classList.add('pressed');
      this.fireHeld = true;
    });
    const fireUp = (e: Event) => {
      e.preventDefault();
      fireBtn.classList.remove('pressed');
      this.fireHeld = false;
    };
    fireBtn.addEventListener('pointerup', fireUp);
    fireBtn.addEventListener('pointercancel', fireUp);
    fireBtn.addEventListener('pointerleave', fireUp);

    // dynamic skill buttons are event-delegated so the HUD can rebuild them freely
    btns.addEventListener('pointerdown', (e) => {
      const el = (e.target as HTMLElement).closest('.btn.skill') as HTMLElement | null;
      if (!el || !el.dataset.skill) return;
      e.preventDefault();
      el.classList.add('pressed');
      this.skillQueue.add(el.dataset.skill);
    });
    const clear = (e: Event) => {
      const el = (e.target as HTMLElement).closest('.btn.skill') as HTMLElement | null;
      if (el) el.classList.remove('pressed');
    };
    btns.addEventListener('pointerup', clear);
    btns.addEventListener('pointercancel', clear);
  }

  // ---------------------------------------------------------------- keyboard
  private bindKeyboard() {
    const skillKeys: Record<string, string> = {
      Space: 'jump', Digit1: 'spread', Digit2: 'shield', Digit3: 'orbital', Digit4: 'dash',
    };
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyJ') this.fireHeld = true;
      if (skillKeys[e.code]) {
        this.skillQueue.add(skillKeys[e.code]);
        if (e.code === 'Space') e.preventDefault();
      }
      this.syncKeyboardMove();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'KeyJ') this.fireHeld = false;
      this.syncKeyboardMove();
    });
  }

  private syncKeyboardMove() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x || y) this.move.set(x, y).normalize().multiplyScalar(this.settings.data.leftSens);
    else if (this.joyId === null) this.move.set(0, 0);
  }

  // ------------------------------------------------------------ desktop mouse
  private bindMouse() {
    window.addEventListener('mousedown', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.btn,.bigbtn,.joystick,.settings-gear,.settings-panel')) return;
      if (e.button === 0) {
        // left side fires, right side starts a look-drag
        if (e.clientX < window.innerWidth * 0.45) {
          this.fireHeld = true;
        } else {
          this.mouseLook = true;
          this.mouseLast.set(e.clientX, e.clientY);
        }
      }
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.mouseLook) return;
      this.lookDelta.x += e.clientX - this.mouseLast.x;
      this.lookDelta.y += e.clientY - this.mouseLast.y;
      this.mouseLast.set(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.fireHeld = false;
        this.mouseLook = false;
      }
    });
  }

  // -------------------------------------------------------------- gyroscope
  private bindGyro() {
    window.addEventListener('deviceorientation', (e) => {
      if (!this.settings.data.gyroEnabled) {
        this.gyroBeta = null;
        this.gyroGamma = null;
        return;
      }
      const beta = e.beta;
      const gamma = e.gamma;
      if (beta === null || gamma === null) return;
      // beta/gamma are reported in the device's natural (portrait) frame.
      // Rotate the tilt deltas by the current screen angle so look matches
      // how the phone is physically held (the game runs locked in landscape).
      const angle = screenAngle();
      if (this.gyroBeta !== null && this.gyroGamma !== null && angle === this.gyroAngle) {
        const dx = gamma - this.gyroGamma; // device left-right tilt
        const dy = beta - this.gyroBeta; //  device front-back tilt
        const { yaw, pitch } = remapGyroDelta(dx, dy, angle);
        // skip axis-wrap spikes (gamma at ±90, beta at ±180)
        if (Math.abs(yaw) < 45 && Math.abs(pitch) < 45) {
          this.gyroDelta.x += yaw;
          this.gyroDelta.y += pitch;
        }
      }
      this.gyroBeta = beta;
      this.gyroGamma = gamma;
      this.gyroAngle = angle;
    });
  }
}
