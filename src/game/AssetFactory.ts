import * as THREE from 'three';

/** Shared geometry/material helpers for the chibi low-poly look. */

function mat(color: number, opts: { rough?: number; metal?: number; emissive?: number; emI?: number } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.75,
    metalness: opts.metal ?? 0.1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emI ?? 1,
    flatShading: false,
  });
}

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function sphere(r: number, m: THREE.Material, x = 0, y = 0, z = 0, seg = 16): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function cyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 16): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.castShadow = true;
  return mesh;
}

/** Cute eyes (white sphere + dark pupil), returns a group facing +Z. */
function eyes(spread: number, size = 0.18): THREE.Group {
  const g = new THREE.Group();
  const white = mat(0xffffff, { rough: 0.4 });
  const black = mat(0x14181f, { rough: 0.3 });
  for (const sx of [-1, 1]) {
    const e = sphere(size, white, sx * spread, 0, 0.02, 12);
    e.scale.z = 0.6;
    const p = sphere(size * 0.5, black, sx * spread + sx * 0.02, 0, size * 0.55, 10);
    p.scale.z = 0.6;
    g.add(e, p);
  }
  return g;
}

// ----------------------------------------------------------------------------
// PLAYER TANK  (forward = +Z). Turret child is named 'turret'.
// ----------------------------------------------------------------------------
export function makeTank(): THREE.Group {
  const g = new THREE.Group();
  const bodyCol = 0x6db33f;
  const darkCol = 0x35471f;
  const body = mat(bodyCol, { rough: 0.6, metal: 0.25 });
  const dark = mat(darkCol, { rough: 0.7 });
  const tread = mat(0x2b2f33, { rough: 0.9 });

  // tracks
  for (const sx of [-1, 1]) {
    const t = box(0.42, 0.52, 1.9, tread, sx * 0.72, 0.26, 0);
    g.add(t);
    for (let i = -2; i <= 2; i++) {
      const wheel = cyl(0.16, 0.16, 0.44, mat(0x4a4f55, { rough: 0.8 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * 0.72, 0.2, i * 0.4);
      g.add(wheel);
    }
  }

  // hull
  const hull = box(1.5, 0.5, 1.7, body, 0, 0.62, 0);
  g.add(hull);
  const hullTop = box(1.2, 0.34, 1.2, body, 0, 0.95, -0.05);
  g.add(hullTop);
  // star decal
  const star = box(0.34, 0.04, 0.34, mat(0xffd54a, { rough: 0.4, emissive: 0xffd54a, emI: 0.25 }), 0, 1.13, 0);
  star.rotation.y = Math.PI / 4;
  g.add(star);

  // turret group (rotates for aim)
  const turret = new THREE.Group();
  turret.name = 'turret';
  turret.position.set(0, 1.18, 0);
  const dome = sphere(0.5, body, 0, 0.05, 0, 18);
  dome.scale.set(1, 0.8, 1.05);
  turret.add(dome);
  // cute face on turret front (+Z)
  const face = eyes(0.2, 0.14);
  face.position.set(0, 0.12, 0.42);
  turret.add(face);
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.03, 8, 16, Math.PI),
    mat(0x14181f, { rough: 0.4 }),
  );
  smile.rotation.set(Math.PI, 0, 0);
  smile.position.set(0, -0.02, 0.46);
  turret.add(smile);
  // barrel along +Z
  const barrel = cyl(0.12, 0.14, 1.1, dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.05, 0.78);
  barrel.name = 'barrel';
  turret.add(barrel);
  const muzzle = cyl(0.17, 0.17, 0.18, dark);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.05, 1.32);
  turret.add(muzzle);
  // antenna
  const ant = cyl(0.015, 0.015, 0.7, dark);
  ant.position.set(-0.32, 0.42, -0.2);
  turret.add(ant);
  const antTip = sphere(0.05, mat(0xff5252, { emissive: 0xff5252, emI: 0.8 }), -0.32, 0.78, -0.2, 8);
  turret.add(antTip);

  g.add(turret);
  g.userData.muzzleLocal = new THREE.Vector3(0, 0.05, 1.4);
  return g;
}

