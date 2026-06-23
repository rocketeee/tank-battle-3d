import * as THREE from 'three';
import { registerSkill, registerUpgrade } from '../registry';
import type { GameApi } from '../api';

/** Fire line — burn DoT, an auto flamethrower, and the Inferno evolution. */

registerSkill({
  id: 'flame',
  name: '火焰喷射',
  icon: '🔥',
  trigger: 'auto',
  baseCooldown: 2.6,
  maxLevel: 5,
  cooldown: (lvl) => 2.6 - (lvl - 1) * 0.25,
  desc: (lvl) => `自动喷射烈焰，点燃附近敌人（伤害随等级提升，当前 +${(lvl - 1) * 20}%）`,
  cast: (api: GameApi, lvl) => {
    const center = api.player.pos;
    const targets = api.nearest(center, 4, 8 * api.stats.areaMult);
    if (targets.length === 0) return;
    api.particles.jetFlame(new THREE.Vector3(center.x, 0.7, center.z));
    const dps = (8 + lvl * 3) * api.stats.burnDmgMult;
    const dmg = (6 + lvl * 2) * api.stats.damageMult;
    for (const t of targets) {
      api.dealDamage(t, dmg, { noCrit: true });
      api.applyStatus(t, { type: 'burn', amount: dps, dur: 3 });
    }
  },
});

registerUpgrade({
  id: 'el_burn',
  name: '燃烧弹',
  icon: '🔥',
  rarity: 'rare',
  kind: 'synergy',
  tags: ['fire', 'element', 'onhit'],
  maxLevel: 4,
  desc: () => '主炮命中附带灼烧，持续灼烧伤害',
  apply: (run, lvl) => {
    run.stats.onHitBurn = 5 + lvl * 3;
  },
});

registerUpgrade({
  id: 'el_burn_amp',
  name: '助燃剂',
  icon: '⛽',
  rarity: 'epic',
  kind: 'synergy',
  tags: ['fire', 'element', 'amplifier'],
  maxLevel: 4,
  desc: () => '灼烧伤害 +40%',
  available: (run) => run.stats.onHitBurn > 0 || run.ownsSkill('flame'),
  apply: (run) => {
    run.stats.burnDmgMult += 0.4;
  },
});

registerUpgrade({
  id: 'evo_inferno',
  name: '【进化】炼狱',
  icon: '🌋',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['fire', 'element', 'evolution'],
  maxLevel: 1,
  desc: () => '灼烧的敌人死亡时引爆，将烈焰扩散给周围敌人',
  available: (run) =>
    run.stats.onHitBurn > 0 && run.skillLevel('flame') >= 4 && !run.stats.burnSpread,
  apply: (run) => {
    run.stats.burnSpread = true;
    run.stats.burnDmgMult += 0.5;
  },
});
