import * as THREE from 'three';
import { registerSkill, registerUpgrade } from '../registry';
import type { GameApi } from '../api';

/** Ice line — chill slow, an auto frost nova, and the Absolute Zero evolution. */

registerSkill({
  id: 'frostnova',
  name: '冰霜新星',
  icon: '❄️',
  trigger: 'auto',
  baseCooldown: 4.5,
  maxLevel: 5,
  cooldown: (lvl) => 4.5 - (lvl - 1) * 0.4,
  desc: (lvl) => `周身爆发寒霜，减速并冻伤范围内敌人（半径随等级 +${(lvl - 1) * 12}%）`,
  cast: (api: GameApi, lvl) => {
    const center = api.player.pos;
    const radius = (5 + lvl * 0.6) * api.stats.areaMult;
    api.particles.ring(new THREE.Vector3(center.x, 0.2, center.z), 0x8fd6ff, radius);
    const dmg = (6 + lvl * 2) * api.stats.damageMult;
    api.dealAoe(new THREE.Vector3(center.x, 0.4, center.z), radius, dmg, { noCrit: true });
    for (const t of api.nearest(center, 12, radius)) {
      if (api.stats.freezeOnChill && t.status.has('chill')) api.applyStatus(t, { type: 'chill', amount: 1, dur: 1.2, stacks: 1 });
      else api.applyStatus(t, { type: 'chill', amount: 0.45 + lvl * 0.05, dur: 2.5 });
    }
  },
});

registerUpgrade({
  id: 'el_chill',
  name: '冰霜弹',
  icon: '❄️',
  rarity: 'rare',
  kind: 'synergy',
  tags: ['ice', 'element', 'onhit'],
  maxLevel: 4,
  desc: () => '主炮命中使敌人减速',
  apply: (run, lvl) => {
    run.stats.onHitChill = 0.25 + lvl * 0.08;
  },
});

registerUpgrade({
  id: 'el_chill_crit',
  name: '凛冬狩猎',
  icon: '🥶',
  rarity: 'epic',
  kind: 'synergy',
  tags: ['ice', 'element', 'amplifier', 'crit'],
  maxLevel: 3,
  desc: () => '对被冰冻/减速的敌人暴击率大幅提升',
  available: (run) => run.stats.onHitChill > 0 || run.ownsSkill('frostnova'),
  apply: (run, lvl) => {
    run.stats.chillCritBonus = 0.15 + lvl * 0.1;
  },
});

registerUpgrade({
  id: 'evo_abszero',
  name: '【进化】绝对零度',
  icon: '🧊',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['ice', 'element', 'evolution'],
  maxLevel: 1,
  desc: () => '减速叠满直接冰冻，冰冻目标受到的伤害提升',
  available: (run) =>
    run.stats.onHitChill > 0 && run.skillLevel('frostnova') >= 4 && !run.stats.freezeOnChill,
  apply: (run) => {
    run.stats.freezeOnChill = true;
    run.stats.chillCritBonus += 0.15;
  },
});
