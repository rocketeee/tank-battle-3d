/**
 * PlayerStats — the per-run, data-driven container that every combat number reads
 * from. Upgrade cards mutate these fields; Player / Game / skills consume them so a
 * roguelite build can stack and synergize without touching hard-coded constants.
 */

export const BASE = {
  fireInterval: 0.3,
  fireDamage: 14,
  fireSpeed: 42,
  moveSpeed: 9,
  maxHp: 10,
};

/** Diminishing stack: never reaches 1, good for crit / armor / dodge chances. */
export function hyperbolic(perStack: number, stacks: number): number {
  if (stacks <= 0) return 0;
  return 1 - 1 / (1 + perStack * stacks);
}

export class PlayerStats {
  // --- offense ---
  damageMult = 1;
  fireRateMult = 1; // higher = faster main cannon
  projCount = 1; // extra main-cannon pellets
  pierce = 0;
  projSpeed = 1;
  projSize = 1;
  critChance = 0.08;
  critMult = 2.0;

  // --- defense / utility ---
  moveSpeed = 1;
  maxHp = BASE.maxHp;
  regen = 0; // hp per second
  armor = 0; // 0..0.85 damage reduction
  cdrMult = 1; // skill cooldown reduction (higher = shorter cd)
  areaMult = 1; // skill radius / size
  xpGain = 1;
  pickupRange = 1;
  luck = 0; // nudges card rarity

  // --- on-hit status application (set by synergy cards) ---
  onHitBurn = 0; // burn dps applied by main cannon / physical hits
  onHitChill = 0; // chill potency (0..1) applied on hit
  onHitShock = false;
  onHitMarkStacks = 0;

  // --- status amplifiers ---
  burnDmgMult = 1;
  burnSpread = false; // burning enemies spread fire on death
  chillCritBonus = 0; // extra crit chance vs chilled/frozen targets
  freezeOnChill = false; // chill ramps to a full freeze
  shockChains = 0; // extra lightning chain targets
  shockDmgMult = 1;
  markPerStack = 0.12; // damage taken per mark stack
  markDmgMult = 1;
  elementCombo = true; // overload / steam / superconduct bursts

  reset() {
    Object.assign(this, new PlayerStats());
  }
}
