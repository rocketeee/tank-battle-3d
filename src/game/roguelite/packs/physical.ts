import * as THREE from 'three';
import { registerSkill, registerUpgrade } from '../registry';
import type { GameApi } from '../api';

/** Physical line — mark amplifier, an auto mortar, and the Barrage evolution. */

registerSkill({
  id: 'mortar',
  name: '自动迫击炮',
  icon: '💣',
  trigger: 'auto',
  baseCooldown: 3.4,
  maxLevel: 5,
  cooldown: (lvl) => 3.4 - (lvl - 1) * 0.3,
  desc: (lvl) => `自动向最近敌人投掷高爆弹，范围爆炸（伤害随等级 +${(lvl - 1) * 25}%）`,
  cast: (api: GameApi, lvl) => {
    const target = api.nearest(api.player.pos, 1, 22)[0];
    if (!target) return;
    const p = target.group.position.clone();
    api.audio.fire();
    setTimeout(() => {
      const radius = (3.2 + lvl * 0.4) * api.stats.areaMult;
      api.particles.explosion(new THREE.Vector3(p.x, 0.6, p.z), 0xffb347, 1.6 + lvl * 0.15);
      api.particles.ring(new THREE.Vector3(p.x, 0.1, p.z), 0xffd27f, radius);
      api.audio.explosion();
      api.dealAoe(new THREE.Vector3(p.x, 0.6, p.z), radius, (30 + lvl * 12) * api.stats.damageMult, {});
    }, 260);
  },
});

registerUpgrade({
  id: 'el_mark',
  name: '猎杀标记',
  icon: '🎯',
  rarity: 'rare',
  kind: 'synergy',
  tags: ['physical', 'element', 'onhit'],
  maxLevel: 3,
  desc: () => '主炮命中标记敌人，被标记者受到更多伤害',
  apply: (run, lvl) => {
    run.stats.onHitMarkStacks = lvl;
  },
});

registerUpgrade({
  id: 'el_mark_amp',
  name: '弱点解析',
  icon: '🔬',
  rarity: 'epic',
  kind: 'synergy',
  tags: ['physical', 'element', 'amplifier'],
  maxLevel: 4,
  desc: () => '每层标记的增伤效果 +6%',
  available: (run) => run.stats.onHitMarkStacks > 0,
  apply: (run) => {
    run.stats.markPerStack += 0.06;
  },
});

registerUpgrade({
  id: 'evo_barrage',
  name: '【进化】弹幕风暴',
  icon: '🌪️',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['physical', 'element', 'evolution'],
  maxLevel: 1,
  desc: () => '主炮弹丸数翻倍，并额外获得穿透与范围',
  available: (run) => run.stats.projCount >= 3 && run.skillLevel('mortar') >= 3,
  apply: (run) => {
    run.stats.projCount *= 2;
    run.stats.pierce += 1;
    run.stats.areaMult += 0.25;
  },
});
