import * as THREE from 'three';
import { registerSkill, registerUpgrade } from '../registry';
import { hyperbolic } from '../stats';
import type { GameApi } from '../api';

/**
 * 无人机齐射系 (Drone Volleys) — autonomous fire-support pack.
 * Auto-cast volleys that seek nearby enemies + area saturation.
 * Scales with cdrMult and projCount.
 */

// ─── Skills ──────────────────────────────────────────────────────────

registerSkill({
  id: 'drn_volley',
  name: '无人机齐射',
  icon: '🤖',
  trigger: 'auto',
  baseCooldown: 3,
  maxLevel: 5,
  desc: (lvl) => `自动向最近 ${2 + lvl} 个敌人发射制导弹，每发 ${10 + lvl * 4} 伤害`,
  cast: (api: GameApi, lvl) => {
    const muzzle = api.player.muzzleWorld();
    const targets = api.nearest(api.player.pos, 2 + lvl, 26);
    if (targets.length === 0) return;
    for (const t of targets) {
      const dir = new THREE.Vector3().subVectors(t.group.position, muzzle).normalize();
      api.spawnBullet({
        pos: muzzle.clone(),
        dir,
        speed: 40 * api.stats.projSpeed,
        damage: (10 + lvl * 4) * api.stats.damageMult,
        color: 0x9be8ff,
        size: 0.28,
        effect: { pierce: 1 },
      });
      api.particles.muzzle(muzzle.clone(), 0x9be8ff);
    }
    api.audio.fire();
  },
});

registerSkill({
  id: 'drn_sentry',
  name: '散弹哨戒',
  icon: '🔫',
  trigger: 'auto',
  baseCooldown: 4.5,
  maxLevel: 5,
  desc: (lvl) => `自动向前方扇形发射 ${5 + lvl} 发散弹，每发 ${8 + lvl * 3} 伤害`,
  cast: (api: GameApi, lvl) => {
    const muzzle = api.player.muzzleWorld();
    const pellets = 5 + lvl;
    const half = (pellets - 1) / 2;
    const spreadAngle = 0.7;
    const step = pellets > 1 ? spreadAngle / (pellets - 1) : 0;
    for (let i = 0; i < pellets; i++) {
      const a = api.camYaw + (i - half) * step;
      api.spawnBullet({
        pos: muzzle.clone(),
        dir: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)),
        speed: 44 * api.stats.projSpeed,
        damage: (8 + lvl * 3) * api.stats.damageMult,
        color: 0x76d6ff,
        size: 0.22,
      });
    }
    api.particles.muzzle(muzzle.clone(), 0x76d6ff);
    api.audio.fire();
  },
});

registerSkill({
  id: 'drn_missilerain',
  name: '导弹雨',
  icon: '🎯',
  trigger: 'auto',
  baseCooldown: 5.5,
  maxLevel: 5,
  desc: (lvl) => `对最近 ${2 + lvl} 个敌人分别发射导弹，造成 ${16 + lvl * 6} 范围伤害`,
  cast: (api: GameApi, lvl) => {
    const targets = api.nearest(api.player.pos, 2 + lvl, 30);
    if (targets.length === 0) return;
    const dmg = (16 + lvl * 6) * api.stats.damageMult;
    const radius = 3 * api.stats.areaMult;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      setTimeout(() => {
        const pos = t.group.position.clone();
        api.dealAoe(pos, radius, dmg);
        api.particles.explosion(pos, 0x9be8ff, 1.6);
        api.particles.orbitalBeam(pos, 0x76d6ff);
        api.audio.explosion();
      }, i * 120);
    }
  },
});

// ─── Upgrade / synergy cards ─────────────────────────────────────────

registerUpgrade({
  id: 'c_drn_volley',
  name: '解锁 无人机齐射',
  icon: '🤖',
  rarity: 'rare',
  kind: 'skill',
  tags: ['summon', 'offense'],
  maxLevel: 5,
  desc: () => '解锁或强化无人机齐射：更多目标、更高伤害',
  available: (run) => run.skillLevel('drn_volley') < 5,
  apply: (run) => run.gainSkill('drn_volley'),
});

registerUpgrade({
  id: 'c_drn_sentry',
  name: '解锁 散弹哨戒',
  icon: '🔫',
  rarity: 'rare',
  kind: 'skill',
  tags: ['summon', 'offense'],
  maxLevel: 5,
  desc: () => '解锁或强化散弹哨戒：更多弹片、更短冷却',
  available: (run) => run.skillLevel('drn_sentry') < 5,
  apply: (run) => run.gainSkill('drn_sentry'),
});

registerUpgrade({
  id: 'c_drn_missilerain',
  name: '解锁 导弹雨',
  icon: '🎯',
  rarity: 'epic',
  kind: 'skill',
  tags: ['summon', 'offense'],
  maxLevel: 5,
  desc: () => '解锁或强化导弹雨：更多目标、更高爆炸伤害',
  available: (run) => run.skillLevel('drn_missilerain') < 5,
  apply: (run) => run.gainSkill('drn_missilerain'),
});

registerUpgrade({
  id: 'c_drn_count',
  name: '弹仓扩容',
  icon: '📦',
  rarity: 'rare',
  kind: 'passive',
  tags: ['summon', 'offense'],
  maxLevel: 4,
  desc: (lvl) => `弹丸数 +1（当前 +${lvl}）`,
  apply: (run) => {
    run.stats.projCount += 1;
  },
});

registerUpgrade({
  id: 'c_drn_haste',
  name: '自动装填',
  icon: '⏱️',
  rarity: 'epic',
  kind: 'synergy',
  tags: ['summon', 'utility'],
  maxLevel: 5,
  desc: (lvl) => `技能冷却大幅缩减（递减叠加，当前 +${Math.round(hyperbolic(0.2, lvl) * 110)}%）`,
  apply: (run, lvl) => {
    run.stats.cdrMult = 1 + hyperbolic(0.2, lvl) * 1.1;
  },
});

registerUpgrade({
  id: 'c_drn_targeting',
  name: '智能制导',
  icon: '📡',
  rarity: 'rare',
  kind: 'synergy',
  tags: ['summon', 'offense'],
  maxLevel: 4,
  desc: () => '技能范围 +12%，弹速 +15%',
  apply: (run) => {
    run.stats.areaMult += 0.12;
    run.stats.projSpeed += 0.15;
  },
});

registerUpgrade({
  id: 'c_drn_swarm',
  name: '【进化】蜂群',
  icon: '🐝',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['summon', 'evolution'],
  maxLevel: 1,
  desc: () => '弹丸数 +2，冷却缩减 +25%，强化无人机齐射',
  available: (run) =>
    run.ownsSkill('drn_volley') &&
    run.skillLevel('drn_volley') >= 3 &&
    run.stats.projCount >= 3,
  apply: (run) => {
    run.stats.projCount += 2;
    run.stats.cdrMult += 0.25;
    run.gainSkill('drn_volley');
  },
});
