/** Out-of-run gold gear. Soft cap, diminishing returns. Skins are not in this file. */

export const SOFT_CAP = 20;

export type GearSlot = 'gun' | 'armor' | 'tracks' | 'radar';

export interface GearLevels {
  gun: number;
  armor: number;
  tracks: number;
  radar: number;
}

export const GEAR_SLOTS: { id: GearSlot; name: string; blurb: string }[] = [
  { id: 'gun', name: '主炮', blurb: '伤害' },
  { id: 'armor', name: '装甲', blurb: '生命' },
  { id: 'tracks', name: '履带', blurb: '移速' },
  { id: 'radar', name: '雷达', blurb: '射速' },
];

/** Level 20 totals: gun +45%, armor +50%, tracks +28%, radar +22% fire rate. */
const CAP_BONUS: Record<GearSlot, number> = {
  gun: 0.45,
  armor: 0.5,
  tracks: 0.28,
  radar: 0.22,
};

function stepWeight(index: number): number {
  return 1 / (1 + index * 0.35);
}

const WEIGHT_SUM = (() => {
  let sum = 0;
  for (let i = 0; i < SOFT_CAP; i++) sum += stepWeight(i);
  return sum;
})();

export function emptyGear(): GearLevels {
  return { gun: 0, armor: 0, tracks: 0, radar: 0 };
}

/** Gold for the next level. Null once the slot is full. */
export function upgradeCost(level: number): number | null {
  if (level >= SOFT_CAP) return null;
  return 10 + level * 6;
}

/** Bonus fraction at this level (0 at level 0, CAP_BONUS at level 20). */
export function slotBonus(slot: GearSlot, level: number): number {
  const n = Math.max(0, Math.min(SOFT_CAP, Math.floor(level)));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += stepWeight(i);
  return (sum / WEIGHT_SUM) * CAP_BONUS[slot];
}

export interface GearMult {
  dmg: number;
  hp: number;
  speed: number;
  fire: number;
}

export function gearMultipliers(levels: GearLevels): GearMult {
  return {
    dmg: 1 + slotBonus('gun', levels.gun),
    hp: 1 + slotBonus('armor', levels.armor),
    speed: 1 + slotBonus('tracks', levels.tracks),
    fire: 1 + slotBonus('radar', levels.radar),
  };
}

/**
 * Cleared-wave depth squared is the main payout. Kills are a small side payout.
 * Dying on wave 3 (two waves cleared) is 32 gold before kills.
 */
export function goldForRun(wave: number, kills: number): number {
  const cleared = Math.max(0, Math.floor(wave) - 1);
  const k = Math.max(0, Math.floor(kills));
  return cleared * cleared * 8 + k * 2;
}

export function tryUpgrade(gold: number, level: number): { gold: number; level: number; spent: boolean } {
  const cost = upgradeCost(level);
  if (cost === null || gold < cost) return { gold, level, spent: false };
  return { gold: gold - cost, level: level + 1, spent: true };
}

/** Non-IAP paints. Berry stays a billing stub and has no gold price. */
const SKIN_GOLD: Record<string, number> = {
  sand: 80,
  void: 160,
  ace: 280,
};

export function skinGoldPrice(id: string): number | null {
  const price = SKIN_GOLD[id];
  return price === undefined ? null : price;
}

export function tryBuySkin(gold: number, id: string, owned: boolean): { gold: number; bought: boolean } {
  if (owned) return { gold, bought: false };
  const price = skinGoldPrice(id);
  if (price === null || gold < price) return { gold, bought: false };
  return { gold: gold - price, bought: true };
}
