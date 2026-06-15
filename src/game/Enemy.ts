import * as THREE from 'three';
import { makeGrayAlien, makeUfo } from './AssetFactory';
import { HealthBar3D } from './HealthBar';
import { Particles } from './Particles';
import { rand } from './util';

export type EnemyKind = 'alien' | 'ufo';

export interface FireIntent {
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  color: number;
  speed: number;
  damage: number;
}

export class Enemy {
  group: THREE.Group;
  kind: EnemyKind;
  hp: number;
  hpMax: number;
  alive = true;
  radius: number;
  headY: number;
  scoreValue: number;
  meleeCd = 0;

  private bar: HealthBar3D;
  private speed: number;
  private fireTimer: number;
  private fireInterval: number;
  private altitude: number;
  private bobPhase = rand(0, Math.PI * 2);
  private strafeDir = Math.random() < 0.5 ? 1 : -1;
  private bulletColor: number;
  private bulletDamage: number;

  constructor(scene: THREE.Scene, kind: EnemyKind, hpScale: number, variant: number) {
    this.kind = kind;
    if (kind === 'alien') {
      this.group = makeGrayAlien(variant);
      this.hpMax = Math.round(40 * hpScale);
      this.radius = 0.7;
      this.headY = 1.18;
      this.speed = rand(2.6, 3.6);
      this.fireInterval = rand(1.6, 2.6);
      this.altitude = 0;
      this.scoreValue = 100;
      this.bulletColor = 0x7cff6b;
      this.bulletDamage = 1;
    } else {
      this.group = makeUfo(variant);
      this.hpMax = Math.round(55 * hpScale);
      this.radius = 1.0;
      this.headY = 0.2;
      this.speed = rand(3.2, 4.5);
      this.fireInterval = rand(1.8, 2.8);
      this.altitude = rand(4.2, 5.6);
      this.scoreValue = 150;
      this.bulletColor = (this.group.userData.beamColor as number) ?? 0xb06bff;
      this.bulletDamage = 2;
    }
    this.hp = this.hpMax;
    this.fireTimer = rand(0.6, this.fireInterval);

    this.bar = new HealthBar3D(kind === 'ufo' ? 1.3 : 0.9);
    this.bar.group.position.y = (this.group.userData.headY as number) + 0.6;
    this.group.add(this.bar.group);
    scene.add(this.group);
  }

  spawnAt(pos: THREE.Vector3) {
    this.group.position.set(pos.x, this.altitude, pos.z);
  }

  faceBar(cam: THREE.Camera) {
    this.bar.faceCamera(cam);
  }

  /** AI step. Returns a fire intent when the enemy shoots, else null. */
  update(dt: number, playerPos: THREE.Vector3, time: number): FireIntent | null {
    if (!this.alive) return null;
    if (this.meleeCd > 0) this.meleeCd -= dt;
    const p = this.group.position;
    const toPlayer = new THREE.Vector3(playerPos.x - p.x, 0, playerPos.z - p.z);
    const dist = toPlayer.length();
    toPlayer.normalize();

    if (this.kind === 'alien') {
      // approach, keep ~6 units
      if (dist > 6) p.addScaledVector(toPlayer, this.speed * dt);
      else if (dist < 4) p.addScaledVector(toPlayer, -this.speed * 0.6 * dt);
      // face player
      this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      // little walk bob
      p.y = Math.abs(Math.sin(time * 6 + this.bobPhase)) * 0.12;
    } else {
      // strafe around player at fixed radius, bob in altitude
      const orbit = 9;
      const tangent = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).multiplyScalar(this.strafeDir);
      const radial = dist > orbit ? 1 : dist < orbit - 1.5 ? -1 : 0;
      p.addScaledVector(tangent, this.speed * dt);
      p.addScaledVector(toPlayer, radial * this.speed * 0.8 * dt);
      p.y = this.altitude + Math.sin(time * 1.5 + this.bobPhase) * 0.5;
      this.group.rotation.y += dt * 1.2;
    }

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && dist < 26) {
      this.fireTimer = this.fireInterval;
      const muzzleLocal = (this.group.userData.muzzleLocal as THREE.Vector3).clone();
      this.group.updateMatrixWorld(true);
      const pos = this.group.localToWorld(muzzleLocal);
      const dir = new THREE.Vector3(playerPos.x - pos.x, (playerPos.y + 0.6) - pos.y, playerPos.z - pos.z).normalize();
      return { pos, dir, color: this.bulletColor, speed: this.kind === 'ufo' ? 14 : 16, damage: this.bulletDamage };
    }
    return null;
  }

  /** Returns crit flag + whether killed. */
  takeDamage(dmg: number, hitY: number, particles: Particles): { crit: boolean; dmg: number; killed: boolean } {
    const headWorldY = this.group.position.y + this.headY;
    const crit = hitY >= headWorldY - 0.35;
    const finalDmg = crit ? Math.round(dmg * 2) : dmg;
    this.hp -= finalDmg;
    this.bar.set(this.hp / this.hpMax);
    const hitPos = new THREE.Vector3(this.group.position.x, hitY, this.group.position.z);
    particles.hit(hitPos, crit);
    if (this.hp <= 0 && this.alive) {
      this.alive = false;
      return { crit, dmg: finalDmg, killed: true };
    }
    return { crit, dmg: finalDmg, killed: false };
  }

  centerWorld(): THREE.Vector3 {
    return new THREE.Vector3(this.group.position.x, this.group.position.y + this.headY * 0.5, this.group.position.z);
  }

  dispose(scene: THREE.Scene, particles: Particles) {
    particles.explosion(this.centerWorld(), this.kind === 'ufo' ? 0xb06bff : 0xff8a3b, this.kind === 'ufo' ? 1.4 : 1);
    this.bar.dispose();
    scene.remove(this.group);
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.userData.isOutline) return;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) mat.dispose();
    });
  }
}