// ----------------------------------------------------------------------------
// GROUND ENEMY: gray alien (forward = +Z)
// ----------------------------------------------------------------------------
export function makeGrayAlien(variant = 0): THREE.Group {
  const g = new THREE.Group();
  const skin = mat([0x9aa3ad, 0x8f98c0, 0xa39a8f][variant % 3], { rough: 0.55 });
  const suit = mat([0x2c3038, 0x34304a, 0x3a342c][variant % 3], { rough: 0.7, metal: 0.2 });

  const legs = box(0.34, 0.4, 0.26, suit, 0, 0.22, 0);
  g.add(legs);
  const torso = box(0.42, 0.46, 0.3, suit, 0, 0.62, 0);
  g.add(torso);
  // big head
  const head = sphere(0.34, skin, 0, 1.08, 0, 16);
  head.scale.set(1, 1.12, 0.92);
  head.name = 'head';
  g.add(head);
  // big black almond eyes
  const eyeMat = mat(0x101216, { rough: 0.2, emissive: 0x101216 });
  for (const sx of [-1, 1]) {
    const e = sphere(0.12, eyeMat, sx * 0.13, 1.1, 0.27, 12);
    e.scale.set(0.8, 1.5, 0.5);
    e.rotation.z = sx * 0.4;
    g.add(e);
  }
  // arms holding a blaster
  for (const sx of [-1, 1]) {
    const arm = box(0.12, 0.4, 0.12, skin, sx * 0.3, 0.62, 0.05);
    g.add(arm);
  }
  const gun = box(0.14, 0.14, 0.5, mat(0x20242a, { metal: 0.4 }), 0.26, 0.5, 0.28);
  gun.name = 'gun';
  g.add(gun);
  const gunTip = sphere(0.06, mat(0x7CFF6b, { emissive: 0x7CFF6b, emI: 0.9 }), 0.26, 0.5, 0.55, 8);
  g.add(gunTip);

  g.userData.headY = 1.08;
  g.userData.muzzleLocal = new THREE.Vector3(0.26, 0.5, 0.62);
  return g;
}

// ----------------------------------------------------------------------------
// AIR ENEMY: UFO (saucer + dome + tractor beam)
// ----------------------------------------------------------------------------
export function makeUfo(variant = 0): THREE.Group {
  const g = new THREE.Group();
  const beamCol = [0x6bff8a, 0xb06bff, 0xff6b6b][variant % 3];
  const hull = mat(0xb9c1cc, { rough: 0.35, metal: 0.6 });
  const trim = mat(0x5a6270, { rough: 0.5, metal: 0.5 });

  const saucer = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 12), hull);
  saucer.scale.set(1, 0.32, 1);
  saucer.castShadow = true;
  g.add(saucer);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 10, 28), trim);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  // glowing dome
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: beamCol, emissive: beamCol, emissiveIntensity: 0.7, roughness: 0.2, transparent: true, opacity: 0.8 }),
  );
  dome.position.y = 0.18;
  dome.name = 'dome';
  g.add(dome);
  // lights around rim
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const light = sphere(0.08, new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffd54a, emissiveIntensity: 0.9 }), Math.cos(a) * 0.8, -0.05, Math.sin(a) * 0.8, 8);
    g.add(light);
  }
  // tractor beam cone (downward)
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 1.6, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: beamCol, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = -1.0;
  beam.rotation.x = Math.PI;
  beam.name = 'beam';
  g.add(beam);

  g.userData.headY = 0.2;
  g.userData.muzzleLocal = new THREE.Vector3(0, -0.2, 0);
  g.userData.beamColor = beamCol;
  return g;
}

