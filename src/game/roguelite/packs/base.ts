import * as THREE from 'three';
import { registerSkill, registerUpgrade } from '../registry';
import type { GameApi } from '../api';

/**
 * Base pack — the five hand-aimed button skills the campaign already shipped with,
 * now expressed as data-driven, level-scaling skills. Shield is the only one every
 * run starts with; the rest are unlocked through level-up cards.
 */

const SHIELD_MAX = 5;
const SPREAD_MAX = 5;
const JUMP_MAX = 5;
const ORBITAL_MAX = 5;
const DASH_MAX = 5;

registerSkill({
  id: 'shield',
  name: '能量护盾',
  icon: '🛡️',
  trigger: 'button',
  baseCooldown: 12,
  maxLevel: SHIELD_MAX,
  cooldown: (lvl) => 12 - (lvl - 1) * 1.4,
  desc: (lvl) => `展开 ${3 + lvl} 秒无敌力场`,
  cast: (api: GameApi, lvl) => {
    api.player.shield(3 + lvl);
    api.particles.ring(new THREE.Vector3(api.player.pos.x, 0.2, api.player.pos.z), 0x5fd8ff, 3 * api.stats.areaMult);
    api.audio.jump();
    api.toast('🛡️ 能量护盾!');
  },
});

registerSkill({
  id: 'spread',
  name: '扇形散射',
  icon: '🔱',
  trigger: 'button',
  baseCooldown: 4.5,
  maxLevel: SPREAD_MAX,
  cooldown: (lvl) => 4.5 - (lvl - 1) * 0.45,
  desc: (lvl) => `一次喷出 ${3 + lvl} 发散弹`,
  cast: (api: GameApi, lvl) => {
    const pos = api.player.muzzleWorld();
    const pellets = 3 + lvl;
    const half = (pellets - 1) / 2;
    const spread = 0.26;
    for (let i = 0; i < pellets; i++) {
      const a = api.player.aimYaw + (i - half) * spread;
      api.spawnBullet({
        pos: pos.clone(),
        dir: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)),
        speed: 38 * api.stats.projSpeed,
        damage: 12 * api.stats.damageMult,
        color: 0xffa83b,
      });
    }
    api.particles.muzzle(pos.clone(), 0xffa83b);
    api.particles.muzzle(pos.clone(), 0xff6b6b);
    api.audio.fire();
    api.toast('🔱 三连散射!');
  },
});

registerSkill({
  id: 'jump',
  name: '跳跃冲击',
  icon: '🔥',
  trigger: 'button',
  baseCooldown: 3.0,
  maxLevel: JUMP_MAX,
  cooldown: (lvl) => 3.0 - (lvl - 1) * 0.25,
  desc: () => '腾空喷火并以落地冲击波震击地面单位',
  cast: (api: GameApi) => {
    api.player.jump();
  },
});

registerSkill({
  id: 'orbital',
  name: '轨道天罚',
  icon: '☄️',
  trigger: 'button',
  baseCooldown: 13,
  maxLevel: ORBITAL_MAX,
  cooldown: (lvl) => 13 - (lvl - 1) * 1.2,
  desc: (lvl) => `准星处召唤天降爆击，范围 +${(lvl - 1) * 10}%`,
  cast: (api: GameApi, lvl) => {
    const hit = api.groundAim();
    api.particles.orbitalBeam(hit.clone(), 0x9b6bff);
    api.audio.bossWarn();
    api.toast('☄️ 轨道天降打击!');
    const radius = (7.5 + (lvl - 1) * 0.9) * api.stats.areaMult;
    const dmg = 140 * api.stats.damageMult;
    setTimeout(() => {
      api.particles.explosion(new THREE.Vector3(hit.x, 0.6, hit.z), 0x9b6bff, 2.8);
      api.particles.ring(new THREE.Vector3(hit.x, 0.1, hit.z), 0xc39bff, radius);
      api.audio.explosion();
      api.dealAoe(new THREE.Vector3(hit.x, 0.6, hit.z), radius, dmg, { forceCrit: true });
    }, 430);
  },
});

registerSkill({
  id: 'dash',
  name: '冲刺',
  icon: '⚡',
  trigger: 'button',
  baseCooldown: 5,
  maxLevel: DASH_MAX,
  cooldown: (lvl) => 5 - (lvl - 1) * 0.5,
  desc: () => '向视角方向高速冲刺并获得短暂无敌',
  cast: (api: GameApi, lvl) => {
    api.player.dash(api.camYaw, 0.24 + (lvl - 1) * 0.02, 34);
    api.audio.jump();
  },
});

// ---- unlock / level cards -------------------------------------------------
function skillCard(id: string, name: string, icon: string, max: number, rarity: 'common' | 'rare', tags: string[], blurb: string) {
  registerUpgrade({
    id: `up_${id}`,
    name,
    icon,
    rarity,
    kind: 'skill',
    tags,
    maxLevel: max,
    desc: () => blurb,
    available: (run) => run.skillLevel(id) < max,
    apply: (run) => run.gainSkill(id),
  });
}

registerUpgrade({
  id: 'up_shield',
  name: '护盾强化',
  icon: '🛡️',
  rarity: 'common',
  kind: 'skill',
  tags: ['shield', 'defense'],
  maxLevel: SHIELD_MAX - 1,
  desc: () => '护盾持续更久、冷却更短',
  available: (run) => run.skillLevel('shield') < SHIELD_MAX,
  apply: (run) => run.gainSkill('shield'),
});
skillCard('spread', '解锁/强化 扇形散射', '🔱', SPREAD_MAX, 'common', ['spread', 'physical'], '解锁或强化扇形散射：更多弹丸、更短冷却');
skillCard('jump', '解锁/强化 跳跃冲击', '🔥', JUMP_MAX, 'common', ['jump', 'physical'], '解锁或强化跳跃冲击：更强落地震击');
skillCard('orbital', '解锁/强化 轨道天罚', '☄️', ORBITAL_MAX, 'rare', ['orbital'], '解锁或强化轨道天罚：更大范围的天降爆击');
skillCard('dash', '解锁/强化 冲刺', '⚡', DASH_MAX, 'common', ['dash', 'mobility'], '解锁或强化冲刺：更长的无敌位移');
