/**
 * Permanent profile. Cosmetics and best-run records only.
 * Nothing in this file may change damage, fire rate, HP, or cooldowns.
 */

const KEY = 'tb.meta.v1';

export interface TankSkin {
  id: string;
  name: string;
  body: number;
  dark: number;
  /** 0 = owned. 999 = stub IAP only. */
  unlockWave: number;
  iap?: boolean;
}

export const SKINS: TankSkin[] = [
  { id: 'sprout', name: '芽绿', body: 0x74c13f, dark: 0x4f9430, unlockWave: 0 },
  { id: 'sand', name: '沙金', body: 0xe2b15a, dark: 0xb8883a, unlockWave: 5 },
  { id: 'void', name: '星紫', body: 0x8b6cff, dark: 0x5a3ec4, unlockWave: 10 },
  { id: 'ace', name: '奶油', body: 0xfff1c9, dark: 0xe6c98a, unlockWave: 15 },
  { id: 'berry', name: '草莓', body: 0xff7aa2, dark: 0xd4537a, unlockWave: 999, iap: true },
];

export interface MetaSave {
  bestWave: number;
  bestKills: number;
  bestTime: number;
  skin: string;
  unlocked: string[];
  removeAds: boolean;
  /** Successful settles since the last mock interstitial. */
  settlesSinceAd: number;
  runs: number;
}

/** Always 0. Skins are paint, not a damage stat. */
export function cosmeticPower(): number {
  return 0;
}

export function defaultMeta(): MetaSave {
  return {
    bestWave: 0,
    bestKills: 0,
    bestTime: 0,
    skin: 'sprout',
    unlocked: ['sprout'],
    removeAds: false,
    settlesSinceAd: 0,
    runs: 0,
  };
}

export function skinById(id: string): TankSkin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function ownsSkin(meta: MetaSave, id: string): boolean {
  return meta.unlocked.includes(id);
}

export function loadMeta(): MetaSave {
  const base = defaultMeta();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<MetaSave>;
    const skin = SKINS.some((s) => s.id === parsed.skin) ? (parsed.skin as string) : base.skin;
    const unlocked = Array.isArray(parsed.unlocked) ? parsed.unlocked.filter((id) => SKINS.some((s) => s.id === id)) : base.unlocked;
    if (!unlocked.includes('sprout')) unlocked.unshift('sprout');
    return {
      bestWave: num(parsed.bestWave),
      bestKills: num(parsed.bestKills),
      bestTime: num(parsed.bestTime),
      skin: unlocked.includes(skin) ? skin : 'sprout',
      unlocked,
      removeAds: parsed.removeAds === true,
      settlesSinceAd: num(parsed.settlesSinceAd),
      runs: num(parsed.runs),
    };
  } catch {
    return base;
  }
}

export function saveMeta(meta: MetaSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    /* private mode */
  }
}

/** Unlock paint when best wave crosses a threshold. Returns newly unlocked names. */
export function syncUnlocks(meta: MetaSave): string[] {
  const gained: string[] = [];
  for (const skin of SKINS) {
    if (skin.iap) continue;
    if (meta.bestWave >= skin.unlockWave && !meta.unlocked.includes(skin.id)) {
      meta.unlocked.push(skin.id);
      gained.push(skin.name);
    }
  }
  return gained;
}

/** Stub IAP: local flag only. Does not touch run stats. */
export function stubRemoveAds(meta: MetaSave): void {
  meta.removeAds = true;
}

/** Stub IAP: unlock one cosmetic. Does not touch run stats. */
export function stubUnlockSkin(meta: MetaSave, id = 'berry'): boolean {
  const skin = SKINS.find((s) => s.id === id);
  if (!skin) return false;
  if (!meta.unlocked.includes(skin.id)) meta.unlocked.push(skin.id);
  meta.skin = skin.id;
  return true;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