// ----------------------------------------------------------------------------
// BOSSES
// ----------------------------------------------------------------------------
export function makeBoss(level: number): THREE.Group {
  if (level === 0) return makeForestBoss();
  if (level === 1) return makeDesertBoss();
  return makeAlienBoss();
}

function crown(): THREE.Group {
  const g = new THREE.Group();
  const m = mat(0xffd54a, { metal: 0.7, rough: 0.3, emissive: 0xffd54a, emI: 0.2 });
  const band = cyl(0.34, 0.34, 0.16, m, 10);
  g.add(band);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = cyl(0.0, 0.08, 0.26, m, 6);
    spike.position.set(Math.cos(a) * 0.3, 0.18, Math.sin(a) * 0.3);
    g.add(spike);
  }
  return g;
}

function makeForestBoss(): THREE.Group {
  // stone/wood golem mech with crown ("机械统帅")
  const g = new THREE.Group();
  const stone = mat(0x8a8f96, { rough: 0.85 });
  const purple = mat(0x6a4d8c, { rough: 0.6, metal: 0.3 });
  const body = sphere(1.5, stone, 0, 1.8, 0, 20);
  body.scale.set(1.1, 1, 1.1);
  g.add(body);
  // face
  const eyeMat = mat(0x7CFF6b, { emissive: 0x7CFF6b, emI: 1 });
  for (const sx of [-1, 1]) g.add(sphere(0.22, eyeMat, sx * 0.45, 2.1, 1.15, 12));
  const horns = mat(0x3a2f1f, { rough: 0.6 });
  for (const sx of [-1, 1]) {
    const h = cyl(0.0, 0.18, 0.7, horns, 8);
    h.position.set(sx * 0.7, 2.9, -0.1);
    h.rotation.z = sx * 0.5;
    g.add(h);
  }
  // arms / cannons
  for (const sx of [-1, 1]) {
    const arm = box(0.5, 0.5, 1.2, purple, sx * 1.7, 1.5, 0.2);
    g.add(arm);
    const cannon = cyl(0.22, 0.26, 0.9, mat(0x2b2f33), 12);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(sx * 1.7, 1.5, 1.0);
    g.add(cannon);
  }
  // legs
  for (const sx of [-1, 1]) g.add(box(0.6, 0.9, 0.7, purple, sx * 0.6, 0.45, 0));
  const c = crown();
  c.position.set(0, 3.0, 0.1);
  g.add(c);
  g.userData.headY = 2.6;
  g.userData.muzzleLocal = new THREE.Vector3(0, 1.5, 1.6);
  return g;
}

function makeDesertBoss(): THREE.Group {
  // armored beetle/scorpion mech
  const g = new THREE.Group();
  const shell = mat(0xb8902f, { rough: 0.5, metal: 0.5 });
  const dark = mat(0x4a3a1a, { rough: 0.7 });
  const body = sphere(1.6, shell, 0, 1.4, 0, 20);
  body.scale.set(1.3, 0.9, 1.6);
  g.add(body);
  // segmented back plates
  for (let i = 0; i < 3; i++) {
    const p = box(2.0 - i * 0.4, 0.4, 0.6, dark, 0, 2.0 + i * 0.05, -1.0 + i * 0.7);
    g.add(p);
  }
  // eyes
  const eyeMat = mat(0xff5252, { emissive: 0xff5252, emI: 1 });
  for (const sx of [-1, 1]) g.add(sphere(0.2, eyeMat, sx * 0.5, 1.6, 1.5, 12));
  // pincer claws
  for (const sx of [-1, 1]) {
    const claw = box(0.4, 0.4, 1.3, shell, sx * 1.5, 1.0, 1.4);
    claw.rotation.y = sx * 0.3;
    g.add(claw);
    const tip = cyl(0.0, 0.22, 0.7, dark, 8);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(sx * 1.7, 1.0, 2.2);
    g.add(tip);
  }
  // tail with stinger cannon
  const tail = box(0.5, 0.5, 1.4, dark, 0, 2.4, -1.8);
  tail.rotation.x = -0.6;
  g.add(tail);
  const stinger = cyl(0.0, 0.3, 0.8, mat(0x2b2f33), 10);
  stinger.position.set(0, 3.1, -2.3);
  g.add(stinger);
  // legs
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const leg = box(0.18, 0.18, 1.0, dark, sx * 1.2, 0.7, -0.6 + i * 0.6);
    leg.rotation.z = sx * 0.9;
    g.add(leg);
  }
  g.userData.headY = 2.0;
  g.userData.muzzleLocal = new THREE.Vector3(0, 1.4, 2.0);
  return g;
}

