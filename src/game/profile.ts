/**
 * Pages and Play keep localStorage.
 * Inside YouTube the same blob goes through ytgame.game saveData / loadData.
 */

import { coerceMeta, defaultMeta, loadMeta, saveMeta, type MetaSave } from './meta';
import { loadCloudString, saveCloudString, cloudSaveActive } from './playablesSdk';
import { coerceSettings, defaultSettings, loadSettings, saveSettings, type Settings } from './settings';
import { PLAYABLES } from './target';

const CLOUD_LIMIT = 3 * 1024 * 1024;

interface CloudBlob {
  v: 1;
  meta: MetaSave;
  settings: Settings;
  coach: boolean;
  desk: boolean;
}

let cloud = false;
let blob: CloudBlob | null = null;
let chain: Promise<void> = Promise.resolve();

export async function prepareProfile(): Promise<void> {
  if (!PLAYABLES || !cloudSaveActive()) return;
  cloud = true;
  blob = decode(await loadCloudString());
}

export function readMeta(): MetaSave {
  if (cloud && blob) return blob.meta;
  return loadMeta();
}

export function writeMeta(meta: MetaSave): void {
  if (cloud && blob) {
    blob.meta = meta;
    flush();
    return;
  }
  saveMeta(meta);
}

export function readSettings(): Settings {
  if (cloud && blob) return blob.settings;
  return loadSettings();
}

export function writeSettings(settings: Settings): void {
  if (cloud && blob) {
    blob.settings = settings;
    flush();
    return;
  }
  saveSettings(settings);
}

export function seenFlag(key: 'coach' | 'desk'): boolean {
  if (cloud && blob) return key === 'coach' ? blob.coach : blob.desk;
  try {
    return localStorage.getItem(flagKey(key)) === '1';
  } catch {
    return false;
  }
}

export function markFlag(key: 'coach' | 'desk'): void {
  if (cloud && blob) {
    if (key === 'coach') blob.coach = true;
    else blob.desk = true;
    flush();
    return;
  }
  try {
    localStorage.setItem(flagKey(key), '1');
  } catch {
    /* private mode */
  }
}

function flagKey(key: 'coach' | 'desk'): string {
  return key === 'coach' ? 'tb.coach.v1' : 'tb.desk.v1';
}

function decode(raw: string | null): CloudBlob {
  const empty: CloudBlob = {
    v: 1,
    meta: defaultMeta(),
    settings: defaultSettings(),
    coach: false,
    desk: false,
  };
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<CloudBlob>;
    return {
      v: 1,
      meta: coerceMeta(parsed.meta),
      settings: coerceSettings(parsed.settings),
      coach: parsed.coach === true,
      desk: parsed.desk === true,
    };
  } catch {
    return empty;
  }
}

function flush(): void {
  if (!blob) return;
  const text = JSON.stringify(blob);
  if (text.length > CLOUD_LIMIT) return;
  chain = chain.then(() => saveCloudString(text)).catch(() => undefined);
}
