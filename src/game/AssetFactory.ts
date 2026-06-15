import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Shared geometry/material helpers for the chibi cartoon look. */

function mat(color: number, opts: { rough?: number; metal?: number; emissive?: number; emI?: number } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.62,
    metalness: opts.metal ?? 0.08,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emI ?? 1,
    flatShading: false,
  });
}

// Shared toon-outline material (inverted hull, drawn on back faces behind the mesh).
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x191722, side: THREE.BackSide });

/**
 * Add a cartoon outline to every opaque mesh under `root` by attaching a
 * slightly enlarged back-face clone. All primitives here are centred on their
 * local origin, so a uniform up-scale expands the silhouette evenly.
 */
export function applyOutline(root: THREE.Object3D, k = 0.05): void {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.isOutline || m.userData.noOutline) return;
    if (Array.isArray(m.material)) return;
    const mt = m.material as THREE.Material & { transparent?: boolean };
    if (mt.transparent) return;
    meshes.push(m);
  });
  for (const m of meshes) {
    const o = new THREE.Mesh(m.geometry, OUTLINE_MAT);
    o.scale.setScalar(1 + k);
    o.castShadow = false;
    o.receiveShadow = false;
    o.renderOrder = -1;
    o.userData.isOutline = true;
    m.add(o);
  }
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

/** Rounded "chunky cartoon" box. */
function rbox(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0, r = 0.12): THREE.Mesh {
  const radius = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, radius), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Cute eyes (white sphere + dark pupil + shine), returns a group facing +Z. */
function eyes(spread: number, size = 0.18): THREE.Group {
  const g = new THREE.Group();
  const white = mat(0xffffff, { rough: 0.35 });
  const black = mat(0x1a1e26, { rough: 0.25 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-1, 1]) {
    const e = sphere(size, white, sx * spread, 0, 0.02, 14);
    e.scale.z = 0.6;
    const p = sphere(size * 0.55, black, sx * spread, 0, size * 0.52, 12);
    p.scale.z = 0.6;
    const s = sphere(size * 0.18, shine, sx * spread + size * 0.18, size * 0.22, size * 0.62, 8);
    s.userData.noOutline = true;
    g.add(e, p, s);
  }
  return g;
}

/** Rosy chibi cheeks (two soft pink discs). */
function cheeks(spread: number, y: number, z: number, r = 0.1): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: 0xff9bb0, transparent: true, opacity: 0.85 });
  for (const sx of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(r, 16), m);
    c.position.set(sx * spread, y, z);
    c.userData.noOutline = true;
    g.add(c);
  }
  return g;
}

/** Simple smile arc facing +Z. */
function smile(width: number, y: number, z: number): THREE.Mesh {
  const s = new THREE.Mesh(
    new THREE.TorusGeometry(width, width * 0.22, 8, 16, Math.PI),
    mat(0x2a1e1a, { rough: 0.5 }),
  );
  s.rotation.set(Math.PI, 0, 0);
  s.position.set(0, y, z);
  return s;
}

