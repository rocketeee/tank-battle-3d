import { registerSkill, registerUpgrade } from '../registry';
import { hyperbolic } from '../stats';
import type { GameApi } from '../api';

/**
 * 近战 / 范围爆发系 — Melee / AoE Burst pack.
 * Close-range tank that punishes clustered enemies with shock-waves,
 * whirlwind slashes and a blazing charge.  Synergises with areaMult, chill, burn.
 */

// ────────────────────────────── Active Skills ──────────────────────────────

/** 冲击波 — button AoE nova around the player with chill. */
registerSkill({
  id: 'ml_nova',
  name: '冲击波',
  icon: '💫',
  trigger: 'button',
  baseCooldown: 6,
  maxLevel: 5,
  cooldown: (lvl, stats) => (6 - (lvl - 1) * 0.35) / stats.cdrMult,
  desc: (lvl) =>
    `以自身为中心释放冲击波，对范围内敌人造成 ${30 + lvl * 10} 伤害并施加寒气（半径随范围提升）`,
  cast: (api: GameApi, lvl: number) => {
    const pos = api.playerPos();
    const radius = (4.5 + lvl) * api.stats.areaMult;
    const dmg = (30 + lvl * 10) * api.stats.damageMult;

    api.dealAoe(pos, radius, dmg, undefined, [
      { type: 'chill', amount: 0.3, dur: 1.5 },
    ]);

    api.particles.ring(pos, 0x9be8ff, radius);
    api.particles.explosion(pos, 0x9be8ff, 1.2);
    api.audio.explosion();
  },
});

/** 旋风刃 — auto, 3 staggered pulses of small AoE around the player. */
registerSkill({
  id: 'ml_whirl',
  name: '旋风刃',
  icon: '🌪️',
  trigger: 'auto',
  baseCooldown: 4,
  maxLevel: 5,
  cooldown: (lvl, stats) => (4 - (lvl - 1) * 0.25) / stats.cdrMult,
  desc: (lvl) =>
    `自动释放旋风，分 3 段对周围敌人各造成 ${10 + lvl * 4} 伤害`,
  cast: (api: GameApi, lvl: number) => {
    const pulses = 3;
    const delay = 0.15; // 0, 0.15, 0.30 s
    const radius = 3 * api.stats.areaMult;
    const dmg = (10 + lvl * 4) * api.stats.damageMult;

    for (let i = 0; i < pulses; i++) {
      setTimeout(() => {
        const pos = api.playerPos();
        api.dealAoe(pos, radius, dmg);
        api.particles.ring(pos, 0x67d2ff, radius);
        api.audio.hit();
      }, i * delay * 1000);
    }
  },
});

/** 烈焰冲撞 — button dash then burn AoE at landing spot. */
registerSkill({
  id: 'ml_charge',
  name: '烈焰冲撞',
  icon: '🔥',
  trigger: 'button',
  baseCooldown: 7,
  maxLevel: 5,
  cooldown: (lvl, stats) => (7 - (lvl - 1) * 0.4) / stats.cdrMult,
  desc: (lvl) =>
    `向前方猛冲并在终点引爆，对周围敌人施加灼烧（${8 + lvl * 4} 每秒，持续 3 秒）`,
  cast: (api: GameApi, lvl: number) => {
    api.player.dash(api.camYaw, 0.28, 38);
    api.particles.dashTrail(api.playerPos(), 0xff6b6b);
    api.audio.jump();

    setTimeout(() => {
      const pos = api.playerPos();
      const radius = (3.5 + lvl * 0.5) * api.stats.areaMult;
      const dmg = (15 + lvl * 6) * api.stats.damageMult;
      const burnDps = (8 + lvl * 4) * api.stats.burnDmgMult;

      api.dealAoe(pos, radius, dmg, undefined, [
        { type: 'burn', amount: burnDps, dur: 3 },
      ]);

      api.particles.jetFlame(pos);
      api.particles.explosion(pos, 0xff8a3b, 1.4);
      api.audio.explosion();
    }, 300);
  },
});

