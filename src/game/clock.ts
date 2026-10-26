export function formatClock(time: number): string {
  const t = Math.max(0, Math.floor(time));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
