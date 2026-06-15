import * as THREE from 'three';

interface Effect {
  obj: THREE.Object3D;
  life: number;
  maxLife: number;
  update: (e: Effect, dt: number) => void;
}

/** Lightweight pooled particle / VFX manager. */
export class Particles {
  private scene: THREE.Scene;
  private effects: Effect[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private add(obj: THREE.Object3D, life: number, update: Effect['update']) {
    this.scene.add(obj);
    this.effects.push({ obj, life, maxLife: life, update });
  }

  /** Expanding fireball + sparks. */
  explosion(pos: THREE.Vector3, color = 0xff8a3b, scale = 1) {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.4 * scale, 12, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false }),
    );
    core.position.copy(pos);
    this.add(core, 0.45, (e, dt) => {
      const t = 1 - e.life / e.maxLife;
      e.obj.scale.setScalar(1 + t * 2.6 * scale);
      ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - t;
      e.life -= dt;
    });

    const smoke = new THREE.Mesh(
      new THREE.SphereGeometry(0.5 * scale, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    smoke.position.copy(pos);
    this.add(smoke, 0.7, (e, dt) => {
      const t = 1 - e.life / e.maxLife;
      e.obj.scale.setScalar(1 + t * 3 * scale);
      e.obj.position.y += dt * 0.6;
      ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
      e.life -= dt;
    });

    const n = Math.round(8 * scale);
    for (let i = 0; i < n; i++) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 * scale, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, depthWrite: false }),
      );
      spark.position.copy(pos);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5 + 1, (Math.random() - 0.5) * 6).multiplyScalar(scale);
      this.add(spark, 0.5 + Math.random() * 0.3, (e, dt) => {
        vel.y -= 12 * dt;
        e.obj.position.addScaledVector(vel, dt);
        ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = e.life / e.maxLife;
        e.life -= dt;
      });
    }
  }

  /** Small muzzle flash at the barrel tip. */
  muzzle(pos: THREE.Vector3, color = 0xffd54a) {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }),
    );
    flash.position.copy(pos);
    this.add(flash, 0.12, (e, dt) => {
      e.obj.scale.setScalar(1 + (1 - e.life / e.maxLife) * 1.5);
      ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = e.life / e.maxLife;
      e.life -= dt;
    });
  }

  /** Impact sparks; crit = bigger golden burst with text-like flare. */
  hit(pos: THREE.Vector3, crit: boolean) {
    const color = crit ? 0xffd54a : 0xff6b6b;
    const n = crit ? 12 : 6;
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(crit ? 0.1 : 0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }),
      );
      p.position.copy(pos);
      const vel = new THREE.Vector3((Math.random() - 0.5) * (crit ? 7 : 4), Math.random() * (crit ? 5 : 3), (Math.random() - 0.5) * (crit ? 7 : 4));
      this.add(p, 0.4, (e, dt) => {
        e.obj.position.addScaledVector(vel, dt);
        ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = e.life / e.maxLife;
        e.life -= dt;
      });
    }
    if (crit) this.ring(pos.clone(), 0xffd54a, 1.4);
  }

  /** Expanding shockwave ring (jump landing / crit). */
  ring(pos: THREE.Vector3, color = 0x67d2ff, maxR = 2.5) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    ring.position.copy(pos);
    ring.position.y += 0.1;
    ring.rotation.x = Math.PI / 2;
    this.add(ring, 0.5, (e, dt) => {
      const t = 1 - e.life / e.maxLife;
      e.obj.scale.setScalar(1 + t * maxR);
      ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      e.life -= dt;
    });
  }

  /** Jet flames burst under the tank during a jump. */
  jetFlame(pos: THREE.Vector3) {
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.5, 7),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x67d2ff : 0xffa83b, transparent: true, opacity: 0.9, depthWrite: false }),
      );
      f.position.copy(pos);
      f.position.x += (Math.random() - 0.5) * 0.6;
      f.position.z += (Math.random() - 0.5) * 0.6;
      f.rotation.x = Math.PI;
      const vel = new THREE.Vector3((Math.random() - 0.5) * 1.5, -3 - Math.random() * 2, (Math.random() - 0.5) * 1.5);
      this.add(f, 0.3, (e, dt) => {
        e.obj.position.addScaledVector(vel, dt);
        e.obj.scale.setScalar(e.life / e.maxLife);
        ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = e.life / e.maxLife;
        e.life -= dt;
      });
    }
  }

  /** Colored energy beam segment fading out (UFO / boss attacks). */
  beam(from: THREE.Vector3, to: THREE.Vector3, color = 0xff6b6b) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(0.06, 0.06, len, 8);
    const beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
    beam.position.copy(from).addScaledVector(dir, 0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.add(beam, 0.18, (e, dt) => {
      ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.85 * (e.life / e.maxLife);
      e.life -= dt;
    });
  }

  update(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.update(e, dt);
      if (e.life <= 0) {
        this.scene.remove(e.obj);
        const mesh = e.obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else if (m) m.dispose();
        this.effects.splice(i, 1);
      }
    }
  }
}