// ----------------------------------------------------------------------------
// PLAYER TANK  (forward = +Z). Turret child is named 'turret'.
// ----------------------------------------------------------------------------
export function makeTank(): THREE.Group {
  const g = new THREE.Group();
  const body = mat(0x74c13f, { rough: 0.5, metal: 0.15 });
  const bodyDark = mat(0x4f9430, { rough: 0.55 });
  const dark = mat(0x33421f, { rough: 0.6 });
  const tread = mat(0x2a2e33, { rough: 0.85 });
  const steel = mat(0x595f66, { rough: 0.7, metal: 0.3 });

  // tracks (rounded) + wheels
  for (const sx of [-1, 1]) {
    const t = rbox(0.5, 0.6, 2.05, tread, sx * 0.74, 0.32, 0, 0.22);
    g.add(t);
    for (let i = -2; i <= 2; i++) {
      const wheel = cyl(0.18, 0.18, 0.5, steel);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * 0.74, 0.24, i * 0.42);
      g.add(wheel);
    }
  }

  // rounded chunky hull
  const hull = rbox(1.62, 0.6, 1.95, body, 0, 0.68, 0, 0.2);
  g.add(hull);
  const glacis = rbox(1.5, 0.42, 0.55, bodyDark, 0, 0.62, 0.78, 0.16);
  glacis.rotation.x = -0.32;
  g.add(glacis);

  // chibi face on hull front (+Z): eyes, cheeks, smile
  const face = eyes(0.27, 0.17);
  face.position.set(0, 0.78, 0.99);
  g.add(face);
  g.add(cheeks(0.42, 0.62, 1.0, 0.1));
  g.add(smile(0.16, 0.55, 1.01));

  // headlights
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffe680, emissiveIntensity: 0.9, roughness: 0.3 });
  for (const sx of [-1, 1]) {
    const hl = cyl(0.1, 0.1, 0.08, lightMat, 12);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(sx * 0.58, 0.5, 1.0);
    hl.userData.noOutline = true;
    g.add(hl);
  }

  // turret group (rotates for aim)
  const turret = new THREE.Group();
  turret.name = 'turret';
  turret.position.set(0, 1.12, -0.05);
  const turretBox = rbox(1.05, 0.5, 1.1, body, 0, 0.1, 0, 0.2);
  turret.add(turretBox);
  const dome = sphere(0.46, bodyDark, 0, 0.32, -0.05, 18);
  dome.scale.set(1, 0.7, 1);
  turret.add(dome);
  // yellow star emblem on turret top
  const starMat = mat(0xffd54a, { rough: 0.35, metal: 0.3, emissive: 0xffb300, emI: 0.2 });
  const star = new THREE.Mesh(starGeometry(0.2, 0.09), starMat);
  star.rotation.x = -Math.PI / 2;
  star.position.set(0, 0.5, -0.05);
  turret.add(star);
  // fat barrel along +Z
  const barrel = cyl(0.15, 0.17, 1.15, dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.08, 0.82);
  barrel.name = 'barrel';
  turret.add(barrel);
  const muzzle = cyl(0.22, 0.22, 0.24, steel);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.08, 1.42);
  turret.add(muzzle);
  // antenna
  const ant = cyl(0.02, 0.02, 0.75, dark);
  ant.position.set(-0.4, 0.5, -0.4);
  turret.add(ant);
  const antTip = sphere(0.06, new THREE.MeshStandardMaterial({ color: 0xff5252, emissive: 0xff5252, emissiveIntensity: 0.9 }), -0.4, 0.88, -0.4, 8);
  antTip.userData.noOutline = true;
  turret.add(antTip);

  g.add(turret);
  applyOutline(g, 0.09);
  g.userData.muzzleLocal = new THREE.Vector3(0, 0.08, 1.5);
  return g;
}

/** Flat 5-point star shape extruded into a thin slab. */
function starGeometry(outer: number, inner: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
  geo.center();
  return geo;
}

