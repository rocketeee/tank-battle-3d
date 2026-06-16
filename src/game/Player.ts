import * as THREE from 'three';
import { makeTank } from './AssetFactory';
import { Particles } from './Particles';
import { AudioEngine } from './Audio';
import { Input } from './Input';
import { clamp, damp, rotateToward } from './util';

const HP_MAX = 10;
const LIVES_MAX = 3;
const SPEED = 9;
const FIRE_RATE = 0.3;

const JUMP_CD = 3.0;
const JUMP_VY = 9;
const GRAVITY = 24;

const SPREAD_CD = 4.5;
const SHIELD_CD = 12;
const SHIELD_DUR = 4;
const ORBITAL_CD = 13;
const DASH_CD = 5;
const DASH_DUR = 0.24;
const DASH_SPEED = 34;

export interface LandShock {
  pos: THREE.Vector3;
  radius: number;
  damage: number;
}

export class Player {
  group: THREE.Group;
  private turret: THREE.Object3D;
  private shield: THREE.Mesh;
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
  spreadCd = 0;
  shieldCd = 0;
  orbitalCd = 0;
  dashCd = 0;

  shieldTime = 0;
  private dashTime = 0;
  private dashDir = new THREE.Vector3();

  private particles: Particles;
  private audio: AudioEngine;
  private pendingShock: LandShock | null = null;

  constructor(scene: THREE.Scene, particles: Particles, audio: AudioEngine) {
    this.group = makeTank();
    this.turret = this.group.getObjectByName('turret')!;
    this.shield = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0x5fd8ff, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    this.shield.position.y = 1.0;
    this.shield.visible = false;
    this.group.add(this.shield);
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
    this.spreadCd = 0;
    this.shieldCd = 0;
    this.orbitalCd = 0;
    this.dashCd = 0;
    this.shieldTime = 0;
    this.dashTime = 0;
    this.bodyYaw = 0;
    this.aimYaw = 0;
    this.group.visible = true;
  }

  get protectedNow(): boolean {
    return this.invincible > 0 || this.shieldTime > 0;
  }

  cdRatio(name: string): number {
    switch (name) {
      case 'jump': return clamp(this.jumpCd / JUMP_CD, 0, 1);
      case 'spread': return clamp(this.spreadCd / SPREAD_CD, 0, 1);
      case 'shield': return clamp(this.shieldCd / SHIELD_CD, 0, 1);
      case 'orbital': return clamp(this.orbitalCd / ORBITAL_CD, 0, 1);
      case 'dash': return clamp(this.dashCd / DASH_CD, 0, 1);
      default: return 0;
    }
  }

  /**
   * @param aimYaw   desired turret yaw (from screen-center crosshair)
   * @param camYaw   camera orientation, used as basis for camera-relative movement
   */
  update(dt: number, input: Input, aimYaw: number, camYaw: number, bounds: number) {
    if (this.dead) return;

    // --- movement (camera-relative) ---
    const mv = input.move;
    const mag = Math.min(1, Math.hypot(mv.x, mv.y));
    if (mag > 0.08 && this.dashTime <= 0) {
      const fwd = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
      const right = new THREE.Vector3(-Math.cos(camYaw), 0, Math.sin(camYaw));
      const dir = new THREE.Vector3().addScaledVector(fwd, -mv.y).addScaledVector(right, mv.x);
      if (dir.lengthSq() > 1e-4) {
        dir.normalize();
        const moveYaw = Math.atan2(dir.x, dir.z);
        this.bodyYaw = rotateToward(this.bodyYaw, moveYaw, 9 * dt);
        this.pos.addScaledVector(dir, SPEED * mag * dt);
      }
    }

    // --- dash motion ---
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.pos.addScaledVector(this.dashDir, DASH_SPEED * dt);
      this.particles.dashTrail(new THREE.Vector3(this.pos.x, this.y + 0.6, this.pos.z), 0x67e8ff);
    }
    this.pos.x = clamp(this.pos.x, -bounds, bounds);
    this.pos.z = clamp(this.pos.z, -bounds, bounds);

    // --- aim (turret tracks crosshair) ---
    this.aimYaw = rotateToward(this.aimYaw, aimYaw, 16 * dt);

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
    this.spreadCd = Math.max(0, this.spreadCd - dt);
    this.shieldCd = Math.max(0, this.shieldCd - dt);
    this.orbitalCd = Math.max(0, this.orbitalCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);

