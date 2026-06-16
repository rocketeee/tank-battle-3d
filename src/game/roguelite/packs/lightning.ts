import * as THREE from 'three';
import { registerSkill, registerUpgrade } from '../registry';
import type { Damageable, GameApi } from '../api';

/** Lightning line — shock chains and the Thunder God evolution. */

function chainZap(api: GameApi, start: Damageable, jumps: number, dmg: number) {
  const hit: Damageable[] = [start];
  let current = start;
  api.dealDamage(current, dmg, {}, [{ type: 'shock', dur: 4 }]);
  for (let i = 0; i < jumps; i++) {
    const next = api.nearest(current.group.position, 1, 9, hit)[0];
    if (!next) break;
    const a = new THREE.Vector3().copy(current.group.position); a.y += 0.8;
    const b = new THREE.Vector3().copy(next.group.position); b.y += 0.8;
    api.particles.beam(a, b, 0x8fb6ff);
    api.dealDamage(next, dmg * (0.9 - i * 0.05) * api.stats.shockDmgMult, {}, [{ type: 'shock', dur: 4 }]);
    hit.push(next);
    current = next;
  }
}

registerSkill({
  id: 'chain',
  name: '闪电链',
  icon: '⛓️',
  trigger: 'auto',
  baseCooldown: 3.2,
  maxLevel: 5,
  cooldown: (lvl) => 3.2 - (lvl - 1) * 0.3,
  desc: (lvl) => `自动释放闪电，在 ${2 + lvl} 个敌人间跳跃并使其感电`,
  cast: (api: GameApi, lvl) => {
    const target = api.nearest(api.player.pos, 1, 16)[0];
    if (!target) return;
    api.audio.fire();
    chainZap(api, target, 2 + lvl + api.stats.shockChains, (14 + lvl * 4) * api.stats.damageMult * api.stats.shockDmgMult);
  },
});

registerUpgrade({
  id: 'el_shock',
  name: '感电弹',
  icon: '⚡',
  rarity: 'rare',
  kind: 'synergy',
  tags: ['lightning', 'element', 'onhit'],
  maxLevel: 1,
  desc: () => '主炮命中使敌人感电（受到的连锁伤害增加）',
  apply: (run) => {
    run.stats.onHitShock = true;
  },
});

registerUpgrade({
  id: 'el_shock_amp',
  name: '雷暴核心',
  icon: '🌩️',
  rarity: 'epic',
  kind: 'synergy',
  tags: ['lightning', 'element', 'amplifier'],
  maxLevel: 4,
  desc: () => '闪电额外跳跃 +1，感电伤害 +25%',
  available: (run) => run.stats.onHitShock || run.ownsSkill('chain'),
  apply: (run) => {
    run.stats.shockChains += 1;
    run.stats.shockDmgMult += 0.25;
  },
});

registerUpgrade({
  id: 'evo_thor',
  name: '【进化】雷神之怒',
  icon: '🔱',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['lightning', 'element', 'evolution'],
  maxLevel: 1,
  desc: () => '闪电链跳跃次数翻倍，对感电目标造成毁灭打击',
  available: (run) =>
    run.stats.onHitShock && run.skillLevel('chain') >= 4 && run.stats.shockChains < 50,
  apply: (run) => {
    run.stats.shockChains += 50;
    run.stats.shockDmgMult += 0.6;
  },
});
