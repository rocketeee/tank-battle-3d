import * as THREE from 'three';
import { registerSkill, registerUpgrade } from '../registry';
import type { GameApi } from '../api';

/** Summon line — homing missiles that seek the nearest enemies, plus a Swarm evolution. */

function launchMissiles(api: GameApi, count: number, dmg: number) {
  const muzzle = api.player.muzzleWorld();
  const targets = api.nearest(api.player.pos, count, 26);
  if (targets.length === 0) return;
  for (let i = 0; i < count; i++) {
    const t = targets[i % targets.length];
    const dir = new THREE.Vector3().subVectors(t.group.position, muzzle).normalize();
    api.spawnBullet({
      pos: muzzle.clone(),
      dir,
      speed: 30 * api.stats.projSpeed,
      damage: dmg,
      color: 0x9be8ff,
      size: 0.32,
      effect: { source: 'missile' },
    });
  }
  api.particles.muzzle(muzzle, 0x9be8ff);
}

registerSkill({
  id: 'homing',
  name: '追踪导弹',
  icon: '🚀',
  trigger: 'auto',
  baseCooldown: 3.0,
  maxLevel: 5,
  cooldown: (lvl) => 3.0 - (lvl - 1) * 0.22,
  desc: (lvl) => `自动向最近的 ${1 + lvl} 个敌人发射追踪导弹`,
  cast: (api: GameApi, lvl) => {
    launchMissiles(api, 1 + lvl, (18 + lvl * 5) * api.stats.damageMult);
  },
});

registerUpgrade({
  id: 'el_missile',
  name: '导弹扩容',
  icon: '🚀',
  rarity: 'rare',
  kind: 'skill',
  tags: ['summon'],
  maxLevel: 5,
  desc: () => '解锁或强化追踪导弹',
  available: (run) => run.skillLevel('homing') < 5,
  apply: (run) => run.gainSkill('homing'),
});

registerUpgrade({
  id: 'evo_swarm',
  name: '【进化】死亡蜂群',
  icon: '🐝',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['summon', 'evolution'],
  maxLevel: 1,
  desc: () => '追踪导弹数量翻倍并大幅提速',
  available: (run) => run.skillLevel('homing') >= 4 && run.stats.projSpeed < 5,
  apply: (run) => {
    run.gainSkill('homing');
    run.stats.projSpeed += 0.6;
  },
});
