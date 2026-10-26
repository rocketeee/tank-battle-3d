import './styles.css';
import { Game } from './game/Game';
import { isDesktopWeb } from './game/platform';
import { detectQuality } from './game/quality';

document.documentElement.classList.add(`quality-${detectQuality().tier}`);
if (isDesktopWeb()) document.documentElement.classList.add('desktop-web');

const app = document.getElementById('app')!;

// portrait guard: this game is landscape-only
const guard = document.createElement('div');
guard.className = 'rotate-guard';
guard.innerHTML =
  '<div class="phone"></div><div class="rg-text">请将手机横过来玩<br/><span>LANDSCAPE ONLY</span></div>';
app.appendChild(guard);

// studio logo intro (black bg, white wiggling "Rocke")
const intro = document.createElement('div');
intro.className = 'studio-intro';
intro.innerHTML =
  '<div class="studio-logo">' +
  [...'Rocke'].map((c) => `<span>${c}</span>`).join('') +
  '</div><div class="studio-tag">STUDIO</div>';
app.appendChild(intro);

let introGone = false;
function dismissIntro() {
  if (introGone) return;
  introGone = true;
  intro.classList.add('out');
  window.setTimeout(() => intro.remove(), 600);
}
intro.addEventListener('pointerdown', dismissIntro);
window.setTimeout(dismissIntro, 2800);

// First gesture on mobile web: fullscreen + landscape. The APK locks this in the manifest.
function enterImmersive() {
  const touch = navigator.maxTouchPoints > 0;
  if (touch) {
    const el = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
    void el.requestFullscreen?.().catch(() => undefined);
  }
  const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  void o?.lock?.('landscape').catch(() => undefined);
}
window.addEventListener('pointerdown', enterImmersive, { once: true });

// loading screen while modules init
const loading = document.createElement('div');
loading.className = 'loading';
loading.innerHTML = '<div class="spin"></div><div>正在加载战场……</div>';
app.appendChild(loading);

function boot() {
  try {
    new Game(app);
  } catch (err) {
    loading.innerHTML = `<div style="color:#ff8a8a;max-width:80%;text-align:center">加载失败:<br/>${(err as Error).message}</div>`;
    console.error(err);
    return;
  }
  loading.remove();
}

// give the browser one frame to paint the loader
requestAnimationFrame(() => requestAnimationFrame(boot));

// Touch play swallows the context menu. Desktop web leaves right-click alone.
window.addEventListener('contextmenu', (e) => {
  if (document.documentElement.classList.contains('desktop-web')) return;
  e.preventDefault();
});
document.addEventListener('gesturestart', (e) => e.preventDefault());
