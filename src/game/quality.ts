export interface Quality {
  tier: 'low' | 'mid' | 'high';
  maxDpr: number;
  antialias: boolean;
  shadows: boolean;
  shadowMap: number;
  propScale: number;
  detailScale: number;
  /** Multiplier for particle counts. */
  fx: number;
}

let cached: Quality | null = null;

/** Mid-range phones land on `low`/`mid` so the first frame is not a 2048 soft shadow. */
export function detectQuality(): Quality {
  if (cached) return cached;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const mem = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  let tier: Quality['tier'] = 'high';
  if (coarse && (mem <= 4 || cores <= 4)) tier = 'low';
  else if (coarse || mem <= 4) tier = 'mid';
  const table: Record<Quality['tier'], Omit<Quality, 'tier'>> = {
    low: { maxDpr: 1.25, antialias: false, shadows: true, shadowMap: 512, propScale: 0.45, detailScale: 0.35, fx: 0.45 },
    mid: { maxDpr: 1.5, antialias: false, shadows: true, shadowMap: 1024, propScale: 0.7, detailScale: 0.55, fx: 0.7 },
    high: { maxDpr: 1.75, antialias: true, shadows: true, shadowMap: 2048, propScale: 1, detailScale: 1, fx: 1 },
  };
  cached = { tier, ...table[tier] };
  return cached;
}
