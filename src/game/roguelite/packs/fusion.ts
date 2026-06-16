import { registerSkill, registerUpgrade } from '../registry';
import { hyperbolic } from '../stats';
import type { GameApi } from '../api';
import type { RunState } from '../run';

/**
 * 跨元素进化与协同系 (Cross-Element Fusions / Duo Synergies)
 * "Build glue" — Duo evolution cards requiring TWO element prereqs,
 * plus cross-cutting synergy/passives and a utility active.
 * All ids prefixed `fus_`.
 */

// ─── Duo EVOLUTION cards (legendary, maxLevel 1) ────────────────────────

registerUpgrade({
  id: 'fus_steam',
  name: '【融合】蒸汽爆发',
  icon: '♨️',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['fire', 'ice', 'element', 'evolution', 'fusion'],
  maxLevel: 1,
  desc: () => '火+冰融合：灼伤倍率+50%，冷冻强化为完全冻结',
  available: (run: RunState) => run.stats.onHitBurn > 0 && run.stats.onHitChill > 0,
  apply: (run: RunState) => {
    run.stats.burnDmgMult += 0.5;
    run.stats.freezeOnChill = true;
  },
});

registerUpgrade({
  id: 'fus_superconduct',
  name: '【融合】超导',
  icon: '⚡',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['ice', 'lightning', 'element', 'evolution', 'fusion'],
  maxLevel: 1,
  desc: () => '冰+雷融合：闪电链+2跳，冰冻暴击加成+20%',
  available: (run: RunState) => run.stats.onHitChill > 0 && run.stats.onHitShock,
  apply: (run: RunState) => {
    run.stats.shockChains += 2;
    run.stats.chillCritBonus += 0.2;
  },
});

registerUpgrade({
  id: 'fus_overload',
  name: '【融合】感电过载',
  icon: '🔥',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['fire', 'lightning', 'element', 'evolution', 'fusion'],
  maxLevel: 1,
  desc: () => '火+雷融合：感电伤害+50%，灼伤倍率+40%',
  available: (run: RunState) => run.stats.onHitBurn > 0 && run.stats.onHitShock,
  apply: (run: RunState) => {
    run.stats.shockDmgMult += 0.5;
    run.stats.burnDmgMult += 0.4;
  },
});

registerUpgrade({
  id: 'fus_shatter',
  name: '【融合】碎甲',
  icon: '💎',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['physical', 'element', 'evolution', 'fusion'],
  maxLevel: 1,
  desc: () => '印记+穿透融合：印记倍率+40%，每层+5%，穿透+1',
  available: (run: RunState) => run.stats.onHitMarkStacks > 0 && run.stats.pierce >= 1,
  apply: (run: RunState) => {
    run.stats.markDmgMult += 0.4;
    run.stats.markPerStack += 0.05;
    run.stats.pierce += 1;
  },
});

registerUpgrade({
  id: 'fus_meltdown',
  name: '【融合】熔毁',
  icon: '☢️',
  rarity: 'legendary',
  kind: 'evolution',
  tags: ['fire', 'crit', 'evolution', 'fusion'],
  maxLevel: 1,
  desc: () => '灼伤+暴击融合：灼伤倍率+60%，暴击伤害+30%',
  available: (run: RunState) => run.stats.onHitBurn > 0 && run.stats.critChance >= 0.35,
  apply: (run: RunState) => {
    run.stats.burnDmgMult += 0.6;
    run.stats.critMult += 0.3;
  },
});

// ─── Cross-cutting synergy / passive cards ──────────────────────────────

registerUpgrade({
  id: 'fus_elementalist',
  name: '元素亲和',
  icon: '🌈',
  rarity: 'epic',
  kind: 'synergy',
  tags: ['element', 'utility'],
  maxLevel: 3,
  desc: (lvl: number) => `全元素倍率各+${lvl * 15}%（灼/雷/印记）`,
  apply: (run: RunState) => {
    run.stats.burnDmgMult += 0.15;
    run.stats.shockDmgMult += 0.15;
    run.stats.markDmgMult += 0.15;
  },
});

registerUpgrade({
  id: 'fus_overclock',
  name: '超频',
  icon: '⚙️',
  rarity: 'epic',
  kind: 'passive',
  tags: ['utility'],
  maxLevel: 4,
  desc: (lvl: number) => `冷却缩减+${Math.round(hyperbolic(0.18, lvl) * 100)}%，射速+${lvl * 10}%`,
  apply: (run: RunState, lvl: number) => {
    run.stats.cdrMult = 1 + hyperbolic(0.18, lvl) * 1.0;
    run.stats.fireRateMult += 0.1;
  },
});

registerUpgrade({
  id: 'fus_glasscannon',
  name: '玻璃大炮',
  icon: '💀',
  rarity: 'rare',
  kind: 'synergy',
  tags: ['offense', 'risk'],
  maxLevel: 3,
  desc: (lvl: number) => `伤害+${lvl * 35}%，暴伤+${lvl * 20}%（高风险高回报）`,
  apply: (run: RunState) => {
    run.stats.damageMult += 0.35;
    run.stats.critMult += 0.2;
  },
});

// ─── Utility active skill ───────────────────────────────────────────────

registerSkill({
  id: 'fus_timewarp',
  name: '时空缓滞',
  icon: '⏳',
  trigger: 'button',
  baseCooldown: 9,
  maxLevel: 4,
  desc: (lvl: number) => `释放时空脉冲，范围${10 + lvl * 2}内敌人受${8 + lvl * 3}伤害并冰冻2.5秒`,
  cast: (api: GameApi, lvl: number) => {
    const pos = api.playerPos();
    const radius = (10 + lvl * 2) * api.stats.areaMult;
    const dmg = (8 + lvl * 3) * api.stats.damageMult;
    api.particles.ring(pos, 0x9be8ff, radius);
    api.audio.bossWarn();
    api.dealAoe(pos, radius, dmg, undefined, [
      { type: 'chill', amount: 0.6, dur: 2.5 },
    ]);
  },
});

// ─── Skill unlock card ──────────────────────────────────────────────────

registerUpgrade({
  id: 'fus_timewarp_card',
  name: '时空核心',
  icon: '⏳',
  rarity: 'epic',
  kind: 'skill',
  tags: ['utility', 'fusion'],
  maxLevel: 4,
  desc: () => '解锁「时空缓滞」主动技能，释放冰冻脉冲波',
  apply: (run: RunState) => {
    run.gainSkill('fus_timewarp');
  },
});
