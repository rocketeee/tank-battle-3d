/** Run-only mods. Reset every new run. Ranks are not saved to the profile. */

export interface RunMods {
  dmg: number;
  fire: number;
  speed: number;
  hpBonus: number;
  cd: number;
  spread: number;
  shield: number;
  crit: number;
  ranks: Record<string, number>;
}

export interface UpgradeDef {
  id: string;
  name: string;
  blurb: string;
  max: number;
  apply: (mods: RunMods) => void;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'power', name: '火力强化', blurb: '炮弹伤害 +18%', max: 6, apply: (m) => { m.dmg *= 1.18; } },
  { id: 'rof', name: '快速装填', blurb: '射速 +12%', max: 5, apply: (m) => { m.fire *= 1.12; } },
  { id: 'plate', name: '加厚装甲', blurb: '生命上限 +3', max: 4, apply: (m) => { m.hpBonus += 3; } },
  { id: 'tread', name: '高速履带', blurb: '移速 +10%', max: 4, apply: (m) => { m.speed *= 1.1; } },
  { id: 'vent', name: '冷却回路', blurb: '技能冷却 -12%', max: 4, apply: (m) => { m.cd *= 0.88; } },
  { id: 'fan', name: '散射扩容', blurb: '散射再 +2 发', max: 3, apply: (m) => { m.spread += 2; } },
  { id: 'dome', name: '护盾电池', blurb: '护盾延长 1.2 秒', max: 3, apply: (m) => { m.shield += 1.2; } },
  { id: 'head', name: '精准瞄具', blurb: '爆头倍率 +0.35', max: 3, apply: (m) => { m.crit += 0.35; } },
];

export function emptyMods(): RunMods {
  return { dmg: 1, fire: 1, speed: 1, hpBonus: 0, cd: 1, spread: 0, shield: 0, crit: 2, ranks: {} };
}

export function rankOf(mods: RunMods, id: string): number {
  return mods.ranks[id] ?? 0;
}

export function applyUpgrade(mods: RunMods, id: string): boolean {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return false;
  const rank = rankOf(mods, id);
  if (rank >= def.max) return false;
  def.apply(mods);
  mods.ranks[id] = rank + 1;
  return true;
}

/** Up to `count` distinct upgrades that are not maxed. `avoid` is the offer being rerolled. */
export function rollChoices(mods: RunMods, count = 3, rng: () => number = Math.random, avoid: readonly string[] = []): UpgradeDef[] {
  const pool = UPGRADES.filter((u) => rankOf(mods, u.id) < u.max);
  const fresh = pool.filter((u) => !avoid.includes(u.id));
  const source = fresh.length >= Math.min(count, pool.length) ? fresh : pool;
  for (let i = source.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = source[i];
    source[i] = source[j];
    source[j] = tmp;
  }
  return source.slice(0, count);
}
