import * as THREE from 'three';
import type { BulletEffect } from './roguelite/api';

export interface Bullet {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  damage: number;
  fromPlayer: boolean;
  radius: number;
  life: number;
  alive: boolean;
  effect: BulletEffect;
  hitsLeft: number;
  hits: Set<object>;
}

export class BulletManager {
  list: Bullet[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(opts: {
    pos: THREE.Vector3;
    dir: THREE.Vector3;
    speed: number;
    damage: number;
    fromPlayer: boolean;
    color?: number;
    radius?: number;
    size?: number;
    life?: number;
    effect?: BulletEffect;
  }): Bullet {
    const color = opts.color ?? (opts.fromPlayer ? 0xffd54a : 0x7cff6b);
    const size = opts.size ?? (opts.fromPlayer ? 0.22 : 0.18);
    const geo = new THREE.SphereGeometry(size, 10, 10);
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, roughness: 0.3 });
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.copy(opts.pos);
    mesh.scale.z = 1.8; // streak
    mesh.castShadow = false;
    // orient streak along travel dir
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), opts.dir.clone().normalize());
    this.scene.add(mesh);
    const effect: BulletEffect = opts.effect ?? { pierce: 0, statuses: [], bonusCritChance: 0, source: 'basic' };
    const b: Bullet = {
      mesh,
      vel: opts.dir.clone().normalize().multiplyScalar(opts.speed),
      damage: opts.damage,
      fromPlayer: opts.fromPlayer,
      radius: opts.radius ?? size + 0.15,
      life: opts.life ?? 3,
      alive: true,
      effect,
      hitsLeft: 1 + Math.max(0, Math.round(effect.pierce)),
      hits: new Set<object>(),
    };
    this.list.push(b);
    return b;
  }

  kill(b: Bullet) {
    b.alive = false;
  }

  update(dt: number, bounds: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;
      const p = b.mesh.position;
      if (b.life <= 0 || !b.alive || Math.abs(p.x) > bounds || Math.abs(p.z) > bounds || p.y < -2) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this.list.splice(i, 1);
      }
    }
  }

  clear() {
    for (const b of this.list) {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    }
    this.list = [];
  }
}
