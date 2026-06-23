import * as THREE from 'three';
import { makeTank } from './AssetFactory';
import { Particles } from './Particles';
import { AudioEngine } from './Audio';
import { Input } from './Input';
import { clamp, damp, rotateToward } from './util';
import { PlayerStats, BASE } from './roguelite/stats';

const LIVES_MAX = 3;
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
  private shieldMesh: THREE.Mesh;
  pos = new THREE.Vector3(0, 0, 0);

  bodyYaw = 0;
  aimYaw = 0;

  vy = 0;
  y = 0;
  airborne = false;

  hp = BASE.maxHp;
  hpMax = BASE.maxHp;
  lives = LIVES_MAX;
  livesMax = LIVES_MAX;
  dead = false;

  invincible = 0;
  fireCd = 0;

  shieldTime = 0;
  private dashTime = 0;
  private dashDir = new THREE.Vector3();
  private regenCarry = 0;

  /** Per-run stats; bound by Game once the RunState is created. */
  stats: PlayerStats = new PlayerStats();

  private particles: Particles;
  private audio: AudioEngine;
  private pendingShock: LandShock | null = null;

  constructor(scene: THREE.Scene, particles: Particles, audio: AudioEngine) {
    this.group = makeTank();
    this.turret = this.group.getObjectByName('turret')!;
    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0x5fd8ff, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    this.shieldMesh.position.y = 1.0;
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);
    scene.add(this.group);
    this.particles = particles;
    this.audio = audio;
  }

  bindStats(stats: PlayerStats) {
    this.stats = stats;
  }

  /** Re-read max HP from stats (after a card raises it). `refill` tops the bar off. */
  syncMaxHp(refill: boolean) {
    this.hpMax = this.stats.maxHp;
    if (refill) this.hp = this.hpMax;
    else this.hp = Math.min(this.hp, this.hpMax);
  }

  reset(pos: THREE.Vector3) {
    this.pos.copy(pos);
    this.hpMax = this.stats.maxHp;
    this.hp = this.hpMax;
    this.lives = LIVES_MAX;
    this.dead = false;
    this.vy = 0;
    this.y = 0;
    this.airborne = false;
    this.invincible = 0;
    this.fireCd = 0;
    this.shieldTime = 0;
    this.dashTime = 0;
    this.regenCarry = 0;
    this.bodyYaw = 0;
    this.aimYaw = 0;
    this.group.visible = true;
  }

  get protectedNow(): boolean {
    return this.invincible > 0 || this.shieldTime > 0;
  }

  /**
   * @param aimYaw   desired turret yaw (from screen-center crosshair)
   * @param camYaw   camera orientation, used as basis for camera-relative movement
   */
  update(dt: number, input: Input, aimYaw: number, camYaw: number, bounds: number) {
    if (this.dead) return;

    // --- movement (camera-relative) ---
    const speed = BASE.moveSpeed * this.stats.moveSpeed;
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
        this.pos.addScaledVector(dir, speed * mag * dt);
      }
    }

    // --- dash motion ---
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.pos.addScaledVector(this.dashDir, 34 * dt);
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

    // --- regen ---
    if (this.stats.regen > 0 && this.hp < this.hpMax && !this.dead) {
      this.regenCarry += this.stats.regen * dt;
      if (this.regenCarry >= 1) {
        const whole = Math.floor(this.regenCarry);
        this.regenCarry -= whole;
        this.hp = Math.min(this.hpMax, this.hp + whole);
      }
    }

    // --- timers ---
    this.fireCd = Math.max(0, this.fireCd - dt);

    if (this.shieldTime > 0) {
      this.shieldTime -= dt;
      this.shieldMesh.visible = true;
      const pulse = 0.32 + Math.sin(performance.now() * 0.012) * 0.1;
      (this.shieldMesh.material as THREE.MeshBasicMaterial).opacity = this.shieldTime > 0 ? pulse : 0;
      this.shieldMesh.scale.setScalar(1 + Math.sin(performance.now() * 0.02) * 0.03);
      if (this.shieldTime <= 0) this.shieldMesh.visible = false;
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

  // -------------------------------------------------------------- skill primitives
  jump() {
    if (this.airborne) return;
    this.airborne = true;
    this.vy = JUMP_VY;
    this.particles.jetFlame(new THREE.Vector3(this.pos.x, 0.1, this.pos.z));
    this.audio.jump();
  }

  shield(dur: number) {
    this.shieldTime = Math.max(this.shieldTime, dur);
  }

  dash(camYaw: number, dur: number, _speed: number) {
    if (this.airborne) return;
    this.dashTime = dur;
    this.dashDir.set(Math.sin(camYaw), 0, Math.cos(camYaw)).normalize();
    this.bodyYaw = Math.atan2(this.dashDir.x, this.dashDir.z);
    this.shieldTime = Math.max(this.shieldTime, 0.35);
  }

  heal(amount: number) {
    if (amount <= 0) return;
    this.hp = Math.min(this.hpMax, this.hp + amount);
  }

  /** Returns world muzzle position + direction toward `target` if ready, else null. */
  tryFire(target: THREE.Vector3 | null): { pos: THREE.Vector3; dir: THREE.Vector3 } | null {
    if (this.fireCd > 0 || this.dead) return null;
    this.fireCd = BASE.fireInterval / this.stats.fireRateMult;
    const pos = this.muzzleWorld();
    const dir = target
      ? new THREE.Vector3().subVectors(target, pos).normalize()
      : new THREE.Vector3(Math.sin(this.aimYaw), 0, Math.cos(this.aimYaw)).normalize();
    this.particles.muzzle(pos.clone(), 0xffd54a);
    this.audio.fire();
    return { pos, dir };
  }

  muzzleWorld(): THREE.Vector3 {
    this.group.updateMatrixWorld(true);
    const local = (this.group.userData.muzzleLocal as THREE.Vector3).clone();
    return this.turret.localToWorld(local);
  }

  /** Apply damage. Returns 'dead' if all lives lost, 'life' if a life was lost, 'hit' otherwise, '' if ignored. */
  takeDamage(dmg: number): '' | 'hit' | 'life' | 'dead' {
    if (this.protectedNow || this.dead) return '';
    const reduced = dmg * (1 - clamp(this.stats.armor, 0, 0.85));
    this.hp -= reduced;
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
