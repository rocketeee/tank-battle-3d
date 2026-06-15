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

  /** Big layered fiery explosion: flash + fireball + smoke puffs + sparks + scorch. */
  explosion(pos: THREE.Vector3, color = 0xff8a3b, scale = 1) {
    // instant white-hot flash
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.6 * scale, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    flash.position.copy(pos);
    this.add(flash, 0.16, (e, dt) => {
      const t = 1 - e.life / e.maxLife;
      e.obj.scale.setScalar(1 + t * 2.2 * scale);
      ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - t;
      e.life -= dt;
    });

    // layered fireball (outer red, inner orange, hot yellow center)
    const layers = [
      { c: 0xff3b1f, r: 0.55, grow: 3.0, life: 0.5 },
      { c: color, r: 0.42, grow: 2.6, life: 0.45 },
      { c: 0xffd54a, r: 0.28, grow: 2.0, life: 0.38 },
    ];
    for (const L of layers) {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(L.r * scale, 14, 14),
        new THREE.MeshBasicMaterial({ color: L.c, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      ball.position.copy(pos);
      this.add(ball, L.life, (e, dt) => {
        const t = 1 - e.life / e.maxLife;
        e.obj.scale.setScalar(1 + t * L.grow * scale);
        e.obj.position.y += dt * 0.5;
        ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - t;
        e.life -= dt;
      });
    }

    // drifting smoke puffs
    const puffs = Math.round(3 * scale);
    for (let i = 0; i < puffs; i++) {
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry((0.4 + Math.random() * 0.3) * scale, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x4a4a4a, transparent: true, opacity: 0.55, depthWrite: false }),
      );
      smoke.position.copy(pos);
      const drift = new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.8 + Math.random(), (Math.random() - 0.5) * 1.4);
      this.add(smoke, 0.8 + Math.random() * 0.4, (e, dt) => {
        const t = 1 - e.life / e.maxLife;
        e.obj.scale.setScalar(1 + t * 2.4 * scale);
        e.obj.position.addScaledVector(drift, dt);
        ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t);
        e.life -= dt;
      });
    }

    // flying sparks/embers
    const n = Math.round(12 * scale);
    for (let i = 0; i < n; i++) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 * scale, 6, 6),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd54a : 0xff7b2a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      spark.position.copy(pos);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 7, Math.random() * 6 + 1.5, (Math.random() - 0.5) * 7).multiplyScalar(scale);
      this.add(spark, 0.5 + Math.random() * 0.4, (e, dt) => {
        vel.y -= 12 * dt;
        e.obj.position.addScaledVector(vel, dt);
        ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = e.life / e.maxLife;
        e.life -= dt;
      });
    }

    // ground scorch shockwave
    this.ring(pos.clone(), 0xffa83b, 2.0 * scale);
  }

  /** Punchy muzzle flash: star-burst cone + glow + smoke puff at the barrel tip. */
  muzzle(pos: THREE.Vector3, color = 0xffd54a) {
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    glow.position.copy(pos);
    this.add(glow, 0.13, (e, dt) => {
      e.obj.scale.setScalar(1 + (1 - e.life / e.maxLife) * 1.8);
      ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = e.life / e.maxLife;
      e.life -= dt;
    });
    // a few quick spark streaks
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      s.position.copy(pos);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.2) * 2, (Math.random() - 0.5) * 3);
      this.add(s, 0.18, (e, dt) => {
        e.obj.position.addScaledVector(vel, dt);
        ((e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = e.life / e.maxLife;
        e.life -= dt;
      });
    }
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
