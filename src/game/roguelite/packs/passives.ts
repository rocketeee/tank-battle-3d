import { registerUpgrade } from '../registry';
import { hyperbolic } from '../stats';
import type { Rarity } from '../api';
import type { RunState } from '../run';

/**
 * Passive stat cards — the Brotato-style number build. Linear stats stack additively;
 * chance stats (crit / armor / cdr) use hyperbolic stacking keyed on the card's own
 * pick count (`lvl`) so they ramp but never break.
 */

function passive(
  id: string,
  name: string,
  icon: string,
  rarity: Rarity,
  tags: string[],
  maxLevel: number,
  desc: string,
  apply: (run: RunState, lvl: number) => void,
) {
  registerUpgrade({ id, name, icon, rarity, kind: 'passive', tags, maxLevel, desc: () => desc, apply });
}

passive('p_damage', '火力强化', '💢', 'common', ['offense'], 8, '主炮与技能伤害 +15%', (run) => {
  run.stats.damageMult += 0.15;
});
passive('p_firerate', '急速装填', '⏩', 'common', ['offense'], 8, '射速 +12%', (run) => {
  run.stats.fireRateMult += 0.12;
});
passive('p_multishot', '多重弹', '🎰', 'rare', ['offense', 'physical'], 4, '主炮额外 +1 发弹丸', (run) => {
  run.stats.projCount += 1;
});
passive('p_pierce', '穿甲弹', '📌', 'rare', ['offense', 'physical'], 3, '子弹可多穿透 1 个目标', (run) => {
  run.stats.pierce += 1;
});
passive('p_crit', '精准瞄准', '🎯', 'rare', ['offense', 'crit'], 6, '暴击率提升（递减叠加）', (run, lvl) => {
  run.stats.critChance = 0.08 + hyperbolic(0.18, lvl) * 0.6;
});
passive('p_critdmg', '致命一击', '💥', 'epic', ['offense', 'crit'], 5, '暴击伤害 +35%', (run) => {
  run.stats.critMult += 0.35;
});
passive('p_speed', '强化引擎', '🏎️', 'common', ['utility', 'mobility'], 6, '移动速度 +12%', (run) => {
  run.stats.moveSpeed += 0.12;
});
passive('p_maxhp', '装甲扩容', '❤️', 'common', ['defense'], 8, '生命上限 +4 并立即回复', (run) => {
  run.stats.maxHp += 4;
  run.pendingHeal += 4;
});
passive('p_regen', '纳米修复', '🩹', 'rare', ['defense'], 5, '每秒回血 +0.6', (run) => {
  run.stats.regen += 0.6;
});
passive('p_armor', '反应装甲', '🛡', 'rare', ['defense'], 6, '减伤提升（递减叠加）', (run, lvl) => {
  run.stats.armor = hyperbolic(0.16, lvl) * 0.85;
});
passive('p_cdr', '过载核心', '🔋', 'epic', ['utility'], 5, '技能冷却缩减（递减叠加）', (run, lvl) => {
  run.stats.cdrMult = 1 + hyperbolic(0.22, lvl) * 1.2;
});
passive('p_area', '扩散力场', '🌀', 'rare', ['utility'], 5, '技能范围 +15%', (run) => {
  run.stats.areaMult += 0.15;
});
passive('p_projspeed', '高速弹', '💨', 'common', ['offense'], 4, '弹速 +20%', (run) => {
  run.stats.projSpeed += 0.2;
});
passive('p_luck', '幸运星', '🍀', 'epic', ['utility'], 5, '幸运 +1（更易刷出稀有卡）', (run) => {
  run.stats.luck += 1;
});

// Always-available fallback so the level-up screen never runs dry.
registerUpgrade({
  id: 'p_repair',
  name: '紧急维修',
  icon: '🔧',
  rarity: 'common',
  kind: 'passive',
  tags: ['defense'],
  maxLevel: 999,
  baseWeight: 0.5,
  desc: () => '立即修复 5 点装甲',
  apply: (run) => {
    run.pendingHeal += 5;
  },
});
