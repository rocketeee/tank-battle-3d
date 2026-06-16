import * as THREE from 'three';
import { registerSkill, registerUpgrade } from '../registry';
import { hyperbolic } from '../stats';
import type { GameApi } from '../api';

/**
 * Ballistics / Crit-Sniping pack (bal_)
 * Projectile mastery + critical hits: manual burst weapons fired toward the
 * crosshair plus a deep crit build synergizing with mark / pierce / projCount.
 */

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

registerSkill({
  id: 'bal_snipe',
  name: '狙击',
  icon: '🎯',
  trigger: 'button',
  baseCooldown: 3.5,
  maxLevel: 5,
  cooldown: (lvl) => 3.5 - (lvl - 1) * 0.3,
  desc: (lvl) =>
    `发射一枚超高速穿甲弹，必定暴击，穿透 ${1 + lvl} 个目标`,
  cast: (api: GameApi, lvl: number) => {
    const muzzle = api.player.muzzleWorld();
    const dir = api.aimPoint.clone().sub(muzzle).normalize();
    const dmg = (40 + lvl * 16) * api.stats.damageMult;

    api.spawnBullet({
      pos: muzzle.clone(),
      dir,
      speed: 80 * api.stats.projSpeed,
      damage: dmg,
      color: 0xfff1a8,
      size: 0.5 * api.stats.projSize,
      effect: { bonusCritChance: 1, pierce: 1 + lvl },
    });

    api.particles.muzzle(muzzle.clone(), 0xfff1a8);
    api.particles.beam(muzzle.clone(), api.aimPoint.clone(), 0xfff1a8);
    api.audio.fire();
    api.audio.crit();
    api.toast('🎯 狙击!');
  },
});

registerSkill({
  id: 'bal_barrage',
  name: '弹幕',
  icon: '🌊',
  trigger: 'button',
  baseCooldown: 6,
  maxLevel: 5,
  cooldown: (lvl) => 6 - (lvl - 1) * 0.5,
  desc: (lvl) =>
    `扇形齐射 ${7 + lvl} 发高速弹丸`,
  cast: (api: GameApi, lvl: number) => {
    const muzzle = api.player.muzzleWorld();
    const centerDir = api.aimPoint.clone().sub(muzzle).normalize();
    const count = 7 + lvl;
    const arc = 0.9; // radians
    const half = (count - 1) / 2;
    const dmg = (12 + lvl * 3) * api.stats.damageMult;
    const yAxis = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < count; i++) {
      const angle = (i - half) * (arc / Math.max(count - 1, 1));
      const d = centerDir.clone().applyAxisAngle(yAxis, angle);
      api.spawnBullet({
        pos: muzzle.clone(),
        dir: d,
        speed: 46 * api.stats.projSpeed,
        damage: dmg,
        color: 0xffc864,
        size: 0.25 * api.stats.projSize,
      });
    }

    api.particles.muzzle(muzzle.clone(), 0xffc864);
    api.audio.fire();
    api.toast('🌊 弹幕!');
  },
});

registerSkill({
  id: 'bal_ricochet',
  name: '跳弹环',
  icon: '💫',
  trigger: 'auto',
  baseCooldown: 4.5,
  maxLevel: 5,
  cooldown: (lvl) => 4.5 - (lvl - 1) * 0.35,
  desc: (lvl) =>
    `向四周发射 ${8 + lvl * 2} 枚穿透弹丸`,
  cast: (api: GameApi, lvl: number) => {
    const pos = api.playerPos();
    const count = 8 + lvl * 2;
    const dmg = (8 + lvl * 3) * api.stats.damageMult;
    const step = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = step * i;
      api.spawnBullet({
        pos: new THREE.Vector3(pos.x, 0.6, pos.z),
        dir: new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)),
        speed: 38 * api.stats.projSpeed,
        damage: dmg,
        color: 0xe0c8ff,
        size: 0.22 * api.stats.projSize,
        effect: { pierce: 1 },
      });
    }

    api.particles.ring(
      new THREE.Vector3(pos.x, 0.2, pos.z),
      0xe0c8ff,
      4 * api.stats.areaMult,
    );
    api.audio.fire();
  },
});

