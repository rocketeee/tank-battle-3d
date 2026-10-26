export type Sensitivity = 'low' | 'mid' | 'high';

const KEY = 'tb.settings.v1';

export interface Settings {
  sensitivity: Sensitivity;
}

const LOOK: Record<Sensitivity, number> = {
  low: 0.62,
  mid: 1,
  high: 1.45,
};

export function lookScale(s: Sensitivity): number {
  return LOOK[s] ?? 1;
}

export function defaultSettings(): Settings {
  return { sensitivity: 'mid' };
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const sensitivity: Sensitivity =
      parsed.sensitivity === 'low' || parsed.sensitivity === 'high' ? parsed.sensitivity : 'mid';
    return { sensitivity };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}
