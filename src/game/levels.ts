import * as THREE from 'three';
import { makeProp } from './AssetFactory';
import { rand } from './util';

export interface WaveDef {
  aliens: number;
  ufos: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  shortName: string;
  theme: 'forest' | 'desert' | 'alien';
  ground: number;
  ground2: number;
  fog: number;
  skyTop: number;
  skyBottom: number;
  ambient: number;
  sun: number;
  sunIntensity: number;
  ambientIntensity: number;
  propCount: number;
  waves: WaveDef[];
  hpScale: number;
}

export const LEVELS: LevelConfig[] = [
  {
    id: 0,
    name: '森林竞技场',
    shortName: '森林',
    theme: 'forest',
    ground: 0x5fa83a,
    ground2: 0x4f9530,
    fog: 0x9fd0e8,
    skyTop: 0x6fb7e8,
    skyBottom: 0xcfeaf5,
    ambient: 0xbfe6ff,
    sun: 0xfff4d6,
    sunIntensity: 1.5,
    ambientIntensity: 0.75,
    propCount: 46,
    hpScale: 1,
    waves: [
      { aliens: 4, ufos: 1 },
      { aliens: 5, ufos: 2 },
      { aliens: 6, ufos: 3 },
    ],
  },
  {
    id: 1,
    name: '黄沙沙丘',
    shortName: '沙漠',
    theme: 'desert',
    ground: 0xd8b466,
    ground2: 0xcca259,
    fog: 0xe8d3a0,
    skyTop: 0xe9b65c,
    skyBottom: 0xf6e3b0,
    ambient: 0xffe6b0,
    sun: 0xfff0c0,
    sunIntensity: 1.7,
    ambientIntensity: 0.8,
    propCount: 40,
    hpScale: 1.3,
    waves: [
      { aliens: 5, ufos: 2 },
      { aliens: 6, ufos: 3 },
      { aliens: 7, ufos: 4 },
    ],
  },
  {
    id: 2,
    name: '虚空外星基地',
    shortName: '外星球',
    theme: 'alien',
    ground: 0x3a2c5c,
    ground2: 0x2e2350,
    fog: 0x2a1f47,
    skyTop: 0x1a1030,
    skyBottom: 0x4a2c70,
    ambient: 0xc09bff,
    sun: 0xd9b8ff,
    sunIntensity: 1.3,
    ambientIntensity: 0.9,
    propCount: 44,
    hpScale: 1.7,
    waves: [
      { aliens: 6, ufos: 3 },
      { aliens: 7, ufos: 4 },
      { aliens: 8, ufos: 5 },
    ],
  },
];

export const ARENA_RADIUS = 30;
export const PLAY_BOUNDS = 27;

export interface Environment {
  group: THREE.Group;
  ambient: THREE.AmbientLight;
  sun: THREE.DirectionalLight;
  dispose(): void;
}

