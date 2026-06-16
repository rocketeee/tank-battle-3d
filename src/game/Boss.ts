import * as THREE from 'three';
import { makeBoss } from './AssetFactory';
import { Particles } from './Particles';
import { FireIntent } from './Enemy';
import { StatusState } from './roguelite/status';
import type { HitOpts } from './roguelite/api';

const BOSS_CONFIG = [
  { name: '机械统帅', hp: 1500, color: 0x7cff6b, altitude: 0, speed: 2.2 },
  { name: '沙暴蝎王', hp: 2200, color: 0xffb24a, altitude: 0, speed: 2.6 },
  { name: '虚空母舰', hp: 3200, color: 0xc06bff, altitude: 1.0, speed: 3.2 },
];

export class Boss {
  group: THREE.Group;
  hp: number;
  hpMax: number;
  name: string;
  alive = true;
  radius = 2.4;
  headY: number;
  level: number;
  status = new StatusState();
  isBoss = true;

  private color: number;
  private altitude: number;
  private speed: number;
  private atkTimer = 2.0;
  private burstTimer = 5.0;
  private spiralAngle = 0;
  private enraged = false;

  constructor(scene: THREE.Scene, level: number) {
    this.level = level;
    const cfg = BOSS_CONFIG[level];
    this.group = makeBoss(level);
    this.hpMax = cfg.hp;
    this.hp = cfg.hp;
    this.name = cfg.name;
    this.color = cfg.color;
    this.altitude = cfg.altitude;
    this.speed = cfg.speed;
    this.headY = (this.group.userData.headY as number) ?? 2.5;
    scene.add(this.group);
  }

  spawnAt(pos: THREE.Vector3) {
    this.group.position.set(pos.x, this.altitude, pos.z);
  }

  private muzzleWorld(): THREE.Vector3 {
    const local = (this.group.userData.muzzleLocal as THREE.Vector3).clone();
    this.group.updateMatrixWorld(true);
    return this.group.localToWorld(local);
  }

  update(dt: number, playerPos: THREE.Vector3, time: number): FireIntent[] {
    if (!this.alive) return [];
    const intents: FireIntent[] = [];
    const p = this.group.position;
    const toPlayer = new THREE.Vector3(playerPos.x - p.x, 0, playerPos.z - p.z);
    const dist = toPlayer.length();
    toPlayer.normalize();

    // keep mid distance, slowly strafe
    const slow = this.status.slowFactor();
    if (dist > 13) p.addScaledVector(toPlayer, this.speed * slow * dt);
    else if (dist < 9) p.addScaledVector(toPlayer, -this.speed * slow * dt);
    const tangent = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
    p.addScaledVector(tangent, Math.sin(time * 0.5) * this.speed * 0.6 * slow * dt);
    if (this.level === 2) p.y = this.altitude + Math.sin(time * 1.2) * 0.6;
    this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    if (this.level === 2) this.group.rotation.y = time * 0.6; // mothership spin

    if (!this.enraged && this.hp < this.hpMax * 0.4) {
      this.enraged = true;
    }
    const rate = this.enraged ? 0.6 : 1;

    // aimed shots
    this.atkTimer -= dt;
    if (this.atkTimer <= 0) {
      this.atkTimer = (this.level === 2 ? 1.2 : 1.6) * rate;
      const muzzle = this.muzzleWorld();
      const baseDir = new THREE.Vector3(playerPos.x - muzzle.x, (playerPos.y + 0.6) - muzzle.y, playerPos.z - muzzle.z).normalize();
      const spread = this.level + 1;
      for (let i = -spread; i <= spread; i++) {
        const a = i * 0.12;
        const dir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
        intents.push({ pos: muzzle.clone(), dir, color: this.color, speed: 16, damage: 2 });
      }
    }

    // radial burst / spiral
    this.burstTimer -= dt;
    if (this.burstTimer <= 0) {
      this.burstTimer = (this.level === 2 ? 0.12 : 3.5) * (this.enraged ? 0.7 : 1);
      const center = new THREE.Vector3(p.x, p.y + this.headY * 0.5, p.z);
      if (this.level === 2) {
        // continuous spiral
        this.spiralAngle += 0.5;
        for (let k = 0; k < 3; k++) {
          const a = this.spiralAngle + (k * Math.PI * 2) / 3;
          const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
          intents.push({ pos: center.clone(), dir, color: this.color, speed: 12, damage: 2 });
        }
      } else {
        const count = 12;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
          intents.push({ pos: center.clone(), dir, color: this.color, speed: 11, damage: 2 });
        }
      }
    }

    return intents;
  }

  takeDamage(dmg: number, hitY: number, particles: Particles, opts?: HitOpts): { crit: boolean; dmg: number; killed: boolean } {
    const headWorldY = this.group.position.y + this.headY;
    const headHit = hitY >= headWorldY - 0.9;
    let crit: boolean;
    if (opts?.noCrit) crit = false;
    else if (opts?.forceCrit || headHit) crit = true;
    else crit = Math.random() < ((opts?.critChance ?? 0) + (opts?.bonusCritChance ?? 0));
    const critMult = opts?.critMult ?? 2;
    const finalDmg = Math.max(1, Math.round((crit ? dmg * critMult : dmg) * (opts?.damageMult ?? 1)));
    this.hp -= finalDmg;
    const hitPos = new THREE.Vector3(this.group.position.x + (Math.random() - 0.5), hitY, this.group.position.z + (Math.random() - 0.5));
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

  /** Big multi-explosion death sequence. */
  explode(particles: Particles) {
    const c = this.centerWorld();
    for (let i = 0; i < 8; i++) {
      const off = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4);
      setTimeout(() => particles.explosion(c.clone().add(off), this.color, 2), i * 90);
    }
  }

  dispose(scene: THREE.Scene) {
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
