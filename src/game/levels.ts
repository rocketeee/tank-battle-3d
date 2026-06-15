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
  scene.fog = new THREE.Fog(cfg.fog, 35, 80);

  // ground
  const groundMat = new THREE.MeshStandardMaterial({ color: cfg.ground, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(ARENA_RADIUS + 18, 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // arena ring decal
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ARENA_RADIUS - 0.6, ARENA_RADIUS, 64),
    new THREE.MeshStandardMaterial({ color: cfg.ground2, roughness: 1, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);
  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(ARENA_RADIUS * 0.55, ARENA_RADIUS * 0.55 + 0.4, 64),
    new THREE.MeshStandardMaterial({ color: cfg.ground2, roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }),
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.02;
  group.add(innerRing);

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

  // lights
  const ambient = new THREE.AmbientLight(cfg.ambient, cfg.ambientIntensity);
  const sun = new THREE.DirectionalLight(cfg.sun, cfg.sunIntensity);
  sun.position.set(18, 30, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  const d = 40;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0005;
  group.add(ambient, sun, sun.target);

  scene.add(group);

  return {
    group,
    ambient,
    sun,
    dispose() {
      scene.remove(group);
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      if (scene.background instanceof THREE.Texture) scene.background.dispose();
    },
  };
}