// ----------------------------------------------------------------------------
// GROUND ENEMY: gray alien (forward = +Z)
// ----------------------------------------------------------------------------
export function makeGrayAlien(variant = 0): THREE.Group {
  const g = new THREE.Group();
  const skin = mat([0xaeb6c0, 0x9aa6cf, 0xb1a79a][variant % 3], { rough: 0.45, metal: 0.05 });
  const suit = mat([0x2b2f38, 0x32304a, 0x3a342c][variant % 3], { rough: 0.55, metal: 0.3 });
  const suitTrim = mat([0x484e5c, 0x4b4870, 0x5c5340][variant % 3], { rough: 0.5, metal: 0.3 });

  // little legs + boots
  for (const sx of [-1, 1]) {
    const leg = cyl(0.1, 0.11, 0.34, suit, 10);
    leg.position.set(sx * 0.12, 0.2, 0);
    g.add(leg);
    const boot = rbox(0.2, 0.14, 0.28, suitTrim, sx * 0.12, 0.07, 0.04, 0.05);
    g.add(boot);
  }
  // chunky torso in a bodysuit
  const torso = rbox(0.46, 0.5, 0.34, suit, 0, 0.62, 0, 0.14);
  g.add(torso);
  const collar = cyl(0.2, 0.24, 0.12, suitTrim, 12);
  collar.position.set(0, 0.86, 0);
  g.add(collar);

  // big bulbous head
  const head = sphere(0.38, skin, 0, 1.18, 0, 18);
  head.scale.set(1, 1.15, 0.95);
  head.name = 'head';
  g.add(head);
  // jaw/chin taper
  const chin = sphere(0.2, skin, 0, 0.98, 0.06, 12);
  chin.scale.set(1, 1.1, 1);
  g.add(chin);

  // big glossy black almond eyes (+ shine)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0c0e13, roughness: 0.12, metalness: 0.1 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-1, 1]) {
    const e = sphere(0.15, eyeMat, sx * 0.16, 1.2, 0.3, 14);
    e.scale.set(0.85, 1.45, 0.5);
    e.rotation.z = sx * 0.45;
    e.userData.noOutline = true;
    g.add(e);
    const s = sphere(0.03, shine, sx * 0.16 + 0.03, 1.27, 0.42, 8);
    s.userData.noOutline = true;
    g.add(s);
  }
  // tiny antenna with glowing bulb
  const ant = cyl(0.012, 0.012, 0.26, suit, 6);
  ant.position.set(0, 1.6, -0.02);
  g.add(ant);
  const bulbCol = [0x7CFF6b, 0xb06bff, 0xff7b4a][variant % 3];
  const bulb = sphere(0.05, new THREE.MeshStandardMaterial({ color: bulbCol, emissive: bulbCol, emissiveIntensity: 1 }), 0, 1.75, -0.02, 8);
  bulb.userData.noOutline = true;
  g.add(bulb);

  // arms holding a blaster (pointing +Z)
  for (const sx of [-1, 1]) {
    const arm = cyl(0.07, 0.08, 0.36, skin, 8);
    arm.position.set(sx * 0.28, 0.66, 0.08);
    arm.rotation.x = -0.5;
    g.add(arm);
  }
  const gunBody = rbox(0.16, 0.16, 0.46, mat(0x202a33, { metal: 0.5, rough: 0.4 }), 0.24, 0.56, 0.34, 0.05);
  gunBody.name = 'gun';
  g.add(gunBody);
  const gunTip = sphere(0.07, new THREE.MeshStandardMaterial({ color: bulbCol, emissive: bulbCol, emissiveIntensity: 1 }), 0.24, 0.56, 0.6, 8);
  gunTip.userData.noOutline = true;
  g.add(gunTip);

  applyOutline(g, 0.095);
  g.userData.headY = 1.18;
  g.userData.muzzleLocal = new THREE.Vector3(0.24, 0.56, 0.66);
  return g;
}

