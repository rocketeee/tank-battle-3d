/**
 * StatusState — elemental status effects carried by every Enemy / Boss.
 * Burn = damage-over-time, Chill = slow (ramping to Freeze), Shock = chain marker,
 * Mark = bonus-damage-taken. Game drives ticks and reads the helpers for slow / crit.
 */

export type StatusType = 'burn' | 'chill' | 'shock' | 'mark';

export class StatusState {
  burnDps = 0;
  burnTime = 0;
  private burnTick = 0;

  chillTime = 0;
  chillPotency = 0; // 0..1 slow strength
  frozenTime = 0;

  shockTime = 0;

  markStacks = 0;
  markTime = 0;

  applyBurn(dps: number, dur: number) {
    this.burnDps = Math.max(this.burnDps, dps);
    this.burnTime = Math.max(this.burnTime, dur);
  }

  applyChill(potency: number, dur: number) {
    this.chillPotency = Math.max(this.chillPotency, Math.min(0.85, potency));
    this.chillTime = Math.max(this.chillTime, dur);
  }

  freeze(dur: number) {
    this.frozenTime = Math.max(this.frozenTime, dur);
    this.chillPotency = Math.max(this.chillPotency, 0.85);
    this.chillTime = Math.max(this.chillTime, dur);
  }

  applyShock(dur: number) {
    this.shockTime = Math.max(this.shockTime, dur);
  }

  applyMark(stacks: number, dur: number) {
    this.markStacks = Math.min(8, this.markStacks + stacks);
    this.markTime = Math.max(this.markTime, dur);
  }

  has(type: StatusType): boolean {
    switch (type) {
      case 'burn': return this.burnTime > 0;
      case 'chill': return this.chillTime > 0;
      case 'shock': return this.shockTime > 0;
      case 'mark': return this.markStacks > 0;
    }
  }

  get frozen(): boolean {
    return this.frozenTime > 0;
  }

  /** Movement multiplier (0..1) from chill / freeze. */
  slowFactor(): number {
    if (this.frozenTime > 0) return 0;
    if (this.chillTime > 0) return 1 - this.chillPotency;
    return 1;
  }

  /** Extra damage multiplier from mark stacks. */
  markMultiplier(perStack: number): number {
    return 1 + this.markStacks * perStack;
  }

  /** Advance timers; returns burn damage to deal this frame (0 if none). */
  tick(dt: number): number {
    let burnDamage = 0;
    if (this.burnTime > 0) {
      this.burnTime -= dt;
      this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = 0.5;
        burnDamage = this.burnDps * 0.5;
      }
      if (this.burnTime <= 0) this.burnDps = 0;
    }
    if (this.chillTime > 0) {
      this.chillTime -= dt;
      if (this.chillTime <= 0) this.chillPotency = 0;
    }
    if (this.frozenTime > 0) this.frozenTime -= dt;
    if (this.shockTime > 0) this.shockTime -= dt;
    if (this.markTime > 0) {
      this.markTime -= dt;
      if (this.markTime <= 0) this.markStacks = 0;
    }
    return burnDamage;
  }

  clear() {
    this.burnDps = 0; this.burnTime = 0; this.burnTick = 0;
    this.chillTime = 0; this.chillPotency = 0; this.frozenTime = 0;
    this.shockTime = 0;
    this.markStacks = 0; this.markTime = 0;
  }
}
