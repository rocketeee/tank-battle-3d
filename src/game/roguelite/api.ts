import * as THREE from 'three';
import type { Particles } from '../Particles';
import type { AudioEngine } from '../Audio';
import type { PlayerStats } from './stats';
import type { StatusState, StatusType } from './status';
import type { RunState } from './run';

/** Anything a skill / bullet can damage (Enemy or Boss). */
export interface Damageable {
  group: THREE.Object3D;
  headY: number;
  radius: number;
  alive: boolean;
  status: StatusState;
  isBoss: boolean;
  takeDamage(dmg: number, hitY: number, particles: Particles, opts?: HitOpts): {
    crit: boolean;
    dmg: number;
    killed: boolean;
  };
}

export interface HitOpts {
  forceCrit?: boolean;
  bonusCritChance?: number;
  critChance?: number;
  critMult?: number;
  damageMult?: number;
  noCrit?: boolean;
}

export interface StatusApply {
  type: StatusType;
  amount?: number; // burn dps OR chill potency
  dur: number;
  stacks?: number; // mark stacks
}

export interface BulletEffect {
  pierce: number;
  statuses: StatusApply[];
  bonusCritChance: number;
  source: string;
}

export interface SpawnBulletOpts {
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  damage: number;
  color?: number;
  size?: number;
  life?: number;
  effect?: Partial<BulletEffect>;
}

/** Minimal player surface skills can drive (jump / dash / shield / muzzle). */
export interface PlayerActions {
  pos: THREE.Vector3;
  aimYaw: number;
  airborne: boolean;
  jump(): void;
  dash(camYaw: number, dur: number, speed: number): void;
  shield(dur: number): void;
  heal(amount: number): void;
  muzzleWorld(): THREE.Vector3;
}

/** Everything a skill module needs to act on the world, without importing Game. */
export interface GameApi {
  readonly stats: PlayerStats;
  readonly run: RunState;
  readonly player: PlayerActions;
  camYaw: number;
  aimPoint: THREE.Vector3;
  particles: Particles;
  audio: AudioEngine;
  playerPos(): THREE.Vector3;
  groundAim(): THREE.Vector3;
  enemies(): Damageable[];
  nearest(pos: THREE.Vector3, count: number, maxRange: number, exclude?: Damageable[]): Damageable[];
  spawnBullet(opts: SpawnBulletOpts): void;
  dealDamage(target: Damageable, amount: number, opts?: HitOpts, statuses?: StatusApply[]): void;
  dealAoe(pos: THREE.Vector3, radius: number, amount: number, opts?: HitOpts, statuses?: StatusApply[]): void;
  applyStatus(target: Damageable, apply: StatusApply): void;
  toast(text: string): void;
}

export type SkillTrigger = 'auto' | 'button';

export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  desc: (lvl: number) => string;
  trigger: SkillTrigger;
  baseCooldown: number;
  maxLevel: number;
  /** Effective cooldown for a level (defaults to baseCooldown scaled by cdr). */
  cooldown?: (lvl: number, stats: PlayerStats) => number;
  cast: (api: GameApi, lvl: number) => void;
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type UpgradeKind = 'skill' | 'passive' | 'synergy' | 'evolution';

export interface Upgrade {
  id: string;
  name: string;
  icon: string;
  desc: (lvl: number) => string;
  rarity: Rarity;
  kind: UpgradeKind;
  tags: string[];
  maxLevel: number;
  baseWeight?: number;
  /** Gate (evolutions / prerequisites). */
  available?: (run: RunState) => boolean;
  apply: (run: RunState, lvl: number) => void;
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#c8d2e0',
  rare: '#5fa8ff',
  epic: '#c06bff',
  legendary: '#ffc24a',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export const RARITY_WEIGHT: Record<Rarity, number> = {
  common: 100,
  rare: 46,
  epic: 18,
  legendary: 6,
};