// ----------------------------------------------------------------------------
// AIR ENEMY: UFO (saucer + dome + tractor beam)
// ----------------------------------------------------------------------------
export function makeUfo(variant = 0): THREE.Group {
  const g = new THREE.Group();
  const beamCol = [0x6bff8a, 0xb06bff, 0xff6b6b][variant % 3];
  const hull = mat(0xd2d8e0, { rough: 0.22, metal: 0.75 });
  const trim = mat(0x6b7480, { rough: 0.4, metal: 0.6 });
  const belly = mat(0x8a929c, { rough: 0.3, metal: 0.6 });

  // double-disc saucer body
  const saucer = new THREE.Mesh(new THREE.SphereGeometry(0.98, 28, 14), hull);
  saucer.scale.set(1, 0.3, 1);
  saucer.castShadow = true;
  g.add(saucer);
  const under = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 12), belly);
  under.scale.set(1, 0.42, 1);
  under.position.y = -0.16;
  g.add(under);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.14, 12, 32), trim);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);

  // glassy dome with a little pilot inside
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xbfe9ff, emissive: 0x6fd0ff, emissiveIntensity: 0.25, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45 }),
  );
  dome.position.y = 0.16;
  dome.name = 'dome';
  dome.userData.noOutline = true;
  g.add(dome);
  const pilot = sphere(0.24, mat(0x9aa6cf, { rough: 0.5 }), 0, 0.28, 0, 12);
  pilot.scale.set(1, 1.1, 1);
  g.add(pilot);
  for (const sx of [-1, 1]) {
    const e = sphere(0.07, new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.2 }), sx * 0.09, 0.32, 0.16, 10);
    e.scale.set(0.8, 1.4, 0.5);
    e.userData.noOutline = true;
    g.add(e);
  }

  // glowing lights around rim
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const light = sphere(0.075, new THREE.MeshStandardMaterial({ color: beamCol, emissive: beamCol, emissiveIntensity: 1 }), Math.cos(a) * 0.86, -0.04, Math.sin(a) * 0.86, 8);
    light.userData.noOutline = true;
    g.add(light);
  }
  // under emitter
  const emitter = sphere(0.16, new THREE.MeshStandardMaterial({ color: beamCol, emissive: beamCol, emissiveIntensity: 1 }), 0, -0.34, 0, 12);
  emitter.userData.noOutline = true;
  g.add(emitter);

  // tractor beam cone (downward)
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.72, 1.7, 22, 1, true),
    new THREE.MeshBasicMaterial({ color: beamCol, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = -1.05;
  beam.rotation.x = Math.PI;
  beam.name = 'beam';
  g.add(beam);

  applyOutline(g, 0.07);
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
  // rounded purple+white mecha overlord with crown ("机械统帅")
  const g = new THREE.Group();
  const white = mat(0xe8e4f0, { rough: 0.4, metal: 0.2 });
  const purple = mat(0x7a4fb0, { rough: 0.45, metal: 0.35 });
  const purpleDark = mat(0x4f3070, { rough: 0.5, metal: 0.35 });
  const steel = mat(0x4a4f57, { rough: 0.5, metal: 0.5 });

  // chunky rounded body + chest plate
  const body = rbox(2.6, 2.2, 1.9, purple, 0, 1.85, 0, 0.5);
  g.add(body);
  const chest = rbox(1.7, 1.4, 0.5, white, 0, 1.8, 0.85, 0.3);
  g.add(chest);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: 0x7CFF6b, emissive: 0x7CFF6b, emissiveIntensity: 0.9, roughness: 0.1 }));
  gem.position.set(0, 1.85, 1.12);
  gem.userData.noOutline = true;
  g.add(gem);

  // head with angry glowing eyes + eyebrows
  const head = rbox(1.3, 1.0, 1.0, white, 0, 3.05, 0.05, 0.3);
  g.add(head);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x7CFF6b, emissive: 0x7CFF6b, emissiveIntensity: 1.2, roughness: 0.2 });
  for (const sx of [-1, 1]) {
    const e = sphere(0.2, eyeMat, sx * 0.32, 3.05, 0.5, 14);
    e.scale.set(1.1, 0.8, 0.6);
    e.userData.noOutline = true;
    g.add(e);
    // angry slanted eyebrow
    const brow = box(0.34, 0.1, 0.1, purpleDark, sx * 0.32, 3.32, 0.52);
    brow.rotation.z = sx * 0.5;
    g.add(brow);
  }
  // horns
  for (const sx of [-1, 1]) {
    const h = cyl(0.0, 0.2, 0.85, white, 8);
    h.position.set(sx * 0.78, 3.75, -0.05);
    h.rotation.z = sx * 0.55;
    g.add(h);
  }
  // shoulders + arms / cannons
  for (const sx of [-1, 1]) {
    const shoulder = sphere(0.6, purpleDark, sx * 1.6, 2.5, 0.1, 14);
    g.add(shoulder);
    const arm = rbox(0.7, 0.7, 1.5, purple, sx * 1.75, 1.7, 0.3, 0.22);
    g.add(arm);
    const cannon = cyl(0.26, 0.32, 1.0, steel, 14);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(sx * 1.75, 1.7, 1.2);
    g.add(cannon);
    const cannonTip = cyl(0.36, 0.36, 0.22, purpleDark, 14);
    cannonTip.rotation.x = Math.PI / 2;
    cannonTip.position.set(sx * 1.75, 1.7, 1.75);
    g.add(cannonTip);
  }
  // legs
  for (const sx of [-1, 1]) g.add(rbox(0.85, 1.1, 0.95, purpleDark, sx * 0.7, 0.55, 0, 0.25));
  const c = crown();
  c.scale.setScalar(1.5);
  c.position.set(0, 3.75, 0.05);
  g.add(c);

  applyOutline(g, 0.05);
  g.userData.headY = 3.05;
  g.userData.muzzleLocal = new THREE.Vector3(0, 1.7, 1.9);
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
  applyOutline(g, 0.05);
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
  applyOutline(g, 0.045);
  g.userData.headY = 2.5;
  g.userData.muzzleLocal = new THREE.Vector3(0, 1.4, 0);
  return g;
}

// ----------------------------------------------------------------------------
// ENVIRONMENT PROPS  (themed per level)
// ----------------------------------------------------------------------------
export function makeProp(theme: 'forest' | 'desert' | 'alien', kind: number): THREE.Object3D {
  const o = theme === 'forest' ? forestProp(kind) : theme === 'desert' ? desertProp(kind) : alienProp(kind);
  applyOutline(o, 0.08);
  return o;
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
