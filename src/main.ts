import './styles.css';
import { Game } from './game/Game';
import { isDesktopWeb } from './game/platform';
import { detectQuality } from './game/quality';
import { firstFrameReady, gameReady } from './game/playablesSdk';
import { prepareProfile } from './game/profile';
import { PLAYABLES } from './game/target';

document.documentElement.classList.add(`quality-${detectQuality().tier}`);
if (PLAYABLES) document.documentElement.classList.add('playables');
else if (isDesktopWeb()) document.documentElement.classList.add('desktop-web');

const app = document.getElementById('app')!;

if (!PLAYABLES) {
  const guard = document.createElement('div');
  guard.className = 'rotate-guard';
  guard.innerHTML =
    '<div class="phone"></div><div class="rg-text">请将手机横过来玩<br/><span>LANDSCAPE ONLY</span></div>';
  app.appendChild(guard);
}

const intro = document.createElement('div');
intro.className = 'studio-intro';
intro.innerHTML =
  '<div class="studio-logo">' +
  [...'Rocke'].map((c) => `<span>${c}</span>`).join('') +
  '</div><div class="studio-tag">STUDIO</div>';
app.appendChild(intro);

let introCleared = false;
let bootDone = false;
function dismissIntro() {
  if (intro.classList.contains('out')) return;
  intro.classList.add('out');
  window.setTimeout(() => {
    intro.remove();
    introCleared = true;
    maybeReady();
  }, 600);
}
intro.addEventListener('pointerdown', dismissIntro);
window.setTimeout(dismissIntro, 2800);

function maybeReady() {
  if (!PLAYABLES || !introCleared || !bootDone) return;
  gameReady();
}

if (!PLAYABLES) {
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
}

const loading = document.createElement('div');
loading.className = 'loading';
loading.innerHTML = '<div class="spin"></div><div>正在加载战场……</div>';
app.appendChild(loading);

function boot() {
  void start();
}

async function start() {
  try {
    await prepareProfile();
    new Game(app);
  } catch (err) {
    loading.innerHTML = `<div style="color:#ff8a8a;max-width:80%;text-align:center">加载失败:<br/>${(err as Error).message}</div>`;
    console.error(err);
    return;
  }
  loading.remove();
  bootDone = true;
  maybeReady();
}

requestAnimationFrame(() => {
  if (PLAYABLES) firstFrameReady();
  requestAnimationFrame(boot);
});

window.addEventListener('contextmenu', (e) => {
  if (document.documentElement.classList.contains('desktop-web')) return;
  e.preventDefault();
});
document.addEventListener('gesturestart', (e) => e.preventDefault());