// ────────────────────────────── Skill-Unlock Cards ──────────────────────────

registerUpgrade({
  id: 'c_ml_nova',
  name: '冲击波',
  icon: '💫',
  rarity: 'rare',
  kind: 'skill',
  tags: ['melee', 'aoe'],
  maxLevel: 5,
  desc: (lvl) =>
    lvl === 1
      ? '解锁主动技能【冲击波】：以自身为中心释放范围伤害并施加寒气'
      : `冲击波等级 +1（当前 Lv${lvl}）`,
  apply: (run) => { run.gainSkill('ml_nova'); },
});

registerUpgrade({
  id: 'c_ml_whirl',
  name: '旋风刃',
  icon: '🌪️',
  rarity: 'common',
  kind: 'skill',
  tags: ['melee', 'aoe'],
  maxLevel: 5,
  desc: (lvl) =>
    lvl === 1
      ? '解锁自动技能【旋风刃】：自动对周围敌人造成 3 段旋风伤害'
      : `旋风刃等级 +1（当前 Lv${lvl}）`,
  apply: (run) => { run.gainSkill('ml_whirl'); },
});

registerUpgrade({
  id: 'c_ml_charge',
  name: '烈焰冲撞',
  icon: '🔥',
  rarity: 'epic',
  kind: 'skill',
  tags: ['melee', 'fire', 'mobility'],
  maxLevel: 5,
  desc: (lvl) =>
    lvl === 1
      ? '解锁主动技能【烈焰冲撞】：冲刺后在终点引爆灼烧'
      : `烈焰冲撞等级 +1（当前 Lv${lvl}）`,
  apply: (run) => { run.gainSkill('ml_charge'); },
});

// ────────────────────────────── Synergy / Passive Cards ─────────────────────

registerUpgrade({
  id: 'c_ml_bigarea',
  name: '力场扩张',
  icon: '🔵',
  rarity: 'rare',
  kind: 'synergy',
  tags: ['melee', 'utility'],
  maxLevel: 4,
  desc: () => '技能范围 +18%',
  apply: (run) => { run.stats.areaMult += 0.18; },
});

registerUpgrade({
  id: 'c_ml_bruiser',
  name: '近战狂热',
  icon: '👊',
  rarity: 'epic',
  kind: 'passive',
  tags: ['melee', 'offense'],
  maxLevel: 5,
  desc: () => '伤害 +20%，生命上限 +3 并立即回复',
  apply: (run) => {
    run.stats.damageMult += 0.2;
    run.stats.maxHp += 3;
    run.pendingHeal += 3;
  },
});

registerUpgrade({
  id: 'c_ml_thorns',
  name: '荆棘护甲',
  icon: '🌵',
  rarity: 'rare',
  kind: 'synergy',
  tags: ['melee', 'defense'],
  maxLevel: 4,
  desc: () => '减伤提升（递减叠加，上限约 70%）',
  apply: (run, lvl) => {
    run.stats.armor = hyperbolic(0.14, lvl) * 0.7;
  },
});

// ────────────────────────────── Evolution Card ──────────────────────────────

registerUpgrade({
  id: 'c_ml_quake',
  name: '【进化】震地',
  icon: '🌋',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['melee', 'aoe', 'evolution'],
  maxLevel: 1,
  desc: () =>
    '冲击波进化为震地：技能范围 +40% 并自动获得旋风刃。需要冲击波 ≥Lv3 且范围 ≥1.3',
  available: (run) =>
    run.ownsSkill('ml_nova') &&
    run.skillLevel('ml_nova') >= 3 &&
    run.stats.areaMult >= 1.3,
  apply: (run) => {
    run.stats.areaMult += 0.4;
    run.gainSkill('ml_whirl');
  },
});
