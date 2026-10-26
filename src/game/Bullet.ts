import * as THREE from 'three';

export interface Bullet {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  damage: number;
  fromPlayer: boolean;
  radius: number;
  life: number;
  alive: boolean;
}

const GEO = new THREE.SphereGeometry(1, 7, 6);
const MAX_ALIVE = 80;

/**
 * Reuses meshes. Boss spirals used to allocate a StandardMaterial per shot
 * and stall mid-range phones.
 */
export class BulletManager {
  list: Bullet[] = [];
  private scene: THREE.Scene;
  private free: Bullet[] = [];
  private forward = new THREE.Vector3(0, 0, 1);

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
  }): Bullet {
    if (this.list.length >= MAX_ALIVE) this.recycleOldestEnemy();
    const color = opts.color ?? (opts.fromPlayer ? 0xffd54a : 0x7cff6b);
    const size = opts.size ?? (opts.fromPlayer ? 0.22 : 0.18);
    let b = this.free.pop();
    if (!b) {
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(GEO, mat);
      mesh.castShadow = false;
      this.scene.add(mesh);
      b = { mesh, vel: new THREE.Vector3(), damage: 0, fromPlayer: true, radius: 0.3, life: 3, alive: true };
    } else if (!b.mesh.parent) {
      this.scene.add(b.mesh);
    }
    const mat = b.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(color);
    b.mesh.visible = true;
    b.mesh.position.copy(opts.pos);
    b.mesh.scale.set(size, size, size * 1.8);
    const dir = opts.dir.clone().normalize();
    b.mesh.quaternion.setFromUnitVectors(this.forward, dir);
    b.vel.copy(dir).multiplyScalar(opts.speed);
    b.damage = opts.damage;
    b.fromPlayer = opts.fromPlayer;
    b.radius = opts.radius ?? size + 0.15;
    b.life = opts.life ?? 3;
    b.alive = true;
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
        this.retire(i);
      }
    }
  }

  clear() {
    for (let i = this.list.length - 1; i >= 0; i--) this.retire(i);
  }

  private retire(index: number) {
    const b = this.list[index];
    b.alive = false;
    b.mesh.visible = false;
    this.list.splice(index, 1);
    this.free.push(b);
  }

  private recycleOldestEnemy() {
    const idx = this.list.findIndex((b) => !b.fromPlayer);
    if (idx >= 0) this.retire(idx);
    else if (this.list.length > 0) this.retire(0);
  }
}