function makeAlienBoss(): THREE.Group {
  // giant purple mothership UFO with crystal core
  const g = new THREE.Group();
  const hull = mat(0x6b4f9e, { rough: 0.3, metal: 0.7 });
  const trim = mat(0x3a2c5c, { rough: 0.5, metal: 0.6 });
  const saucer = new THREE.Mesh(new THREE.SphereGeometry(2.4, 28, 14), hull);
  saucer.scale.set(1, 0.34, 1);
  saucer.position.y = 1.6;
  saucer.castShadow = true;
  g.add(saucer);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.3, 12, 32), trim);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.6;
  g.add(rim);
  // glowing crystal core (the weak spot / head)
  const coreMat = new THREE.MeshStandardMaterial({ color: 0xc06bff, emissive: 0xc06bff, emissiveIntensity: 1.1, roughness: 0.1, metalness: 0.2 });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), coreMat);
  core.position.y = 2.5;
  core.name = 'core';
  g.add(core);
  // rim lights
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.add(sphere(0.16, new THREE.MeshStandardMaterial({ color: 0xff6bd0, emissive: 0xff6bd0, emissiveIntensity: 1 }), Math.cos(a) * 2.2, 1.45, Math.sin(a) * 2.2, 8));
  }
  // bottom turrets
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const t = cyl(0.18, 0.24, 0.6, trim, 8);
    t.position.set(Math.cos(a) * 1.4, 1.0, Math.sin(a) * 1.4);
    g.add(t);
  }
  g.userData.headY = 2.5;
  g.userData.muzzleLocal = new THREE.Vector3(0, 1.4, 0);
  return g;
}

// ----------------------------------------------------------------------------
// ENVIRONMENT PROPS  (themed per level)
// ----------------------------------------------------------------------------
export function makeProp(theme: 'forest' | 'desert' | 'alien', kind: number): THREE.Object3D {
  if (theme === 'forest') return forestProp(kind);
  if (theme === 'desert') return desertProp(kind);
  return alienProp(kind);
}

function tree(): THREE.Group {
  const g = new THREE.Group();
  const trunk = cyl(0.18, 0.26, 1.0, mat(0x6b4a2a, { rough: 0.9 }));
  trunk.position.y = 0.5;
  g.add(trunk);
  const leaf = mat(0x3f9a45, { rough: 0.8 });
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9 - i * 0.22, 0.9, 10), leaf);
    cone.position.y = 1.1 + i * 0.55;
    cone.castShadow = true;
    g.add(cone);
  }
  return g;
}

function forestProp(kind: number): THREE.Object3D {
  switch (kind % 5) {
    case 0: return tree();
    case 1: { // bush
      const g = new THREE.Group();
      const leaf = mat(0x4caf50, { rough: 0.85 });
      for (let i = 0; i < 3; i++) g.add(sphere(0.4, leaf, (i - 1) * 0.35, 0.35, 0, 12));
      return g;
    }
    case 2: { // rock
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), mat(0x8b8f94, { rough: 0.95 }));
      r.position.y = 0.4; r.castShadow = true; return r;
    }
    case 3: { // crate
      const c = box(0.9, 0.9, 0.9, mat(0x9c6b3c, { rough: 0.8 }), 0, 0.45, 0);
      return c;
    }
    default: { // mushroom
      const g = new THREE.Group();
      const stem = cyl(0.12, 0.16, 0.5, mat(0xeee0c8)); stem.position.y = 0.25; g.add(stem);
      const cap = sphere(0.34, mat(0xd64545), 0, 0.55, 0, 12); cap.scale.y = 0.7; g.add(cap);
      return g;
    }
  }
}

