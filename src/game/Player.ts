import * as THREE from 'three';
import { makeTank } from './AssetFactory';
import { Particles } from './Particles';
import { AudioEngine } from './Audio';
import { Input } from './Input';
import { clamp, damp, rotateToward } from './util';

const HP_MAX = 10;
const LIVES_MAX = 3;
const SPEED = 9;
const FIRE_RATE = 0.32;
const JUMP_CD = 3.0;
const JUMP_VY = 9;
const GRAVITY = 24;

export interface LandShock {
  pos: THREE.Vector3;
  radius: number;
  damage: number;
}

export class Player {
  group: THREE.Group;
  private turret: THREE.Object3D;
  pos = new THREE.Vector3(0, 0, 0);

  bodyYaw = 0;
  aimYaw = 0;

  vy = 0;
  y = 0;
  airborne = false;

  hp = HP_MAX;
  hpMax = HP_MAX;
  lives = LIVES_MAX;
  livesMax = LIVES_MAX;
  dead = false;

  invincible = 0;
  fireCd = 0;
  jumpCd = 0;

  private particles: Particles;
  private audio: AudioEngine;
  private pendingShock: LandShock | null = null;

  constructor(scene: THREE.Scene, particles: Particles, audio: AudioEngine) {
    this.group = makeTank();
    this.turret = this.group.getObjectByName('turret')!;
    scene.add(this.group);
    this.particles = particles;
    this.audio = audio;
  }

  reset(pos: THREE.Vector3) {
    this.pos.copy(pos);
    this.hp = HP_MAX;
    this.lives = LIVES_MAX;
    this.dead = false;
    this.vy = 0;
    this.y = 0;
    this.airborne = false;
    this.invincible = 0;
    this.fireCd = 0;
    this.jumpCd = 0;
    this.bodyYaw = 0;
    this.aimYaw = 0;
    this.group.visible = true;
  }

  get jumpReady(): boolean {
    return this.jumpCd <= 0 && !this.airborne;
  }

  get jumpCdRatio(): number {
    return clamp(this.jumpCd / JUMP_CD, 0, 1);
  }

  update(dt: number, input: Input, desiredAimYaw: number, bounds: number) {
    if (this.dead) return;

    // --- movement ---
    const mv = input.move;
    const mag = Math.min(1, Math.hypot(mv.x, mv.y));
    if (mag > 0.08) {
      const moveYaw = Math.atan2(mv.x, mv.y);
      this.bodyYaw = rotateToward(this.bodyYaw, moveYaw, 9 * dt);
      const dir = new THREE.Vector3(Math.sin(this.bodyYaw), 0, Math.cos(this.bodyYaw));
      this.pos.addScaledVector(dir, SPEED * mag * dt);
      this.pos.x = clamp(this.pos.x, -bounds, bounds);
      this.pos.z = clamp(this.pos.z, -bounds, bounds);
    }

    // --- aim (smoothed toward desired) ---
    this.aimYaw = rotateToward(this.aimYaw, desiredAimYaw, 14 * dt);

    // --- jump physics ---
    if (this.airborne) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (Math.random() < 0.9) this.particles.jetFlame(new THREE.Vector3(this.pos.x, this.y + 0.1, this.pos.z));
      if (this.y <= 0) {
        this.y = 0;
        this.airborne = false;
        this.land();
      }
    }

    // --- timers ---
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.jumpCd = Math.max(0, this.jumpCd - dt);
    if (this.invincible > 0) {
      this.invincible -= dt;
      // blink
      const blink = Math.floor(this.invincible * 12) % 2 === 0;
      this.group.visible = blink;
      if (this.invincible <= 0) this.group.visible = true;
    }

    // --- transforms ---
    this.group.position.set(this.pos.x, this.y, this.pos.z);
    this.group.rotation.y = this.bodyYaw;
    this.turret.rotation.y = this.aimYaw - this.bodyYaw;
  }

  private land() {
    this.pendingShock = { pos: this.pos.clone(), radius: 5.5, damage: 28 };
    this.particles.ring(new THREE.Vector3(this.pos.x, 0.1, this.pos.z), 0x67d2ff, 4);
    this.particles.explosion(new THREE.Vector3(this.pos.x, 0.3, this.pos.z), 0x67d2ff, 1.2);
    this.audio.jump();
  }

  consumeLandShock(): LandShock | null {
    const s = this.pendingShock;
    this.pendingShock = null;
    return s;
  }

  tryJump(): boolean {
    if (!this.jumpReady) return false;
    this.airborne = true;
    this.vy = JUMP_VY;
    this.jumpCd = JUMP_CD;
    this.particles.jetFlame(new THREE.Vector3(this.pos.x, 0.1, this.pos.z));
    this.audio.jump();
    return true;
  }

  /** Returns world muzzle position + direction if ready to fire, else null. */
  tryFire(): { pos: THREE.Vector3; dir: THREE.Vector3 } | null {
    if (this.fireCd > 0 || this.dead) return null;
    this.fireCd = FIRE_RATE;
    this.group.updateMatrixWorld(true);
    const local = (this.group.userData.muzzleLocal as THREE.Vector3).clone();
    const pos = this.turret.localToWorld(local);
    const dir = new THREE.Vector3(Math.sin(this.aimYaw), 0, Math.cos(this.aimYaw)).normalize();
    this.particles.muzzle(pos.clone(), 0xffd54a);
    this.audio.fire();
    return { pos, dir };
  }

  /** Apply damage. Returns 'dead' if all lives lost, 'life' if a life was lost, 'hit' otherwise, '' if ignored. */
  takeDamage(dmg: number): '' | 'hit' | 'life' | 'dead' {
    if (this.invincible > 0 || this.dead) return '';
    this.hp -= dmg;
    this.audio.hurt();
    if (this.hp <= 0) {
      this.lives -= 1;
      if (this.lives <= 0) {
        this.lives = 0;
        this.hp = 0;
        this.dead = true;
        this.audio.gameOver();
        return 'dead';
      }
      this.hp = this.hpMax;
      this.invincible = 3.0;
      this.particles.explosion(new THREE.Vector3(this.pos.x, 0.8, this.pos.z), 0xff5252, 1.5);
      return 'life';
    }
    return 'hit';
  }

  worldPos(): THREE.Vector3 {
    return new THREE.Vector3(this.pos.x, this.y + 0.8, this.pos.z);
  }

  /** Camera follow helper. */
  cameraLerp(camera: THREE.PerspectiveCamera, dt: number) {
    const back = new THREE.Vector3(Math.sin(this.bodyYaw), 0, Math.cos(this.bodyYaw));
    const target = new THREE.Vector3(
      this.pos.x - back.x * 1.5,
      0,
      this.pos.z - back.z * 1.5,
    );
    const camTarget = new THREE.Vector3(target.x, 13.5, target.z + 11.5);
    camera.position.x = damp(camera.position.x, camTarget.x, 6, dt);
    camera.position.y = damp(camera.position.y, camTarget.y, 6, dt);
    camera.position.z = damp(camera.position.z, camTarget.z, 6, dt);
    camera.lookAt(this.pos.x, 1.8, this.pos.z - 3);
  }
}
