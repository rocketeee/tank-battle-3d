/**
 * Endless wave table. There is no final wave and no campaign clear.
 *
 * Session target (playing + upgrade picks, not the settle screen):
 * - new players fall around waves 5–8 → about 3–6 minutes
 * - players who pick damage/speed and dodge fall around waves 12–18 → about 8–15 minutes
 *
 * Edit AUTHORED for the early curve. Later waves use the formula in specForWave.
 */

export type ArenaTheme = 'forest' | 'desert' | 'alien';

export interface WaveSpec {
  wave: number;
  aliens: number;
  ufos: number;
  hpScale: number;
  dmgScale: number;
  speedScale: number;
  boss: boolean;
  bossHp: number;
  /** 0 aimed only, 1 ring burst, 2 slow spiral. */
  pressure: number;
  /** Backdrop only. Clearing a theme does not end the run. */
  theme: ArenaTheme;
}

interface Row {
  aliens: number;
  ufos: number;
  hpScale: number;
  dmgScale: number;
  speedScale: number;
  boss: boolean;
  bossHp: number;
  pressure: number;
}

const AUTHORED: Row[] = [
  { aliens: 3, ufos: 0, hpScale: 0.75, dmgScale: 0.6, speedScale: 0.82, boss: false, bossHp: 0, pressure: 0 },
  { aliens: 4, ufos: 0, hpScale: 0.85, dmgScale: 0.72, speedScale: 0.88, boss: false, bossHp: 0, pressure: 0 },
  { aliens: 4, ufos: 1, hpScale: 0.95, dmgScale: 0.88, speedScale: 0.94, boss: false, bossHp: 0, pressure: 0 },
  { aliens: 5, ufos: 2, hpScale: 1.1, dmgScale: 1.05, speedScale: 1, boss: false, bossHp: 0, pressure: 0 },
  { aliens: 2, ufos: 1, hpScale: 1.05, dmgScale: 1.1, speedScale: 1, boss: true, bossHp: 680, pressure: 0 },
  { aliens: 6, ufos: 2, hpScale: 1.25, dmgScale: 1.22, speedScale: 1.05, boss: false, bossHp: 0, pressure: 0 },
  { aliens: 6, ufos: 3, hpScale: 1.4, dmgScale: 1.38, speedScale: 1.08, boss: false, bossHp: 0, pressure: 0 },
  { aliens: 7, ufos: 3, hpScale: 1.55, dmgScale: 1.52, speedScale: 1.12, boss: false, bossHp: 0, pressure: 0 },
  { aliens: 8, ufos: 4, hpScale: 1.7, dmgScale: 1.68, speedScale: 1.16, boss: false, bossHp: 0, pressure: 0 },
  { aliens: 3, ufos: 2, hpScale: 1.45, dmgScale: 1.55, speedScale: 1.1, boss: true, bossHp: 1100, pressure: 1 },
];

function themeFor(wave: number): ArenaTheme {
  const band = Math.floor((wave - 1) / 4) % 3;
  if (band === 1) return 'desert';
  if (band === 2) return 'alien';
  return 'forest';
}

/** 1-indexed. Wave 1 is the tutorial wave. Never returns a terminal state. */
export function specForWave(wave: number): WaveSpec {
  const n = Math.max(1, Math.floor(wave));
  const theme = themeFor(n);
  if (n <= AUTHORED.length) {
    return { wave: n, theme, ...AUTHORED[n - 1] };
  }
  const k = n - AUTHORED.length;
  const boss = n % 5 === 0;
  const pressure = n >= 15 ? 2 : 1;
  return {
    wave: n,
    theme,
    aliens: Math.min(14, (boss ? 3 : 8) + Math.floor(k * (boss ? 0.2 : 0.4))),
    ufos: Math.min(8, (boss ? 2 : 4) + Math.floor(k * (boss ? 0.15 : 0.28))),
    hpScale: 1.75 + k * 0.11,
    dmgScale: 1.7 + k * 0.075,
    speedScale: Math.min(1.45, 1.16 + k * 0.012),
    boss,
    bossHp: boss ? 1100 + k * 200 : 0,
    pressure: boss ? pressure : 0,
  };
}
