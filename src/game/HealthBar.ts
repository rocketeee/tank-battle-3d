import * as THREE from 'three';

/** Billboard health bar that floats above an enemy. */
export class HealthBar3D {
  group: THREE.Group;
  private fill: THREE.Mesh;
  private width: number;

  constructor(width = 1.0, color = 0xff4444) {
    this.width = width;
    this.group = new THREE.Group();
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 0.08, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthTest: false }),
    );
    bg.renderOrder = 998;
    const fillMat = new THREE.MeshBasicMaterial({ color, depthTest: false });
    this.fill = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.12), fillMat);
    this.fill.renderOrder = 999;
    this.fill.position.z = 0.001;
    this.group.add(bg, this.fill);
  }

  set(ratio: number) {
    const r = Math.max(0, Math.min(1, ratio));
    this.fill.scale.x = r || 0.0001;
    this.fill.position.x = -(this.width * (1 - r)) / 2;
    const mat = this.fill.material as THREE.MeshBasicMaterial;
    mat.color.setHex(r > 0.5 ? 0x6bdf5a : r > 0.25 ? 0xffd54a : 0xff4444);
  }

  faceCamera(cam: THREE.Camera) {
    this.group.quaternion.copy(cam.quaternion);
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
  }
}

function textTexture(text: string, color: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.font = 'bold 76px -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, 128, 64);
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

interface FloatText {
  sprite: THREE.Sprite;
  life: number;
  maxLife: number;
  vy: number;
}

/** Manager for rising/fading damage numbers (e.g. "120!" crits). */
export class FloatingTextManager {
  private scene: THREE.Scene;
  private items: FloatText[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(pos: THREE.Vector3, text: string, crit: boolean) {
    const tex = textTexture(text, crit ? '#ffd54a' : '#ffffff');
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    const s = crit ? 1.4 : 0.9;
    sprite.scale.set(s, s * 0.5, 1);
    sprite.position.copy(pos);
    sprite.renderOrder = 1000;
    this.scene.add(sprite);
    this.items.push({ sprite, life: 0.9, maxLife: 0.9, vy: crit ? 3.2 : 2.2 });
  }

  update(dt: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      it.sprite.position.y += it.vy * dt;
      const mat = it.sprite.material as THREE.SpriteMaterial;
      mat.opacity = Math.max(0, it.life / it.maxLife);
      if (it.life <= 0) {
        this.scene.remove(it.sprite);
        mat.map?.dispose();
        mat.dispose();
        this.items.splice(i, 1);
      }
    }
  }
}