function desertProp(kind: number): THREE.Object3D {
  switch (kind % 5) {
    case 0: { // cactus
      const g = new THREE.Group();
      const m = mat(0x4f9d5a, { rough: 0.85 });
      const body = cyl(0.28, 0.32, 1.6, m); body.position.y = 0.8; g.add(body);
      for (const sx of [-1, 1]) {
        const arm = cyl(0.16, 0.18, 0.7, m); arm.position.set(sx * 0.35, 1.0, 0); arm.rotation.z = sx * 0.6; g.add(arm);
        const up = cyl(0.16, 0.16, 0.5, m); up.position.set(sx * 0.55, 1.35, 0); g.add(up);
      }
      return g;
    }
    case 1: { // pyramid block
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.2, 4), mat(0xc9a86a, { rough: 0.9 }));
      p.position.y = 0.6; p.rotation.y = Math.PI / 4; p.castShadow = true; return p;
    }
    case 2: { // sand rock
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), mat(0xcbb27a, { rough: 0.95 }));
      r.position.y = 0.4; r.castShadow = true; return r;
    }
    case 3: { // dead tree
      const g = new THREE.Group();
      const m = mat(0x7a5a36, { rough: 0.9 });
      const t = cyl(0.14, 0.22, 1.6, m); t.position.y = 0.8; g.add(t);
      for (const sx of [-1, 1]) { const b = cyl(0.07, 0.1, 0.7, m); b.position.set(sx * 0.25, 1.3, 0); b.rotation.z = sx * 0.8; g.add(b); }
      return g;
    }
    default: { // pottery / ruin pillar
      const g = new THREE.Group();
      const col = cyl(0.3, 0.34, 1.4, mat(0xbdaa7e, { rough: 0.9 })); col.position.y = 0.7; g.add(col);
      const cap = box(0.8, 0.2, 0.8, mat(0xa8946a), 0, 1.5, 0); g.add(cap);
      return g;
    }
  }
}

function alienProp(kind: number): THREE.Object3D {
  switch (kind % 4) {
    case 0: { // crystal cluster
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: 0xb06bff, emissive: 0x6a2fb0, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.92 });
      for (let i = 0; i < 4; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.18 + Math.random() * 0.1, 0.8 + Math.random() * 0.7, 6), m);
        c.position.set((Math.random() - 0.5) * 0.5, 0.4, (Math.random() - 0.5) * 0.5);
        c.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4);
        c.castShadow = true;
        g.add(c);
      }
      return g;
    }
    case 1: { // tech block
      const g = new THREE.Group();
      const b = box(0.9, 0.9, 0.9, mat(0x3a3550, { rough: 0.4, metal: 0.6 }), 0, 0.45, 0); g.add(b);
      const glow = box(0.95, 0.1, 0.95, new THREE.MeshStandardMaterial({ color: 0xc06bff, emissive: 0xc06bff, emissiveIntensity: 0.9 }), 0, 0.6, 0); g.add(glow);
      return g;
    }
    case 2: { // energy pillar
      const g = new THREE.Group();
      const base = cyl(0.4, 0.5, 0.3, mat(0x2a2740, { metal: 0.6 })); base.position.y = 0.15; g.add(base);
      const core = cyl(0.16, 0.16, 1.6, new THREE.MeshStandardMaterial({ color: 0xc06bff, emissive: 0xc06bff, emissiveIntensity: 1 })); core.position.y = 1.0; g.add(core);
      return g;
    }
    default: { // floating shard
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: 0x9a5bff, emissive: 0x6a2fb0, emissiveIntensity: 0.7, roughness: 0.2 }));
      s.position.y = 0.9; s.castShadow = true; return s;
    }
  }
}
