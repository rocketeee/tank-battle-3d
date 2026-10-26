import * as THREE from 'three';

export interface SkillBtn {
  name: string;
  el: HTMLElement;
}

export interface ControlEls {
  moveZone: HTMLElement;
  joystick: HTMLElement;
  knob: HTMLElement;
  aimZone: HTMLElement;
  fireBtn: HTMLElement;
  skills: SkillBtn[];
}

/**
 * Touch: left stick moves, right drag looks, on-screen buttons fire and use skills.
 * Desktop web: WASD moves, the pointer aims, left click fires. Right click is not a control.
 */
export class Input {
  move = new THREE.Vector2(0, 0);
  lookDelta = new THREE.Vector2(0, 0);
  /** Normalized device coords. Desktop aim reads this; touch aim ignores it. */
  pointerNdc = new THREE.Vector2(0, 0);
  fireHeld = false;

  private skillQueue = new Set<string>();
  private els: ControlEls;
  private keys = new Set<string>();

  private joyId: number | null = null;
  private joyCenter = new THREE.Vector2();
  private joyRadius = 56;

  private lookId: number | null = null;
  private lookLast = new THREE.Vector2();

  private mouseAim: boolean;
  private mouseOnStick: boolean;

  constructor(els: ControlEls, opts: { mouseAim?: boolean; mouseOnStick?: boolean } = {}) {
    this.els = els;
    this.mouseAim = opts.mouseAim === true;
    this.mouseOnStick = opts.mouseOnStick === true;
    this.bindMove();
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

  /** Drop held fire, queued skills, and look delta. Movement keys stay. */
  discardActions() {
    this.fireHeld = false;
    this.skillQueue.clear();
    this.lookDelta.set(0, 0);
  }

  /** Returns accumulated look delta (px) and resets it. */
  takeLook(): THREE.Vector2 {
    const d = this.lookDelta.clone();
    this.lookDelta.set(0, 0);
    return d;
  }

  private bindMove() {
    const { moveZone, joystick, knob } = this.els;
    moveZone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && !this.mouseOnStick) return;
      e.preventDefault();
      this.joyId = e.pointerId;
      try { moveZone.setPointerCapture(e.pointerId); } catch { /* untrusted or lost pointer */ }
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
    const denom = this.joyRadius || 1;
    this.move.set((Math.cos(ang) * clamped) / denom, (Math.sin(ang) * clamped) / denom);
  }

  private bindLook() {
    const { aimZone } = this.els;
    aimZone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && !this.mouseOnStick) return;
      const target = e.target as HTMLElement;
      if (target.closest('.btn')) return;
      e.preventDefault();
      this.lookId = e.pointerId;
      try { aimZone.setPointerCapture(e.pointerId); } catch { /* untrusted or lost pointer */ }
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

  private bindButtons() {
    const { fireBtn, skills } = this.els;
    fireBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { fireBtn.setPointerCapture(e.pointerId); } catch { /* untrusted or lost pointer */ }
      fireBtn.classList.add('pressed');
      this.fireHeld = true;
    });
    const fireUp = (e: PointerEvent) => {
      if (!this.fireHeld) return;
      e.preventDefault();
      fireBtn.classList.remove('pressed');
      this.fireHeld = false;
    };
    fireBtn.addEventListener('pointerup', fireUp);
    fireBtn.addEventListener('pointercancel', fireUp);

    for (const s of skills) {
      s.el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { s.el.setPointerCapture(e.pointerId); } catch { /* untrusted or lost pointer */ }
        s.el.classList.add('pressed');
        this.skillQueue.add(s.name);
      });
      const up = (e: Event) => {
        e.preventDefault();
        s.el.classList.remove('pressed');
      };
      s.el.addEventListener('pointerup', up);
      s.el.addEventListener('pointercancel', up);
    }
  }

  private bindKeyboard() {
    const skillKeys: Record<string, string> = {
      Space: 'jump', Digit1: 'spread', Digit2: 'shield', Digit3: 'orbital', Digit4: 'dash',
    };
    window.addEventListener('keydown', (e) => {
      if (e.repeat && skillKeys[e.code]) return;
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

  private trackPointer(e: MouseEvent) {
    if (!this.mouseAim) return;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    this.pointerNdc.set((e.clientX / w) * 2 - 1, -(e.clientY / h) * 2 + 1);
  }

  private bindMouse() {
    window.addEventListener('mousemove', (e) => this.trackPointer(e));
    window.addEventListener('mousedown', (e) => {
      this.trackPointer(e);
      if (!this.mouseAim || e.button !== 0) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('.btn,.bigbtn,.textbtn,.card,.joystick,.panel,a,.move-zone,.aim-zone')) return;
      this.fireHeld = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0 && !this.keys.has('KeyJ')) this.fireHeld = false;
    });
    if (!this.mouseAim) {
      window.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }
}
