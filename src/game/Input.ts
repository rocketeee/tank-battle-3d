import * as THREE from 'three';

export interface ControlEls {
  joystick: HTMLElement;
  knob: HTMLElement;
  aimZone: HTMLElement;
  fireBtn: HTMLElement;
  jumpBtn: HTMLElement;
}

/**
 * Unified input: left virtual joystick (move), right drag zone (aim),
 * fire / jump buttons, plus keyboard + mouse fallbacks for desktop.
 * `move` and `aimDir` are expressed in world ground-plane coords (x, z),
 * where screen-up maps to world -Z.
 */
export class Input {
  move = new THREE.Vector2(0, 0);
  aimDir = new THREE.Vector2(0, 0);
  aimActive = false;
  fireHeld = false;
  private jumpQueued = false;

  // desktop mouse aim
  pointerNDC = new THREE.Vector2(0, 0);
  mouseAiming = false;

  private els: ControlEls;
  private keys = new Set<string>();

  private joyId: number | null = null;
  private joyCenter = new THREE.Vector2();
  private joyRadius = 56;

  private aimId: number | null = null;
  private aimStart = new THREE.Vector2();

  constructor(els: ControlEls) {
    this.els = els;
    this.bindJoystick();
    this.bindAim();
    this.bindButtons();
    this.bindKeyboard();
    this.bindMouse();
  }

  consumeJump(): boolean {
    if (this.jumpQueued) {
      this.jumpQueued = false;
      return true;
    }
    return false;
  }

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
    const nx = (Math.cos(ang) * clamped) / this.joyRadius;
    const ny = (Math.sin(ang) * clamped) / this.joyRadius;
    // screen down (+y) -> world +z (toward camera); screen up -> world -z
    this.move.set(nx, ny);
  }

  private bindAim() {
    const { aimZone } = this.els;
    aimZone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.aimId = e.pointerId;
      aimZone.setPointerCapture(e.pointerId);
      this.aimStart.set(e.clientX, e.clientY);
      this.aimActive = true;
      this.aimDir.set(0, 0);
    });
    aimZone.addEventListener('pointermove', (e) => {
      if (this.aimId !== e.pointerId) return;
      const dx = e.clientX - this.aimStart.x;
      const dy = e.clientY - this.aimStart.y;
      if (Math.hypot(dx, dy) > 6) this.aimDir.set(dx, dy).normalize();
    });
    const end = (e: PointerEvent) => {
      if (this.aimId !== e.pointerId) return;
      this.aimId = null;
      this.aimActive = false;
      this.aimDir.set(0, 0);
    };
    aimZone.addEventListener('pointerup', end);
    aimZone.addEventListener('pointercancel', end);
  }

  private bindButtons() {
    const { fireBtn, jumpBtn } = this.els;
    const press = (el: HTMLElement, down: () => void, up?: () => void) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.classList.add('pressed');
        down();
      });
      const release = (e: Event) => {
        e.preventDefault();
        el.classList.remove('pressed');
        up?.();
      };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('pointerleave', release);
    };
    press(fireBtn, () => (this.fireHeld = true), () => (this.fireHeld = false));
    press(jumpBtn, () => (this.jumpQueued = true));
  }

  private bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === ' ') {
        this.jumpQueued = true;
        e.preventDefault();
      }
      this.syncKeyboardMove();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
      this.syncKeyboardMove();
    });
  }

  private syncKeyboardMove() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x || y) {
      this.move.set(x, y).normalize();
    } else if (this.joyId === null) {
      this.move.set(0, 0);
    }
  }

  private bindMouse() {
    window.addEventListener('mousemove', (e) => {
      this.pointerNDC.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      this.mouseAiming = true;
    });
    window.addEventListener('mousedown', (e) => {
      // only left button, and ignore clicks on UI buttons
      if (e.button === 0 && !(e.target as HTMLElement).closest('.btn,.bigbtn')) this.fireHeld = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.fireHeld = false;
    });
  }
}
