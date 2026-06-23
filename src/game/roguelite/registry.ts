import type { SkillDef, Upgrade } from './api';

/**
 * Self-registering catalogs. Skill / upgrade packs call these at import time, so
 * adding a new element pack is a single new file + one import line — keeping
 * multi-agent contributions nearly conflict-free.
 */

const SKILLS = new Map<string, SkillDef>();
const UPGRADES = new Map<string, Upgrade>();

export function registerSkill(def: SkillDef) {
  if (SKILLS.has(def.id)) throw new Error(`duplicate skill id: ${def.id}`);
  SKILLS.set(def.id, def);
}

export function registerUpgrade(up: Upgrade) {
  if (UPGRADES.has(up.id)) throw new Error(`duplicate upgrade id: ${up.id}`);
  UPGRADES.set(up.id, up);
}

export function getSkill(id: string): SkillDef | undefined {
  return SKILLS.get(id);
}

export function allUpgrades(): Upgrade[] {
  return [...UPGRADES.values()];
}

export function getUpgrade(id: string): Upgrade | undefined {
  return UPGRADES.get(id);
}
