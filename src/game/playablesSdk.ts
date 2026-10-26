/**
 * Thin calls into the YouTube Playables SDK.
 * The script tag is injected only into the playables index.html, and it is a
 * no-op when that page is opened outside YouTube.
 */

import { PLAYABLES } from './target';

type AudioListener = (enabled: boolean) => void;
type LifeListener = () => void;

interface YtGameApi {
  IN_PLAYABLES_ENV?: boolean;
  game?: {
    firstFrameReady?: () => void;
    gameReady?: () => void;
    loadData?: () => Promise<string | null | undefined>;
    saveData?: (data: string) => Promise<void>;
  };
  system?: {
    isAudioEnabled?: () => boolean;
    onAudioEnabledChange?: (cb: AudioListener) => void;
    onPause?: (cb: LifeListener) => void;
    onResume?: (cb: LifeListener) => void;
  };
}

function yt(): YtGameApi | null {
  const host = window as unknown as { ytgame?: YtGameApi };
  return host.ytgame ?? null;
}

let frameSent = false;
let readySent = false;

export function cloudSaveActive(): boolean {
  if (!PLAYABLES) return false;
  const api = yt();
  return Boolean(api?.IN_PLAYABLES_ENV && api.game?.loadData && api.game?.saveData);
}

export function firstFrameReady(): void {
  if (!PLAYABLES || frameSent) return;
  frameSent = true;
  try {
    yt()?.game?.firstFrameReady?.();
  } catch {
    /* local no-op */
  }
}

export function gameReady(): void {
  if (!PLAYABLES || readySent || !frameSent) return;
  readySent = true;
  try {
    yt()?.game?.gameReady?.();
  } catch {
    /* local no-op */
  }
}

export async function loadCloudString(): Promise<string | null> {
  const api = yt();
  if (!api?.game?.loadData) return null;
  try {
    const data = await api.game.loadData();
    return typeof data === 'string' && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}

export async function saveCloudString(data: string): Promise<void> {
  const api = yt();
  if (!api?.game?.saveData) return;
  try {
    await api.game.saveData(data);
  } catch {
    /* keep playing if YouTube rejects one write */
  }
}

export function hostAudioEnabled(): boolean {
  if (!PLAYABLES) return true;
  try {
    const read = yt()?.system?.isAudioEnabled;
    if (!read) return true;
    return read() !== false;
  } catch {
    return true;
  }
}

export function onHostAudio(cb: AudioListener): void {
  if (!PLAYABLES) return;
  try {
    yt()?.system?.onAudioEnabledChange?.(cb);
  } catch {
    /* local no-op */
  }
}

export function onHostPause(cb: LifeListener): void {
  if (!PLAYABLES) return;
  try {
    yt()?.system?.onPause?.(cb);
  } catch {
    /* local no-op */
  }
}

export function onHostResume(cb: LifeListener): void {
  if (!PLAYABLES) return;
  try {
    yt()?.system?.onResume?.(cb);
  } catch {
    /* local no-op */
  }
}