// ---------------------------------------------------------------------------
// Skill-unlock cards
// ---------------------------------------------------------------------------

registerUpgrade({
  id: 'c_bal_snipe',
  name: '解锁/强化 狙击',
  icon: '🎯',
  rarity: 'rare',
  kind: 'skill',
  tags: ['ballistics', 'crit', 'offense'],
  maxLevel: 5,
  desc: () => '解锁或强化「狙击」：必定暴击的穿甲弹',
  available: (run) => run.skillLevel('bal_snipe') < 5,
  apply: (run) => run.gainSkill('bal_snipe'),
});

registerUpgrade({
  id: 'c_bal_barrage',
  name: '解锁/强化 弹幕',
  icon: '🌊',
  rarity: 'rare',
  kind: 'skill',
  tags: ['ballistics', 'offense'],
  maxLevel: 5,
  desc: () => '解锁或强化「弹幕」：扇形齐射大量弹丸',
  available: (run) => run.skillLevel('bal_barrage') < 5,
  apply: (run) => run.gainSkill('bal_barrage'),
});

registerUpgrade({
  id: 'c_bal_ricochet',
  name: '解锁/强化 跳弹环',
  icon: '💫',
  rarity: 'common',
  kind: 'skill',
  tags: ['ballistics', 'offense'],
  maxLevel: 5,
  desc: () => '解锁或强化「跳弹环」：自动向四周发射穿透弹',
  available: (run) => run.skillLevel('bal_ricochet') < 5,
  apply: (run) => run.gainSkill('bal_ricochet'),
});

// ---------------------------------------------------------------------------
// Passive / Synergy cards
// ---------------------------------------------------------------------------

registerUpgrade({
  id: 'c_bal_crit',
  name: '会心',
  icon: '💎',
  rarity: 'rare',
  kind: 'passive',
  tags: ['crit', 'offense'],
  maxLevel: 6,
  desc: (lvl) => `暴击率大幅提升（当前 Lv${lvl}）`,
  apply: (run, lvl) => {
    run.stats.critChance = 0.08 + hyperbolic(0.2, lvl) * 0.65;
  },
});

registerUpgrade({
  id: 'c_bal_execute',
  name: '处决',
  icon: '🗡️',
  rarity: 'epic',
  kind: 'passive',
  tags: ['crit', 'offense'],
  maxLevel: 5,
  desc: () => '暴击倍率 +0.4',
  apply: (run) => {
    run.stats.critMult += 0.4;
  },
});

registerUpgrade({
  id: 'c_bal_ballistics',
  name: '弹道学',
  icon: '🚀',
  rarity: 'common',
  kind: 'passive',
  tags: ['offense', 'physical'],
  maxLevel: 5,
  desc: () => '弹速 +20%，弹丸大小 +10%',
  apply: (run) => {
    run.stats.projSpeed += 0.2;
    run.stats.projSize += 0.1;
  },
});

registerUpgrade({
  id: 'c_bal_markhunter',
  name: '猎杀标记',
  icon: '🔍',
  rarity: 'epic',
  kind: 'synergy',
  tags: ['crit', 'mark'],
  maxLevel: 4,
  desc: () => '标记增伤效果 +30%',
  apply: (run) => {
    run.stats.markDmgMult += 0.3;
  },
});

registerUpgrade({
  id: 'c_bal_reaper',
  name: '【进化】死神',
  icon: '💀',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['crit', 'ballistics', 'evolution'],
  maxLevel: 1,
  desc: () => '暴击率 +15%，暴击倍率 +0.6（需高暴击 + 狙击 Lv3）',
  available: (run) =>
    run.stats.critChance >= 0.4 &&
    run.ownsSkill('bal_snipe') &&
    run.skillLevel('bal_snipe') >= 3,
  apply: (run) => {
    run.stats.critChance = Math.min(1, run.stats.critChance + 0.15);
    run.stats.critMult += 0.6;
  },
});