    if (this.shieldTime > 0) {
      this.shieldTime -= dt;
      this.shield.visible = true;
      const pulse = 0.32 + Math.sin(performance.now() * 0.012) * 0.1;
      (this.shield.material as THREE.MeshBasicMaterial).opacity = this.shieldTime > 0 ? pulse : 0;
      this.shield.scale.setScalar(1 + Math.sin(performance.now() * 0.02) * 0.03);
      if (this.shieldTime <= 0) this.shield.visible = false;
    }

    if (this.invincible > 0) {
      this.invincible -= dt;
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

  // -------------------------------------------------------------- skills
  tryJump(): boolean {
    if (this.jumpCd > 0 || this.airborne) return false;
    this.airborne = true;
    this.vy = JUMP_VY;
    this.jumpCd = JUMP_CD;
    this.particles.jetFlame(new THREE.Vector3(this.pos.x, 0.1, this.pos.z));
    this.audio.jump();
    return true;
  }

  tryShield(): boolean {
    if (this.shieldCd > 0) return false;
    this.shieldCd = SHIELD_CD;
    this.shieldTime = SHIELD_DUR;
    this.particles.ring(new THREE.Vector3(this.pos.x, 0.2, this.pos.z), 0x5fd8ff, 3);
    this.audio.jump();
    return true;
  }

  tryDash(camYaw: number): boolean {
    if (this.dashCd > 0 || this.airborne) return false;
    this.dashCd = DASH_CD;
    this.dashTime = DASH_DUR;
    this.dashDir.set(Math.sin(camYaw), 0, Math.cos(camYaw)).normalize();
    this.bodyYaw = Math.atan2(this.dashDir.x, this.dashDir.z);
    this.shieldTime = Math.max(this.shieldTime, 0.35);
    this.audio.jump();
    return true;
  }

  /** Returns world muzzle position + direction toward `target` if ready, else null. */
  tryFire(target: THREE.Vector3 | null): { pos: THREE.Vector3; dir: THREE.Vector3 } | null {
    if (this.fireCd > 0 || this.dead) return null;
    this.fireCd = FIRE_RATE;
    const pos = this.muzzleWorld();
    const dir = target
      ? new THREE.Vector3().subVectors(target, pos).normalize()
      : new THREE.Vector3(Math.sin(this.aimYaw), 0, Math.cos(this.aimYaw)).normalize();
    this.particles.muzzle(pos.clone(), 0xffd54a);
    this.audio.fire();
    return { pos, dir };
  }

  /** Spread skill: returns a fan of muzzle pos/dir, or null if on cooldown. */
  trySpread(): { pos: THREE.Vector3; dir: THREE.Vector3 }[] | null {
    if (this.spreadCd > 0 || this.dead) return null;
    this.spreadCd = SPREAD_CD;
    const pos = this.muzzleWorld();
    const out: { pos: THREE.Vector3; dir: THREE.Vector3 }[] = [];
    const spread = 0.3;
    for (let i = -2; i <= 2; i++) {
      const a = this.aimYaw + i * spread;
      out.push({ pos: pos.clone(), dir: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).normalize() });
    }
    this.particles.muzzle(pos.clone(), 0xffa83b);
    this.particles.muzzle(pos.clone(), 0xff6b6b);
    this.audio.fire();
    return out;
  }

  tryOrbital(): boolean {
    if (this.orbitalCd > 0) return false;
    this.orbitalCd = ORBITAL_CD;
    this.audio.fire();
    return true;
  }

  private muzzleWorld(): THREE.Vector3 {
    this.group.updateMatrixWorld(true);
    const local = (this.group.userData.muzzleLocal as THREE.Vector3).clone();
    return this.turret.localToWorld(local);
  }

  /** Apply damage. Returns 'dead' if all lives lost, 'life' if a life was lost, 'hit' otherwise, '' if ignored. */
  takeDamage(dmg: number): '' | 'hit' | 'life' | 'dead' {
    if (this.protectedNow || this.dead) return '';
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

  /** Idle/menu camera (gentle high follow); playing state uses Game's free-look camera. */
  cameraLerp(camera: THREE.PerspectiveCamera, dt: number) {
    const back = new THREE.Vector3(Math.sin(this.bodyYaw), 0, Math.cos(this.bodyYaw));
    const camTarget = new THREE.Vector3(this.pos.x - back.x * 1.5, 13.5, this.pos.z - back.z * 1.5 + 11.5);
    camera.position.x = damp(camera.position.x, camTarget.x, 6, dt);
    camera.position.y = damp(camera.position.y, camTarget.y, 6, dt);
    camera.position.z = damp(camera.position.z, camTarget.z, 6, dt);
    camera.lookAt(this.pos.x, 1.8, this.pos.z - 3);
  }
}
