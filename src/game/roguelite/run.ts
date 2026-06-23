import { PlayerStats } from './stats';
import { Leveling } from './leveling';
import { getSkill, getUpgrade, allUpgrades } from './registry';
import { RARITY_WEIGHT, type GameApi, type SkillDef, type Upgrade } from './api';

interface OwnedSkill {
  def: SkillDef;
  level: number;
  cd: number;
}

/** Per-run mutable state: stats, level/xp, owned skills + their cooldowns, card levels. */
export class RunState {
  stats = new PlayerStats();
  leveling = new Leveling();
  private skills = new Map<string, OwnedSkill>();
  private upgradeLevels = new Map<string, number>();
  /** First slot for each newly unlocked button skill, in acquisition order. */
  buttonOrder: string[] = [];
  /** HP a freshly-picked card wants Game to restore (consumed by Game). */
  pendingHeal = 0;

  reset() {
    this.stats.reset();
    this.leveling.reset();
    this.skills.clear();
    this.upgradeLevels.clear();
    this.buttonOrder = [];
    this.pendingHeal = 0;
    this.gainSkill('shield'); // every run starts with only the shield
  }

  consumeHeal(): number {
    const h = this.pendingHeal;
    this.pendingHeal = 0;
    return h;
  }

  // ----------------------------------------------------------------- skills
  gainSkill(id: string): boolean {
    const existing = this.skills.get(id);
    if (existing) {
      const def = existing.def;
      existing.level = Math.min(def.maxLevel, existing.level + 1);
      return false;
    }
    const def = getSkill(id);
    if (!def) throw new Error(`unknown skill: ${id}`);
    this.skills.set(id, { def, level: 1, cd: 0 });
    if (def.trigger === 'button') this.buttonOrder.push(id);
    return true;
  }

  ownsSkill(id: string): boolean {
    return this.skills.has(id);
  }

  skillLevel(id: string): number {
    return this.skills.get(id)?.level ?? 0;
  }

  ownedSkills(): { id: string; def: SkillDef; level: number }[] {
    return [...this.skills.entries()].map(([id, s]) => ({ id, def: s.def, level: s.level }));
  }

  buttonSkills(): { id: string; def: SkillDef; level: number }[] {
    return this.buttonOrder
      .map((id) => this.skills.get(id))
      .filter((s): s is OwnedSkill => !!s)
      .map((s) => ({ id: s.def.id, def: s.def, level: s.level }));
  }

  private cooldownOf(s: OwnedSkill): number {
    const raw = s.def.cooldown ? s.def.cooldown(s.level, this.stats) : s.def.baseCooldown;
    return Math.max(0.05, raw / this.stats.cdrMult);
  }

  cdRatio(id: string): number {
    const s = this.skills.get(id);
    if (!s) return 0;
    const max = this.cooldownOf(s);
    return max > 0 ? Math.max(0, Math.min(1, s.cd / max)) : 0;
  }

  /** Tick cooldowns and fire auto-cast skills. */
  updateSkills(dt: number, api: GameApi) {
    for (const s of this.skills.values()) {
      if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
      if (s.def.trigger === 'auto' && s.cd <= 0) {
        s.def.cast(api, s.level);
        s.cd = this.cooldownOf(s);
      }
    }
  }

  /** Manual cast from a HUD button; returns true if it fired. */
  castButton(id: string, api: GameApi): boolean {
    const s = this.skills.get(id);
    if (!s || s.def.trigger !== 'button' || s.cd > 0) return false;
    s.def.cast(api, s.level);
    s.cd = this.cooldownOf(s);
    return true;
  }

  // --------------------------------------------------------------- upgrades
  upgradeLevel(id: string): number {
    return this.upgradeLevels.get(id) ?? 0;
  }

  applyUpgrade(up: Upgrade) {
    const next = this.upgradeLevel(up.id) + 1;
    this.upgradeLevels.set(up.id, next);
    up.apply(this, next);
  }

  private candidates(): Upgrade[] {
    return allUpgrades().filter((up) => {
      if (this.upgradeLevel(up.id) >= up.maxLevel) return false;
      return up.available ? up.available(this) : true;
    });
  }

  /** Weighted, distinct draw of `count` cards for the level-up screen. */
  rollCards(count: number): Upgrade[] {
    const pool = this.candidates();
    const luck = this.stats.luck;
    const out: Upgrade[] = [];
    const used = new Set<string>();
    while (out.length < count && used.size < pool.length) {
      const avail = pool.filter((u) => !used.has(u.id));
      let total = 0;
      const weights = avail.map((u) => {
        let w = (RARITY_WEIGHT[u.rarity] ?? 1) * (u.baseWeight ?? 1);
        if (u.rarity !== 'common') w *= 1 + luck * 0.15;
        if (u.kind === 'evolution') w *= 4;
        total += w;
        return w;
      });
      let r = Math.random() * total;
      let pick = avail[0];
      for (let i = 0; i < avail.length; i++) {
        r -= weights[i];
        if (r <= 0) { pick = avail[i]; break; }
      }
      used.add(pick.id);
      out.push(pick);
    }
    return out;
  }

  cardDisplayLevel(up: Upgrade): { current: number; isNew: boolean } {
    const current = this.upgradeLevel(up.id);
    return { current, isNew: current === 0 };
  }
}

export { getUpgrade };
