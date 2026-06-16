/**
 * Leveling — XP from minion kills drives level-ups; each level queues one card pick.
 * Curve is gently escalating so early levels come fast (hooks the player) and later
 * ones pace out.
 */

export const XP_PER_KILL: Record<string, number> = {
  alien: 3,
  ufo: 5,
};

export class Leveling {
  level = 1;
  xp = 0;
  xpToNext = 6;
  pendingLevels = 0;
  kills = 0;

  reset() {
    this.level = 1;
    this.xp = 0;
    this.xpToNext = this.curve(1);
    this.pendingLevels = 0;
    this.kills = 0;
  }

  private curve(level: number): number {
    return 6 + 4 * (level - 1);
  }

  /** Returns how many level-ups occurred. */
  addXp(amount: number): number {
    this.xp += amount;
    let ups = 0;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = this.curve(this.level);
      this.pendingLevels += 1;
      ups += 1;
    }
    return ups;
  }

  addKill(kind: string, mult = 1): number {
    this.kills += 1;
    return this.addXp(Math.max(1, Math.round((XP_PER_KILL[kind] ?? 3) * mult)));
  }

  ratio(): number {
    return this.xpToNext > 0 ? this.xp / this.xpToNext : 0;
  }
}
