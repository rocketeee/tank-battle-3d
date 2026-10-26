export interface ShareInfo {
  wave: number;
  kills: number;
  time: number;
  name: string;
}

export function formatClock(time: number): string {
  const t = Math.max(0, Math.floor(time));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatShareText(info: ShareInfo): string {
  return `${info.name}\n第 ${info.wave} 波 · 击杀 ${info.kills} · 存活 ${formatClock(info.time)}`;
}

function drawCard(info: ShareInfo): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 1280, 720);
  g.addColorStop(0, '#142018');
  g.addColorStop(1, '#3a2a12');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#7ed957';
  ctx.beginPath();
  ctx.arc(180, 360, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4f9430';
  ctx.fillRect(120, 400, 120, 36);
  ctx.fillStyle = '#fff8e8';
  ctx.font = '800 72px sans-serif';
  ctx.fillText(info.name, 320, 230);
  ctx.font = '800 64px sans-serif';
  ctx.fillStyle = '#ffd54a';
  ctx.fillText(`第 ${info.wave} 波`, 320, 330);
  ctx.font = '600 40px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`击杀 ${info.kills}    存活 ${formatClock(info.time)}`, 320, 410);
  ctx.font = '500 28px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('无尽波次 · 涂装不含战斗力', 320, 490);
  return canvas;
}

/** Share sheet when the browser allows files, otherwise download the card and copy the text. */
export async function shareResult(info: ShareInfo): Promise<'shared' | 'downloaded' | 'copied'> {
  const text = formatShareText(info);
  const canvas = drawCard(info);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    return 'copied';
  }
  const file = new File([blob], 'mengtan-dazhan.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === 'function') {
    const payload: ShareData = { title: info.name, text, files: [file] };
    const allowed = !nav.canShare || nav.canShare(payload) || nav.canShare({ title: info.name, text });
    if (allowed) {
      try {
        if (nav.canShare && !nav.canShare(payload)) await nav.share({ title: info.name, text });
        else await nav.share(payload);
        return 'shared';
      } catch (err) {
        if ((err as Error).name === 'AbortError') return 'copied';
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mengtan-dazhan.png';
  a.click();
  URL.revokeObjectURL(url);
  await navigator.clipboard?.writeText(text).catch(() => undefined);
  return 'downloaded';
}