function skyTexture(top: number, bottom: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#' + top.toString(16).padStart(6, '0'));
  grad.addColorStop(1, '#' + bottom.toString(16).padStart(6, '0'));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

export function buildEnvironment(scene: THREE.Scene, cfg: LevelConfig): Environment {
  const group = new THREE.Group();

  // sky + fog
  scene.background = skyTexture(cfg.skyTop, cfg.skyBottom);
  scene.fog = new THREE.Fog(cfg.fog, 38, 88);

  // outer ground (darker apron) + raised arena disc (brighter)
  const apron = new THREE.Mesh(
    new THREE.CircleGeometry(ARENA_RADIUS + 24, 56),
    new THREE.MeshStandardMaterial({ color: cfg.ground2, roughness: 1 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.receiveShadow = true;
  group.add(apron);

  const arena = new THREE.Mesh(
    new THREE.CircleGeometry(ARENA_RADIUS, 64),
    new THREE.MeshStandardMaterial({ color: cfg.ground, roughness: 1 }),
  );
  arena.rotation.x = -Math.PI / 2;
  arena.position.y = 0.02;
  arena.receiveShadow = true;
  group.add(arena);

  // ringed "dirt/track" path inside the arena
  const path = new THREE.Mesh(
    new THREE.RingGeometry(ARENA_RADIUS * 0.62, ARENA_RADIUS * 0.74, 64),
    new THREE.MeshStandardMaterial({ color: cfg.ground2, roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.03;
  group.add(path);

  // bright rim border of the arena
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ARENA_RADIUS - 0.7, ARENA_RADIUS, 72),
    new THREE.MeshStandardMaterial({ color: cfg.ground2, roughness: 0.9, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);

  // ground detail: flowers (forest) / pebbles, scattered inside the arena
  scatterGroundDetail(group, cfg);

  // scattered props (mostly outside play bounds, some inside as cover)
  for (let i = 0; i < cfg.propCount; i++) {
    const inside = i < cfg.propCount * 0.35;
    const r = inside ? rand(8, PLAY_BOUNDS - 2) : rand(ARENA_RADIUS, ARENA_RADIUS + 16);
    const a = rand(0, Math.PI * 2);
    const prop = makeProp(cfg.theme, i);
    prop.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    prop.rotation.y = rand(0, Math.PI * 2);
    const s = rand(0.8, 1.4) * (inside ? 0.9 : 1.2);
    prop.scale.setScalar(s);
    group.add(prop);
  }

  // distant decorative skyline (clouds / floating rocks)
  scatterSkyline(group, cfg);

  // lights: ambient + hemisphere fill + key sun
  const ambient = new THREE.AmbientLight(cfg.ambient, cfg.ambientIntensity * 0.6);
  const hemi = new THREE.HemisphereLight(cfg.skyTop, cfg.ground, 0.55);
  hemi.position.set(0, 40, 0);
  const sun = new THREE.DirectionalLight(cfg.sun, cfg.sunIntensity);
  sun.position.set(18, 30, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.radius = 4;
  const d = 40;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0004;
  // soft warm rim/back light
  const rimLight = new THREE.DirectionalLight(cfg.ambient, 0.35);
  rimLight.position.set(-16, 14, -20);
  group.add(ambient, hemi, sun, sun.target, rimLight);

  scene.add(group);

  return {
    group,
    ambient,
    sun,
    dispose() {
      scene.remove(group);
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.userData.isOutline) return;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      if (scene.background instanceof THREE.Texture) scene.background.dispose();
    },
  };
}

const FLOWER_COLORS = [0xff6f91, 0xffd54a, 0xffffff, 0xff9bb0, 0xb06bff];

/** Scatter small flowers (forest) or pebbles (desert/alien) across the arena floor. */
function scatterGroundDetail(group: THREE.Group, cfg: LevelConfig): void {
  if (cfg.theme === 'forest') {
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x3f9a45, roughness: 0.9 });
    for (let i = 0; i < 70; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(3, ARENA_RADIUS - 1.5);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const f = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 5), stemMat);
      stem.position.y = 0.15;
      const petalCol = FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)];
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 6),
        new THREE.MeshStandardMaterial({ color: petalCol, emissive: petalCol, emissiveIntensity: 0.25, roughness: 0.6 }),
      );
      head.position.y = 0.32;
      head.scale.y = 0.7;
      f.add(stem, head);
      f.position.set(x, 0.04, z);
      f.scale.setScalar(rand(0.7, 1.3));
      group.add(f);
    }
  } else {
    const pebbleCol = cfg.theme === 'desert' ? 0xb89a5e : 0x5a4880;
    for (let i = 0; i < 45; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(3, ARENA_RADIUS - 1.5);
      const peb = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rand(0.12, 0.28), 0),
        new THREE.MeshStandardMaterial({ color: pebbleCol, roughness: 1 }),
      );
      peb.position.set(Math.cos(a) * r, 0.06, Math.sin(a) * r);
      peb.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
      peb.castShadow = true;
      group.add(peb);
    }
  }
}

/** Distant decorative elements high in the sky for depth (clouds / planets). */
function scatterSkyline(group: THREE.Group, cfg: LevelConfig): void {
  if (cfg.theme === 'alien') {
    // floating rocks + a big planet
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(7, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0x8a5bd0, emissive: 0x3a1f6a, emissiveIntensity: 0.4, roughness: 0.8 }),
    );
    planet.position.set(-34, 30, -46);
    group.add(planet);
    const ringG = new THREE.Mesh(
      new THREE.TorusGeometry(10, 0.6, 8, 40),
      new THREE.MeshStandardMaterial({ color: 0xc6a6ff, emissive: 0x6a4da0, emissiveIntensity: 0.4, roughness: 0.7 }),
    );
    ringG.position.copy(planet.position);
    ringG.rotation.set(1.1, 0.3, 0);
    group.add(ringG);
    for (let i = 0; i < 8; i++) {
      const a = rand(0, Math.PI * 2);
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rand(0.8, 2), 0),
        new THREE.MeshStandardMaterial({ color: 0x4a3a6a, roughness: 0.9 }),
      );
      rock.position.set(Math.cos(a) * rand(30, 46), rand(8, 22), Math.sin(a) * rand(30, 46));
      group.add(rock);
    }
  } else {
    // puffy stylized clouds
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf0f4ff, emissiveIntensity: 0.15, roughness: 1 });
    const cloudCount = 7;
    for (let i = 0; i < cloudCount; i++) {
      const a = (i / cloudCount) * Math.PI * 2 + rand(-0.3, 0.3);
      const r = rand(40, 52);
      const cloud = new THREE.Group();
      const lobes = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < lobes; j++) {
        const s = rand(1.6, 3);
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8), cloudMat);
        lobe.position.set((j - lobes / 2) * 2.2, rand(-0.4, 0.4), rand(-0.6, 0.6));
        lobe.scale.y = 0.7;
        cloud.add(lobe);
      }
      cloud.position.set(Math.cos(a) * r, rand(16, 26), Math.sin(a) * r);
      group.add(cloud);
    }
  }
}
