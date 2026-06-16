import * as THREE from 'three';

export interface SkillBtn {
  name: string;
  el: HTMLElement;
}

export interface ControlEls {
  joystick: HTMLElement;
  knob: HTMLElement;
  aimZone: HTMLElement;
  fireBtn: HTMLElement;
  skills: SkillBtn[];
}

/**
 * Unified input (third-person / PUBG-style):
 *  - left virtual joystick -> `move` (screen space: x right, y down)
 *  - right drag zone -> `lookDelta` (incremental camera yaw/pitch, consumed per frame)
 *  - fire button (hold) + tappable skill buttons (queued, consumed per frame)
 *  - desktop fallbacks: WASD move, mouse-drag look, J fire, Space/1-4 skills, Q/E/R/F look
 */
export class Input {
  move = new THREE.Vector2(0, 0);
  lookDelta = new THREE.Vector2(0, 0);
  fireHeld = false;

  private skillQueue = new Set<string>();
  private els: ControlEls;
  private keys = new Set<string>();

  private joyId: number | null = null;
  private joyCenter = new THREE.Vector2();
  private joyRadius = 56;

  private lookId: number | null = null;
  private lookLast = new THREE.Vector2();

  // desktop mouse-drag look
  private mouseLook = false;
  private mouseLast = new THREE.Vector2();

  constructor(els: ControlEls) {
    this.els = els;
    this.bindJoystick();
    this.bindLook();
    this.bindButtons();
    this.bindKeyboard();
    this.bindMouse();
  }

  consumeSkill(name: string): boolean {
    if (this.skillQueue.has(name)) {
      this.skillQueue.delete(name);
      return true;
    }
    return false;
  }

  keyHeld(code: string): boolean {
    return this.keys.has(code);
  }

  /** Returns accumulated look delta (px) and resets it. */
  takeLook(): THREE.Vector2 {
    const d = this.lookDelta.clone();
    this.lookDelta.set(0, 0);
    return d;
  }

  // ----------------------------------------------------------------- joystick
  private bindJoystick() {
    const { joystick, knob } = this.els;
    const rectCenter = () => {
      const r = joystick.getBoundingClientRect();
      this.joyCenter.set(r.left + r.width / 2, r.top + r.height / 2);
      this.joyRadius = r.width / 2 - 6;
    };
    joystick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.joyId = e.pointerId;
      joystick.setPointerCapture(e.pointerId);
      rectCenter();
      this.updateJoystick(e.clientX, e.clientY, knob);
    });
    joystick.addEventListener('pointermove', (e) => {
      if (this.joyId !== e.pointerId) return;
      this.updateJoystick(e.clientX, e.clientY, knob);
    });
    const end = (e: PointerEvent) => {
      if (this.joyId !== e.pointerId) return;
      this.joyId = null;
      this.move.set(0, 0);
      knob.style.transform = 'translate(0px, 0px)';
    };
    joystick.addEventListener('pointerup', end);
    joystick.addEventListener('pointercancel', end);
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
    this.move.set((Math.cos(ang) * clamped) / this.joyRadius, (Math.sin(ang) * clamped) / this.joyRadius);
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
    const { fireBtn, skills } = this.els;
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

    for (const s of skills) {
      s.el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        s.el.classList.add('pressed');
        this.skillQueue.add(s.name);
      });
      const up = (e: Event) => {
        e.preventDefault();
        s.el.classList.remove('pressed');
      };
      s.el.addEventListener('pointerup', up);
      s.el.addEventListener('pointercancel', up);
      s.el.addEventListener('pointerleave', up);
    }
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
    if (x || y) this.move.set(x, y).normalize();
    else if (this.joyId === null) this.move.set(0, 0);
  }

  // ------------------------------------------------------------ desktop mouse
  private bindMouse() {
    const canvas = () => document.querySelector('canvas');
    window.addEventListener('mousedown', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.btn,.bigbtn,.joystick')) return;
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
    void canvas;
  }
}
